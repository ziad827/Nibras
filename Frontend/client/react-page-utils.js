(function () {
  const MONOLITH_FALLBACK_URL = 'https://nibras-backend.up.railway.app/api';
  const FALLBACK_ADMIN_URL =
    window.NIBRAS_API_URL || window.NIBRAS_BACKEND_URL || MONOLITH_FALLBACK_URL;
  const FALLBACK_LEGACY_URL =
    window.NIBRAS_LEGACY_API_URL ||
    window.NIBRAS_API_URL ||
    window.NIBRAS_BACKEND_URL ||
    MONOLITH_FALLBACK_URL;
  const FALLBACK_COMMUNITY_URL =
    window.NIBRAS_COMMUNITY_API_URL ||
    window.NIBRAS_API_URL ||
    window.NIBRAS_BACKEND_URL ||
    MONOLITH_FALLBACK_URL;
  const FALLBACK_TRACKING_URL =
    window.NIBRAS_TRACKING_API_URL ||
    window.NIBRAS_API_URL ||
    window.NIBRAS_BACKEND_URL ||
    MONOLITH_FALLBACK_URL;
  const FALLBACK_COMPETITIONS_URL =
    window.NIBRAS_COMPETITIONS_API_URL ||
    window.NIBRAS_API_URL ||
    window.NIBRAS_BACKEND_URL ||
    MONOLITH_FALLBACK_URL;
  const FALLBACK_COURSES_URL =
    window.NIBRAS_COURSES_API_URL ||
    window.NIBRAS_API_URL ||
    window.NIBRAS_BACKEND_URL ||
    MONOLITH_FALLBACK_URL;

  const onReady = (cb) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb, { once: true });
    } else {
      cb();
    }
  };

  const getTheme = () =>
    document.documentElement.getAttribute('data-theme') || 'light';

  const setTheme = (theme) => {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    return next;
  };

  const toggleTheme = () => setTheme(getTheme() === 'light' ? 'dark' : 'light');

  const resolveServiceUrl = (service = 'admin') => {
    if (
      window.NibrasApiConfig &&
      typeof window.NibrasApiConfig.getServiceUrl === 'function'
    ) {
      return window.NibrasApiConfig.getServiceUrl(service);
    }
    if (service === 'legacyCommunity') return FALLBACK_LEGACY_URL;
    if (service === 'community') return FALLBACK_COMMUNITY_URL;
    if (service === 'tracking') return FALLBACK_TRACKING_URL;
    if (service === 'competitions') return FALLBACK_COMPETITIONS_URL;
    if (service === 'courses') return FALLBACK_COURSES_URL;
    return FALLBACK_ADMIN_URL;
  };

  const safeStorageGet = (storage, key) => {
    if (!storage || !key) return null;
    try {
      return storage.getItem(key);
    } catch (_) {
      return null;
    }
  };

  const tryParseJson = (value) => {
    if (typeof value !== 'string') {
      return { ok: false, value: null };
    }
    try {
      return { ok: true, value: JSON.parse(value) };
    } catch (_) {
      return { ok: false, value: null };
    }
  };

  const normalizeToken = (token) => {
    if (typeof token !== 'string') return null;
    const trimmed = token.trim();
    if (!trimmed) return null;
    if (/^bearer\s+/i.test(trimmed))
      return trimmed.replace(/^bearer\s+/i, '').trim() || null;
    return trimmed;
  };

  const AUTH_ERROR_CODES = Object.freeze({
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
  });

  const CLIENT_ERROR_CODES = Object.freeze({
    429: 'RATE_LIMITED',
  });

  const AUTH_ERROR_EVENT = 'nibras:auth-error';

  const isAuthErrorStatus = (status) => status === 401 || status === 403;

  const isRateLimitError = (status) => status === 429;

  const getErrorCode = (status, explicitCode = null) =>
    explicitCode ||
    AUTH_ERROR_CODES[status] ||
    CLIENT_ERROR_CODES[status] ||
    'REQUEST_FAILED';

  const pickTokenCandidate = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const parsed = tryParseJson(value);
      if (parsed.ok) return pickTokenCandidate(parsed.value);
      return normalizeToken(value);
    }
    if (typeof value === 'object') {
      const candidates = [
        value.token,
        value.accessToken,
        value.authToken,
        value.jwt,
        value?.tokens?.access?.token,
        value?.tokens?.accessToken,
      ];
      for (let i = 0; i < candidates.length; i += 1) {
        const token = pickTokenCandidate(candidates[i]);
        if (token) return token;
      }
    }
    return null;
  };

  const getTokenFromStorage = (storage) => {
    if (window.NibrasSession) return null;
    const keys = [
      'token',
      'nibras.webSession',
      'accessToken',
      'authToken',
      'jwt',
    ];
    for (let i = 0; i < keys.length; i += 1) {
      const token = pickTokenCandidate(safeStorageGet(storage, keys[i]));
      if (token) return token;
    }
    return null;
  };

  const getToken = () => {
    if (window.NibrasSession) return window.NibrasSession.getToken();
    return (
      getTokenFromStorage(window.localStorage) ||
      getTokenFromStorage(window.sessionStorage)
    );
  };

  const getRefreshToken = () => {
    if (window.NibrasSession) return window.NibrasSession.getRefreshToken();
    return (
      safeStorageGet(window.localStorage, 'refreshToken') ||
      safeStorageGet(window.sessionStorage, 'refreshToken')
    );
  };

  const getUser = () => {
    if (window.NibrasSession) return window.NibrasSession.getUser();
    const raw = safeStorageGet(window.localStorage, 'user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  };

  const extractAuth = (payload) => {
    if (window.NibrasSession) return window.NibrasSession.extractAuth(payload);
    const data = payload && payload.data ? payload.data : payload || {};
    const tokens =
      payload && payload.tokens ? payload.tokens : data.tokens || {};
    const user = data.user || payload?.user || data;
    const accessToken =
      data.token || payload?.token || tokens?.access?.token || null;
    const refreshToken =
      data.refreshToken ||
      payload?.refreshToken ||
      tokens?.refresh?.token ||
      null;
    return {
      accessToken,
      refreshToken,
      user: user && user._id ? user : payload?.data || null,
    };
  };

  const setAuth = ({ token, accessToken, refreshToken, user }) => {
    if (window.NibrasSession) {
      window.NibrasSession.setAuth({ token, accessToken, refreshToken, user });
      return;
    }
    const finalAccess = accessToken || token || null;
    if (finalAccess) window.localStorage.setItem('token', finalAccess);
    if (refreshToken) window.localStorage.setItem('refreshToken', refreshToken);
    if (user) window.localStorage.setItem('user', JSON.stringify(user));
  };

  const clearAuth = () => {
    if (window.NibrasSession) {
      window.NibrasSession.clearAuth();
      return;
    }
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('refreshToken');
    window.localStorage.removeItem('user');
  };

  const safeParseResponse = async (response) => {
    let rawText = '';
    try {
      rawText = await response.text();
    } catch (_) {
      return { payload: null, rawText: '', isJson: false };
    }

    if (!rawText) {
      return { payload: null, rawText: '', isJson: false };
    }

    const parsed = tryParseJson(rawText);
    if (parsed.ok) {
      return { payload: parsed.value, rawText, isJson: true };
    }

    return { payload: null, rawText, isJson: false };
  };

  const hasHeader = (headers, key) =>
    Object.keys(headers || {}).some(
      (headerKey) =>
        headerKey.toLowerCase() === String(key || '').toLowerCase(),
    );

  const getErrorMessage = (payload, status, statusText, rawText) => {
    if (status === 401) {
      return 'Authentication required. Please sign in to continue.';
    }
    if (status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (status === 429) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }

    const candidates = [
      payload?.message,
      payload?.error?.message,
      typeof payload?.error === 'string' ? payload.error : null,
      Array.isArray(payload?.errors) && payload.errors.length
        ? payload.errors
            .map((entry) => entry?.message || entry?.msg)
            .filter(Boolean)
            .join(' ')
        : null,
      rawText || null,
      status
        ? `Request failed (${status}${statusText ? ` ${statusText}` : ''})`
        : null,
      'Request failed',
    ];

    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      if (typeof candidate === 'string' && candidate.trim())
        return candidate.trim();
    }
    return 'Request failed';
  };

  const normalizeError = ({
    status = 0,
    statusText = '',
    payload = null,
    rawText = '',
    service = 'admin',
    url = '',
    code = null,
    correlationId = currentCorrelationId,
  }) => {
    const message = getErrorMessage(payload, status, statusText, rawText);
    return {
      message,
      status,
      statusText,
      code: getErrorCode(status, code),
      isAuthError: isAuthErrorStatus(status),
      payload,
      rawText: rawText || '',
      service,
      url,
      correlationId,
    };
  };

  const toError = (normalizedError) => {
    const err = new Error(normalizedError?.message || 'Request failed');
    err.status = normalizedError?.status || 0;
    err.statusText = normalizedError?.statusText || '';
    err.code = normalizedError?.code || 'REQUEST_FAILED';
    err.isAuthError = Boolean(normalizedError?.isAuthError);
    err.payload = normalizedError?.payload || null;
    err.service = normalizedError?.service || 'admin';
    err.url = normalizedError?.url || '';
    err.rawText = normalizedError?.rawText || '';
    err.correlationId = normalizedError?.correlationId || null;
    return err;
  };

  const logClientError = (error, context = {}) => {
    try {
      const monitoringUrl = joinUrl(
        resolveServiceUrl('admin'),
        '/monitoring/client-error',
      );
      const correlationId = error?.correlationId || currentCorrelationId;
      const payload = {
        message: error?.message || String(error),
        stack: error?.stack || '',
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        correlationId,
        ...(context.userId ? { userId: context.userId } : {}),
      };
      if (correlationId) payload.correlationId = correlationId;
      fetch(monitoringUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch (_e) {}
  };

  const observeWebVitals = () => {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      if (navigator?.webdriver) return;
    } catch (_e) {
      return;
    }

    const report = (metrics) => {
      try {
        const vitalsUrl = joinUrl(
          resolveServiceUrl('admin'),
          '/monitoring/web-vitals',
        );
        fetch(vitalsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            correlationId: currentCorrelationId,
          }),
          keepalive: true,
        }).catch(() => {});
      } catch (_e) {}
    };

    const vitals = {};

    try {
      const lcpObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length) {
          vitals.lcp = entries[entries.length - 1].startTime;
        }
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_e) {}

    try {
      const fidObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length) {
          vitals.fid = entries[0].processingStart - entries[0].startTime;
        }
      });
      fidObs.observe({ type: 'first-input', buffered: true });
    } catch (_e) {}

    try {
      let clsValue = 0;
      const clsObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
        vitals.cls = clsValue;
      });
      clsObs.observe({ type: 'layout-shift', buffered: true });
    } catch (_e) {}

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && Object.keys(vitals).length) {
        report(vitals);
      }
    });
  };

  const UI_STATE_MAP = Object.freeze({
    auth: 'unauthorized',
    'auth-required': 'unauthorized',
    unauthorized: 'unauthorized',
    forbidden: 'forbidden',
    loading: 'loading',
    empty: 'empty',
    error: 'error',
    info: 'info',
  });

  const UI_STATE_META = Object.freeze({
    loading: {
      icon: 'fa-solid fa-spinner fa-spin',
      fallbackMessage: 'Loading...',
    },
    empty: {
      icon: 'fa-regular fa-folder-open',
      fallbackMessage: 'No data available.',
    },
    error: {
      icon: 'fa-solid fa-circle-exclamation',
      fallbackMessage: 'Something went wrong.',
    },
    unauthorized: {
      icon: 'fa-solid fa-lock',
      fallbackMessage: 'Please sign in to continue.',
    },
    forbidden: {
      icon: 'fa-solid fa-ban',
      fallbackMessage: 'You do not have permission to view this.',
    },
    info: {
      icon: 'fa-solid fa-circle-info',
      fallbackMessage: '',
    },
  });

  const normalizeUiStateType = (state) => {
    const key = String(state || '')
      .trim()
      .toLowerCase();
    return UI_STATE_MAP[key] || 'info';
  };

  const resolveUiStateFromError = (
    error,
    fallbackMessage = 'Request failed',
  ) => {
    const status = Number(error?.status || 0);
    let state = 'error';
    if (
      status === 401 ||
      String(error?.code || '').toUpperCase() === 'UNAUTHORIZED'
    ) {
      state = 'unauthorized';
    } else if (
      status === 403 ||
      String(error?.code || '').toUpperCase() === 'FORBIDDEN'
    ) {
      state = 'forbidden';
    } else if (status === 404) {
      state = 'empty';
    }
    const message =
      (typeof error?.message === 'string' && error.message.trim()) ||
      fallbackMessage ||
      UI_STATE_META[state]?.fallbackMessage ||
      'Request failed';
    return { state, message };
  };

  const applyUiNoticeStyle = (target, state) => {
    const isErrorTone =
      state === 'error' || state === 'unauthorized' || state === 'forbidden';
    target.style.border = '1px solid';
    target.style.borderRadius = '10px';
    target.style.padding = '10px 12px';
    target.style.fontSize = '13px';
    target.style.margin = '12px 0 18px';
    target.style.color = isErrorTone ? '#ef4444' : 'var(--text-secondary)';
    target.style.borderColor = isErrorTone
      ? 'rgba(239, 68, 68, 0.35)'
      : 'var(--border-color)';
    target.style.backgroundColor = isErrorTone
      ? 'rgba(239, 68, 68, 0.08)'
      : 'var(--bg-secondary)';
  };

  const renderUiState = (target, options = {}) => {
    if (!target) return;

    const state = normalizeUiStateType(options.state || options.type || 'info');
    const mode = String(
      options.mode || options.layout || 'block',
    ).toLowerCase();
    const hideWhenEmpty = options.hideWhenEmpty !== false;
    const configuredMessage =
      typeof options.message === 'string' ? options.message.trim() : '';
    const message =
      configuredMessage || UI_STATE_META[state]?.fallbackMessage || '';

    if (!message && hideWhenEmpty) {
      target.hidden = true;
      target.textContent = '';
      if (mode !== 'notice') target.innerHTML = '';
      return;
    }

    target.hidden = false;
    if (mode === 'notice') {
      applyUiNoticeStyle(target, state);
      target.textContent = message;
      return;
    }

    const iconClass = UI_STATE_META[state]?.icon || UI_STATE_META.info.icon;
    const isErrorTone =
      state === 'error' || state === 'unauthorized' || state === 'forbidden';
    target.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.textAlign = 'center';
    wrapper.style.padding = options.compact ? '1rem' : '2rem';
    wrapper.style.color = isErrorTone
      ? 'var(--tag-red-text, #dc2626)'
      : 'var(--text-secondary)';

    const icon = document.createElement('i');
    icon.className = iconClass;
    icon.style.fontSize = options.compact ? '1.2rem' : '1.8rem';
    if (!isErrorTone) icon.style.color = 'var(--accent-blue)';

    const text = document.createElement('p');
    text.style.marginTop = '0.8rem';
    text.textContent = message;

    wrapper.appendChild(icon);
    wrapper.appendChild(text);
    target.appendChild(wrapper);
  };

  const clearUiState = (target) => {
    if (!target) return;
    target.hidden = true;
    target.textContent = '';
    target.innerHTML = '';
  };

  const isAbsoluteUrl = (value) => /^https?:\/\//i.test(String(value || ''));

  const joinUrl = (baseUrl, path) => {
    const normalizedBase = String(baseUrl || '').replace(/\/+$/, '');
    const normalizedPath = String(path || '');
    if (!normalizedPath) return normalizedBase;
    if (isAbsoluteUrl(normalizedPath)) return normalizedPath;
    if (!normalizedBase) return normalizedPath;
    if (normalizedPath.startsWith('/'))
      return `${normalizedBase}${normalizedPath}`;
    return `${normalizedBase}/${normalizedPath}`;
  };

  const toPlainHeaders = (headers) => {
    if (!headers) return {};
    if (typeof Headers !== 'undefined' && headers instanceof Headers) {
      const result = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    return Object.assign({}, headers);
  };

  const buildAuthHeaders = (headers, options = {}) => {
    const result = toPlainHeaders(headers);
    const authEnabled = options.auth !== false;
    if (!authEnabled) return result;

    const replaceAuthorization = options.replaceAuthorization === true;
    if (replaceAuthorization) {
      Object.keys(result).forEach((key) => {
        if (String(key).toLowerCase() === 'authorization') {
          delete result[key];
        }
      });
    }

    if (hasHeader(result, 'Authorization')) return result;

    const token = normalizeToken(options.token || getToken());
    if (token) result.Authorization = `Bearer ${token}`;
    return result;
  };

  const emitAuthError = (normalizedError) => {
    if (!normalizedError || !isAuthErrorStatus(normalizedError.status)) return;
    if (
      typeof window?.dispatchEvent !== 'function' ||
      typeof window?.CustomEvent !== 'function'
    )
      return;
    try {
      window.dispatchEvent(
        new window.CustomEvent(AUTH_ERROR_EVENT, {
          detail: {
            status: normalizedError.status,
            code: normalizedError.code,
            message: normalizedError.message,
            service: normalizedError.service,
            url: normalizedError.url,
          },
        }),
      );
    } catch (_) {
      // ignore custom event dispatch failures
    }
  };

  let currentCorrelationId = null;

  const request = async (path, options = {}) => {
    const settings = Object.assign({}, options);
    const service = settings.service || 'admin';
    const authEnabled = settings.auth !== false;
    const throwOnError = settings.throwOnError === true;
    const timeoutMs = Number(settings.timeoutMs || settings.timeout || 0);
    const method = (settings.method || 'GET').toUpperCase();
    const explicitBaseUrl =
      settings.baseUrl || settings.serviceUrl || settings.url || null;

    delete settings.service;
    delete settings.auth;
    delete settings.throwOnError;
    delete settings.timeout;
    delete settings.timeoutMs;
    delete settings.baseUrl;
    delete settings.serviceUrl;
    delete settings.url;

    const headers = buildAuthHeaders(settings.headers, { auth: authEnabled });
    delete settings.headers;

    const hasBody =
      Object.prototype.hasOwnProperty.call(settings, 'body') &&
      settings.body != null;
    const isJsonBody =
      hasBody &&
      typeof settings.body === 'object' &&
      !(settings.body instanceof FormData) &&
      !(
        typeof URLSearchParams !== 'undefined' &&
        settings.body instanceof URLSearchParams
      ) &&
      !(typeof Blob !== 'undefined' && settings.body instanceof Blob) &&
      !(
        typeof ArrayBuffer !== 'undefined' &&
        settings.body instanceof ArrayBuffer
      );
    if (isJsonBody) {
      if (!hasHeader(headers, 'Content-Type'))
        headers['Content-Type'] = 'application/json';
      settings.body = JSON.stringify(settings.body);
    }
    const baseUrl = explicitBaseUrl || resolveServiceUrl(service);
    const requestUrl = joinUrl(baseUrl, path);

    if (
      currentCorrelationId &&
      !hasHeader(headers, 'x-correlation-id') &&
      !hasHeader(headers, 'x-request-id')
    ) {
      headers['X-Correlation-Id'] = currentCorrelationId;
    }

    const controller =
      typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId =
      timeoutMs > 0 && controller
        ? window.setTimeout(() => controller.abort(), timeoutMs)
        : null;

    try {
      const response = await fetch(
        requestUrl,
        Object.assign({}, settings, {
          method,
          headers,
          signal: controller ? controller.signal : settings.signal,
        }),
      );
      const parsed = await safeParseResponse(response);
      const payload = parsed.payload;
      const data = parsed.isJson ? payload : parsed.rawText || null;

      const correlationId =
        response.headers.get('X-Request-Id') ||
        response.headers.get('X-Correlation-Id') ||
        currentCorrelationId;
      if (correlationId) currentCorrelationId = correlationId;

      const result = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        service,
        url: requestUrl,
        data: response.ok ? data : null,
        payload,
        rawText: parsed.rawText || '',
        error: null,
        response,
        correlationId,
      };

      if (!response.ok) {
        result.error = normalizeError({
          status: response.status,
          statusText: response.statusText,
          payload,
          rawText: parsed.rawText,
          service,
          url: requestUrl,
          correlationId,
        });
        if (throwOnError) throw toError(result.error);
      }

      return result;
    } catch (error) {
      if (
        throwOnError &&
        error &&
        typeof error.status === 'number' &&
        error.status > 0
      ) {
        throw error;
      }
      const isAbort =
        error &&
        (error.name === 'AbortError' ||
          /aborted|timeout/i.test(String(error.message || '')));
      const normalizedError = normalizeError({
        status: 0,
        payload: null,
        rawText: '',
        service,
        url: requestUrl,
        code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
        correlationId: currentCorrelationId,
      });
      normalizedError.message = isAbort
        ? `Request timeout after ${timeoutMs}ms`
        : error?.message || normalizedError.message;

      if (throwOnError) throw toError(normalizedError);

      return {
        ok: false,
        status: 0,
        statusText: '',
        service,
        url: requestUrl,
        data: null,
        payload: null,
        rawText: '',
        error: normalizedError,
        response: null,
        correlationId: currentCorrelationId,
      };
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };

  const REFRESH_ELIGIBLE_SERVICES = new Set([
    'admin',
    'legacyCommunity',
    'community',
    'tracking',
    'competitions',
    'courses',
  ]);
  let refreshPromise = null;

  const refreshAccessToken = async () => {
    if (window.NibrasSession) {
      return window.NibrasSession.refreshAccessToken(resolveServiceUrl('admin'));
    }
    if (refreshPromise) return refreshPromise;

    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    refreshPromise = request('/auth/refresh-tokens', {
      service: 'admin',
      method: 'POST',
      auth: false,
      throwOnError: true,
      body: { refreshToken },
    })
      .then((result) => {
        const nextAuth = extractAuth(result?.data || {});
        if (!nextAuth.accessToken) return null;
        setAuth(nextAuth);
        return nextAuth.accessToken;
      })
      .catch(() => {
        clearAuth();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  };

  const apiFetch = async (path, options = {}) => {
    const service = options.service || 'admin';
    const authEnabled = options.auth !== false;
    const retryAuth = options.retryAuth !== false;
    const requestOptions = Object.assign({}, options, {
      service,
      auth: authEnabled,
      throwOnError: false,
    });
    delete requestOptions.retryAuth;

    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      toPlainHeaders(requestOptions.headers),
    );
    if (
      requestOptions.body instanceof FormData &&
      !hasHeader(toPlainHeaders(options.headers), 'Content-Type')
    ) {
      delete headers['Content-Type'];
    }
    requestOptions.headers = headers;

    let result = await request(path, requestOptions);

    const shouldRetryWithRefresh =
      REFRESH_ELIGIBLE_SERVICES.has(service) &&
      authEnabled &&
      retryAuth &&
      result.status === 401 &&
      path !== '/auth/login' &&
      path !== '/auth/register' &&
      path !== '/auth/refresh-tokens';

    if (shouldRetryWithRefresh) {
      const nextAccessToken = await refreshAccessToken();
      if (nextAccessToken) {
        const retryHeaders = buildAuthHeaders(headers, {
          token: nextAccessToken,
          replaceAuthorization: true,
        });
        result = await request(
          path,
          Object.assign({}, requestOptions, { headers: retryHeaders }),
        );
      }
    }

    if (authEnabled && isAuthErrorStatus(result.status)) {
      emitAuthError(
        result.error ||
          normalizeError({ status: result.status, service, url: result.url }),
      );
    }

    if (!result.ok) {
      const errorObj =
        result.error ||
        normalizeError({ status: result.status, service, url: result.url });
      logClientError(errorObj, { userId: (getUser() || {}).id });
      throw toError(errorObj);
    }

    return result.data;
  };

  let logoutRequestPromise = null;

  const normalizeLogoutRedirect = (href) => {
    const fallback = '/Login/loginPage/login.html';
    if (typeof href !== 'string') return fallback;
    const trimmed = href.trim();
    if (!trimmed || /^javascript:/i.test(trimmed)) return fallback;
    return trimmed;
  };

  const performLogout = async (redirectHref) => {
    if (logoutRequestPromise) return logoutRequestPromise;

    logoutRequestPromise = (async () => {
      const targetHref = normalizeLogoutRedirect(redirectHref);

      if (window.NibrasSession) {
        try {
          await window.NibrasSession.performLogout(resolveServiceUrl('admin'));
        } catch (error) {
          console.warn(
            '[NibrasAuth] Logout API request failed:',
            error?.message || error,
          );
          window.NibrasSession.clearAuth();
        }
      } else {
        const refreshToken = getRefreshToken();
        const accessToken = getToken();
        if (refreshToken || accessToken) {
          try {
            const headers = { 'Content-Type': 'application/json' };
            if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
            await apiFetch('/auth/logout', {
              service: 'admin',
              method: 'POST',
              auth: false,
              retryAuth: false,
              headers,
              body: { refreshToken },
            });
          } catch (error) {
            console.warn(
              '[NibrasAuth] Logout API request failed:',
              error?.message || error,
            );
          }
        }
        clearAuth();
      }

      window.location.href = targetHref;
    })().finally(() => {
      logoutRequestPromise = null;
    });

    return logoutRequestPromise;
  };

  const attachLogoutHandlers = () => {
    if (window.__NIBRAS_LOGOUT_HANDLER_ATTACHED__) return;
    window.__NIBRAS_LOGOUT_HANDLER_ATTACHED__ = true;

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      const logoutLink = target.closest(
        'a.logout-btn, a[data-auth-logout="true"]',
      );
      if (!logoutLink) return;
      event.preventDefault();
      void performLogout(logoutLink.getAttribute('href'));
    });
  };

  onReady(() => {
    attachLogoutHandlers();
  });

  const nibrasApi = Object.freeze({
    resolveServiceUrl,
    getToken,
    buildAuthHeaders,
    request,
  });

  // ============================================================
  // Session/User Display Utilities
  // ============================================================
  const updateUserInfoDisplay = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const initials = user?.name
        ? user.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()
        : 'US';
      const displayName = user?.name || 'User';
      const displayRole = user?.role?.name || user?.role || 'student';

      // Update all avatar circles
      document
        .querySelectorAll('.avatar-circle, .profile-circle-small')
        .forEach((el) => {
          if (el.textContent.trim() === 'ZA' || el.textContent.trim() === '') {
            el.textContent = initials;
          }
        });

      // Update user profile name in sidebar
      const sidebarUserNames = document.querySelectorAll('.user-profile h4');
      sidebarUserNames.forEach((el) => {
        if (
          el.textContent.trim() === 'Ziad Alaa' ||
          el.textContent.trim() === ''
        ) {
          el.textContent = displayName;
        }
      });

      // Update user role in sidebar
      const sidebarUserRoles = document.querySelectorAll('.user-profile span');
      sidebarUserRoles.forEach((el) => {
        if (
          el.textContent.trim() === 'student' ||
          el.textContent.trim() === ''
        ) {
          el.textContent = displayRole;
        }
      });

      // Update welcome messages
      const welcomeMsgs = document.querySelectorAll('#welcome-msg');
      welcomeMsgs.forEach((el) => {
        const firstName = user?.name ? user.name.split(' ')[0] : 'Student';
        el.textContent = `Welcome back, ${firstName}!`;
      });

      setupProfileDropdowns(user, initials, displayName, displayRole);

      return { user, initials, displayName, displayRole };
    } catch (_) {
      return null;
    }
  };

  function setupProfileDropdowns(user, initials, displayName, displayRole) {
    var avatars = document.querySelectorAll('.profile-circle-small');
    if (!avatars.length) return;

    var displayEmail = user?.email || '';

    function closeAll() {
      document
        .querySelectorAll(
          '.profile-dropdown-menu.show, .notif-dropdown-menu.show',
        )
        .forEach(function (m) {
          m.classList.remove('show');
        });
    }

    avatars.forEach(function (avatar) {
      if (avatar.getAttribute('data-dd')) return;
      avatar.setAttribute('data-dd', '1');
      avatar.style.cursor = 'pointer';

      var parent = avatar.parentElement;
      if (getComputedStyle(parent).position === 'static')
        parent.style.position = 'relative';

      var curTheme = localStorage.getItem('theme') || 'light';
      var tIcon = curTheme === 'dark' ? '🌙' : '☀️';
      var tLabel = curTheme === 'dark' ? 'Light Mode' : 'Dark Mode';

      var dd = document.createElement('div');
      dd.className = 'profile-dropdown-menu';
      var role = String(user?.role?.name || user?.role || '').toLowerCase();
      var isInstructor = role === 'instructor';
      var isAdmin = role === 'admin';
      var menuItems = [
        '<div class="dd-header">',
        '  <div class="dd-avatar-circle">' + initials + '</div>',
        '  <div class="dd-info">',
        '    <div class="dd-name">' + displayName + '</div>',
        '    <div class="dd-role">' + displayRole + '</div>',
        displayEmail
          ? '    <div class="dd-email">' + displayEmail + '</div>'
          : '',
        '  </div>',
        '</div>',
        '<div class="dd-divider"></div>',
      ];
      if (isAdmin) {
        menuItems.push(
          '<a class="dd-item" data-href="/Admin/Dashboard/dashboard.html"><span>📊</span> Admin Dashboard</a>',
          '<a class="dd-item" data-href="/Admin/Courses/courses.html"><span>📚</span> Course Management</a>',
          '<a class="dd-item" data-href="/Admin/Users/users.html"><span>👥</span> User Management</a>',
        );
      } else if (isInstructor) {
        menuItems.push(
          '<a class="dd-item" data-href="/Dashboard/instructor-dashboard.html"><span>📊</span> Dashboard</a>',
          '<a class="dd-item" data-href="/Courses/instructor-courses.html"><span>📚</span> My Courses</a>',
          '<a class="dd-item" data-href="/Analytics/Overview/overview.html"><span>📈</span> Analytics</a>',
          '<a class="dd-item" data-href="/Community/community.html"><span>👥</span> Community</a>',
        );
      } else {
        menuItems.push(
          '<a class="dd-item" data-href="/Dashboard/dashboard.html"><span>📊</span> Dashboard</a>',
          '<a class="dd-item" data-href="/Courses/courses.html"><span>📚</span> My Courses</a>',
          '<a class="dd-item" data-href="/Achievements/Achievements/achievements.html"><span>🏆</span> Achievements</a>',
        );
      }
      if (!isAdmin) {
        menuItems.push(
          '<div class="dd-divider"></div>',
          '<a class="dd-item" data-href="/Settings/settings.html"><span>⚙️</span> Settings</a>',
        );
      }
      menuItems.push(
        '<div class="dd-divider"></div>',
        '<a class="dd-item dd-action" data-action="theme"><span>' +
          tIcon +
          '</span> ' +
          tLabel +
          '</a>',
        '<a class="dd-item dd-signout" data-action="logout"><span>🚪</span> Sign Out</a>',
      );
      dd.innerHTML = menuItems.join('');

      parent.appendChild(dd);

      avatar.addEventListener('click', function (e) {
        e.stopPropagation();
        closeAll();
        dd.classList.toggle('show');
      });

      dd.addEventListener('click', function (e) {
        var item = e.target.closest('.dd-item');
        if (!item) return;
        var href = item.getAttribute('data-href');
        var action = item.getAttribute('data-action');
        if (href) {
          closeAll();
          window.location.href = href;
        } else if (action === 'theme') {
          var theme = window.NibrasShared?.theme;
          var html = document.documentElement;
          var cur = html.getAttribute('data-theme') || 'light';
          var next = cur === 'dark' ? 'light' : 'dark';
          html.setAttribute('data-theme', next);
          localStorage.setItem('theme', next);
          item.innerHTML =
            '<span>' +
            (next === 'dark' ? '🌙' : '☀️') +
            '</span> ' +
            (next === 'dark' ? 'Light Mode' : 'Dark Mode');
          var logo = document.getElementById('app-logo');
          if (logo)
            logo.src =
              next === 'dark'
                ? '/Assets/images/logo-dark.png'
                : '/Assets/images/logo-light.png';
          closeAll();
        } else if (action === 'logout') {
          closeAll();
          try {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
          } catch (_) {}
          window.location.href = '/Login/loginPage/login.html';
        }
      });
    });

    document.addEventListener('click', closeAll);
  }

  const requireAuth = (redirectUrl = '/Login/loginPage/login.html') => {
    const token = getToken();
    if (!token) {
      // Check for new session-based auth
      const sessionToken = safeStorageGet(
        window.localStorage,
        'nibras_session_token',
      );
      if (!sessionToken) {
        window.location.href = redirectUrl;
        return false;
      }
      return true;
    }
    return true;
  };

  /**
   * Get current user from new tracking API session
   * @returns {Promise<object|null>}
   */
  const fetchTrackingSession = async () => {
    const trackingApi = resolveServiceUrl('tracking');
    try {
      const response = await fetch(`${trackingApi}/v1/web/session`, {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const userData = await response.json();
        return userData;
      }
      return null;
    } catch (err) {
      console.error('[NibrasShared] Failed to fetch tracking session:', err);
      return null;
    }
  };

  // --- Inject dropdown styles ---
  (function () {
    var id = 'nibras-profile-dropdown-styles';
    if (document.getElementById(id)) return;
    var style = document.createElement('style');
    style.id = id;
    style.textContent = [
      '.profile-dropdown-menu { position:absolute; top:calc(100% + 8px); right:0; min-width:220px; background:var(--bg-body,#fff); border:1px solid var(--border-color,#e2e8f0); border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.15); z-index:9999; display:none; overflow:hidden; }',
      '.profile-dropdown-menu.show { display:block; }',
      '.dd-header { display:flex; align-items:center; gap:12px; padding:16px; }',
      '.dd-avatar-circle { width:40px; height:40px; border-radius:50%; background:var(--accent-blue,#2563eb); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:0.9rem; flex-shrink:0; }',
      '.dd-info { min-width:0; }',
      '.dd-name { font-weight:600; font-size:0.9rem; color:var(--text-primary,#1e293b); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
      '.dd-role { font-size:0.75rem; color:var(--text-secondary,#64748b); text-transform:capitalize; }',
      '.dd-email { font-size:0.75rem; color:var(--text-secondary,#64748b); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
      '.dd-divider { height:1px; background:var(--border-color,#e2e8f0); margin:0; }',
      '.dd-item { display:flex; align-items:center; gap:10px; padding:10px 16px; font-size:0.85rem; color:var(--text-primary,#1e293b); text-decoration:none; cursor:pointer; transition:background 0.15s; }',
      '.dd-item:hover { background:var(--bg-secondary,#f1f5f9); }',
      '.dd-item span { font-size:1rem; }',
      '[data-theme="dark"] .dd-item:hover { background:rgba(255,255,255,0.08); }',
      '.dd-signout { color:var(--tag-red-text,#dc2626) !important; }',
      '.dd-signout:hover { background:rgba(220,38,38,0.08) !important; }',
      '.notif-dropdown-menu { position:absolute; top:calc(100% + 8px); right:0; min-width:240px; background:var(--bg-body,#fff); border:1px solid var(--border-color,#e2e8f0); border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.15); z-index:9999; display:none; overflow:hidden; }',
      '.notif-dropdown-menu.show { display:block; }',
      '.notif-header { padding:16px 16px 8px; font-weight:600; font-size:0.95rem; color:var(--text-primary,#1e293b); }',
      '.notif-empty { display:flex; flex-direction:column; align-items:center; gap:6px; padding:28px 16px; color:var(--text-secondary,#64748b); }',
      '.notif-empty-icon { font-size:1.8rem; }',
      '.notif-empty-text { font-size:0.9rem; }',
      '.notif-list { max-height:320px; overflow-y:auto; }',
      '.notif-item { display:flex; gap:10px; padding:10px 16px; cursor:pointer; transition:background 0.15s; border-bottom:1px solid var(--border-color,#e2e8f0); }',
      '.notif-item:hover { background:var(--bg-secondary,#f1f5f9); }',
      '.notif-item.unread { background:rgba(37,99,235,0.04); }',
      '.notif-icon { font-size:1.1rem; flex-shrink:0; margin-top:2px; }',
      '.notif-body { min-width:0; flex:1; }',
      '.notif-title { font-size:0.82rem; font-weight:500; color:var(--text-primary,#1e293b); line-height:1.3; }',
      '.notif-msg { font-size:0.75rem; color:var(--text-secondary,#64748b); margin-top:1px; line-height:1.3; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }',
      '.notif-time { font-size:0.7rem; color:var(--text-secondary,#64748b); margin-top:3px; }',
    ].join('');
    document.head.appendChild(style);
  })();

  function setupNotificationDropdown() {
    var bellBtn = document.querySelector(
      '.icon-btn .fa-bell, .icon-btn .fa-regular.fa-bell',
    );
    if (!bellBtn) return;
    bellBtn = bellBtn.closest('button');
    if (!bellBtn || bellBtn.getAttribute('data-ndd')) return;
    bellBtn.setAttribute('data-ndd', '1');
    bellBtn.style.cursor = 'pointer';
    bellBtn.style.position = 'relative';

    var wrap = document.createElement('span');
    wrap.style.cssText =
      'position:relative;display:inline-flex;align-items:center';
    bellBtn.parentNode.insertBefore(wrap, bellBtn);
    wrap.appendChild(bellBtn);

    var badge = document.createElement('span');
    badge.className = 'notif-badge';
    badge.style.cssText =
      'position:absolute;top:-4px;right:-4px;background:#dc2626;color:#fff;font-size:10px;font-weight:700;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 4px;display:none';
    wrap.appendChild(badge);

    var dd = document.createElement('div');
    dd.className = 'notif-dropdown-menu';
    dd.innerHTML =
      '<div class="notif-header">Notifications</div><div class="dd-divider"></div><div class="notif-loading" style="padding:24px;text-align:center;color:var(--text-secondary,#64748b);font-size:0.85rem">Loading...</div>';
    wrap.appendChild(dd);

    (function () {
      var s = window.NibrasServices?.adminNotificationService;
      if (s && s.count) {
        s.count()
          .then(function (res) {
            var data = res?.data || res || {};
            var c = Number(data.count || 0);
            if (c > 0) {
              badge.textContent = c > 99 ? '99+' : c;
              badge.style.display = 'flex';
            }
          })
          .catch(function () {});
      }
    })();

    function refreshBadge() {
      var s = window.NibrasServices?.adminNotificationService;
      if (s && s.count) {
        s.count()
          .then(function (res) {
            var data = res?.data || res || {};
            var c = Number(data.count || 0);
            if (c > 0) {
              badge.textContent = c > 99 ? '99+' : c;
              badge.style.display = 'flex';
            } else badge.style.display = 'none';
          })
          .catch(function () {});
      }
    }
    setInterval(refreshBadge, 30000);

    function getSvc() {
      return window.NibrasServices?.adminNotificationService;
    }

    function renderNotifications() {
      dd.innerHTML =
        '<div class="notif-header">Notifications</div><div class="dd-divider"></div><div class="notif-loading" style="padding:24px;text-align:center;color:var(--text-secondary,#64748b);font-size:0.85rem">Loading...</div>';
      var svc = getSvc();
      if (!svc || !svc.list) {
        dd.innerHTML =
          '<div class="notif-header">Notifications</div><div class="dd-divider"></div><div class="notif-empty"><div class="notif-empty-icon">ℹ️</div><div class="notif-empty-text">Service unavailable</div></div>';
        return;
      }
      svc
        .list(1, 20)
        .then(function (res) {
          var data = res?.data || res || {};
          var items = data.notifications || [];
          if (!items.length) {
            dd.innerHTML =
              '<div class="notif-header">Notifications</div><div class="dd-divider"></div><div class="notif-empty"><div class="notif-empty-icon">✅</div><div class="notif-empty-text">All caught up 🎉</div></div>';
            return;
          }
          var html =
            '<div class="notif-header">' +
            (data.pagination?.total || items.length) +
            ' Notifications</div><div class="dd-divider"></div><div class="notif-list">';
          items.forEach(function (n) {
            var icon = '📌';
            if (n.type === 'contest_reminder' || n.type === 'contest_starting')
              icon = '🏆';
            else if (n.type === 'question_answered') icon = '💬';
            else if (
              n.type === 'question_vote' ||
              n.type === 'answer_vote' ||
              n.type === 'comment_vote'
            )
              icon = '⬆️';
            else if (
              n.type === 'assignment_deadline' ||
              n.type === 'assignment_due'
            )
              icon = '📝';
            else if (n.type === 'badge_earned') icon = '🏅';
            else if (n.type === 'at_risk_alert') icon = '⚠️';
            else if (n.type === 'grade_posted') icon = '📊';
            else if (n.type === 'project_commit') icon = '🔀';
            else if (n.type === 'project_pr') icon = '🔄';
            var time = '';
            if (n.createdAt) {
              var diff = Date.now() - new Date(n.createdAt).getTime();
              var mins = Math.floor(diff / 60000);
              if (mins < 1) time = 'just now';
              else if (mins < 60) time = mins + 'm ago';
              else if (mins < 1440) time = Math.floor(mins / 60) + 'h ago';
              else time = Math.floor(mins / 1440) + 'd ago';
            }
            var relatedId = n._id || n.id || '';
            html +=
              '<div class="notif-item' +
              (n.isRead ? '' : ' unread') +
              '" data-id="' +
              relatedId +
              '" data-type="' +
              (n.type || '') +
              '" data-related="' +
              (n.relatedId || '') +
              '"><div class="notif-icon">' +
              icon +
              '</div><div class="notif-body"><div class="notif-title">' +
              (n.title || '') +
              '</div><div class="notif-msg">' +
              (n.message || '') +
              '</div><div class="notif-time">' +
              time +
              '</div></div></div>';
          });
          html +=
            '</div><div class="dd-divider"></div><div class="notif-footer" style="padding:8px 16px;text-align:center"><button class="notif-mark-read-btn" style="background:none;border:none;color:var(--accent-blue,#2563eb);cursor:pointer;font-size:0.8rem;padding:4px 8px">Mark all as read</button></div>';
          dd.innerHTML = html;

          var markBtn = dd.querySelector('.notif-mark-read-btn');
          if (markBtn) {
            markBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              if (svc && svc.markAllRead)
                svc.markAllRead().catch(function () {});
              badge.style.display = 'none';
              renderNotifications();
            });
          }

          var listEl = dd.querySelector('.notif-list');
          if (listEl) {
            listEl.addEventListener('click', function (e) {
              var item = e.target.closest('.notif-item');
              if (!item) return;
              var type = item.getAttribute('data-type') || '';
              var related = item.getAttribute('data-related') || '';
              var url = '';
              if (type === 'contest_reminder' || type === 'contest_starting')
                url = '/Competitions/Contests/contest.html';
              else if (type === 'question_vote' || type === 'question_answered')
                url = related
                  ? '/Community/QuestionID/question.html?questionId=' +
                    encodeURIComponent(related)
                  : '';
              else if (type === 'answer_vote')
                url = related
                  ? '/Community/QuestionID/question.html?questionId=' +
                    encodeURIComponent(related)
                  : '';
              else if (type === 'comment_vote')
                url = '/Community/CourseDiscussions/discussions.html';
              else if (
                type === 'assignment_deadline' ||
                type === 'assignment_due'
              )
                url = '/Courses/Assignments/Assignments.html';
              else if (type === 'badge_earned')
                url = '/Achievements/Achievements/achievements.html';
              else if (type === 'grade_posted')
                url = '/Courses/Grades/grades.html';
              else if (type === 'at_risk_alert')
                url = '/Analytics/Students/students.html';
              else if (type === 'project_commit' || type === 'project_pr')
                url = '/Projects/projects.html';
              if (url) {
                dd.classList.remove('show');
                window.location.href = url;
              }
            });
          }
        })
        .catch(function () {
          dd.innerHTML =
            '<div class="notif-header">Notifications</div><div class="dd-divider"></div><div class="notif-empty"><div class="notif-empty-icon">❌</div><div class="notif-empty-text">Could not load notifications</div></div>';
        });
    }

    bellBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      document
        .querySelectorAll(
          '.profile-dropdown-menu.show, .notif-dropdown-menu.show',
        )
        .forEach(function (m) {
          m.classList.remove('show');
        });
      dd.classList.toggle('show');
      if (dd.classList.contains('show')) renderNotifications();
    });

    document.addEventListener('click', function (e) {
      if (
        !e.target.closest('[data-ndd]') &&
        !e.target.closest('.notif-dropdown-menu')
      ) {
        dd.classList.remove('show');
      }
    });
  }

  // --- Global monitoring: error logging + web vitals ---
  (function () {
    try {
      window.addEventListener('error', function (e) {
        logClientError(e.error || e.message, { userId: (getUser() || {}).id });
      });
    } catch (_) {}
    try {
      window.addEventListener('unhandledrejection', function (e) {
        logClientError(e.reason || e, { userId: (getUser() || {}).id });
      });
    } catch (_) {}
  })();
  observeWebVitals();

  // --- Check feature flags for maintenance/beta mode ---
  (function () {
    try {
      var _flagsUrl = joinUrl(resolveServiceUrl('admin'), '/admin/config');
      var _flagsHeaders = buildAuthHeaders({}, { auth: true });
      fetch(_flagsUrl, { headers: _flagsHeaders })
        .then(function (_r) {
          return _r.json().catch(function () {
            return null;
          });
        })
        .then(function (_cfg) {
          if (!_cfg) return;
          var _flags = _cfg.featureFlags || _cfg.flags || {};
          var _isMaintenance = _flags.maintenanceMode === true;
          var _isBeta = _flags.betaMode === true;
          if (!_isMaintenance && !_isBeta) return;

          var _ov = document.createElement('div');
          _ov.id = 'nibras-feature-overlay';
          _ov.style.cssText =
            'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(3px);';

          var _card = document.createElement('div');
          _card.style.cssText =
            'background:var(--bg-card,#fff);color:var(--text-primary,#333);border-radius:16px;padding:2.5rem;max-width:480px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

          var _icon = document.createElement('div');
          _icon.innerHTML = _isMaintenance
            ? '<i class="fa-solid fa-wrench" style="font-size:3rem;color:var(--accent-blue,#2563eb);margin-bottom:1rem;"></i>'
            : '<i class="fa-solid fa-flask" style="font-size:3rem;color:var(--accent-blue,#2563eb);margin-bottom:1rem;"></i>';
          _card.appendChild(_icon);

          var _title = document.createElement('h2');
          _title.style.cssText =
            'font-size:1.5rem;font-weight:700;margin:0 0 0.75rem;';
          _title.textContent = _isMaintenance
            ? 'Under Maintenance'
            : 'Beta Preview';
          _card.appendChild(_title);

          var _desc = document.createElement('p');
          _desc.style.cssText =
            'font-size:0.95rem;line-height:1.6;color:var(--text-secondary,#666);margin:0 0 1.5rem;';
          _desc.textContent = _isMaintenance
            ? 'The platform is currently undergoing scheduled maintenance. We will be back shortly.'
            : 'You are viewing a beta version of the platform. Some features may be unstable or incomplete.';
          _card.appendChild(_desc);

          if (!_isMaintenance) {
            var _btn = document.createElement('button');
            _btn.className = 'btn-primary';
            _btn.textContent = 'Got it';
            _btn.onclick = function () {
              _ov.remove();
            };
            _card.appendChild(_btn);
          }

          _ov.appendChild(_card);
          document.body.appendChild(_ov);
        })
        .catch(function () {});
    } catch (_) {}
  })();

  // --- Auto-init dropdown on all pages ---
  (function () {
    try {
      var u = JSON.parse(localStorage.getItem('user') || '{}');
      var init = u?.name
        ? u.name
            .split(' ')
            .map(function (n) {
              return n[0];
            })
            .join('')
            .substring(0, 2)
            .toUpperCase()
        : 'US';
      var nm = u?.name || 'User';
      var rl = u?.role?.name || u?.role || 'student';
      setupProfileDropdowns(u, init, nm, rl);
      setupNotificationDropdown();
    } catch (_) {}
  })();

  const safeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const safeMarkdown = (text) => {
    if (!text) return '';
    const marked = window.marked;
    const purify = window.DOMPurify;
    if (!marked || !purify) return safeHtml(text);
    return purify.sanitize(marked.parse(text));
  };

  window.NibrasApi = nibrasApi;
  window.NibrasShared = {
    BACKEND_URL: resolveServiceUrl('admin'),
    resolveServiceUrl,
    onReady,
    theme: { getTheme, setTheme, toggleTheme },
    auth: {
      getToken,
      getRefreshToken,
      getUser,
      setAuth,
      clearAuth,
      extractAuth,
      refreshAccessToken,
      buildAuthHeaders,
    },
    session: {
      updateUserInfoDisplay,
      requireAuth,
      fetchTrackingSession,
    },
    uiStates: {
      render: renderUiState,
      clear: clearUiState,
      fromError: resolveUiStateFromError,
      normalize: normalizeUiStateType,
    },
    safeHtml,
    safeMarkdown,
    api: nibrasApi,
    apiRequest: request,
    apiFetch,
  };

  (function () {
    var raw = safeStorageGet(window.localStorage, 'user');
    if (!raw) return;
    var parsed = tryParseJson(raw);
    if (!parsed.ok || !parsed.value) return;
    var user = parsed.value;
    var role = String(user?.role?.name || user?.role || '').toLowerCase();
    var isStaff =
      role === 'instructor' ||
      role === 'admin' ||
      role === 'super admin' ||
      role === 'ta';

    if (
      isStaff &&
      window.location.pathname.includes('/Projects/projects.html')
    ) {
      window.location.replace(
        window.location.pathname.replace(
          'projects.html',
          'instructor-projects.html',
        ),
      );
      return;
    }

    onReady(function () {
      var items = document.querySelectorAll('.nav-item');
      for (var i = 0; i < items.length; i++) {
        var link = items[i].querySelector('a');
        if (!link) continue;
        var text = link.textContent.trim();

        if (!isStaff && text === 'Analytics') {
          items[i].style.display = 'none';
          continue;
        }

        if (isStaff && text === 'Projects') {
          var href = link.getAttribute('href');
          if (href && href.split('/').pop() === 'projects.html') {
            link.setAttribute(
              'href',
              href.replace('projects.html', 'instructor-projects.html'),
            );
          }
        }
      }
    });
  })();

  // --- Role-based page quick-navigator for search bar ---
  (function () {
    var STUDENT_PAGES = [
      {
        keywords: ['dashboard', 'home', 'main', 'student dashboard'],
        url: 'Dashboard/dashboard.html',
      },
      {
        keywords: ['courses', 'my courses', 'course list'],
        url: 'Courses/courses.html',
      },
      {
        keywords: ['assignments', 'homework', 'tasks'],
        url: 'Courses/Assignments/Assignments.html',
      },
      {
        keywords: ['assignment content', 'assignment detail'],
        url: 'Courses/Assignments/Assignments Content/AssignmentContent.html',
      },
      {
        keywords: ['course content', 'course description', 'syllabus'],
        url: 'Courses/Course Description/courseContent.html',
      },
      {
        keywords: ['grades', 'my grades', 'scores'],
        url: 'Courses/Grades/grades.html',
      },
      {
        keywords: ['videos', 'course videos', 'lectures'],
        url: 'Courses/Videos/videos.html',
      },
      {
        keywords: ['course projects', 'course project'],
        url: 'Courses/Projects/Projects.html',
      },
      {
        keywords: ['intermediate courses', 'all courses', 'courses'],
        url: 'Courses/courses.html',
      },
      {
        keywords: ['community', 'feed', 'discussions'],
        url: 'Community/community.html',
      },
      {
        keywords: ['question', 'q&a', 'help', 'ask'],
        url: 'Community/QuestionID/question.html',
      },
      {
        keywords: ['course discussions', 'discussions'],
        url: 'Community/CourseDiscussions/discussions.html',
      },
      {
        keywords: ['thread', 'discussion thread'],
        url: 'Community/CourseDiscussions/thread.html',
      },
      {
        keywords: ['mentorship', 'mentors', 'mentor'],
        url: 'Community/mentorship.html',
      },
      {
        keywords: ['achievements', 'badges', 'trophies', 'awards'],
        url: 'Achievements/Achievements/achievements.html',
      },
      {
        keywords: ['leaderboard', 'ranking', 'top students'],
        url: 'Achievements/Leaderboard/leaderboard.html',
      },
      {
        keywords: ['reputation', 'rep', 'xp', 'points'],
        url: 'Achievements/Reputation/reputation.html',
      },
      {
        keywords: ['ai tutor', 'tutor', 'ai assistant'],
        url: 'Ai-tutor/Ai Tutor/ai_tutor.html',
      },
      {
        keywords: ['learning insights', 'insights', 'learning analytics'],
        url: 'Ai-tutor/Learning Insights/learning_insights.html',
      },
      {
        keywords: ['recommendations', 'ai recommendations', 'suggestions'],
        url: 'Ai-tutor/Recommendations/recommendation.html',
      },
      {
        keywords: ['smart routing', 'routing', 'learning path'],
        url: 'Ai-tutor/Smart Routing/smart_routing.html',
      },
      {
        keywords: ['analytics overview', 'overview', 'analytics'],
        url: 'Analytics/Overview/overview.html',
      },
      {
        keywords: ['analytics courses', 'course analytics'],
        url: 'Analytics/Courses/courses.html',
      },
      {
        keywords: ['analytics engagement', 'engagement', 'student engagement'],
        url: 'Analytics/Engagement/engagement.html',
      },
      {
        keywords: ['analytics students', 'student analytics', 'my students'],
        url: 'Analytics/Students/students.html',
      },
      {
        keywords: ['contests', 'competitions', 'challenges'],
        url: 'Competitions/Contests/contest.html',
      },
      {
        keywords: [
          'contest details',
          'competition details',
          'challenge detail',
        ],
        url: 'Competitions/ContestDetail/contestDetail.html',
      },
      {
        keywords: ['competition history', 'contest history', 'past contests'],
        url: 'Competitions/Contests/contest.html',
      },
      {
        keywords: ['competition practice', 'contest practice', 'practice'],
        url: 'Competitions/Practice/practice.html',
      },
      {
        keywords: ['competition ranking', 'contest ranking', 'rankings'],
        url: 'Competitions/Ranking/ranking.html',
      },
      {
        keywords: ['projects', 'my projects', 'student projects'],
        url: 'Projects/projects.html',
      },
      {
        keywords: ['project planner', 'planner', 'project planning'],
        url: 'Projects/planner.html',
      },
      {
        keywords: ['project catalog', 'catalog', 'project templates'],
        url: 'Projects/catalog.html',
      },
      {
        keywords: ['settings', 'preferences', 'profile settings'],
        url: 'Settings/settings.html',
      },
      { keywords: ['cli', 'command line', 'terminal'], url: 'CLI/cli.html' },
      {
        keywords: ['levels', 'leveling', 'xp levels', 'experience'],
        url: 'Levels/level.html',
      },
      {
        keywords: ['portfolio', 'profile', 'student profile'],
        url: 'Portfolio/portfolio.html',
      },
      {
        keywords: ['recommendation system', 'recommendations', 'suggestions'],
        url: 'Recommendation System/recommendation.html',
      },
    ];

    var INSTRUCTOR_PAGES = [
      {
        keywords: ['dashboard', 'home', 'instructor dashboard', 'main'],
        url: 'Dashboard/instructor-dashboard.html',
      },
      {
        keywords: ['courses', 'my courses', 'instructor courses'],
        url: 'Courses/instructor-courses.html',
      },
      {
        keywords: ['projects', 'instructor projects', 'student projects'],
        url: 'Projects/instructor-projects.html',
      },
    ];

    var ADMIN_PAGES = [
      {
        keywords: ['dashboard', 'home', 'main', 'admin dashboard'],
        url: 'Admin/Dashboard/dashboard.html',
      },
      {
        keywords: ['users', 'user management', 'accounts', 'people'],
        url: 'Admin/Users/users.html',
      },
      {
        keywords: ['courses', 'course management', 'admin courses'],
        url: 'Admin/Courses/courses.html',
      },
      {
        keywords: ['roles', 'permissions', 'role management'],
        url: 'Admin/Roles/roles.html',
      },
      {
        keywords: ['audit', 'audit logs', 'logs'],
        url: 'Admin/AuditLogs/audit-logs.html',
      },
      {
        keywords: ['config', 'system config', 'configuration', 'settings'],
        url: 'Admin/Config/config.html',
      },
      {
        keywords: ['moderation', 'moderate', 'reports', 'report'],
        url: 'Admin/moderation.html',
      },
      {
        keywords: ['badges', 'badge', 'achievements'],
        url: 'Admin/badges.html',
      },
      {
        keywords: ['sections', 'section'],
        url: 'Admin/Sections/section-detail.html',
      },
      {
        keywords: ['create section', 'new section', 'add section'],
        url: 'Admin/Sections/create-section.html',
      },
      {
        keywords: [
          'create user',
          'bulk create',
          'bulk',
          'create users',
          'import users',
        ],
        url: 'Admin/Users/bulk-create.html',
      },
      {
        keywords: ['course form', 'create course', 'new course', 'add course'],
        url: 'Admin/Courses/course-form.html',
      },
      {
        keywords: ['role form', 'new role', 'create role', 'add role'],
        url: 'Admin/Roles/role-form.html',
      },
    ];

    function findBestMatch(query, pages) {
      var q = query.trim().toLowerCase();
      if (!q) return null;

      var bestScore = -1;
      var bestUrl = null;

      for (var i = 0; i < pages.length; i++) {
        var page = pages[i];
        var score = 0;

        for (var j = 0; j < page.keywords.length; j++) {
          var kw = page.keywords[j].toLowerCase();
          if (kw === q) {
            score = 100;
            break;
          }
          if (q.indexOf(kw) !== -1) {
            score = Math.max(score, 50);
          }
          if (kw.indexOf(q) !== -1) {
            score = Math.max(score, 30 + kw.length / 50);
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestUrl = page.url;
        }
      }

      return bestScore > 0 ? bestUrl : null;
    }

    onReady(function () {
      var raw = safeStorageGet(window.localStorage, 'user');
      var parsed = tryParseJson(raw);
      var user = parsed.ok ? parsed.value : null;
      var role = String(user?.role?.name || user?.role || '').toLowerCase();
      var isAdmin =
        role === 'admin' || role === 'super admin' || role === 'super-admin';
      var isInstructor = role === 'instructor' || role === 'ta';

      var pages;
      var placeholder;
      if (isAdmin) {
        pages = ADMIN_PAGES;
        placeholder = 'Search admin pages...';
      } else if (isInstructor) {
        pages = INSTRUCTOR_PAGES;
        placeholder = 'Search instructor pages...';
      } else {
        pages = STUDENT_PAGES;
        placeholder = 'Search pages...';
      }

      var inputs = document.querySelectorAll(
        '.search-bar-global input[type="text"]',
      );
      for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];
        input.removeAttribute('disabled');
        input.placeholder = placeholder;

        input.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter') return;
          var query = e.target.value;
          if (!query || !query.trim()) return;

          var target = findBestMatch(query, pages);
          if (target) {
            var currentPath = window.location.pathname.replace(/\/$/, '');
            var targetPath = '/' + target;

            if (currentPath !== targetPath.replace(/\/$/, '')) {
              window.location.href = window.location.origin + targetPath;
            }
          }
        });
      }
    });
  })();
})();
