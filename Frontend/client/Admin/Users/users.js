window.NibrasReact.run(function () {
  var currentPage = 1,
    totalPages = 1,
    totalUsers = 0,
    searchTimeout = null;
  var editTargetId = null,
    banTargetId = null,
    pointsTargetId = null,
    pointsCurrentVal = 0;

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

  function getFilters() {
    var p = { page: currentPage, limit: 20 };
    ['search', 'role', 'status', 'institution'].forEach(function (k) {
      var el = document.getElementById(
        k === 'search' ? 'searchInput' : k + 'Filter',
      );
      if (el && el.value.trim()) p[k] = el.value.trim();
    });
    return p;
  }

  function qs(params) {
    var parts = [];
    Object.keys(params).forEach(function (k) {
      if (params[k] != null && params[k] !== '')
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    });
    return parts.length ? '?' + parts.join('&') : '';
  }

  async function loadUsers() {
    var tc = document.getElementById('table-container'),
      pg = document.getElementById('pagination');
    tc.innerHTML =
      '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading users...</p></div>';
    pg.style.display = 'none';
    try {
      var params = getFilters(),
        res = await api('/admin/users' + qs(params));
      var data = res?.data || res || {};
      var users = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
          ? data.users
          : [];
      var meta = data?.pagination || data?.meta || {};
      totalPages = meta?.totalPages || meta?.pages || 1;
      totalUsers = meta?.total || meta?.totalCount || users.length;
      renderTable(users);
      pg.style.display =
        totalPages > 1 ? 'flex' : totalUsers > 20 ? 'flex' : 'none';
      document.getElementById('pagination-info').textContent =
        totalPages > 1
          ? 'Page ' +
            currentPage +
            ' of ' +
            totalPages +
            ' (' +
            totalUsers +
            ' users)'
          : totalUsers + ' user' + (totalUsers !== 1 ? 's' : '');
      document.getElementById('prevBtn').disabled = currentPage <= 1;
      document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    } catch (err) {
      tc.innerHTML =
        '<div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load users: ' +
        esc(err.message || 'Unknown error') +
        '</p><button class="btn-primary" onclick="location.reload()" style="margin-top:1rem;"><i class="fa-solid fa-rotate"></i> Retry</button></div>';
    }
  }

  function renderTable(users) {
    var tc = document.getElementById('table-container');
    if (users.length === 0) {
      var hasFilters = [
        'searchInput',
        'roleFilter',
        'statusFilter',
        'institutionFilter',
      ].some(function (id) {
        var el = document.getElementById(id);
        return el && el.value.trim();
      });
      tc.innerHTML = hasFilters
        ? "<div class=\"empty-state\"><i class=\"fa-solid fa-search\"></i><p>No users match your filters</p><button class=\"btn-primary\" onclick=\"document.getElementById('searchInput').value='';document.getElementById('roleFilter').value='';document.getElementById('statusFilter').value='';document.getElementById('institutionFilter').value='';location.reload()\" style=\"margin-top:0.5rem;\">Clear Filters</button></div>"
        : '<div class="empty-state"><i class="fa-solid fa-users"></i><p>No users found</p></div>';
      return;
    }

    var html =
      '<table class="data-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Institution</th><th>Status</th><th>Rep</th><th>Joined</th><th>Actions</th></tr></thead><tbody>';
    users.forEach(function (u) {
      var id = u._id || u.id || '',
        name = u.name || u.displayName || u.username || 'Unknown',
        email = u.email || '—';
      var role = (u.role?.name || u.role || 'student').toLowerCase();
      var status = (u.status || 'active').toLowerCase();
      var inst = u.institution || u.affiliation || '—';
      var rep = u.reputation || u.points || 0;
      var joined = u.createdAt
        ? new Date(u.createdAt).toLocaleDateString()
        : '—';
      var initials = gi(name);
      html +=
        '<tr><td><div class="user-name-cell"><span class="user-avatar-sm">' +
        initials +
        '</span><div><div class="name">' +
        esc(name) +
        '</div></div></div></td>' +
        '<td style="color:var(--text-secondary);font-size:0.82rem;">' +
        esc(email) +
        '</td>' +
        '<td><span class="role-badge ' +
        role +
        '">' +
        esc(role) +
        '</span></td>' +
        '<td style="font-size:0.82rem;color:var(--text-secondary);">' +
        esc(inst) +
        '</td>' +
        '<td><span class="status-badge-sm ' +
        status +
        '">' +
        esc(status) +
        '</span></td>' +
        '<td><span class="rep-badge-sm">' +
        rep +
        '</span></td>' +
        '<td style="font-size:0.82rem;color:var(--text-secondary);">' +
        joined +
        '</td>' +
        '<td><div class="action-btn-group">' +
        '<button class="action-btn-sm edit-user" data-id="' +
        encodeURIComponent(id) +
        '" data-name="' +
        esc(name) +
        '" data-role="' +
        esc(role) +
        '" data-status="' +
        esc(status) +
        '" data-institution="' +
        esc(inst) +
        '" title="Edit"><i class="fa-solid fa-pen"></i></button>' +
        '<button class="action-btn-sm danger ban-user" data-id="' +
        encodeURIComponent(id) +
        '" data-name="' +
        esc(name) +
        '" title="Ban"><i class="fa-solid fa-ban"></i></button>' +
        '<button class="action-btn-sm warning adjust-points" data-id="' +
        encodeURIComponent(id) +
        '" data-name="' +
        esc(name) +
        '" data-rep="' +
        rep +
        '" title="Adjust Points"><i class="fa-solid fa-coins"></i></button>' +
        '</div></td></tr>';
    });
    html += '</tbody></table>';
    tc.innerHTML = html;

    tc.querySelectorAll('.edit-user').forEach(function (b) {
      b.addEventListener('click', function () {
        openEditModal(b.dataset);
      });
    });
    tc.querySelectorAll('.ban-user').forEach(function (b) {
      b.addEventListener('click', function () {
        openBanModal(b.dataset);
      });
    });
    tc.querySelectorAll('.adjust-points').forEach(function (b) {
      b.addEventListener('click', function () {
        openPointsModal(b.dataset);
      });
    });
  }

  function goToPage(p) {
    if (p >= 1 && p <= totalPages) {
      currentPage = p;
      loadUsers();
    }
  }

  function initFilters() {
    var si = document.getElementById('searchInput');
    if (si)
      si.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
          currentPage = 1;
          loadUsers();
        }, 300);
      });
    ['roleFilter', 'statusFilter', 'institutionFilter'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el)
        el.addEventListener('change', function () {
          currentPage = 1;
          loadUsers();
        });
    });
    document.getElementById('prevBtn').addEventListener('click', function () {
      goToPage(currentPage - 1);
    });
    document.getElementById('nextBtn').addEventListener('click', function () {
      goToPage(currentPage + 1);
    });
  }

  /* ---- Edit Modal ---- */
  function openEditModal(data) {
    editTargetId = decodeURIComponent(data.id);
    document.getElementById('edit-user-label').textContent =
      'Editing: ' + data.name;
    document.getElementById('edit-role').value = data.role || 'student';
    document.getElementById('edit-status').value = data.status || 'active';
    document.getElementById('edit-institution').value = data.institution || '';
    document.getElementById('edit-modal').classList.add('active');
  }

  function initEditModal() {
    var modal = document.getElementById('edit-modal');
    document
      .getElementById('edit-cancel')
      .addEventListener('click', function () {
        modal.classList.remove('active');
        editTargetId = null;
      });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        editTargetId = null;
      }
    });
    document
      .getElementById('edit-save')
      .addEventListener('click', async function () {
        if (!editTargetId) return;
        var btn = this;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        try {
          var body = {
            role: document.getElementById('edit-role').value,
            status: document.getElementById('edit-status').value,
          };
          var inst = document.getElementById('edit-institution').value.trim();
          if (inst) body.institution = inst;
          await api('/admin/users/' + encodeURIComponent(editTargetId), {
            method: 'PATCH',
            body: body,
          });
          toast('User updated successfully', 'success');
          modal.classList.remove('active');
          editTargetId = null;
          loadUsers();
        } catch (err) {
          toast('Failed to update: ' + (err.message || 'Error'), 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
        }
      });
  }

  /* ---- Ban Modal ---- */
  function openBanModal(data) {
    banTargetId = decodeURIComponent(data.id);
    document.getElementById('ban-user-name').textContent = data.name;
    document.getElementById('ban-user-label').textContent =
      'Ban "' + data.name + '" from the platform';
    document.getElementById('ban-reason').value = '';
    // Reset duration
    document
      .querySelectorAll('#ban-duration .duration-option')
      .forEach(function (b) {
        b.classList.toggle('selected', b.dataset.value === 'permanent');
      });
    document.getElementById('ban-modal').classList.add('active');
  }

  function initBanModal() {
    var modal = document.getElementById('ban-modal');
    document
      .getElementById('ban-cancel')
      .addEventListener('click', function () {
        modal.classList.remove('active');
        banTargetId = null;
      });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        banTargetId = null;
      }
    });

    document
      .querySelectorAll('#ban-duration .duration-option')
      .forEach(function (b) {
        b.addEventListener('click', function () {
          document
            .querySelectorAll('#ban-duration .duration-option')
            .forEach(function (x) {
              x.classList.remove('selected');
            });
          b.classList.add('selected');
        });
      });

    document
      .getElementById('ban-confirm')
      .addEventListener('click', async function () {
        if (!banTargetId) return;
        var reason = document.getElementById('ban-reason').value.trim();
        if (!reason) {
          alert('Please provide a reason for the ban.');
          return;
        }
        var duration = document.querySelector(
          '#ban-duration .duration-option.selected',
        );
        var durationVal = duration ? duration.dataset.value : 'permanent';
        var btn = this;
        btn.disabled = true;
        btn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Banning...';
        try {
          await api(
            '/admin/users/' + encodeURIComponent(banTargetId) + '/ban',
            { method: 'POST', body: { reason: reason, duration: durationVal } },
          );
          toast('User banned successfully', 'success');
          modal.classList.remove('active');
          banTargetId = null;
          loadUsers();
        } catch (err) {
          toast('Failed to ban: ' + (err.message || 'Error'), 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-ban"></i> Ban User';
        }
      });
  }

  /* ---- Points Modal ---- */
  function openPointsModal(data) {
    pointsTargetId = decodeURIComponent(data.id);
    pointsCurrentVal = parseInt(data.rep) || 0;
    document.getElementById('points-current').textContent = pointsCurrentVal;
    document.getElementById('points-user-label').textContent =
      'Adjust points for: ' + data.name;
    document.getElementById('points-amount').value = '';
    document.getElementById('points-reason').value = '';
    document.getElementById('points-sign').textContent = '+';
    document.getElementById('points-sign').className = 'points-sign positive';
    document.getElementById('points-modal').classList.add('active');
  }

  function initPointsModal() {
    var modal = document.getElementById('points-modal');
    document
      .getElementById('points-cancel')
      .addEventListener('click', function () {
        modal.classList.remove('active');
        pointsTargetId = null;
      });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        pointsTargetId = null;
      }
    });

    document
      .getElementById('points-amount')
      .addEventListener('input', function () {
        var val = parseInt(this.value) || 0;
        var sign = document.getElementById('points-sign');
        if (val >= 0) {
          sign.textContent = '+';
          sign.className = 'points-sign positive';
        } else {
          sign.textContent = '';
          sign.className = 'points-sign negative';
        }
        var preview = document.getElementById('points-preview');
        preview.innerHTML =
          'Current: <strong>' +
          pointsCurrentVal +
          '</strong> → New: <strong>' +
          (pointsCurrentVal + val) +
          '</strong>';
      });

    document
      .getElementById('points-confirm')
      .addEventListener('click', async function () {
        if (!pointsTargetId) return;
        var amount = document.getElementById('points-amount').value.trim();
        var reason = document.getElementById('points-reason').value.trim();
        if (!amount || isNaN(parseInt(amount)) || parseInt(amount) === 0) {
          alert('Please enter a valid point amount (non-zero).');
          return;
        }
        if (!reason) {
          alert('Please provide a reason.');
          return;
        }
        var btn = this;
        btn.disabled = true;
        btn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Adjusting...';
        try {
          await api(
            '/admin/users/' +
              encodeURIComponent(pointsTargetId) +
              '/adjust-points',
            {
              method: 'POST',
              body: { points: parseInt(amount), reason: reason },
            },
          );
          toast('Points adjusted successfully', 'success');
          modal.classList.remove('active');
          pointsTargetId = null;
          loadUsers();
        } catch (err) {
          toast(
            'Failed to adjust points: ' + (err.message || 'Error'),
            'error',
          );
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-coins"></i> Adjust Points';
        }
      });
  }

  function checkToast() {
    try {
      var m = localStorage.getItem('adminToast');
      if (m) {
        localStorage.removeItem('adminToast');
        var p = JSON.parse(m);
        toast(p.message, p.type || 'success');
      }
    } catch (_) {}
  }

  updateSidebar();
  initTheme();
  checkToast();
  initFilters();
  initEditModal();
  initBanModal();
  initPointsModal();
  loadUsers();
});
