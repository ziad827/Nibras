window.NibrasReact.run(() => {
  // --- 1. SIDEBAR LOGIC ---
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.forEach((n) => n.classList.remove('active'));
      link.classList.add('active');
    });
  });

  const apiFetch = window.NibrasShared?.apiFetch;
  const resolveServiceUrl =
    window.NibrasApiConfig?.getServiceUrl?.bind(window.NibrasApiConfig) ||
    window.NibrasShared?.resolveServiceUrl ||
    (() => null);

  const adminApiBase = String(
    resolveServiceUrl('admin') || 'https://nibras-backend.up.railway.app/api',
  ).replace(/\/+$/, '');
  const trackingApiBase = String(
    resolveServiceUrl('tracking') ||
      'https://nibras-backend.up.railway.app/api',
  ).replace(/\/+$/, '');
  function loadLevel() {
    return localStorage.getItem('pref-level') || settingsData.preferences.level;
  }

  function saveLevel(level) {
    localStorage.setItem('pref-level', level);
  }

  const githubServiceCandidates = ['tracking', 'admin'];
  const githubDisconnectPathCandidates = [
    '/v1/github/oauth/disconnect',
    '/v1/github/disconnect',
  ];

  const btnConnectGitHub = document.getElementById('btn-connect-github');
  const btnInstallGitHubApp = document.getElementById('btn-install-github-app');
  const btnDisconnectGitHub = document.getElementById('btn-disconnect-github');

  function getBaseForService(service) {
    if (service === 'tracking') return trackingApiBase;
    return adminApiBase;
  }

  function isCompatibilityStatus(status) {
    return status === 404 || status === 405 || status === 501;
  }

  function buildGithubServiceCandidates() {
    const unique = [];
    githubServiceCandidates.forEach((service) => {
      const base = getBaseForService(service);
      if (!base) return;
      const duplicate = unique.some((entry) => entry.base === base);
      if (!duplicate) {
        unique.push({ service, base });
      }
    });
    return unique;
  }

  async function githubApiRequestWithFallback(
    path,
    options = {},
    fallbackStatuses = [404, 405, 501],
  ) {
    if (!apiFetch) {
      throw new Error('API fetch utility is unavailable.');
    }
    let lastError = null;
    const candidates = buildGithubServiceCandidates();
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      try {
        return await apiFetch(
          path,
          Object.assign({}, options, {
            service: candidate.service,
            auth: options.auth !== false,
          }),
        );
      } catch (error) {
        const status = Number(error?.status || 0);
        const isLastCandidate = i === candidates.length - 1;
        const shouldFallback = fallbackStatuses.includes(status);
        lastError = error;
        if (!shouldFallback || isLastCandidate) {
          throw error;
        }
      }
    }
    throw lastError || new Error(`No compatible endpoint found for ${path}`);
  }

  async function resolveGitHubConnectTarget() {
    if (typeof fetch !== 'function') {
      return { base: adminApiBase, path: '/v1/github/oauth/login' };
    }

    const candidates = buildGithubServiceCandidates();
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      try {
        const response = await fetch(`${candidate.base}/v1/github/config`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (response.status !== 404) {
          return { base: candidate.base, path: '/v1/github/oauth/start' };
        }
      } catch (_) {
        // Probe failed, continue fallback chain.
      }
    }

    return { base: adminApiBase, path: '/v1/github/oauth/login' };
  }

  async function callFirstAvailableGithubDisconnectPath() {
    let lastError = null;
    const serviceCandidates = buildGithubServiceCandidates();
    for (let s = 0; s < serviceCandidates.length; s += 1) {
      const candidateService = serviceCandidates[s];
      for (let p = 0; p < githubDisconnectPathCandidates.length; p += 1) {
        const path = githubDisconnectPathCandidates[p];
        try {
          await apiFetch(path, {
            service: candidateService.service,
            method: 'POST',
            auth: true,
          });
          return;
        } catch (error) {
          const status = Number(error?.status || 0);
          lastError = error;
          if (!isCompatibilityStatus(status)) {
            throw error;
          }
        }
      }
    }
    throw lastError || new Error('Failed to disconnect GitHub account.');
  }

  async function startGitHubAppInstallFlow() {
    const payload = await githubApiRequestWithFallback(
      '/v1/github/install-url',
      {
        method: 'GET',
        auth: true,
      },
    );
    const installUrl = String(payload?.installUrl || '').trim();
    if (!installUrl) {
      throw new Error('Install URL is missing from backend response.');
    }
    window.location.href = installUrl;
  }

  function setGitHubStatusMessage(message, tone = 'neutral') {
    const statusText = document.getElementById('github-status-text');
    if (!statusText) return;
    statusText.textContent = String(message || '');
    if (tone === 'error') {
      statusText.style.color = 'var(--tag-red-text, #dc2626)';
      return;
    }
    if (tone === 'success') {
      statusText.style.color = 'var(--accent-blue, #2563eb)';
      return;
    }
    statusText.style.color = '';
  }

  async function handleGitHubSetupCompletionFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const installationId = params.get('installation_id');
    if (!installationId) return;

    const stateToken = params.get('state') || undefined;
    try {
      await githubApiRequestWithFallback('/v1/github/setup/complete', {
        method: 'POST',
        auth: true,
        body: {
          installationId,
          state: stateToken,
        },
      });
      setGitHubStatusMessage(
        'GitHub App installation linked successfully.',
        'success',
      );
    } catch (error) {
      setGitHubStatusMessage(
        error?.message || 'Could not complete GitHub App setup.',
        'error',
      );
    } finally {
      params.delete('installation_id');
      params.delete('state');
      params.delete('setup_action');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash || ''}`;
      window.history.replaceState({}, document.title, nextUrl);
    }
  }

  // --- GITHUB BUTTON ACTIONS ---
  if (btnConnectGitHub) {
    btnConnectGitHub.addEventListener('click', async () => {
      const originalText = btnConnectGitHub.innerHTML;
      btnConnectGitHub.disabled = true;
      btnConnectGitHub.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';

      try {
        const target = await resolveGitHubConnectTarget();
        if (target.path === '/v1/github/oauth/start') {
          const returnTo = window.location.href;
          window.location.href = `${target.base}${target.path}?return_to=${encodeURIComponent(returnTo)}`;
          return;
        }
        window.location.href = `${target.base}${target.path}`;
      } catch (err) {
        alert(
          'Could not start GitHub connection: ' +
            (err?.message || 'Unknown error'),
        );
        btnConnectGitHub.disabled = false;
        btnConnectGitHub.innerHTML = originalText;
      }
    });
  }

  if (btnInstallGitHubApp) {
    btnInstallGitHubApp.addEventListener('click', async () => {
      const originalText = btnInstallGitHubApp.innerHTML;
      btnInstallGitHubApp.disabled = true;
      btnInstallGitHubApp.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Opening...';
      try {
        await startGitHubAppInstallFlow();
      } catch (error) {
        alert(
          'Could not start GitHub App installation: ' +
            (error?.message || 'Unknown error'),
        );
        btnInstallGitHubApp.disabled = false;
        btnInstallGitHubApp.innerHTML = originalText;
      }
    });
  }

  if (btnDisconnectGitHub) {
    btnDisconnectGitHub.addEventListener('click', async () => {
      if (
        !confirm(
          'Are you sure you want to disconnect your GitHub account? Automated grading will be disabled.',
        )
      )
        return;
      if (!apiFetch) {
        alert(
          'Disconnect is unavailable because API utilities are not loaded on this page.',
        );
        return;
      }
      try {
        await callFirstAvailableGithubDisconnectPath();
        location.reload();
      } catch (err) {
        if (Number(err?.status || 0) === 404) {
          alert(
            'Disconnect is not supported by the active backend integration.',
          );
          return;
        }
        alert('Failed to disconnect: ' + (err?.message || 'Unknown error'));
      }
    });
  }

  // --- 2. FETCH USER PROFILE FROM API ---
  async function loadUserProfile() {
    try {
      const cachedUser = JSON.parse(localStorage.getItem('user'));
      if (
        cachedUser &&
        (cachedUser.name || cachedUser.username || cachedUser.email)
      ) {
        applyProfileToUI(cachedUser);
      }
    } catch (_) {}

    try {
      const token = localStorage.getItem('token');
      if (!token || !apiFetch) return;

      const data = await fetchProfileWithFallback();
      const user = data?.user || data;
      if (user && (user.name || user.username || user.email)) {
        localStorage.setItem('user', JSON.stringify(user));
        applyProfileToUI(user);
      }
    } catch (err) {
      console.warn('[SETTINGS.JS] Could not fetch user profile:', err.message);
    }
  }

  async function fetchProfileWithFallback() {
    const profileCandidates = [
      { service: 'admin', path: '/auth/me' },
      { service: 'admin', path: '/v1/web/session' },
      { service: 'tracking', path: '/v1/web/session' },
      { service: 'admin', path: '/v1/me' },
      { service: 'tracking', path: '/v1/me' },
    ];
    let lastError = null;
    for (let index = 0; index < profileCandidates.length; index += 1) {
      const candidate = profileCandidates[index];
      try {
        return await apiFetch(candidate.path, {
          service: candidate.service,
          method: 'GET',
          auth: true,
        });
      } catch (error) {
        const status = Number(error?.status || 0);
        const shouldTryFallback = isCompatibilityStatus(status);
        const isLastCandidate = index === profileCandidates.length - 1;
        lastError = error;
        if (!shouldTryFallback || isLastCandidate) {
          throw error;
        }
      }
    }
    throw (
      lastError || new Error('Unable to load profile from the active backend.')
    );
  }

  function applyProfileToUI(user) {
    const nameInput = document.getElementById('input-name');
    const emailInput = document.getElementById('input-email');

    if (nameInput && (user.name || user.username))
      nameInput.value = user.name || user.username;
    if (emailInput && user.email) emailInput.value = user.email;

    const displayName = user?.name || user?.username || '';
    if (displayName) {
      const initials = displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
      const avatarLarge = document.querySelector('.avatar-large');
      if (avatarLarge && avatarLarge.textContent.trim() === 'ZA') {
        avatarLarge.textContent = initials;
      }
      const sidebarUserNames = document.querySelectorAll('.user-profile h4');
      sidebarUserNames.forEach((el) => {
        if (
          el.textContent.trim() === 'Ziad Alaa' ||
          el.textContent.trim() === ''
        ) {
          el.textContent = displayName;
        }
      });
      const sidebarUserRoles = document.querySelectorAll('.user-profile span');
      const displayRole = user?.role?.name || user?.role || 'student';
      sidebarUserRoles.forEach((el) => {
        if (
          el.textContent.trim() === 'student' ||
          el.textContent.trim() === ''
        ) {
          el.textContent = displayRole;
        }
      });
    }

    const btnConnect = document.getElementById('btn-connect-github');
    const btnInstall = document.getElementById('btn-install-github-app');
    const profileInfo = document.getElementById('github-profile-info');
    const statusText = document.getElementById('github-status-text');
    const usernameNode = document.getElementById('github-username');
    const avatarNode = document.getElementById('github-avatar');
    if (statusText) statusText.style.color = '';

    const githubUsername = user.githubUsername || user.githubLogin || '';
    const hasGithubLink = Boolean(
      user.githubId ||
      githubUsername ||
      user.githubLinked ||
      user.githubAppInstalled,
    );
    const hasAppInstall = Boolean(user.githubAppInstalled);

    if (hasGithubLink) {
      if (btnConnect) btnConnect.style.display = 'none';
      if (profileInfo) profileInfo.style.display = 'flex';
      if (usernameNode)
        usernameNode.textContent = githubUsername || 'Connected';
      if (avatarNode && user.githubAvatarUrl)
        avatarNode.src = user.githubAvatarUrl;

      if (hasAppInstall) {
        if (btnInstall) btnInstall.style.display = 'none';
        if (statusText) statusText.textContent = 'Connected and Synced';
      } else {
        if (btnInstall) btnInstall.style.display = '';
        if (statusText)
          statusText.textContent =
            'Connected. Install GitHub App to enable automated grading.';
      }
    } else {
      if (btnConnect) btnConnect.style.display = '';
      if (btnInstall) btnInstall.style.display = 'none';
      if (profileInfo) profileInfo.style.display = 'none';
      if (statusText) statusText.textContent = 'Not connected';
    }
  }

  // Load setup completion first (if redirected from install), then profile.
  void handleGitHubSetupCompletionFromUrl().finally(() => {
    void loadUserProfile();
  });

  var notifTypeMap = {
    'notif-assign': 'assignment_deadline',
    'notif-grade': 'grade_posted',
    'notif-course': 'course_announcement',
    'notif-achieve': 'achievement',
    'notif-contest': 'contest_starting',
    'notif-badge': 'badge_earned',
    'notif-atrisk': 'at_risk_alert',
    'notif-email': 'email_digest',
  };
  var notifLabels = [
    {
      id: 'notif-assign',
      title: 'Assignment Deadlines',
      desc: 'Get notified about upcoming assignment due dates',
    },
    {
      id: 'notif-grade',
      title: 'Grade Updates',
      desc: 'Receive notifications when new grades are posted',
    },
    {
      id: 'notif-course',
      title: 'Course Announcements',
      desc: 'Stay updated with course announcements from instructors',
    },
    {
      id: 'notif-achieve',
      title: 'Achievement Unlocked',
      desc: 'Get notified when you earn new badges and achievements',
    },
    {
      id: 'notif-contest',
      title: 'Contest Reminders',
      desc: 'Get notified when a contest is about to start',
    },
    {
      id: 'notif-badge',
      title: 'Badge Achievements',
      desc: 'Receive notifications when you earn new badges',
    },
  ];

  var notifDefaults = {
    'notif-assign': true,
    'notif-grade': true,
    'notif-course': true,
    'notif-achieve': true,
    'notif-contest': true,
    'notif-badge': true,
    'notif-atrisk': true,
    'notif-email': false,
  };

  var channelLabels = [
    {
      id: 'channel-email',
      title: 'Email',
      desc: 'Receive notification emails',
      icon: 'fa-solid fa-envelope',
    },
    {
      id: 'channel-slack',
      title: 'Slack',
      desc: 'Send notifications to your Slack workspace',
      icon: 'fa-brands fa-slack',
    },
    {
      id: 'channel-discord',
      title: 'Discord',
      desc: 'Send notifications to your Discord channel',
      icon: 'fa-brands fa-discord',
    },
  ];
  var channelDefaults = {
    'channel-email': false,
    'channel-slack': false,
    'channel-discord': false,
  };

  function renderNotificationToggles(prefMap) {
    var container = document.getElementById('notification-container');
    if (!container) return;
    container.innerHTML = '';
    var isInstructor = false;
    try {
      var _u = JSON.parse(localStorage.getItem('user') || '{}');
      var _r = String(_u?.role?.name || _u?.role || '').toLowerCase();
      isInstructor = _r === 'instructor';
    } catch (_) {}
    notifLabels.forEach(function (n) {
      var checked =
        prefMap && prefMap[n.id] !== undefined
          ? prefMap[n.id]
          : notifDefaults[n.id];
      var isChecked = checked ? 'checked' : '';
      container.innerHTML += [
        '<div class="toggle-row">',
        '<div class="toggle-info"><h4>' +
          n.title +
          '</h4><p>' +
          n.desc +
          '</p></div>',
        '<label class="switch">',
        '<input type="checkbox" id="' + n.id + '" ' + isChecked + '>',
        '<span class="slider round"></span>',
        '</label>',
        '</div>',
      ].join('');
    });
    if (isInstructor) {
      var atriskChecked =
        prefMap && prefMap['notif-atrisk'] !== undefined
          ? prefMap['notif-atrisk']
          : notifDefaults['notif-atrisk'];
      container.innerHTML += [
        '<div class="toggle-row border-top">',
        '<div class="toggle-info"><h4>At-Risk Alerts</h4><p>Get alerts about students who may need help</p></div>',
        '<label class="switch">',
        '<input type="checkbox" id="notif-atrisk" ' +
          (atriskChecked ? 'checked' : '') +
          '>',
        '<span class="slider round"></span>',
        '</label>',
        '</div>',
      ].join('');
    }
  }

  function attachNotificationListeners() {
    notifLabels.forEach(function (n) {
      var checkbox = document.getElementById(n.id);
      if (!checkbox) return;
      checkbox.addEventListener('change', function () {
        var type = notifTypeMap[n.id];
        var enabled = this.checked;
        if (
          window.NibrasServices &&
          window.NibrasServices.notificationService
        ) {
          window.NibrasServices.notificationService
            .updatePreference(type, enabled)
            .catch(function () {
              /* silent — keep UI state */
            });
        }
      });
    });
    var atriskBox = document.getElementById('notif-atrisk');
    if (atriskBox) {
      atriskBox.addEventListener('change', function () {
        var type = notifTypeMap['notif-atrisk'];
        var enabled = this.checked;
        if (
          window.NibrasServices &&
          window.NibrasServices.notificationService
        ) {
          window.NibrasServices.notificationService
            .updatePreference(type, enabled)
            .catch(function () {});
        }
      });
    }
  }

  function renderChannelToggles(prefMap) {
    var container = document.getElementById('channel-container');
    if (!container) return;
    container.innerHTML = '';
    channelLabels.forEach(function (c) {
      var checked =
        prefMap && prefMap[c.id] !== undefined
          ? prefMap[c.id]
          : channelDefaults[c.id];
      var isChecked = checked ? 'checked' : '';
      container.innerHTML += [
        '<div class="toggle-row">',
        '<div class="toggle-info"><h4><i class="' +
          c.icon +
          '" style="width:18px;margin-right:6px;"></i>' +
          c.title +
          '</h4><p>' +
          c.desc +
          '</p></div>',
        '<label class="switch">',
        '<input type="checkbox" id="' + c.id + '" ' + isChecked + '>',
        '<span class="slider round"></span>',
        '</label>',
        '</div>',
      ].join('');
    });
    container.innerHTML += [
      '<div class="toggle-row" style="border-bottom:none;padding-bottom:0;">',
      '<p style="font-size:0.8rem;color:var(--text-tertiary);">',
      '<i class="fa-solid fa-plug" style="margin-right:4px;"></i>',
      'Configure Slack and Discord in <a href="../Integrations/integrations.html" style="color:var(--accent-blue);">Integrations</a>',
      '</p>',
      '</div>',
    ].join('');
  }

  function attachChannelListeners() {
    channelLabels.forEach(function (c) {
      var checkbox = document.getElementById(c.id);
      if (!checkbox) return;
      checkbox.addEventListener('change', function () {
        var enabled = this.checked;
        if (
          window.NibrasServices &&
          window.NibrasServices.notificationService
        ) {
          window.NibrasServices.notificationService
            .updatePreference(
              'channel_' + c.id.replace('channel-', ''),
              enabled,
            )
            .catch(function () {});
        }
      });
    });
  }

  function loadChannelPreferences() {
    if (!window.NibrasServices || !window.NibrasServices.notificationService) {
      renderChannelToggles(null);
      attachChannelListeners();
      return;
    }
    window.NibrasServices.notificationService
      .getPreferences()
      .then(function (res) {
        var prefs = Array.isArray(res)
          ? res
          : (res && (res.preferences || res.data)) || [];
        var prefMap = {};
        channelLabels.forEach(function (c) {
          var channelKey = 'channel_' + c.id.replace('channel-', '');
          var match = null;
          if (Array.isArray(prefs)) {
            for (var i = 0; i < prefs.length; i++) {
              if (prefs[i].type === channelKey || prefs[i].id === channelKey) {
                match = prefs[i];
                break;
              }
            }
          }
          prefMap[c.id] = match ? match.enabled : channelDefaults[c.id];
        });
        renderChannelToggles(prefMap);
        attachChannelListeners();
      })
      .catch(function () {
        renderChannelToggles(null);
        attachChannelListeners();
      });
  }

  function loadNotificationPreferences() {
    if (!window.NibrasServices || !window.NibrasServices.notificationService) {
      renderNotificationToggles(null);
      attachNotificationListeners();
      return;
    }
    window.NibrasServices.notificationService
      .getPreferences()
      .then(function (res) {
        var prefs = Array.isArray(res)
          ? res
          : (res && (res.preferences || res.data)) || [];
        var prefMap = {};
        notifLabels.forEach(function (n) {
          var type = notifTypeMap[n.id];
          var match = null;
          if (Array.isArray(prefs)) {
            for (var i = 0; i < prefs.length; i++) {
              if (prefs[i].type === type || prefs[i].id === type) {
                match = prefs[i];
                break;
              }
            }
          }
          prefMap[n.id] = match ? match.enabled : notifDefaults[n.id];
        });
        renderNotificationToggles(prefMap);
        attachNotificationListeners();
      })
      .catch(function () {
        renderNotificationToggles(null);
        attachNotificationListeners();
      });
  }

  // --- 3. BACKEND DATA (fallback defaults) ---
  const settingsData = {
    profile: { name: '', email: '', avatar: '' },
    preferences: { level: 'Level 3' },
    theme: 'light',
  };

  // --- 4. RENDER UI ---
  document.getElementById('input-name').value = settingsData.profile.name;
  document.getElementById('input-email').value = settingsData.profile.email;

  loadNotificationPreferences();
  loadChannelPreferences();

  var savedLevel = loadLevel();
  document.getElementById('pref-level').value = savedLevel;

  // --- 5. AVATAR (local file) ---
  document
    .getElementById('btn-change-avatar')
    .addEventListener('click', function () {
      document.getElementById('avatar-file-input').click();
    });
  document
    .getElementById('avatar-file-input')
    .addEventListener('change', function (e) {
      var file = e.target.files?.[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        document.getElementById('avatar-display').innerHTML =
          '<img src="' +
          ev.target.result +
          '" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';
        localStorage.setItem('nibras_avatar', ev.target.result);
      };
      reader.readAsDataURL(file);
    });
  var savedAvatar = localStorage.getItem('nibras_avatar');
  if (savedAvatar) {
    document.getElementById('avatar-display').innerHTML =
      '<img src="' +
      savedAvatar +
      '" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';
  }

  // --- 6. THEME TOGGLE (apply only on save) ---
  const appLogo = document.getElementById('app-logo');
  var currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'dark' && appLogo) {
    appLogo.src = '/Assets/images/logo-dark.png';
  }
  const themeSelector = document.getElementById('theme-selector');
  var pendingTheme = null;

  themeSelector.addEventListener('change', function () {
    pendingTheme = themeSelector.value;
  });

  // --- 7. SAVE ---
  document.querySelector('.btn-save').addEventListener('click', function () {
    var btn = document.querySelector('.btn-save');
    var originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    var level = document.getElementById('pref-level').value;
    var theme = pendingTheme || localStorage.getItem('theme') || 'light';

    function done(ok) {
      btn.textContent = ok ? 'Settings saved!' : 'Save failed';
      btn.style.backgroundColor = ok
        ? 'var(--accent-blue, #2563eb)'
        : 'var(--danger-color, #dc2626)';
      setTimeout(function () {
        btn.textContent = originalText;
        btn.style.backgroundColor = '';
        btn.disabled = false;
      }, 1500);
    }

    saveLevel(level);

    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (appLogo) {
      appLogo.src =
        theme === 'dark'
          ? '/Assets/images/logo-dark.png'
          : '/Assets/images/logo-light.png';
    }

    if (window.NibrasServices?.usersService) {
      window.NibrasServices.usersService
        .updateMe({ preferences: { level: level } })
        .then(function () {
          done(true);
        })
        .catch(function () {
          done(false);
        });
    } else {
      done(true);
    }
  });
});
