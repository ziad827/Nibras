window.NibrasReact.run(() => {
  (function handleGoogleRedirectCallback() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=')) return;

    const params = new URLSearchParams(hash.replace('#', ''));
    const accessToken = params.get('access_token');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      const desc =
        params.get('error_description') ||
        'Google sign-in was denied or failed.';
      sessionStorage.setItem('google_auth_error', desc);
      window.location.hash = '';
      window.location.href = 'login.html';
      return;
    }

    const savedState = sessionStorage.getItem('google_oauth_state');
    if (!accessToken || !state || state !== savedState) {
      sessionStorage.setItem(
        'google_auth_error',
        'Invalid OAuth state. Please try again.',
      );
      window.location.hash = '';
      window.location.href = 'login.html';
      return;
    }

    sessionStorage.removeItem('google_oauth_state');
    sessionStorage.setItem('google_access_token', accessToken);
    window.location.hash = '';

    (async () => {
      try {
        const apiBase =
          window.NibrasApiConfig?.getServiceUrl?.('admin') ||
          window.NIBRAS_API_URL ||
          window.NIBRAS_BACKEND_URL ||
          window.location.origin;
        const response = await fetch(`${apiBase}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken }),
        });
        const payload = await response.json();
        if (
          payload.tokens?.access?.token ||
          payload.data?.token ||
          payload.token
        ) {
          const authResult = {
            accessToken: null,
            refreshToken: null,
            user: null,
          };
          const data = payload.data || payload;
          const tokens = payload.tokens || {};
          authResult.accessToken =
            data.token ||
            data.accessToken ||
            payload.token ||
            tokens?.access?.token ||
            tokens?.accessToken ||
            null;
          authResult.refreshToken =
            data.refreshToken ||
            payload.refreshToken ||
            tokens?.refresh?.token ||
            tokens?.refreshToken ||
            null;
          authResult.user = data.user || payload.user || data;
          setAuthData(authResult);
          sessionStorage.removeItem('google_access_token');
          (function () {
            try {
              var _u = JSON.parse(localStorage.getItem('user'));
              var _r = String(_u?.role?.name || _u?.role || '').toLowerCase();
              window.location.href =
                _r === 'instructor'
                  ? '../../Dashboard/instructor-dashboard.html'
                  : _r === 'admin' || _r === 'super-admin'
                    ? '../../Admin/Dashboard/dashboard.html'
                    : '../../Dashboard/dashboard.html';
            } catch (_) {
              window.location.href = '../../Dashboard/dashboard.html';
            }
          })();
          return;
        }
      } catch (e) {
        console.error('Google auth failed:', e);
      }
      window.location.href = 'login.html?error=google_auth_failed';
    })();
  })();

  (function handleMicrosoftRedirectCallback() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token=')) return;

    const params = new URLSearchParams(hash.replace('#', ''));
    const accessToken = params.get('access_token');
    const state = params.get('state');
    const error = params.get('error');
    const savedState = sessionStorage.getItem('microsoft_oauth_state');

    if (error || !accessToken || !state || state !== savedState) {
      sessionStorage.removeItem('microsoft_oauth_state');
      window.location.hash = '';
      return;
    }

    sessionStorage.removeItem('microsoft_oauth_state');
    sessionStorage.setItem('microsoft_access_token', accessToken);
    window.location.hash = '';

    (async () => {
      try {
        const apiBase =
          window.NibrasApiConfig?.getServiceUrl?.('admin') ||
          window.NIBRAS_API_URL ||
          window.NIBRAS_BACKEND_URL ||
          window.location.origin;
        const response = await fetch(`${apiBase}/auth/microsoft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken }),
        });
        const payload = await response.json();
        if (
          payload.tokens?.access?.token ||
          payload.data?.token ||
          payload.token
        ) {
          const authResult = {
            accessToken: null,
            refreshToken: null,
            user: null,
          };
          const data = payload.data || payload;
          const tokens = payload.tokens || {};
          authResult.accessToken =
            data.token ||
            data.accessToken ||
            payload.token ||
            tokens?.access?.token ||
            tokens?.accessToken ||
            null;
          authResult.refreshToken =
            data.refreshToken ||
            payload.refreshToken ||
            tokens?.refresh?.token ||
            tokens?.refreshToken ||
            null;
          authResult.user = data.user || payload.user || data;
          setAuthData(authResult);
          sessionStorage.removeItem('microsoft_access_token');
          (function () {
            try {
              var _u = JSON.parse(localStorage.getItem('user'));
              var _r = String(_u?.role?.name || _u?.role || '').toLowerCase();
              window.location.href =
                _r === 'instructor'
                  ? '../../Dashboard/instructor-dashboard.html'
                  : _r === 'admin' || _r === 'super-admin'
                    ? '../../Admin/Dashboard/dashboard.html'
                    : '../../Dashboard/dashboard.html';
            } catch (_) {
              window.location.href = '../../Dashboard/dashboard.html';
            }
          })();
          return;
        }
      } catch (e) {
        console.error('Microsoft auth failed:', e);
      }
      window.location.href = 'login.html?error=microsoft_auth_failed';
    })();
  })();

  const shared = window.NibrasShared || {};
  const adminApiBase =
    (typeof shared.resolveServiceUrl === 'function'
      ? shared.resolveServiceUrl('admin')
      : null) ||
    window.NibrasApi?.resolveServiceUrl?.('admin') ||
    window.NibrasApiConfig?.getServiceUrl?.('admin') ||
    window.NIBRAS_API_URL ||
    window.NIBRAS_BACKEND_URL ||
    (/^https?:/i.test(window.location?.origin || '')
      ? window.location.origin.replace(/\/+$/, '')
      : '');

  const requestJson = shared.apiFetch
    ? shared.apiFetch.bind(shared)
    : async (path, options = {}) => {
        const response = await fetch(`${adminApiBase}${path}`, {
          method: options.method || 'GET',
          headers: Object.assign(
            { 'Content-Type': 'application/json' },
            options.headers || {},
          ),
          body: options.body,
        });
        const payload = await response.json();
        if (!response.ok) {
          const error = new Error(
            payload?.message || `Request failed (${response.status})`,
          );
          error.status = response.status;
          error.payload = payload;
          throw error;
        }
        return payload;
      };

  const extractAuthData = (payload) => {
    const data = payload?.data || payload || {};
    const tokens = payload?.tokens || data?.tokens || {};
    const accessToken =
      data?.token ||
      data?.accessToken ||
      payload?.token ||
      payload?.accessToken ||
      tokens?.access?.token ||
      tokens?.accessToken ||
      null;
    const refreshToken =
      data?.refreshToken ||
      payload?.refreshToken ||
      tokens?.refresh?.token ||
      tokens?.refreshToken ||
      null;
    const user =
      data?.user ||
      payload?.user ||
      (data && data._id ? data : null) ||
      (payload && payload._id ? payload : null) ||
      null;
    return { accessToken, refreshToken, user };
  };

  const setAuthData = ({ accessToken, refreshToken, user }) => {
    if (shared.auth?.setAuth) {
      shared.auth.setAuth({ accessToken, refreshToken, user });
      return;
    }
    if (accessToken) window.localStorage.setItem('token', accessToken);
    if (refreshToken) window.localStorage.setItem('refreshToken', refreshToken);
    if (user) window.localStorage.setItem('user', JSON.stringify(user));
  };

  const clearAuthData = () => {
    if (shared.auth?.clearAuth) {
      shared.auth.clearAuth();
      return;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn?.querySelector('i');
  if (themeIcon) {
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      themeIcon.className = 'fa-regular fa-sun';
    } else {
      themeIcon.className = 'fa-regular fa-moon';
    }
  }
  themeBtn?.addEventListener('click', () => {
    themeBtn.classList.add('rotating');
    setTimeout(() => themeBtn.classList.remove('rotating'), 400);
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    if (current === 'light') {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      if (themeIcon) themeIcon.className = 'fa-regular fa-sun';
      return;
    }
    html.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
  });

  window.togglePassword = function () {
    const passwordInput = document.getElementById('passwordInput');
    const icon = document.querySelector('.toggle-password');
    if (!passwordInput || !icon) return;

    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
      return;
    }
    passwordInput.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  };

  if (sessionStorage.getItem('google_auth_error')) {
    const err = sessionStorage.getItem('google_auth_error');
    sessionStorage.removeItem('google_auth_error');
  }

  const loginNotice = document.getElementById('loginNotice');
  const loginForm = document.getElementById('loginForm');
  const otpVerifyForm = document.getElementById('otpVerifyForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const otpEmailInput = document.getElementById('otpEmailInput');
  const otpCodeInput = document.getElementById('otpCodeInput');
  const googleSignInContainer = document.getElementById(
    'googleSignInContainer',
  );
  const googleAuthStatus = document.getElementById('googleAuthStatus');
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

  const resolveGoogleClientId = () => {
    return String(
      window.NibrasApiConfig?.googleClientId ||
        new URLSearchParams(window.location.search).get('googleClientId') ||
        localStorage.getItem('nibras_google_client_id') ||
        window.NIBRAS_GOOGLE_CLIENT_ID ||
        '',
    ).trim();
  };

  const setNotice = (message, tone = 'info') => {
    if (!loginNotice) return;
    if (!message) {
      loginNotice.hidden = true;
      loginNotice.textContent = '';
      loginNotice.className = 'auth-notice';
      return;
    }
    loginNotice.hidden = false;
    loginNotice.textContent = String(message);
    loginNotice.className =
      tone === 'error'
        ? 'auth-notice error'
        : tone === 'success'
          ? 'auth-notice success'
          : 'auth-notice';
  };

  const setGoogleStatus = (message, tone = 'info') => {
    if (!googleAuthStatus) return;
    if (!message) {
      googleAuthStatus.hidden = true;
      googleAuthStatus.textContent = '';
      googleAuthStatus.style.color = '';
      return;
    }
    googleAuthStatus.hidden = false;
    googleAuthStatus.textContent = String(message);
    if (tone === 'error') {
      googleAuthStatus.style.color = '#ef4444';
      return;
    }
    if (tone === 'success') {
      googleAuthStatus.style.color = '#10b981';
      return;
    }
    googleAuthStatus.style.color = '';
  };

  const setGithubStatus = (message, tone = 'info') => {
    const githubAuthStatus = document.getElementById('githubAuthStatus');
    if (!githubAuthStatus) return;
    if (!message) {
      githubAuthStatus.hidden = true;
      githubAuthStatus.textContent = '';
      githubAuthStatus.style.color = '';
      return;
    }
    githubAuthStatus.hidden = false;
    githubAuthStatus.textContent = String(message);
    if (tone === 'error') {
      githubAuthStatus.style.color = '#ef4444';
      return;
    }
    if (tone === 'success') {
      githubAuthStatus.style.color = '#10b981';
      return;
    }
    githubAuthStatus.style.color = '';
  };

  const shouldShowOtpAssist = (errorMessage, status) => {
    const message = String(errorMessage || '').toLowerCase();
    const unverifiedKeywords = [
      'not verified',
      'verify your otp',
      'otp',
      'verification pending',
      'pending verification',
    ];
    const matches = unverifiedKeywords.some((keyword) =>
      message.includes(keyword),
    );
    console.log('[LOGIN DEBUG] OTP check:', { status, message, matches });
    return (status === 403 || status === 400) && matches;
  };

  if (sessionStorage.getItem('google_auth_error')) {
    const err = sessionStorage.getItem('google_auth_error');
    sessionStorage.removeItem('google_auth_error');
    (function showGoogleError() {
      if (typeof loginNotice !== 'undefined' && loginNotice) {
        loginNotice.hidden = false;
        loginNotice.textContent = err;
        loginNotice.className = 'auth-notice error';
      }
    })();
  }

  const applyAuthenticatedSession = (payload) => {
    const authData = shared.auth?.extractAuth
      ? shared.auth.extractAuth(payload)
      : extractAuthData(payload);
    const resolvedUser =
      authData.user || payload?.data || payload?.user || null;

    if (!authData.accessToken) {
      throw new Error(
        'Authentication succeeded but no access token was returned.',
      );
    }

    setAuthData({
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      user: resolvedUser,
    });
  };

  const redirectToDashboard = () => {
    try {
      var u = JSON.parse(localStorage.getItem('user'));
      var role = String(u?.role?.name || u?.role || '').toLowerCase();
      if (role === 'instructor')
        window.location.href = '../../Dashboard/instructor-dashboard.html';
      else if (role === 'admin' || role === 'super-admin')
        window.location.href = '../../Admin/Dashboard/dashboard.html';
      else window.location.href = '../../Dashboard/dashboard.html';
    } catch (_) {
      window.location.href = '../../Dashboard/dashboard.html';
    }
  };

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setNotice('');

      const email = String(emailInput?.value || '')
        .trim()
        .toLowerCase();
      const password = String(passwordInput?.value || '');
      if (!gmailRegex.test(email)) {
        setNotice(
          'Use a valid @gmail.com address. This backend only supports Gmail accounts.',
          'error',
        );
        return;
      }

      try {
        const payload = await window.NibrasServices.authService.login(
          email,
          password,
        );

        applyAuthenticatedSession(payload);
        setNotice('Login successful. Redirecting...', 'success');
        redirectToDashboard();
      } catch (error) {
        const message =
          error?.payload?.message ||
          error?.message ||
          'Login failed. Please try again.';
        const errorStatus = Number(
          error?.status || error?.payload?.statusCode || 0,
        );
        console.log('[LOGIN DEBUG] Login error:', {
          message,
          errorStatus,
          error,
        });

        if (shouldShowOtpAssist(message, errorStatus)) {
          if (otpVerifyForm) {
            otpVerifyForm.hidden = false;
            setTimeout(() => {
              otpVerifyForm.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }, 50);
          }
          if (otpEmailInput && email) otpEmailInput.value = email;
          setNotice(
            'Your account requires OTP verification. Enter the 6-digit code sent to your email.',
            'error',
          );
          setTimeout(() => {
            if (otpCodeInput) otpCodeInput.focus();
          }, 100);
        } else {
          setNotice(message, 'error');
        }
      }
    });
  }

  if (otpVerifyForm) {
    otpVerifyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setNotice('');

      const email = String(otpEmailInput?.value || '')
        .trim()
        .toLowerCase();
      const otp = String(otpCodeInput?.value || '').trim();
      if (!email || !otp) {
        setNotice('Please provide both email and OTP code.', 'error');
        return;
      }
      if (!gmailRegex.test(email)) {
        setNotice(
          'OTP verification requires a valid @gmail.com address.',
          'error',
        );
        return;
      }

      try {
        const payload = await window.NibrasServices.authService.verifyOtp(
          email,
          otp,
        );

        applyAuthenticatedSession(payload);
        setNotice('OTP verified successfully. Redirecting...', 'success');
        redirectToDashboard();
      } catch (error) {
        const message =
          error?.payload?.message ||
          error?.message ||
          'OTP verification failed. Check the code and try again.';
        setNotice(message, 'error');
        console.error('[LOGIN OTP ERROR]', error);
      }
    });
  }

  const initializeGoogleAuth = () => {
    if (!googleSignInContainer) return;

    const googleClientId = resolveGoogleClientId();
    if (!googleClientId) {
      googleSignInContainer.hidden = true;
      setGoogleStatus(
        'Google sign-in is unavailable: missing Google Client ID runtime configuration.',
        'error',
      );
      return;
    }

    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '20px';
    googleSignInContainer.appendChild(buttonContainer);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'google-btn';
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continue with Google';
    btn.style.cssText =
      'display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 24px;background:#fff;border:1px solid #dadce0;border-radius:4px;font-family:Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:500;color:#3c4043;cursor:pointer;width:100%;max-width:320px;transition:background .2s,box-shadow .2s;';
    btn.onmouseenter = () =>
      (btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)');
    btn.onmouseleave = () => (btn.style.boxShadow = 'none');
    btn.onclick = () => {
      const state =
        Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('google_oauth_state', state);

      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      const params = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: 'email profile openid',
        include_granted_scopes: 'true',
        state: state,
      });

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    };
    buttonContainer.appendChild(btn);

    if (sessionStorage.getItem('google_auth_error')) {
      const err = sessionStorage.getItem('google_auth_error');
      sessionStorage.removeItem('google_auth_error');
      setNotice(err, 'error');
    }

    console.log('Google button rendered');
    setGoogleStatus('');
  };

  const resolveMicrosoftClientId = () => {
    return String(
      window.NibrasApiConfig?.microsoftClientId ||
        new URLSearchParams(window.location.search).get('microsoftClientId') ||
        localStorage.getItem('nibras_microsoft_client_id') ||
        window.NIBRAS_MICROSOFT_CLIENT_ID ||
        '',
    ).trim();
  };

  const setMicrosoftStatus = (message, tone = 'info') => {
    const msStatus = document.getElementById('microsoftAuthStatus');
    if (!msStatus) return;
    if (!message) {
      msStatus.hidden = true;
      msStatus.textContent = '';
      msStatus.style.color = '';
      return;
    }
    msStatus.hidden = false;
    msStatus.textContent = String(message);
    if (tone === 'error') {
      msStatus.style.color = '#ef4444';
      return;
    }
    if (tone === 'success') {
      msStatus.style.color = '#10b981';
      return;
    }
    msStatus.style.color = '';
  };

  const initializeMicrosoftAuth = () => {
    const msContainer = document.getElementById('microsoftSignInContainer');
    if (!msContainer) return;

    const microsoftClientId = resolveMicrosoftClientId();
    if (!microsoftClientId) {
      msContainer.hidden = true;
      setMicrosoftStatus(
        'Microsoft sign-in is unavailable: missing Client ID.',
        'error',
      );
      return;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'microsoft-btn';
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 23 23"><rect x="1" y="1" width="10" height="10" fill="#f25022"/><rect x="12" y="1" width="10" height="10" fill="#7fba00"/><rect x="1" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/></svg> Continue with Microsoft';
    btn.style.cssText =
      'display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 24px;background:#fff;border:1px solid #dadce0;border-radius:4px;font-family:Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:500;color:#3c4043;cursor:pointer;width:100%;max-width:320px;transition:background .2s,box-shadow .2s;';
    btn.onmouseenter = () =>
      (btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)');
    btn.onmouseleave = () => (btn.style.boxShadow = 'none');
    btn.onclick = () => {
      const state =
        Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('microsoft_oauth_state', state);

      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      const params = new URLSearchParams({
        client_id: microsoftClientId,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: 'openid email profile',
        state: state,
      });

      window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    };
    msContainer.appendChild(btn);

    if (sessionStorage.getItem('microsoft_auth_error')) {
      const err = sessionStorage.getItem('microsoft_auth_error');
      sessionStorage.removeItem('microsoft_auth_error');
      setNotice(err, 'error');
    }

    setMicrosoftStatus('');
  };

  initializeGoogleAuth();
  initializeMicrosoftAuth();
});
