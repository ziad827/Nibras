window.NibrasReact.run(() => {
  var appLogo = document.getElementById('app-logo');
  if (appLogo) {
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') appLogo.src = '/Assets/images/logo-dark.png';
  }

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

  function getBaseForService(service) {
    if (service === 'tracking') return trackingApiBase;
    return adminApiBase;
  }

  function isCompatibilityStatus(status) {
    return status === 404 || status === 405 || status === 501;
  }

  var integrationServiceCandidates = ['tracking', 'admin'];

  function buildServiceCandidates() {
    const unique = [];
    integrationServiceCandidates.forEach((service) => {
      const base = getBaseForService(service);
      if (!base) return;
      const duplicate = unique.some((entry) => entry.base === base);
      if (!duplicate) unique.push({ service, base });
    });
    return unique;
  }

  async function apiRequestWithFallback(
    path,
    options = {},
    fallbackStatuses = [404, 405, 501],
  ) {
    if (!apiFetch) throw new Error('API fetch utility is unavailable.');
    let lastError = null;
    const candidates = buildServiceCandidates();
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      try {
        return await apiFetch(
          path,
          Object.assign({}, options, { service: candidate.service }),
        );
      } catch (error) {
        const status = Number(error?.status || 0);
        const isLast = i === candidates.length - 1;
        const shouldFallback = fallbackStatuses.includes(status);
        lastError = error;
        if (!shouldFallback || isLast) throw error;
      }
    }
    throw lastError || new Error('No compatible endpoint for ' + path);
  }

  function setStatus(id, message, tone) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = String(message || '');
    el.style.color =
      tone === 'error'
        ? 'var(--tag-red-text, #dc2626)'
        : tone === 'success'
          ? 'var(--accent-blue, #2563eb)'
          : '';
  }

  var userData = null;

  function loadUserProfile() {
    try {
      var cached = JSON.parse(localStorage.getItem('user'));
      if (cached) userData = cached;
    } catch (_) {}
    try {
      var token = localStorage.getItem('token');
      if (!token || !apiFetch) return;
      apiFetch('/auth/me', { service: 'admin', method: 'GET', auth: true })
        .then(function (data) {
          var u = data?.user || data;
          if (u && (u.name || u.username)) {
            localStorage.setItem('user', JSON.stringify(u));
            userData = u;
          }
        })
        .catch(function () {});
    } catch (_) {}
  }

  function applyUserDataToUI() {
    if (!userData) return;
    var u = userData;

    var displayName = u?.name || u?.username || '';
    if (displayName) {
      var initials = displayName
        .split(' ')
        .map(function (n) {
          return n[0];
        })
        .join('')
        .substring(0, 2)
        .toUpperCase();
      var avatarCircle = document.querySelector('.avatar-circle');
      if (avatarCircle && avatarCircle.textContent.trim() === 'ZA')
        avatarCircle.textContent = initials;
      var sidebarNames = document.querySelectorAll('.user-profile h4');
      sidebarNames.forEach(function (el) {
        if (
          el.textContent.trim() === 'Ziad Alaa' ||
          el.textContent.trim() === ''
        )
          el.textContent = displayName;
      });
      var sidebarRoles = document.querySelectorAll('.user-profile span');
      var displayRole = u?.role?.name || u?.role || 'student';
      sidebarRoles.forEach(function (el) {
        if (el.textContent.trim() === 'student' || el.textContent.trim() === '')
          el.textContent = displayRole;
      });
    }

    loadCanvasStatus(u);
    loadMoodleStatus(u);
    loadSlackStatus(u);
    loadDiscordStatus(u);
    loadGitHubStatus(u);
    loadGitLabStatus(u);
  }

  // ============================================================
  // Canvas LMS
  // ============================================================
  function loadCanvasStatus(u) {
    var hasCanvas = Boolean(u.canvasLinked || u.canvasId || u.canvasToken);
    var statusText = document.getElementById('canvas-status-text');
    var connectBtn = document.getElementById('btn-canvas-connect');
    var detailArea = document.getElementById('canvas-detail');
    var connectedAs = document.getElementById('canvas-connected-as');

    if (hasCanvas) {
      setStatus('canvas-status-text', 'Connected', 'success');
      if (connectBtn) {
        connectBtn.style.display = 'none';
      }
      if (detailArea) detailArea.classList.add('visible');
      if (connectedAs) {
        var name = u.canvasInstitution || u.canvasName || 'Canvas';
        connectedAs.textContent = 'Connected to ' + name;
      }
    } else {
      setStatus('canvas-status-text', 'Not connected');
      if (connectBtn) connectBtn.style.display = '';
      if (detailArea) detailArea.classList.remove('visible');
    }
  }

  document
    .getElementById('btn-canvas-connect')
    ?.addEventListener('click', async function () {
      var btn = this;
      var orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';
      try {
        var url =
          adminApiBase.replace(/\/api\/?$/, '') +
          '/api/integrations/canvas/connect';
        var returnTo = window.location.href;
        window.location.href =
          url + '?return_to=' + encodeURIComponent(returnTo);
      } catch (err) {
        setStatus(
          'canvas-status-text',
          'Connection failed: ' + (err.message || 'Unknown'),
          'error',
        );
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });

  document
    .getElementById('btn-canvas-sync')
    ?.addEventListener('click', async function () {
      var btn = this;
      var orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
      try {
        await apiRequestWithFallback('/api/integrations/canvas/sync-roster', {
          method: 'POST',
          auth: true,
        });
        setStatus(
          'canvas-status-text',
          'Roster synced successfully',
          'success',
        );
      } catch (err) {
        setStatus(
          'canvas-status-text',
          'Sync failed: ' + (err.message || 'Error'),
          'error',
        );
      } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });

  document
    .getElementById('btn-canvas-disconnect')
    ?.addEventListener('click', async function () {
      if (!confirm('Disconnect Canvas LMS integration?')) return;
      try {
        await apiRequestWithFallback('/api/integrations/canvas/disconnect', {
          method: 'POST',
          auth: true,
        });
        location.reload();
      } catch (err) {
        setStatus(
          'canvas-status-text',
          'Disconnect failed: ' + (err.message || 'Error'),
          'error',
        );
      }
    });

  // ============================================================
  // Moodle
  // ============================================================
  function loadMoodleStatus(u) {
    var hasMoodle = Boolean(u.moodleLinked || u.moodleId || u.moodleToken);
    var statusText = document.getElementById('moodle-status-text');
    var toggleBtn = document.getElementById('btn-moodle-toggle');
    var detailArea = document.getElementById('moodle-detail');
    var connectBtn = document.getElementById('btn-moodle-connect');
    var disconnectBtn = document.getElementById('btn-moodle-disconnect');
    var urlInput = document.getElementById('moodle-url');
    var tokenInput = document.getElementById('moodle-token');

    if (hasMoodle) {
      setStatus('moodle-status-text', 'Connected', 'success');
      if (connectBtn) connectBtn.style.display = 'none';
      if (disconnectBtn) disconnectBtn.style.display = '';
      if (urlInput && u.moodleUrl) urlInput.value = u.moodleUrl;
      if (tokenInput && u.moodleToken) tokenInput.value = '••••••••';
    } else {
      setStatus('moodle-status-text', 'Not configured');
      if (connectBtn) connectBtn.style.display = '';
      if (disconnectBtn) disconnectBtn.style.display = 'none';
    }
  }

  document
    .getElementById('btn-moodle-toggle')
    ?.addEventListener('click', function () {
      var detail = document.getElementById('moodle-detail');
      detail.classList.toggle('visible');
    });

  document
    .getElementById('btn-moodle-test')
    ?.addEventListener('click', async function () {
      var btn = this;
      var url = document.getElementById('moodle-url')?.value?.trim();
      var token = document.getElementById('moodle-token')?.value?.trim();
      var resultEl = document.getElementById('moodle-test-result');
      if (!url || !token) {
        resultEl.textContent = 'Please fill in URL and token';
        resultEl.style.color = '#dc2626';
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing...';
      resultEl.textContent = '';
      try {
        await apiRequestWithFallback('/api/integrations/moodle/test', {
          method: 'POST',
          auth: true,
          body: { url: url, token: token },
        });
        resultEl.textContent = 'Connection successful!';
        resultEl.style.color = '#059669';
      } catch (err) {
        resultEl.textContent = 'Connection failed: ' + (err.message || 'Error');
        resultEl.style.color = '#dc2626';
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-vial"></i> Test Connection';
      }
    });

  document
    .getElementById('btn-moodle-connect')
    ?.addEventListener('click', async function () {
      var btn = this;
      var url = document.getElementById('moodle-url')?.value?.trim();
      var token = document.getElementById('moodle-token')?.value?.trim();
      var resultEl = document.getElementById('moodle-test-result');
      if (!url || !token) {
        resultEl.textContent = 'Please fill in URL and token';
        resultEl.style.color = '#dc2626';
        return;
      }
      btn.disabled = true;
      btn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';
      try {
        await apiRequestWithFallback('/api/integrations/moodle/connect', {
          method: 'POST',
          auth: true,
          body: { url: url, token: token },
        });
        resultEl.textContent = 'Connected successfully!';
        resultEl.style.color = '#059669';
        location.reload();
      } catch (err) {
        resultEl.textContent = 'Connection failed: ' + (err.message || 'Error');
        resultEl.style.color = '#dc2626';
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-save"></i> Save & Connect';
      }
    });

  document
    .getElementById('btn-moodle-disconnect')
    ?.addEventListener('click', async function () {
      if (!confirm('Disconnect Moodle integration?')) return;
      try {
        await apiRequestWithFallback('/api/integrations/moodle/disconnect', {
          method: 'POST',
          auth: true,
        });
        location.reload();
      } catch (err) {
        setStatus(
          'moodle-status-text',
          'Disconnect failed: ' + (err.message || 'Error'),
          'error',
        );
      }
    });

  // ============================================================
  // Slack
  // ============================================================
  function loadSlackStatus(u) {
    var hasSlack = Boolean(u.slackLinked || u.slackId || u.slackTeamId);
    var detailArea = document.getElementById('slack-detail');
    var connectBtn = document.getElementById('btn-slack-connect');
    var workspaceName = document.getElementById('slack-workspace-name');

    if (hasSlack) {
      setStatus('slack-status-text', 'Connected', 'success');
      if (connectBtn) connectBtn.style.display = 'none';
      if (detailArea) detailArea.classList.add('visible');
      if (workspaceName)
        workspaceName.textContent =
          u.slackWorkspace || u.slackTeamName || 'Connected';
    } else {
      setStatus('slack-status-text', 'Not connected');
      if (connectBtn) connectBtn.style.display = '';
      if (detailArea) detailArea.classList.remove('visible');
    }
  }

  document
    .getElementById('btn-slack-connect')
    ?.addEventListener('click', async function () {
      var btn = this;
      var orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';
      try {
        var returnTo = window.location.href;
        var url =
          adminApiBase.replace(/\/api\/?$/, '') +
          '/api/integrations/slack/connect';
        window.location.href =
          url + '?return_to=' + encodeURIComponent(returnTo);
      } catch (err) {
        setStatus(
          'slack-status-text',
          'Connection failed: ' + (err.message || 'Unknown'),
          'error',
        );
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });

  document
    .getElementById('btn-slack-disconnect')
    ?.addEventListener('click', async function () {
      if (!confirm('Disconnect Slack integration?')) return;
      try {
        await apiRequestWithFallback('/api/integrations/slack/disconnect', {
          method: 'POST',
          auth: true,
        });
        location.reload();
      } catch (err) {
        setStatus(
          'slack-status-text',
          'Disconnect failed: ' + (err.message || 'Error'),
          'error',
        );
      }
    });

  // ============================================================
  // Discord
  // ============================================================
  function loadDiscordStatus(u) {
    var hasDiscord = Boolean(
      u.discordLinked || u.discordWebhookUrl || u.discordConfigured,
    );
    var detailArea = document.getElementById('discord-detail');
    var toggleBtn = document.getElementById('btn-discord-toggle');
    var saveBtn = document.getElementById('btn-discord-save');
    var disconnectBtn = document.getElementById('btn-discord-disconnect');
    var urlInput = document.getElementById('discord-webhook-url');

    if (hasDiscord) {
      setStatus('discord-status-text', 'Connected', 'success');
      if (toggleBtn) toggleBtn.textContent = 'Settings';
      if (saveBtn) saveBtn.style.display = 'none';
      if (disconnectBtn) disconnectBtn.style.display = '';
      if (urlInput && u.discordWebhookUrl) urlInput.value = u.discordWebhookUrl;
    } else {
      setStatus('discord-status-text', 'Not connected');
      if (toggleBtn) toggleBtn.textContent = 'Configure';
      if (saveBtn) saveBtn.style.display = '';
      if (disconnectBtn) disconnectBtn.style.display = 'none';
    }
  }

  document.querySelectorAll('.channel-event-tag').forEach(function (tag) {
    tag.addEventListener('click', function () {
      var cb = this.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.checked = !cb.checked;
        this.classList.toggle('active', cb.checked);
      }
    });
  });

  document
    .getElementById('btn-discord-toggle')
    ?.addEventListener('click', function () {
      var detail = document.getElementById('discord-detail');
      detail.classList.toggle('visible');
    });

  document
    .getElementById('btn-discord-test')
    ?.addEventListener('click', async function () {
      var btn = this;
      var url = document.getElementById('discord-webhook-url')?.value?.trim();
      var resultEl = document.getElementById('discord-test-result');
      if (!url) {
        resultEl.textContent = 'Please enter a webhook URL';
        resultEl.style.color = '#dc2626';
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing...';
      resultEl.textContent = '';
      try {
        await apiRequestWithFallback('/api/integrations/discord/test', {
          method: 'POST',
          auth: true,
          body: { webhookUrl: url },
        });
        resultEl.textContent = 'Webhook works!';
        resultEl.style.color = '#059669';
      } catch (err) {
        resultEl.textContent = 'Test failed: ' + (err.message || 'Error');
        resultEl.style.color = '#dc2626';
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-vial"></i> Test Webhook';
      }
    });

  document
    .getElementById('btn-discord-save')
    ?.addEventListener('click', async function () {
      var btn = this;
      var url = document.getElementById('discord-webhook-url')?.value?.trim();
      var resultEl = document.getElementById('discord-test-result');
      if (!url) {
        resultEl.textContent = 'Please enter a webhook URL';
        resultEl.style.color = '#dc2626';
        return;
      }
      var events = [];
      document
        .querySelectorAll('#discord-events .channel-event-tag.active')
        .forEach(function (tag) {
          var event = tag.getAttribute('data-event');
          if (event) events.push(event);
        });
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
      try {
        await apiRequestWithFallback('/api/integrations/discord/connect', {
          method: 'POST',
          auth: true,
          body: { webhookUrl: url, events: events },
        });
        resultEl.textContent = 'Discord integration saved!';
        resultEl.style.color = '#059669';
        location.reload();
      } catch (err) {
        resultEl.textContent = 'Save failed: ' + (err.message || 'Error');
        resultEl.style.color = '#dc2626';
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-save"></i> Save';
      }
    });

  document
    .getElementById('btn-discord-disconnect')
    ?.addEventListener('click', async function () {
      if (!confirm('Disconnect Discord integration?')) return;
      try {
        await apiRequestWithFallback('/api/integrations/discord/disconnect', {
          method: 'POST',
          auth: true,
        });
        location.reload();
      } catch (err) {
        setStatus(
          'discord-status-text',
          'Disconnect failed: ' + (err.message || 'Error'),
          'error',
        );
      }
    });

  // ============================================================
  // GitHub
  // ============================================================
  function loadGitHubStatus(u) {
    var hasGitHub = Boolean(
      u.githubId || u.githubUsername || u.githubLinked || u.githubAppInstalled,
    );
    var statusText = document.getElementById('github-status-text');
    var badge = document.getElementById('github-webhook-badge');
    var detailArea = document.getElementById('github-detail');
    var avatar = document.getElementById('github-avatar');
    var connectedAs = document.getElementById('github-connected-as');

    if (hasGitHub) {
      setStatus('github-status-text', 'Connected', 'success');
      if (badge) {
        badge.className = 'integration-status connected';
        badge.innerHTML = '<i class="fa-solid fa-circle"></i> Webhook Active';
      }
      if (detailArea) detailArea.classList.add('visible');
      if (avatar && u.githubAvatarUrl) {
        avatar.src = u.githubAvatarUrl;
        avatar.style.display = '';
      }
      if (connectedAs)
        connectedAs.textContent =
          'Connected as ' + (u.githubUsername || 'GitHub user');
    } else {
      setStatus('github-status-text', 'Not connected');
      if (badge) {
        badge.className = 'integration-status disconnected';
        badge.innerHTML = '<i class="fa-solid fa-circle"></i> Webhook Inactive';
      }
      if (detailArea) detailArea.classList.remove('visible');
    }
  }

  // ============================================================
  // GitLab
  // ============================================================
  function loadGitLabStatus(u) {
    var hasGitLab = Boolean(
      u.gitlabLinked || u.gitlabId || u.gitlabWebhookConfigured,
    );
    var statusText = document.getElementById('gitlab-status-text');
    var badge = document.getElementById('gitlab-webhook-badge');
    var detailArea = document.getElementById('gitlab-detail');
    var configureBtn = document.getElementById('btn-gitlab-configure');

    if (hasGitLab) {
      setStatus('gitlab-status-text', 'Configured', 'success');
      if (badge) {
        badge.className = 'integration-status connected';
        badge.innerHTML = '<i class="fa-solid fa-circle"></i> Configured';
      }
      if (detailArea) detailArea.classList.add('visible');
      if (configureBtn) configureBtn.textContent = 'Settings';
    } else {
      setStatus('gitlab-status-text', 'Not configured');
      if (badge) {
        badge.className = 'integration-status disconnected';
        badge.innerHTML = '<i class="fa-solid fa-circle"></i> Not Configured';
      }
      if (detailArea) detailArea.classList.remove('visible');
    }
  }

  document
    .getElementById('btn-gitlab-configure')
    ?.addEventListener('click', function () {
      var detail = document.getElementById('gitlab-detail');
      detail.classList.toggle('visible');
    });

  document
    .getElementById('btn-gitlab-copy-url')
    ?.addEventListener('click', function () {
      var input = document.getElementById('gitlab-webhook-url');
      if (!input) return;
      try {
        navigator.clipboard.writeText(input.value).then(function () {
          var btn = document.getElementById('btn-gitlab-copy-url');
          var orig = btn.innerHTML;
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
          setTimeout(function () {
            btn.innerHTML = orig;
          }, 2000);
        });
      } catch (_) {
        input.select();
        document.execCommand('copy');
      }
    });

  // ============================================================
  // Handle OAuth redirect callback
  // ============================================================
  (function handleOAuthCallback() {
    var params = new URLSearchParams(window.location.search);
    var integration = params.get('integration');
    var status = params.get('status');
    var message = params.get('message');

    if (integration && status) {
      if (status === 'success') {
        setStatus(
          integration + '-status-text',
          message || 'Connected successfully',
          'success',
        );
      } else if (status === 'error') {
        setStatus(
          integration + '-status-text',
          message || 'Connection failed',
          'error',
        );
      }
      var newUrl = window.location.pathname + (window.location.hash || '');
      window.history.replaceState({}, document.title, newUrl);
      setTimeout(function () {
        location.reload();
      }, 1500);
    }
  })();

  // ============================================================
  // Init
  // ============================================================
  loadUserProfile();
  var checkInterval = setInterval(function () {
    if (userData) {
      applyUserDataToUI();
      clearInterval(checkInterval);
    }
  }, 200);
  setTimeout(function () {
    if (!userData) {
      applyUserDataToUI();
    }
  }, 3000);
});
