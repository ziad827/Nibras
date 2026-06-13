window.NibrasReact.run(function () {
  var currentPage = 1,
    totalPages = 1,
    totalLogs = 0,
    logsCache = [];

  function gi(n) {
    if (!n) return 'U';
    return (
      n
        .split(' ')
        .map(function (s) {
          return s.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U'
    );
  }
  function esc(s) {
    if (typeof s !== 'string') return String(s || '');
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function updateSidebar() {
    try {
      var u = JSON.parse(localStorage.getItem('user') || '{}'),
        n = u.name || u.login || 'Admin',
        r = String(u.role?.name || u.role || 'admin'),
        i = gi(n);
      [
        'sidebar-name',
        'sidebar-role',
        'sidebar-avatar',
        'header-avatar',
      ].forEach(function (id) {
        var e = document.getElementById(id);
        if (!e) return;
        if (id === 'sidebar-name') e.textContent = n;
        else if (id === 'sidebar-role') e.textContent = r;
        else e.textContent = i;
      });
    } catch (_) {}
  }

  function toast(msg, type) {
    var c = document.getElementById('toast-container'),
      t = document.createElement('div');
    t.className = 'toast ' + (type || 'success');
    t.textContent = msg;
    c.appendChild(t);
    requestAnimationFrame(function () {
      t.classList.add('show');
    });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () {
        t.remove();
      }, 300);
    }, 3500);
  }

  async function api(path, opts) {
    opts = opts || {};
    var fn = window.NibrasServices?.apiFetch || window.NibrasShared?.apiFetch;
    if (fn) return await fn(path, Object.assign({ service: 'admin' }, opts));
    if (window.NibrasShared?.apiFetch)
      return await window.NibrasShared.apiFetch(
        path,
        Object.assign({ service: 'admin' }, opts),
      );
    throw new Error('API not available');
  }

  function initTheme() {
    var btn = document.getElementById('themeBtn'),
      icon = btn?.querySelector('i'),
      logo = document.getElementById('app-logo');
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    if (cur === 'dark') {
      if (icon) icon.className = 'fa-solid fa-sun';
      if (logo) logo.src = '../../Assets/images/logo-dark.png';
    } else {
      if (icon) icon.className = 'fa-regular fa-moon';
      if (logo) logo.src = '../../Assets/images/logo-light.png';
    }
    if (btn)
      btn.addEventListener('click', function () {
        btn.style.transform = 'scale(1.2)';
        setTimeout(function () {
          btn.style.transform = 'scale(1)';
        }, 200);
        var h = document.documentElement,
          c = h.getAttribute('data-theme'),
          n = c === 'light' ? 'dark' : 'light';
        h.setAttribute('data-theme', n);
        localStorage.setItem('theme', n);
        if (n === 'dark') {
          if (icon) icon.className = 'fa-solid fa-sun';
          if (logo) logo.src = '../../Assets/images/logo-dark.png';
        } else {
          if (icon) icon.className = 'fa-regular fa-moon';
          if (logo) logo.src = '../../Assets/images/logo-light.png';
        }
      });
  }

  function qs(params) {
    var parts = [];
    Object.keys(params).forEach(function (k) {
      if (params[k] != null && params[k] !== '')
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    });
    return parts.length ? '?' + parts.join('&') : '';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var now = new Date();
      var opts = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      if (d.getFullYear() === now.getFullYear()) delete opts.year;
      return d.toLocaleDateString('en-US', opts);
    } catch (_) {
      return iso;
    }
  }

  function getFilters() {
    var p = { page: currentPage, limit: 20 };
    var si = document.getElementById('searchInput');
    if (si && si.value.trim()) p.search = si.value.trim();
    var af = document.getElementById('actionFilter');
    if (af && af.value) p.action = af.value;
    var df = document.getElementById('dateFrom');
    if (df && df.value) p.from = df.value;
    var dt = document.getElementById('dateTo');
    if (dt && dt.value) p.to = dt.value;
    if (p.from && p.to && p.from > p.to) {
      p.from = p.to;
    }
    return p;
  }

  function getActionClass(action) {
    var a = (action || 'other').toLowerCase();
    if (a.includes('create') || a === 'post' || a === 'register')
      return 'create';
    if (a.includes('update') || a.includes('edit') || a === 'patch')
      return 'update';
    if (a.includes('delete') || a.includes('remove') || a === 'archive')
      return 'delete';
    if (a === 'login' || a === 'logout') return 'login';
    if (a === 'ban' || a === 'unban') return 'ban';
    if (a.includes('restore')) return 'restore';
    if (a.includes('backup')) return 'backup';
    if (a.includes('config')) return 'config';
    return 'other';
  }

  function formatChanges(changes) {
    if (!changes) return null;
    try {
      return JSON.stringify(changes, null, 2);
    } catch (_) {
      return String(changes);
    }
  }

  async function loadLogs() {
    var tc = document.getElementById('table-container'),
      pg = document.getElementById('pagination');
    tc.innerHTML =
      '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading audit logs...</p></div>';
    pg.style.display = 'none';
    try {
      var params = getFilters(),
        res = await api('/admin/audit-logs' + qs(params));
      var data = res?.data || res || {};
      logsCache = Array.isArray(data)
        ? data
        : Array.isArray(data?.logs)
          ? data.logs
          : Array.isArray(data?.auditLogs)
            ? data.auditLogs
            : [];
      var meta = data?.pagination || data?.meta || {};
      totalPages = meta?.totalPages || meta?.pages || 1;
      totalLogs = meta?.total || meta?.totalCount || logsCache.length;

      renderTable(logsCache);

      pg.style.display =
        totalPages > 1 ? 'flex' : totalLogs > 20 ? 'flex' : 'none';
      document.getElementById('pagination-info').textContent =
        totalPages > 1
          ? 'Page ' +
            currentPage +
            ' of ' +
            totalPages +
            ' (' +
            totalLogs +
            ' logs)'
          : totalLogs + ' log' + (totalLogs !== 1 ? 's' : '');
      document.getElementById('prevBtn').disabled = currentPage <= 1;
      document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    } catch (err) {
      logsCache = [];
      tc.innerHTML =
        '<div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load audit logs: ' +
        esc(err.message || 'Unknown error') +
        '</p><p style="font-size:0.82rem;color:var(--text-secondary);margin-top:0.5rem;">Audit log endpoints may not be implemented on the backend yet.</p><button class="btn-primary" onclick="location.reload()" style="margin-top:1rem;"><i class="fa-solid fa-rotate"></i> Retry</button></div>';
    }
  }

  function renderTable(logs) {
    var tc = document.getElementById('table-container');
    if (logs.length === 0) {
      var hasFilters = [
        'searchInput',
        'actionFilter',
        'dateFrom',
        'dateTo',
      ].some(function (id) {
        var el = document.getElementById(id);
        return el && (el.value || '').trim();
      });
      tc.innerHTML = hasFilters
        ? "<div class=\"empty-state\"><i class=\"fa-solid fa-search\"></i><p>No logs match your filters</p><button class=\"btn-primary\" onclick=\"document.getElementById('searchInput').value='';document.getElementById('actionFilter').value='';document.getElementById('dateFrom').value='';document.getElementById('dateTo').value='';location.reload()\" style=\"margin-top:0.5rem;\">Clear Filters</button></div>"
        : '<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><p>No audit logs found</p></div>';
      return;
    }

    var html =
      '<table class="data-table"><thead><tr><th style="width:40px;"></th><th>Timestamp</th><th>User</th><th>Action</th><th>Resource</th><th>IP</th></tr></thead><tbody>';
    logs.forEach(function (log, idx) {
      var id = log._id || log.id || 'log-' + idx;
      var ts = formatDate(log.createdAt || log.timestamp);
      var userName =
        log.user?.name || log.userName || log.user?.email || 'System';
      var initials = gi(userName);
      var action = (log.action || 'unknown').toLowerCase();
      var actionClass = getActionClass(action);
      var resource = log.resource || log.resourceId || '—';
      var resourceLabel =
        typeof resource === 'string'
          ? resource
          : resource?.name || resource?._id || '—';
      var ip = log.ip || log.ipAddress || '—';

      html +=
        '<tr class="log-row" data-id="' +
        esc(id) +
        '" data-idx="' +
        idx +
        '">' +
        '<td><button class="expand-btn" data-id="' +
        esc(id) +
        '" title="View details"><i class="fa-solid fa-chevron-right"></i></button></td>' +
        '<td><span class="audit-timestamp">' +
        esc(ts) +
        '</span></td>' +
        '<td><div class="audit-user-cell"><span class="audit-user-avatar">' +
        esc(initials) +
        '</span>' +
        esc(userName) +
        '</div></td>' +
        '<td><span class="audit-action-badge ' +
        esc(actionClass) +
        '">' +
        esc(action) +
        '</span></td>' +
        '<td style="font-size:0.82rem;color:var(--text-secondary);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' +
        esc(resourceLabel.toString()) +
        '">' +
        esc(resourceLabel.toString().slice(0, 50)) +
        '</td>' +
        '<td><span class="audit-ip">' +
        esc(ip) +
        '</span></td>' +
        '</tr>' +
        '<tr class="audit-row-detail" data-id="' +
        esc(id) +
        '"><td colspan="6" class="audit-detail-cell"><div class="audit-detail-inner">' +
        '<div class="audit-detail-header">Changes <span style="font-weight:400;text-transform:none;letter-spacing:0;">' +
        esc(id) +
        '</span></div>' +
        renderDetailContent(log.changes) +
        '</div></td></tr>';
    });
    html += '</tbody></table>';
    tc.innerHTML = html;

    tc.querySelectorAll('.log-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('.expand-btn')) return;
        var btn = row.querySelector('.expand-btn');
        if (btn) btn.click();
      });
    });

    tc.querySelectorAll('.expand-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.dataset.id;
        var detailRow = tc.querySelector(
          '.audit-row-detail[data-id="' + id + '"]',
        );
        if (!detailRow) return;
        var isExpanded = detailRow.classList.contains('expanded');
        if (isExpanded) {
          detailRow.classList.remove('expanded');
          btn.classList.remove('expanded');
        } else {
          detailRow.classList.add('expanded');
          btn.classList.add('expanded');
        }
      });
    });
  }

  function renderDetailContent(changes) {
    var formatted = formatChanges(changes);
    if (!formatted) {
      return '<div class="audit-no-details">No details recorded for this action.</div>';
    }
    return '<pre class="json-view">' + esc(formatted) + '</pre>';
  }

  function goToPage(p) {
    if (p >= 1 && p <= totalPages) {
      currentPage = p;
      loadLogs();
    }
  }

  function initPagination() {
    document.getElementById('prevBtn').addEventListener('click', function () {
      goToPage(currentPage - 1);
    });
    document.getElementById('nextBtn').addEventListener('click', function () {
      goToPage(currentPage + 1);
    });
  }

  function initFilters() {
    var si = document.getElementById('searchInput');
    if (si)
      si.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          currentPage = 1;
          loadLogs();
        }
      });

    document
      .getElementById('applyFiltersBtn')
      .addEventListener('click', function () {
        currentPage = 1;
        loadLogs();
      });
    document
      .getElementById('clearFiltersBtn')
      .addEventListener('click', function () {
        ['searchInput', 'actionFilter', 'dateFrom', 'dateTo'].forEach(
          function (id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
          },
        );
        currentPage = 1;
        loadLogs();
      });
  }

  updateSidebar();
  initTheme();
  initPagination();
  initFilters();
  loadLogs();
});
