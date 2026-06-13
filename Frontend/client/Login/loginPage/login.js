window.NibrasReact.run(() => {
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

  const clearUrlHash = () => {
    if (!window.location.hash) return;
    history.replaceState(
      null,
      document.title,
      window.location.pathname + window.location.search,
    );
  };

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
  const loginSubmitBtn = loginForm?.querySelector('button[type="submit"]');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const showOtpForm = (email) => {
    if (otpVerifyForm) otpVerifyForm.hidden = false;
    if (loginForm) loginForm.hidden = true;
    if (otpEmailInput && email) otpEmailInput.value = email;
    setTimeout(() => {
      otpVerifyForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      otpCodeInput?.focus();
    }, 50);
  };

  const hideOtpForm = () => {
    if (otpVerifyForm) otpVerifyForm.hidden = true;
    if (loginForm) loginForm.hidden = false;
    if (otpCodeInput) otpCodeInput.value = '';
  };

  const resolveGoogleClientId = () => {
    return String(
      window.NibrasApiConfig?.googleClientId ||
        new URLSearchParams(window.location.search).get('googleClientId') ||
        localStorage.getItem('nibras_google_client_id') ||
        window.NIBRAS_GOOGLE_CLIENT_ID ||
        '',
    ).trim();
  };

  const createGoogleTokenClient = (googleClientId, onAccessToken, onError) => {
    if (!window.google?.accounts?.oauth2?.initTokenClient) {
      return null;
    }
    return google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: 'openid email profile',
      callback: (response) => {
        if (response.error) {
          onError(
            response.error_description ||
              response.error ||
              'Google sign-in was denied or failed.',
          );
          return;
        }
        if (!response.access_token) {
          onError('Google sign-in failed. No access token returned.');
          return;
        }
        onAccessToken(response.access_token);
      },
    });
  };

  const requestGoogleAccessToken = (googleClientId, onAccessToken, onError) => {
    let tokenClient = createGoogleTokenClient(
      googleClientId,
      onAccessToken,
      onError,
    );
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: '' });
      return;
    }

    let attempts = 0;
    const waitForGoogle = () => {
      attempts += 1;
      tokenClient = createGoogleTokenClient(
        googleClientId,
        onAccessToken,
        onError,
      );
      if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: '' });
        return;
      }
      if (attempts >= 25) {
        onError(
          'Google sign-in failed to load. Check your connection and try again.',
        );
        return;
      }
      setTimeout(waitForGoogle, 200);
    };
    waitForGoogle();
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
    return (status === 403 || status === 400) && matches;
  };

  const getAdminApiBase = () =>
    window.NibrasApiConfig?.getServiceUrl?.('admin') ||
    window.NIBRAS_API_URL ||
    window.NIBRAS_BACKEND_URL ||
    adminApiBase ||
    window.location.origin;

  const completeGoogleLogin = async (accessToken, onError) => {
    try {
      const apiBase = getAdminApiBase();
      const response = await fetch(`${apiBase}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const payload = await response.json();
      const authData = extractAuthData(payload);
      if (authData.accessToken) {
        setAuthData(authData);
        sessionStorage.removeItem('google_access_token');
        redirectToDashboard();
        return;
      }
      onError('Google sign-in failed. Please try again.');
    } catch (e) {
      console.error('Google auth failed:', e);
      onError('Google sign-in failed. Please try again.');
    }
  };

  const handleStoredAuthErrors = () => {
    const err = sessionStorage.getItem('google_auth_error');
    if (!err) return;
    sessionStorage.removeItem('google_auth_error');
    setNotice(err, 'error');
  };

  const handleAuthQueryParams = () => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const googleAuth = params.get('google_auth');
    const googleMessage = params.get('message');

    if (error === 'google_auth_failed') {
      setNotice('Google sign-in failed. Please try again.', 'error');
      return;
    }

    if (googleAuth === 'error') {
      setNotice(
        googleMessage
          ? decodeURIComponent(googleMessage)
          : 'Google sign-in was denied or failed.',
        'error',
      );
      return;
    }

    if (googleAuth === 'success') {
      const token = sessionStorage.getItem('google_access_token');
      if (token) {
        setNotice('Completing Google sign-in...', 'info');
        completeGoogleLogin(token, (msg) => setNotice(msg, 'error'));
      }
    }
  };

  const handleOAuthHashRedirect = () => {
    const hash = window.location.hash;
    if (!hash || hash.length <= 1) return;

    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    const state = params.get('state');
    const error = params.get('error');

    if (!accessToken && !error) return;

    clearUrlHash();

    if (error) {
      const desc =
        params.get('error_description') ||
        'Google sign-in was denied or failed.';
      setNotice(desc, 'error');
      return;
    }

    const savedGoogleState = sessionStorage.getItem('google_oauth_state');
    if (!accessToken || !state || state !== savedGoogleState) {
      setNotice('Invalid OAuth state. Please try again.', 'error');
      return;
    }

    sessionStorage.removeItem('google_oauth_state');
    setNotice('Completing Google sign-in...', 'info');
    completeGoogleLogin(accessToken, (msg) => setNotice(msg, 'error'));
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

  handleStoredAuthErrors();
  handleAuthQueryParams();
  handleOAuthHashRedirect();

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setNotice('');

      const email = String(emailInput?.value || '')
        .trim()
        .toLowerCase();
      const password = String(passwordInput?.value || '');
      if (!emailRegex.test(email)) {
        setNotice('Please enter a valid email address.', 'error');
        return;
      }

      const authService = window.NibrasServices?.authService;
      if (!authService) {
        setNotice(
          'Authentication service failed to load. Refresh the page.',
          'error',
        );
        return;
      }

      const originalBtnText = loginSubmitBtn?.textContent || 'Login now';
      if (loginSubmitBtn) {
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = 'Logging in…';
      }

      try {
        const payload = await authService.login(email, password);

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

        if (shouldShowOtpAssist(message, errorStatus)) {
          showOtpForm(email);
          setNotice(
            'Your account requires OTP verification. Enter the 6-digit code sent to your email.',
            'error',
          );
        } else {
          setNotice(message, 'error');
        }
      } finally {
        if (loginSubmitBtn) {
          loginSubmitBtn.disabled = false;
          loginSubmitBtn.textContent = originalBtnText;
        }
      }
    });
  }

  document.getElementById('otpBackLink')?.addEventListener('click', (event) => {
    event.preventDefault();
    hideOtpForm();
    setNotice('');
  });

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
      if (!emailRegex.test(email)) {
        setNotice('Please enter a valid email address.', 'error');
        return;
      }

      const authService = window.NibrasServices?.authService;
      if (!authService) {
        setNotice(
          'Authentication service failed to load. Refresh the page.',
          'error',
        );
        return;
      }

      try {
        const payload = await authService.verifyOtp(email, otp);

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
      setNotice(
        'Google sign-in is unavailable: missing Google Client ID configuration.',
        'error',
      );
      return;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'google-btn';
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continue with Google';
    btn.onclick = () => {
      requestGoogleAccessToken(
        googleClientId,
        (accessToken) => {
          setNotice('Completing Google sign-in...', 'info');
          completeGoogleLogin(accessToken, (msg) => setNotice(msg, 'error'));
        },
        (message) => setNotice(message, 'error'),
      );
    };
    googleSignInContainer.appendChild(btn);
  };

  initializeGoogleAuth();
});
