window.NibrasReact.run(() => {
  const statsContainer = document.getElementById('stats-container');
  const auditContainer = document.getElementById('audit-logs-container');
  const statusContainer = document.getElementById('system-status');

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = now - d;
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return d.toLocaleDateString();
    } catch (_) {
      return String(dateStr || '');
    }
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pluralize(count, singular, plural) {
    return count === 1
      ? `${count} ${singular}`
      : `${count} ${plural || singular + 's'}`;
  }

  function getInitials(name) {
    if (!name) return 'A';
    return (
      name
        .split(' ')
        .map(function (s) {
          return s.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'A'
    );
  }

  function updateSidebarUser() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const name = user.name || user.login || 'Admin';
      const role = String(user.role?.name || user.role || 'admin');
      const initials = getInitials(name);

      const sidebarName = document.getElementById('sidebar-name');
      const sidebarRole = document.getElementById('sidebar-role');
      const sidebarAvatar = document.getElementById('sidebar-avatar');
      const headerAvatar = document.getElementById('header-avatar');

      if (sidebarName) sidebarName.textContent = name;
      if (sidebarRole) sidebarRole.textContent = role;
      if (sidebarAvatar) sidebarAvatar.textContent = initials;
      if (headerAvatar) headerAvatar.textContent = initials;
    } catch (_) {}
  }

  async function apiCall(path, options) {
    options = options || {};
    const fetchFn =
      window.NibrasServices?.apiFetch || window.NibrasShared?.apiFetch;
    if (fetchFn) {
      return await fetchFn(path, Object.assign({ service: 'admin' }, options));
    }
    const shared = window.NibrasShared || {};
    if (shared.apiFetch) {
      return await shared.apiFetch(
        path,
        Object.assign({ service: 'admin' }, options),
      );
    }
    throw new Error('API not available');
  }

  async function loadStats() {
    statsContainer.innerHTML = '';
    const loadingCards = [
      { label: 'Total Users', icon: 'fa-solid fa-users', color: 'blue' },
      { label: 'Total Courses', icon: 'fa-solid fa-book-open', color: 'green' },
      { label: 'Backups', icon: 'fa-solid fa-database', color: 'purple' },
      { label: 'Pending Flags', icon: 'fa-solid fa-flag', color: 'orange' },
    ];
    loadingCards.forEach(function (s) {
      statsContainer.innerHTML += `
                <div class="admin-stat-card">
                    <div class="admin-stat-icon ${s.color}"><i class="${s.icon}"></i></div>
                    <div class="admin-stat-info">
                        <span>${s.label}</span>
                        <h3><i class="fa-solid fa-spinner fa-spin" style="font-size:1rem;opacity:0.5;"></i></h3>
                    </div>
                </div>
            `;
    });

    const results = await Promise.allSettled([
      (async function () {
        const res = await apiCall('/admin/users?page=1&limit=1');
        const data = res?.data || res || {};
        return (
          data?.pagination?.total || data?.meta?.total || data?.total || '—'
        );
      })(),
      (async function () {
        const res = await apiCall('/admin/courses?page=1&limit=1');
        const data = res?.data || res || {};
        return (
          data?.pagination?.total || data?.meta?.total || data?.total || '—'
        );
      })(),
      (async function () {
        const res = await apiCall('/admin/backups');
        const data = res?.data || res || {};
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.backups)
            ? data.backups
            : [];
        return items.length;
      })(),
      (async function () {
        var count = '—';
        try {
          var fs = window.NibrasServices?.flagService;
          if (fs && typeof fs.getQueue === 'function') {
            var result = await fs.getQueue({ status: 'pending' });
            var data = result?.data || result?.flags || result || [];
            count = Array.isArray(data) ? data.length : '—';
          }
        } catch (_) {}
        return count;
      })(),
    ]);

    statsContainer.innerHTML = '';
    var statDefs = [
      {
        label: 'Total Users',
        icon: 'fa-solid fa-users',
        color: 'blue',
        value: results[0].status === 'fulfilled' ? results[0].value : 'Error',
      },
      {
        label: 'Total Courses',
        icon: 'fa-solid fa-book-open',
        color: 'green',
        value: results[1].status === 'fulfilled' ? results[1].value : 'Error',
      },
      {
        label: 'Backups',
        icon: 'fa-solid fa-database',
        color: 'purple',
        value: results[2].status === 'fulfilled' ? results[2].value : 'Error',
      },
      {
        label: 'Pending Flags',
        icon: 'fa-solid fa-flag',
        color: 'orange',
        value: results[3].status === 'fulfilled' ? results[3].value : 'Error',
      },
    ];

    statDefs.forEach(function (s) {
      var link = '';
      if (
        s.label === 'Pending Flags' &&
        typeof s.value === 'number' &&
        s.value > 0
      ) {
        link =
          '<a href="../moderation.html" class="pending-count-link">' +
          s.value +
          '</a>';
      }
      statsContainer.innerHTML += `
                <div class="admin-stat-card">
                    <div class="admin-stat-icon ${s.color}"><i class="${s.icon}"></i></div>
                    <div class="admin-stat-info">
                        <span>${s.label}</span>
                        <h3>${link || s.value}</h3>
                    </div>
                </div>
            `;
    });
  }

  async function loadAuditLogs() {
    auditContainer.innerHTML =
      '<div style="text-align:center;padding:1.5rem;color:var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.2rem;display:block;margin-bottom:0.5rem;"></i><span style="font-size:0.85rem;">Loading audit logs...</span></div>';

    try {
      const res = await apiCall('/admin/audit-logs?limit=5&sort=-createdAt');
      const data = res?.data || res || {};
      const logs = Array.isArray(data)
        ? data
        : Array.isArray(data?.logs)
          ? data.logs
          : Array.isArray(data?.auditLogs)
            ? data.auditLogs
            : [];

      if (logs.length === 0) {
        auditContainer.innerHTML =
          '<div style="text-align:center;padding:2rem;color:var(--text-secondary);"><i class="fa-solid fa-check-circle" style="font-size:1.5rem;display:block;margin-bottom:0.5rem;opacity:0.5;"></i><span style="font-size:0.85rem;">No audit logs yet</span></div>';
        return;
      }

      var html =
        '<table class="audit-log-table"><thead><tr><th>User</th><th>Action</th><th>Resource</th><th>Time</th></tr></thead><tbody>';
      logs.forEach(function (log) {
        var userName =
          log.user?.name || log.userName || log.user?.email || 'System';
        var initials = getInitials(userName);
        var action = (log.action || 'unknown').toLowerCase();
        var actionClass = 'other';
        if (action.includes('create') || action === 'post')
          actionClass = 'create';
        else if (
          action.includes('update') ||
          action.includes('edit') ||
          action === 'patch'
        )
          actionClass = 'update';
        else if (
          action.includes('delete') ||
          action.includes('remove') ||
          action === 'archive'
        )
          actionClass = 'delete';
        var resource = log.resource || log.resourceId || '—';
        var resourceLabel =
          typeof resource === 'string'
            ? resource
            : resource?.name || resource?._id || '—';
        html +=
          '<tr>' +
          '<td><div class="audit-user-cell"><span class="audit-user-avatar">' +
          initials +
          '</span>' +
          escapeHtml(userName) +
          '</div></td>' +
          '<td><span class="audit-action-badge ' +
          actionClass +
          '">' +
          escapeHtml(log.action || 'unknown') +
          '</span></td>' +
          '<td style="font-size:0.8rem;color:var(--text-secondary);">' +
          escapeHtml(resourceLabel.toString().slice(0, 40)) +
          '</td>' +
          '<td><span class="audit-time">' +
          formatDate(log.createdAt || log.timestamp) +
          '</span></td>' +
          '</tr>';
      });
      html += '</tbody></table>';
      auditContainer.innerHTML = html;
    } catch (error) {
      auditContainer.innerHTML =
        '<div style="text-align:center;padding:2rem;color:var(--text-secondary);"><i class="fa-solid fa-circle-info" style="font-size:1.2rem;display:block;margin-bottom:0.5rem;opacity:0.5;"></i><span style="font-size:0.85rem;">Audit log service unavailable</span></div>';
    }
  }

  async function loadSystemStatus() {
    statusContainer.innerHTML =
      '<div style="text-align:center;padding:1.5rem;color:var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.2rem;display:block;margin-bottom:0.5rem;"></i><span style="font-size:0.85rem;">Loading status...</span></div>';

    var backupSchedule = 'Daily 2:00 AM + Weekly Sunday';
    var retentionPolicy = '30 daily + 12 weekly';
    var configItems = [];

    try {
      const res = await apiCall('/admin/config');
      const data = res?.data || res || {};
      if (typeof data === 'object') {
        var featureFlags = data.featureFlags || data.flags || null;
        var gamification = data.gamification || data.gamificationRules || null;
        if (featureFlags) {
          var flagKeys = Object.keys(featureFlags);
          configItems.push('Feature flags: ' + flagKeys.length);
        }
        if (gamification) {
          configItems.push('Gamification rules: active');
        }
        var thresholds = data.thresholds || data.reputationThresholds || null;
        if (thresholds) {
          configItems.push(
            'Reputation thresholds: ' +
              Object.keys(thresholds).length +
              ' levels',
          );
        }
      }
    } catch (_) {}

    var html = '';
    html +=
      '<div class="status-item"><span class="status-label"><span class="status-dot green"></span> Backups</span><span class="status-value">' +
      escapeHtml(backupSchedule) +
      '</span></div>';
    html +=
      '<div class="status-item"><span class="status-label"><span class="status-dot blue"></span> Retention</span><span class="status-value">' +
      escapeHtml(retentionPolicy) +
      '</span></div>';
    if (configItems.length > 0) {
      configItems.forEach(function (item) {
        html +=
          '<div class="status-item"><span class="status-label"><span class="status-dot green"></span> Config</span><span class="status-value">' +
          escapeHtml(item) +
          '</span></div>';
      });
    } else {
      html +=
        '<div class="status-item"><span class="status-label"><span class="status-dot yellow"></span> Config</span><span class="status-value">Using defaults</span></div>';
    }
    statusContainer.innerHTML = html;
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    const themeBtn = document.getElementById('themeBtn');
    const themeIcon = themeBtn?.querySelector('i');
    const appLogo = document.getElementById('app-logo');

    const currentTheme =
      document.documentElement.getAttribute('data-theme') || 'light';
    if (currentTheme === 'dark') {
      if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
      if (appLogo) appLogo.src = '../../Assets/images/logo-dark.png';
    } else {
      if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
      if (appLogo) appLogo.src = '../../Assets/images/logo-light.png';
    }

    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        themeBtn.style.transform = 'scale(1.2)';
        setTimeout(function () {
          themeBtn.style.transform = 'scale(1)';
        }, 200);

        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const newTheme = current === 'light' ? 'dark' : 'light';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        if (newTheme === 'dark') {
          if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
          if (appLogo) appLogo.src = '../../Assets/images/logo-dark.png';
        } else {
          if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
          if (appLogo) appLogo.src = '../../Assets/images/logo-light.png';
        }
      });
    }
  }

  updateSidebarUser();
  initTheme();
  loadStats();
  loadAuditLogs();
  loadSystemStatus();
});
