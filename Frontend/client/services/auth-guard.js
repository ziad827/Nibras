(function () {
  'use strict';

  var script = document.currentScript;
  var loginPage =
    script.getAttribute('data-login') || '../../Login/loginPage/login.html';
  var apiBase =
    script.getAttribute('data-api') ||
    'https://nibras-backend.up.railway.app/api';

  function redirectToLogin() {
    window.location.replace(loginPage);
  }

  function clearAuth() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
    } catch (_) {}
  }

  function showNotAuthorized() {
    var overlay = document.createElement('div');
    overlay.id = 'nibras-auth-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
    overlay.innerHTML =
      '<div style="background:#1e1e2e;border-radius:12px;padding:2rem 3rem;text-align:center;max-width:420px;box-shadow:0 8px 32px rgba(0,0,0,0.4);">' +
      '<div style="font-size:3rem;margin-bottom:1rem;">&#128274;</div>' +
      '<h2 style="color:#fff;margin:0 0 0.5rem;">Access Denied</h2>' +
      '<p style="color:#a0a0b0;margin:0 0 1.5rem;line-height:1.5;">You do not have permission to access this page. Contact your administrator if you believe this is a mistake.</p>' +
      '<button onclick="window.location.replace(\'' +
      loginPage +
      '\')" style="background:#6c5ce7;color:#fff;border:none;border-radius:8px;padding:0.75rem 2rem;cursor:pointer;font-size:1rem;">Go to Login</button>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  function getToken() {
    try {
      var keys = ['token', 'accessToken', 'authToken', 'nibras.webSession'];
      for (var i = 0; i < keys.length; i++) {
        var t = localStorage.getItem(keys[i]);
        if (t && typeof t === 'string' && t.trim())
          return t.trim().replace(/^bearer\s+/i, '');
      }
      var s = sessionStorage.getItem('token');
      if (s && typeof s === 'string' && s.trim())
        return s.trim().replace(/^bearer\s+/i, '');
    } catch (_) {}
    return null;
  }

  function getStoredUser() {
    try {
      var raw = localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  var ADMIN_ROLES = ['super-admin', 'admin'];
  var ADMIN_PATHS = ['/Admin/', '/admin/'];

  var currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  var isAdminPage = ADMIN_PATHS.some(function (p) {
    return currentPath.indexOf(p) !== -1;
  });

  var token = getToken();

  if (!token) {
    redirectToLogin();
    return;
  }

  if (isAdminPage) {
    var storedUser = getStoredUser();
    if (storedUser) {
      var role = String(
        storedUser.role?.name || storedUser.role || '',
      ).toLowerCase();
      if (role && ADMIN_ROLES.indexOf(role) === -1) {
        showNotAuthorized();
        return;
      }
    }
  }

  // Background validation — page renders immediately, redirects only if 401
  var xhr = new XMLHttpRequest();
  xhr.open('GET', apiBase.replace(/\/+$/, '') + '/auth/me', true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.timeout = 10000;

  xhr.onload = function () {
    if (xhr.status === 200) {
      try {
        var payload = JSON.parse(xhr.responseText);
        var user =
          payload?.user || payload?.data?.user || payload?.data || null;
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          if (isAdminPage) {
            var role = String(user.role?.name || user.role || '').toLowerCase();
            if (role && ADMIN_ROLES.indexOf(role) === -1) {
              showNotAuthorized();
            }
          }
        }
      } catch (_) {}
    } else if (xhr.status === 401) {
      clearAuth();
      redirectToLogin();
    } else if (xhr.status === 403) {
      showNotAuthorized();
    }
  };

  xhr.onerror = xhr.ontimeout = function () {};

  xhr.send();
})();
