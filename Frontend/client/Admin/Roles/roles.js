window.NibrasReact.run(function () {
  var assignUserId = null,
    searchTimeout = null;

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

  function toast(msg, tp) {
    var c = document.getElementById('toast-container'),
      t = document.createElement('div');
    t.className = 'toast ' + (tp || 'success');
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

  async function loadRoles() {
    var c = document.getElementById('roles-container');
    c.innerHTML =
      '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading roles...</p></div>';
    try {
      var res = await api('/admin/roles');
      var data = res?.data || res || {};
      var roles = Array.isArray(data)
        ? data
        : Array.isArray(data?.roles)
          ? data.roles
          : [];
      renderRoles(roles);
    } catch (err) {
      c.innerHTML =
        '<div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load roles: ' +
        esc(err.message || 'Unknown error') +
        '</p><button class="btn-primary" onclick="location.reload()" style="margin-top:1rem;"><i class="fa-solid fa-rotate"></i> Retry</button></div>';
    }
  }

  function renderRoles(roles) {
    var c = document.getElementById('roles-container');
    if (roles.length === 0) {
      c.innerHTML =
        '<div class="empty-state"><i class="fa-solid fa-shield-halved"></i><p>No roles defined yet</p><a href="./role-form.html" class="btn-primary" style="display:inline-flex;margin-top:0.5rem;"><i class="fa-solid fa-plus"></i> Create your first role</a></div>';
      return;
    }
    var html = '<div class="role-grid">';
    roles.forEach(function (role) {
      var id = role._id || role.id || '';
      var perms = Array.isArray(role.permissions) ? role.permissions : [];
      var permCount = perms.length;
      var displayPerms = perms.slice(0, 5);
      var extraCount = permCount - 5;
      var userCount = role.userCount || role.users?.length || 0;

      html +=
        '<div class="role-card">' +
        '<div class="role-card-header"><h3>' +
        esc(role.name || 'Unnamed') +
        '</h3></div>' +
        '<p class="role-card-desc">' +
        esc(role.description || 'No description') +
        '</p>' +
        '<div class="role-permissions-summary">';
      displayPerms.forEach(function (p) {
        html += '<span class="perm-badge">' + esc(p) + '</span>';
      });
      if (extraCount > 0)
        html += '<span class="perm-badge more">+' + extraCount + ' more</span>';
      if (permCount === 0)
        html +=
          '<span style="font-size:0.8rem;color:var(--text-tertiary);">No permissions</span>';
      html +=
        '</div>' +
        '<div class="role-card-meta">' +
        '<span><i class="fa-regular fa-user"></i> ' +
        userCount +
        ' user' +
        (userCount !== 1 ? 's' : '') +
        '</span>' +
        '<div class="role-card-actions">' +
        '<a href="./role-form.html?id=' +
        encodeURIComponent(id) +
        '" class="action-btn-sm" title="Edit"><i class="fa-solid fa-pen"></i></a>' +
        '<button class="action-btn-sm assign-role" data-id="' +
        encodeURIComponent(id) +
        '" title="Assign to User"><i class="fa-solid fa-user-plus"></i></button>' +
        '</div>' +
        '</div>' +
        '</div>';
    });
    html += '</div>';
    c.innerHTML = html;

    c.querySelectorAll('.assign-role').forEach(function (b) {
      b.addEventListener('click', function () {
        openAssignModal();
      });
    });
  }

  /* ---- Assign Modal ---- */
  function openAssignModal() {
    loadRoleDropdown();
    document.getElementById('assign-modal').classList.add('active');
  }

  async function loadRoleDropdown() {
    var select = document.getElementById('assign-role-select');
    select.innerHTML = '<option value="">Loading roles...</option>';
    try {
      var res = await api('/admin/roles');
      var data = res?.data || res || {};
      var roles = Array.isArray(data)
        ? data
        : Array.isArray(data?.roles)
          ? data.roles
          : [];
      select.innerHTML = '<option value="">Select a role...</option>';
      roles.forEach(function (r) {
        var opt = document.createElement('option');
        opt.value = r._id || r.id || '';
        opt.textContent = r.name || 'Unnamed';
        select.appendChild(opt);
      });
      if (roles.length === 0)
        select.innerHTML = '<option value="">No roles available</option>';
    } catch (err) {
      select.innerHTML = '<option value="">Failed to load roles</option>';
    }
  }

  function initAssignModal() {
    var modal = document.getElementById('assign-modal');
    document
      .getElementById('assign-cancel')
      .addEventListener('click', function () {
        closeAssignModal();
      });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeAssignModal();
    });

    var searchInput = document.getElementById('assign-user-search');
    var suggestions = document.getElementById('user-suggestions');

    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      var val = this.value.trim();
      if (val.length < 2) {
        suggestions.classList.remove('active');
        suggestions.innerHTML = '';
        return;
      }
      searchTimeout = setTimeout(function () {
        searchUsers(val);
      }, 350);
    });

    searchInput.addEventListener('focus', function () {
      if (suggestions.children.length > 0) suggestions.classList.add('active');
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.user-search-wrapper')) {
        suggestions.classList.remove('active');
      }
    });

    document
      .getElementById('deselect-user')
      .addEventListener('click', function () {
        assignUserId = null;
        document.getElementById('selected-user-badge').style.display = 'none';
        searchInput.value = '';
        searchInput.disabled = false;
        searchInput.focus();
        updateAssignBtn();
      });

    document
      .getElementById('assign-role-select')
      .addEventListener('change', updateAssignBtn);

    document
      .getElementById('assign-confirm')
      .addEventListener('click', async function () {
        var roleId = document.getElementById('assign-role-select').value;
        if (!assignUserId || !roleId) return;
        var btn = this;
        btn.disabled = true;
        btn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Assigning...';
        try {
          await api(
            '/admin/users/' + encodeURIComponent(assignUserId) + '/assign-role',
            { method: 'POST', body: { roleId: roleId } },
          );
          toast('Role assigned successfully', 'success');
          closeAssignModal();
        } catch (err) {
          toast('Failed to assign role: ' + (err.message || 'Error'), 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Assign Role';
        }
      });
  }

  async function searchUsers(query) {
    var suggestions = document.getElementById('user-suggestions');
    try {
      var res = await api(
        '/admin/users?search=' + encodeURIComponent(query) + '&limit=10',
      );
      var data = res?.data || res || {};
      var users = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
          ? data.users
          : [];
      suggestions.innerHTML = '';
      if (users.length === 0) {
        suggestions.innerHTML =
          '<div class="user-suggestion-item" style="color:var(--text-tertiary);">No users found</div>';
      } else {
        users.forEach(function (u) {
          var item = document.createElement('div');
          item.className = 'user-suggestion-item';
          item.innerHTML =
            '<span class="user-avatar-sm">' +
            gi(u.name || u.username || '') +
            '</span><div><div>' +
            esc(u.name || u.username || 'Unknown') +
            '</div><div class="email">' +
            esc(u.email || '') +
            '</div></div>';
          item.dataset.id = u._id || u.id || '';
          item.dataset.name = u.name || u.username || 'Unknown';
          item.addEventListener('click', function () {
            selectUser(this.dataset.id, this.dataset.name);
          });
          suggestions.appendChild(item);
        });
      }
      suggestions.classList.add('active');
    } catch (err) {
      suggestions.innerHTML =
        '<div class="user-suggestion-item" style="color:#ef4444;">Search failed</div>';
      suggestions.classList.add('active');
    }
  }

  function selectUser(id, name) {
    assignUserId = id;
    document.getElementById('assign-user-search').value = '';
    document.getElementById('assign-user-search').disabled = true;
    document.getElementById('selected-user-name').textContent = name;
    document.getElementById('selected-user-badge').style.display =
      'inline-flex';
    document.getElementById('user-suggestions').classList.remove('active');
    updateAssignBtn();
  }

  function updateAssignBtn() {
    var roleId = document.getElementById('assign-role-select').value;
    document.getElementById('assign-confirm').disabled =
      !assignUserId || !roleId;
  }

  function closeAssignModal() {
    document.getElementById('assign-modal').classList.remove('active');
    assignUserId = null;
    document.getElementById('selected-user-badge').style.display = 'none';
    document.getElementById('assign-user-search').value = '';
    document.getElementById('assign-user-search').disabled = false;
    document.getElementById('assign-role-select').value = '';
    document.getElementById('user-suggestions').innerHTML = '';
    document.getElementById('user-suggestions').classList.remove('active');
    document.getElementById('assign-confirm').disabled = true;
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
  initAssignModal();
  loadRoles();
});
