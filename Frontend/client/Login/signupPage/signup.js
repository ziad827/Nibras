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
      window.location.href = 'signup.html';
      return;
    }

    const savedState = sessionStorage.getItem('google_oauth_state');
    if (!accessToken || !state || state !== savedState) {
      sessionStorage.setItem(
        'google_auth_error',
        'Invalid OAuth state. Please try again.',
      );
      window.location.hash = '';
      window.location.href = 'signup.html';
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
      window.location.href = 'signup.html?error=google_auth_failed';
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
      window.location.href = 'signup.html?error=microsoft_auth_failed';
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

  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn?.querySelector('i');
  if (themeIcon) {
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      themeIcon.className = 'fa-solid fa-sun';
    } else {
      themeIcon.className = 'fa-solid fa-moon';
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
      if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
      return;
    }
    html.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
  });

  window.togglePass = function (inputId, icon) {
    const input = document.getElementById(inputId);
    if (!input || !icon) return;
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
      return;
    }
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  };

  const signupNotice = document.getElementById('signupNotice');
  const signupForm = document.getElementById('signupForm');
  const otpForm = document.getElementById('otpForm');
  const otpBackBtn = document.getElementById('otpBackBtn');
  const nameInput = document.getElementById('nameInput');
  const emailInput = document.getElementById('emailInput');
  const passInput = document.getElementById('passInput');
  const confPassInput = document.getElementById('confPassInput');
  const otpEmailInput = document.getElementById('otpEmailInput');
  const otpCodeInput = document.getElementById('otpCodeInput');
  const otpEmailLabel = document.getElementById('otpEmailLabel');
  const googleSignInContainer = document.getElementById(
    'googleSignInContainer',
  );
  const googleAuthStatus = document.getElementById('googleAuthStatus');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (sessionStorage.getItem('google_auth_error')) {
    const err = sessionStorage.getItem('google_auth_error');
    sessionStorage.removeItem('google_auth_error');
    setNotice(err, 'error');
  }

  const setNotice = (message, tone = 'info') => {
    if (!signupNotice) return;
    if (!message) {
      signupNotice.hidden = true;
      signupNotice.textContent = '';
      signupNotice.className = 'auth-notice';
      return;
    }
    signupNotice.hidden = false;
    signupNotice.textContent = String(message);
    signupNotice.className =
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
    const path = String(window.location.pathname || '').toLowerCase();
    const isInstructorSignup = path.includes('signupinstructor');
    if (isInstructorSignup) {
      window.location.href = './signupInstructor/department/department.html';
      return;
    }
    try {
      var u = JSON.parse(localStorage.getItem('user'));
      var role = String(u?.role?.name || u?.role || '').toLowerCase();
      var instructorStatus = String(u?.instructorStatus || '').toLowerCase();
      if (instructorStatus === 'pending') {
        window.location.href =
          './signupInstructor/Pending%20Instructor/pending.html';
        return;
      }
      window.location.href =
        role === 'instructor'
          ? '../../Dashboard/instructor-dashboard.html'
          : '../../Dashboard/dashboard.html';
    } catch (_) {
      window.location.href = '../../Dashboard/dashboard.html';
    }
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

  const handleAuthQueryParams = () => {
    const params = new URLSearchParams(window.location.search);
    const googleAuth = params.get('google_auth');
    const googleMessage = params.get('message');

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

  handleAuthQueryParams();

  const setOtpMode = (enabled, email = '') => {
    if (signupForm) signupForm.hidden = enabled;
    if (otpForm) otpForm.hidden = !enabled;
    if (!enabled) return;

    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();
    if (otpEmailInput) otpEmailInput.value = normalizedEmail;
    if (otpEmailLabel)
      otpEmailLabel.textContent = normalizedEmail || 'your email';
    if (normalizedEmail)
      localStorage.setItem('pendingVerificationEmail', normalizedEmail);
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

  const resolveUserRole = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('signupinstructor')) return 'instructor';
    return 'student';
  };

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setNotice('');

      const name = String(nameInput?.value || '').trim();
      const email = String(emailInput?.value || '')
        .trim()
        .toLowerCase();
      const password = String(passInput?.value || '');
      const confirmPassword = String(confPassInput?.value || '');
      const role = resolveUserRole();

      if (!name) {
        setNotice('Please enter your name.', 'error');
        return;
      }
      if (!email) {
        setNotice('Please enter your email.', 'error');
        return;
      }
      if (!emailRegex.test(email)) {
        setNotice('Please enter a valid email address.', 'error');
        return;
      }
      if (password.length < 6) {
        setNotice('Password must be at least 6 characters.', 'error');
        return;
      }
      if (password !== confirmPassword) {
        setNotice('Passwords do not match.', 'error');
        return;
      }

      try {
        const payload = await window.NibrasServices.authService.register({
          name,
          email,
          password,
          role,
        });

        setOtpMode(true, email);
        setNotice(
          (payload?.message ||
            'Registration successful. Enter the OTP sent to your email.') +
            ' If you do not see it, check Spam/Promotions.',
          'success',
        );
      } catch (error) {
        const message =
          error?.payload?.message ||
          error?.message ||
          'Registration failed. Please try again.';
        setNotice(message, 'error');
        console.error('[SIGNUP ERROR]', error);
      }
    });
  }

  if (otpForm) {
    otpForm.addEventListener('submit', async (event) => {
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

      try {
        const payload = await window.NibrasServices.authService.verifyOtp(
          email,
          otp,
        );

        applyAuthenticatedSession(payload);
        localStorage.removeItem('pendingVerificationEmail');
        setNotice('OTP verified successfully. Redirecting...', 'success');
        redirectToDashboard();
      } catch (error) {
        const message =
          error?.payload?.message ||
          error?.message ||
          'OTP verification failed. Check the code and try again.';
        setNotice(message, 'error');
        console.error('[OTP ERROR]', error);
      }
    });
  }

  otpBackBtn?.addEventListener('click', () => {
    setOtpMode(false);
    setNotice('');
    localStorage.removeItem('pendingVerificationEmail');
  });

  const pendingEmail = String(
    localStorage.getItem('pendingVerificationEmail') || '',
  )
    .trim()
    .toLowerCase();
  if (pendingEmail) {
    setOtpMode(true, pendingEmail);
    setNotice('Complete OTP verification to activate your account.', 'info');
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
      requestGoogleAccessToken(
        googleClientId,
        (accessToken) => {
          setNotice('Completing Google sign-in...', 'info');
          completeGoogleLogin(accessToken, (msg) => setNotice(msg, 'error'));
        },
        (message) => setNotice(message, 'error'),
      );
    };
    buttonContainer.appendChild(btn);

    if (sessionStorage.getItem('google_auth_error')) {
      const err = sessionStorage.getItem('google_auth_error');
      sessionStorage.removeItem('google_auth_error');
      setNotice(err, 'error');
    }

    console.log('Google button rendered successfully');
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
