window.NibrasReact.run(function () {
  var currentPage = 1,
    totalPages = 1,
    totalBackups = 0;
  var restoreTargetId = null,
    restoreTargetName = '';

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

  function formatSize(bytes) {
    if (bytes == null || isNaN(bytes)) return '—';
    if (bytes === 0) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    if (i >= units.length) i = units.length - 1;
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return iso;
    }
  }

  function updateRetentionStats(backups) {
    var daily = 0,
      weekly = 0,
      latest = null,
      totalBytes = 0;
    if (Array.isArray(backups)) {
      backups.forEach(function (b) {
        totalBytes += Number(b.size || b.sizeBytes || 0);
        if (!latest || new Date(b.createdAt || b.date) > new Date(latest))
          latest = b.createdAt || b.date;
        var type = (b.type || 'daily').toLowerCase();
        if (type === 'weekly') weekly++;
        else daily++;
      });
    }
    document.getElementById('daily-count').textContent = daily;
    document.getElementById('weekly-count').textContent = weekly;
    document.getElementById('latest-backup').textContent = latest
      ? formatDate(latest)
      : 'No backups yet';
    document.getElementById('total-size').textContent = formatSize(totalBytes);
  }

  async function loadBackups() {
    var tc = document.getElementById('table-container'),
      pg = document.getElementById('pagination');
    tc.innerHTML =
      '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading backups...</p></div>';
    pg.style.display = 'none';
    try {
      var params = { page: currentPage, limit: 20 };
      var res = await api('/admin/backups' + qs(params));
      var data = res?.data || res || {};
      var backups = Array.isArray(data)
        ? data
        : Array.isArray(data?.backups)
          ? data.backups
          : [];
      var meta = data?.pagination || data?.meta || {};
      totalPages = meta?.totalPages || meta?.pages || 1;
      totalBackups = meta?.total || meta?.totalCount || backups.length;

      updateRetentionStats(backups);
      renderTable(backups);

      pg.style.display =
        totalPages > 1 ? 'flex' : totalBackups > 20 ? 'flex' : 'none';
      document.getElementById('pagination-info').textContent =
        totalPages > 1
          ? 'Page ' +
            currentPage +
            ' of ' +
            totalPages +
            ' (' +
            totalBackups +
            ' backups)'
          : totalBackups + ' backup' + (totalBackups !== 1 ? 's' : '');
      document.getElementById('prevBtn').disabled = currentPage <= 1;
      document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    } catch (err) {
      tc.innerHTML =
        '<div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load backups: ' +
        esc(err.message || 'Unknown error') +
        '</p><p style="font-size:0.82rem;color:var(--text-secondary);margin-top:0.5rem;">Backup endpoints may not be implemented on the backend yet.</p><button class="btn-primary" onclick="location.reload()" style="margin-top:1rem;"><i class="fa-solid fa-rotate"></i> Retry</button></div>';
    }
  }

  function renderTable(backups) {
    var tc = document.getElementById('table-container');
    if (backups.length === 0) {
      tc.innerHTML =
        '<div class="empty-state"><i class="fa-solid fa-database"></i><p>No backups found</p><p style="font-size:0.82rem;color:var(--text-secondary);margin-top:0.25rem;">Click "Trigger Backup" to create your first backup.</p></div>';
      return;
    }

    var u = null;
    try {
      u = JSON.parse(localStorage.getItem('user') || '{}');
    } catch (_) {}
    var role = String(u?.role?.name || u?.role || '').toLowerCase();
    var isSuperAdmin = role === 'super-admin';

    var html =
      '<table class="data-table"><thead><tr><th>Date / Time</th><th>Type</th><th>Size</th><th>Status</th><th>S3 Key</th><th>Actions</th></tr></thead><tbody>';
    backups.forEach(function (b) {
      var id = b._id || b.id || '';
      var date = formatDate(b.createdAt || b.date || b.timestamp);
      var type = (b.type || 'daily').toLowerCase();
      var size = formatSize(b.size || b.sizeBytes || b.fileSize);
      var status = (b.status || 'completed').toLowerCase();
      var s3Key = b.s3Key || b.key || b.path || '—';
      var name = b.name || b.filename || s3Key;

      html +=
        '<tr>' +
        '<td style="font-size:0.85rem;">' +
        esc(date) +
        '</td>' +
        '<td><span class="badge-' +
        (type === 'weekly' ? 'weekly' : 'daily') +
        '">' +
        esc(type) +
        '</span></td>' +
        '<td><span class="backup-size">' +
        esc(size) +
        '</span></td>' +
        '<td><span class="badge-' +
        esc(status) +
        '">' +
        esc(status) +
        '</span></td>' +
        '<td><span class="backup-s3-key" title="' +
        esc(s3Key) +
        '">' +
        esc(s3Key) +
        '</span></td>' +
        '<td><div class="action-btn-group">' +
        (isSuperAdmin
          ? '<button class="action-btn-sm danger restore-backup" data-id="' +
            encodeURIComponent(id) +
            '" data-name="' +
            esc(name) +
            '" title="Restore"><i class="fa-solid fa-rotate-left"></i></button>'
          : '<span style="font-size:0.75rem;color:var(--text-tertiary);">—</span>') +
        '</div></td></tr>';
    });
    html += '</tbody></table>';
    tc.innerHTML = html;

    if (isSuperAdmin) {
      tc.querySelectorAll('.restore-backup').forEach(function (b) {
        b.addEventListener('click', function () {
          openRestoreModal(b.dataset);
        });
      });
    }
  }

  function goToPage(p) {
    if (p >= 1 && p <= totalPages) {
      currentPage = p;
      loadBackups();
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

  /* ---- Trigger Modal ---- */
  function initTriggerModal() {
    var modal = document.getElementById('trigger-modal');
    document
      .getElementById('trigger-cancel')
      .addEventListener('click', function () {
        modal.classList.remove('active');
      });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.classList.remove('active');
    });
    document
      .getElementById('trigger-confirm')
      .addEventListener('click', async function () {
        var btn = this;
        btn.disabled = true;
        btn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Starting...';
        try {
          await api('/admin/backups/trigger', { method: 'POST' });
          toast('Backup triggered successfully', 'success');
          modal.classList.remove('active');
          loadBackups();
        } catch (err) {
          toast(
            'Failed to trigger backup: ' + (err.message || 'Error'),
            'error',
          );
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-play"></i> Start Backup';
        }
      });
  }

  /* ---- Restore Modal ---- */
  function openRestoreModal(data) {
    restoreTargetId = decodeURIComponent(data.id);
    restoreTargetName = data.name;
    document.getElementById('restore-backup-label').textContent =
      'Restore from: ' + data.name;
    document.getElementById('restore-backup-name').textContent = data.name;
    document.getElementById('restore-confirm-input').value = '';
    document.getElementById('restore-confirm').disabled = true;
    document.getElementById('restore-modal').classList.add('active');
  }

  function initRestoreModal() {
    var modal = document.getElementById('restore-modal');
    document
      .getElementById('restore-cancel')
      .addEventListener('click', function () {
        modal.classList.remove('active');
        restoreTargetId = null;
        restoreTargetName = '';
      });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        restoreTargetId = null;
        restoreTargetName = '';
      }
    });

    var input = document.getElementById('restore-confirm-input');
    input.addEventListener('input', function () {
      var btn = document.getElementById('restore-confirm');
      btn.disabled = this.value.trim() !== restoreTargetName;
    });

    document
      .getElementById('restore-confirm')
      .addEventListener('click', async function () {
        if (!restoreTargetId) return;
        var btn = this;
        btn.disabled = true;
        btn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Restoring...';
        try {
          await api(
            '/admin/backups/' +
              encodeURIComponent(restoreTargetId) +
              '/restore',
            { method: 'POST' },
          );
          toast('Backup restored successfully', 'success');
          modal.classList.remove('active');
          restoreTargetId = null;
          restoreTargetName = '';
          loadBackups();
        } catch (err) {
          toast(
            'Failed to restore backup: ' + (err.message || 'Error'),
            'error',
          );
        } finally {
          btn.disabled = false;
          btn.innerHTML =
            '<i class="fa-solid fa-rotate-left"></i> Restore Backup';
        }
      });
  }

  /* ---- Sidebar Trigger Button ---- */
  document
    .getElementById('triggerBackupBtn')
    .addEventListener('click', function () {
      document.getElementById('trigger-modal').classList.add('active');
    });

  updateSidebar();
  initTheme();
  initPagination();
  initTriggerModal();
  initRestoreModal();
  loadBackups();
});
