function detectPreferredOsFromSignals(userAgent, platform, saved) {
  if (saved === 'macos' || saved === 'linux' || saved === 'windows') {
    return saved;
  }
  var ua = String(userAgent || '');
  var plat = String(platform || '');
  if (/Win/i.test(plat) || /Windows/i.test(ua)) return 'windows';
  if (/Mac/i.test(plat) || /Macintosh/i.test(ua)) return 'macos';
  if (/Linux/i.test(plat) || /Linux/i.test(ua)) return 'linux';
  return 'linux';
}

(function initNibrasCli(global) {
  var VERSION = '2.0.0';
  var RELEASE_TAG = 'v' + VERSION;
  var REPO = 'EpitomeZied/nibras';
  var DEFAULT_API_PLACEHOLDER = 'https://nibras-api.fly.dev';

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function resolveApiBase() {
    var raw = String(
      global.NibrasShared?.resolveServiceUrl?.('tracking') ||
        global.NIBRAS_TRACKING_API_URL ||
        '',
    ).trim();
    if (!raw) return '{your-api-url}';
    return raw.replace(/\/+$/, '').replace(/\/v1$/i, '');
  }

  function resolveCliBaseUrl(options) {
    var opts = options || {};
    if (typeof opts.getCliBaseUrl === 'function') {
      var fromClient = opts.getCliBaseUrl();
      if (fromClient) return fromClient;
    }
    return resolveApiBase();
  }

  function getInstallCommand() {
    return 'npm install -g @nibras/cli@' + VERSION;
  }

  function getInstallScriptCommand(os) {
    var url =
      'https://github.com/' +
      REPO +
      '/releases/download/' +
      RELEASE_TAG +
      '/';
    if (os === 'windows') {
      return 'irm "' + url + 'install.ps1" | iex';
    }
    return 'curl -fsSL "' + url + 'install.sh" | bash';
  }

  function buildLoginCommand(apiBase) {
    return 'nibras login --api-base-url ' + (apiBase || resolveApiBase());
  }

  function buildSetupCommand(projectKey, courseSlug) {
    if (projectKey && String(projectKey).includes('/')) {
      return 'nibras setup --project ' + projectKey;
    }
    if (courseSlug && projectKey) {
      return 'nibras setup --project ' + courseSlug + '/' + projectKey;
    }
    if (projectKey) {
      return 'nibras setup --project ' + projectKey;
    }
    return 'nibras setup --project your-course/project-key';
  }

  function hydrateInstallBoxes(root) {
    var installCmd = getInstallCommand();
    root.querySelectorAll('[data-cli-install]').forEach(function (el) {
      el.textContent = installCmd;
    });
    root.querySelectorAll('[data-cli-install-script]').forEach(function (el) {
      var os = el.getAttribute('data-cli-install-script') || 'linux';
      el.textContent = getInstallScriptCommand(os);
    });
    root.querySelectorAll('[data-cli-version]').forEach(function (el) {
      el.textContent = RELEASE_TAG;
    });
  }

  function detectPreferredOs() {
    var saved = null;
    try {
      saved = global.localStorage.getItem('nibras_cli_os');
    } catch (_) {}
    return detectPreferredOsFromSignals(
      global.navigator && global.navigator.userAgent,
      global.navigator && global.navigator.platform,
      saved,
    );
  }

  function hydrateGuidePage() {
    var root = global.document;
    if (!root) return;

    var apiBase = resolveApiBase();
    var loginCmd = buildLoginCommand(apiBase);

    hydrateInstallBoxes(root);

    root.querySelectorAll('.cli-api-login-cmd').forEach(function (el) {
      el.textContent = loginCmd;
    });

    root.querySelectorAll('[data-cli-api-base]').forEach(function (el) {
      el.textContent = apiBase;
    });

    var walker = root.createTreeWalker(root.body, global.NodeFilter.SHOW_TEXT);
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function (node) {
      if (node.nodeValue && node.nodeValue.indexOf(DEFAULT_API_PLACEHOLDER) !== -1) {
        node.nodeValue = node.nodeValue.split(DEFAULT_API_PLACEHOLDER).join(apiBase);
      }
    });
  }

  function updateModalInstallCommand() {
    var installEl = global.document.getElementById('cli-install-command');
    if (installEl) installEl.textContent = getInstallCommand();
  }

  function updateCliCommands(courseSlug, projectKey, options) {
    var cliBase = resolveCliBaseUrl(options);
    var loginCmd = buildLoginCommand(cliBase);
    var setupCmd = buildSetupCommand(projectKey, courseSlug);
    var loginEl = global.document.getElementById('cli-login-command');
    var setupEl = global.document.getElementById('cli-setup-command');
    if (loginEl) loginEl.textContent = loginCmd;
    if (setupEl) setupEl.textContent = setupCmd;
    updateModalInstallCommand();
  }

  function populateCourseDropdown(courses, selectedCourseId, options) {
    var select = global.document.getElementById('cli-course-select');
    if (!select) return;
    select.innerHTML = '<option value="">Select a course...</option>';
    var hasSelected = false;
    (courses || []).forEach(function (c) {
      var id = c.id || c._id || '';
      var name = c.name || c.title || c.courseCode || id;
      var selected = id === selectedCourseId ? 'selected' : '';
      if (selected) hasSelected = true;
      select.innerHTML +=
        '<option value="' +
        escapeHtml(id) +
        '" ' +
        selected +
        '>' +
        escapeHtml(name) +
        '</option>';
    });
    select.onchange = function () {
      var courseId = this.value;
      if (courseId) loadProjectsForCourse(courseId, options);
      else {
        var projectSelect = global.document.getElementById('cli-project-select');
        if (projectSelect) {
          projectSelect.innerHTML =
            '<option value="">Select a project...</option>';
        }
      }
    };
    if (!hasSelected && courses && courses.length === 1) {
      select.value = courses[0].id || courses[0]._id || '';
      loadProjectsForCourse(select.value, options);
    }
  }

  function loadProjectsForCourse(courseId, options) {
    var select = global.document.getElementById('cli-project-select');
    if (!select) return;
    select.innerHTML = '<option value="">Loading projects...</option>';
    var services = global.NibrasServices;
    if (!services || !services.trackingProjectService) {
      select.innerHTML = '<option value="">Service unavailable</option>';
      return;
    }
    var getActiveProjectKey =
      options && typeof options.getActiveProjectKey === 'function'
        ? options.getActiveProjectKey
        : function () {
            return '';
          };

    services.trackingProjectService
      .listByCourse(courseId)
      .then(function (res) {
        var projects = Array.isArray(res)
          ? res
          : res?.data || res?.projects || [];
        select.innerHTML = '<option value="">Select a project...</option>';
        var activeProjectKey = getActiveProjectKey();
        (projects || []).forEach(function (p) {
          var key = p.projectKey || p.slug || p.id || p._id || '';
          var title = p.title || p.name || key;
          var selected =
            key &&
            activeProjectKey &&
            (key === activeProjectKey || title === activeProjectKey)
              ? 'selected'
              : '';
          select.innerHTML +=
            '<option value="' +
            escapeHtml(key) +
            '" data-title="' +
            escapeHtml(title) +
            '" ' +
            selected +
            '>' +
            escapeHtml(title) +
            '</option>';
        });
        select.onchange = function () {
          var key = this.value;
          var slug =
            global.document.getElementById('cli-course-select')?.value || '';
          updateCliCommands(slug, key, options);
        };
        var firstVal = select.value;
        var slug =
          global.document.getElementById('cli-course-select')?.value || '';
        updateCliCommands(slug, firstVal, options);
      })
      .catch(function () {
        select.innerHTML = '<option value="">Failed to load projects</option>';
      });
  }

  function initHelpModal(options) {
    options = options || {};
    var getActiveProjectKey =
      typeof options.getActiveProjectKey === 'function'
        ? options.getActiveProjectKey
        : function () {
            return '';
          };
    var getTrackingCourseId =
      typeof options.getTrackingCourseId === 'function'
        ? options.getTrackingCourseId
        : function () {
            return '';
          };

    global.loadCliGuide = function () {
      var statusIcon = global.document.getElementById('cli-status-icon');
      var statusText = global.document.getElementById('cli-status-text');
      if (statusIcon) statusIcon.style.background = '#6b7280';
      if (statusText) statusText.textContent = 'Checking connection...';

      var actionsRow = global.document.getElementById('cli-actions-row');
      if (actionsRow) {
        actionsRow.querySelectorAll('[data-cli-action]').forEach(function (btn) {
          btn.onclick = null;
          var action = btn.getAttribute('data-cli-action');
          if (action === 'link-github') btn.onclick = global.linkCliGitHub;
          else if (action === 'check-github')
            btn.onclick = global.checkCliGitHubStatus;
          else if (action === 'ping-api') btn.onclick = global.checkCliApiPing;
        });
      }

      var services = global.NibrasServices;
      if (!services || !services.authService) {
        if (statusText)
          statusText.textContent = 'Services not loaded. Please refresh.';
        return;
      }

      updateCliCommands('', getActiveProjectKey(), options);

      services.authService
        .getMe()
        .then(function (res) {
          var user = res?.user || res?.data?.user || res?.data || {};
          var name = user.name || user.username || user.email || 'User';
          var githubUser = user.githubUsername || user.githubLogin || '';
          var hasGithub = Boolean(
            user.githubId || githubUser || user.githubAppInstalled,
          );
          if (statusIcon)
            statusIcon.style.background = hasGithub ? '#10b981' : '#f59e0b';
          if (statusText) {
            statusText.textContent = hasGithub
              ? 'Connected as ' +
                escapeHtml(name) +
                (githubUser ? ' (GitHub: @' + escapeHtml(githubUser) + ')' : '')
              : 'Logged in as ' +
                escapeHtml(name) +
                ' — Link GitHub to submit projects.';
          }
        })
        .catch(function () {
          if (statusIcon) statusIcon.style.background = '#ef4444';
          if (statusText)
            statusText.textContent =
              'Not connected. Run nibras login from your terminal.';
        });

      if (!services.trackingCourseService) return;

      services.trackingCourseService
        .list()
        .then(function (res) {
          var courses = Array.isArray(res)
            ? res
            : res?.data || res?.courses || [];
          populateCourseDropdown(courses, getTrackingCourseId(), options);
        })
        .catch(function () {
          var select = global.document.getElementById('cli-course-select');
          if (select)
            select.innerHTML =
              '<option value="">Failed to load courses</option>';
        });
    };

    global.checkCliGitHubStatus = function () {
      var result = global.document.getElementById('cli-verify-result');
      if (result) result.textContent = 'Checking GitHub...';
      var services = global.NibrasServices;
      if (!services || !services.githubService) {
        if (result) result.textContent = 'Service unavailable';
        return;
      }
      services.githubService
        .getConfig()
        .then(function (res) {
          var configured = res?.configured ?? res?.data?.configured ?? false;
          var appName = res?.appName || res?.data?.appName || '';
          if (result)
            result.textContent = configured
              ? 'GitHub App connected' +
                (appName ? ' (' + appName + ')' : '') +
                ' ✓'
              : 'GitHub App not installed — click Install App in Settings.';
        })
        .catch(function () {
          if (result) result.textContent = 'GitHub check failed (API unavailable)';
        });
    };

    global.checkCliApiPing = function () {
      var result = global.document.getElementById('cli-verify-result');
      if (result) result.textContent = 'Pinging...';
      var cliBase = resolveCliBaseUrl(options);
      var pingUrl = cliBase.replace(/\/+$/, '') + '/v1/health';
      fetch(pingUrl, { method: 'GET' })
        .then(function (r) {
          if (result)
            result.textContent = r.ok
              ? 'API reachable ✓'
              : 'API returned status ' + r.status;
        })
        .catch(function () {
          if (result) result.textContent = 'API unreachable — check the URL';
        });
    };

    global.linkCliGitHub = function () {
      var result = global.document.getElementById('cli-verify-result');
      if (result) result.textContent = 'Opening GitHub...';
      var returnTo = encodeURIComponent(global.location.href);
      var cliBase = resolveCliBaseUrl(options);
      var raw = String(
        global.NibrasShared?.resolveServiceUrl?.('tracking') ||
          global.NIBRAS_TRACKING_API_URL ||
          '',
      ).trim();
      var candidates = [];
      if (raw) candidates.push(raw.replace(/\/+$/, ''));
      var adminUrl = String(global.NIBRAS_API_URL || '')
        .replace(/\/+$/, '')
        .replace(/\/api$/, '');
      if (adminUrl && adminUrl !== raw.replace(/\/+$/, ''))
        candidates.push(adminUrl);
      candidates.push(cliBase);

      function tryConnect(idx) {
        if (idx >= candidates.length) {
          global.location.href =
            candidates[0] + '/v1/github/oauth/start?return_to=' + returnTo;
          return;
        }
        var base = candidates[idx];
        fetch(base + '/v1/github/config', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
          .then(function (r) {
            if (r.status !== 404) {
              global.location.href =
                base + '/v1/github/oauth/start?return_to=' + returnTo;
            } else {
              tryConnect(idx + 1);
            }
          })
          .catch(function () {
            tryConnect(idx + 1);
          });
      }
      tryConnect(0);
    };

    updateModalInstallCommand();
  }

  global.NibrasCli = Object.freeze({
    VERSION: VERSION,
    RELEASE_TAG: RELEASE_TAG,
    REPO: REPO,
    escapeHtml: escapeHtml,
    resolveApiBase: resolveApiBase,
    resolveCliBaseUrl: resolveCliBaseUrl,
    getInstallCommand: getInstallCommand,
    getInstallScriptCommand: getInstallScriptCommand,
    buildLoginCommand: buildLoginCommand,
    buildSetupCommand: buildSetupCommand,
    hydrateGuidePage: hydrateGuidePage,
    detectPreferredOs: detectPreferredOs,
    detectPreferredOsFromSignals: detectPreferredOsFromSignals,
    updateCliCommands: updateCliCommands,
    initHelpModal: initHelpModal,
  });
})(typeof window !== 'undefined' ? window : global);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectPreferredOsFromSignals: detectPreferredOsFromSignals };
}
