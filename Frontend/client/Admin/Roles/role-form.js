window.NibrasReact.run(function () {
  var isEditMode = false,
    roleId = null;

  var PERMISSION_GROUPS = [
    {
      name: 'Course Management',
      perms: [
        'course:create',
        'course:read',
        'course:update',
        'course:delete',
        'section:create',
        'section:enroll',
        'section:remove-student',
      ],
    },
    {
      name: 'User Management',
      perms: [
        'user:read',
        'user:update',
        'user:ban',
        'user:adjust-points',
        'user:bulk-create',
      ],
    },
    {
      name: 'Role Management',
      perms: ['role:create', 'role:read', 'role:update', 'role:assign'],
    },
    {
      name: 'System',
      perms: [
        'backup:trigger',
        'backup:restore',
        'backup:list',
        'audit-log:read',
        'config:read',
        'config:update',
      ],
    },
    {
      name: 'Content',
      perms: ['content:moderate', 'badge:manage', 'flag:resolve'],
    },
  ];

  function gi(n) {
    if (!n) return 'A';
    return (
      n
        .split(' ')
        .map(function (s) {
          return s.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'A'
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

  function showLoading(msg) {
    var overlay = document.getElementById('loading-overlay');
    var text = document.getElementById('loading-text');
    if (text) text.textContent = msg || 'Saving...';
    if (overlay) overlay.classList.add('active');
  }

  function hideLoading() {
    var overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function redirectWithToast(url, msg, type) {
    try {
      localStorage.setItem(
        'adminToast',
        JSON.stringify({ message: msg, type: type || 'success' }),
      );
    } catch (_) {}
    window.location.href = url;
  }

  function renderPermissionGroups() {
    var container = document.getElementById('permissions-container');
    container.innerHTML = '';
    PERMISSION_GROUPS.forEach(function (group) {
      var div = document.createElement('div');
      div.className = 'perm-group';
      div.innerHTML =
        '<div class="perm-group-header">' +
        '<h3>' +
        esc(group.name) +
        '</h3>' +
        '<button type="button" class="group-toggle select-all" data-group="' +
        esc(group.name) +
        '">Select All</button>' +
        '<button type="button" class="group-toggle deselect-all" data-group="' +
        esc(group.name) +
        '">Deselect All</button>' +
        '</div>' +
        '<div class="perm-grid" id="perm-grid-' +
        esc(group.name.replace(/\s+/g, '-')) +
        '"></div>';
      container.appendChild(div);

      var grid = div.querySelector('.perm-grid');
      group.perms.forEach(function (perm) {
        var label = document.createElement('label');
        label.className = 'perm-checkbox';
        label.innerHTML =
          '<input type="checkbox" name="permissions" value="' +
          esc(perm) +
          '">' +
          '<span>' +
          esc(perm.replace(':', ': ')) +
          '</span>' +
          '<span class="perm-key">' +
          esc(perm) +
          '</span>';
        grid.appendChild(label);
      });
    });

    // Select All / Deselect All handlers
    container.querySelectorAll('.select-all').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var grid = btn.closest('.perm-group').querySelector('.perm-grid');
        grid.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
          cb.checked = true;
        });
      });
    });
    container.querySelectorAll('.deselect-all').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var grid = btn.closest('.perm-group').querySelector('.perm-grid');
        grid.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
          cb.checked = false;
        });
      });
    });
  }

  function getSelectedPermissions() {
    var perms = [];
    document
      .querySelectorAll('input[name="permissions"]:checked')
      .forEach(function (cb) {
        perms.push(cb.value);
      });
    return perms;
  }

  function setSelectedPermissions(permList) {
    var set = new Set(permList);
    document
      .querySelectorAll('input[name="permissions"]')
      .forEach(function (cb) {
        cb.checked = set.has(cb.value);
      });
  }

  function initForm() {
    var params = new URLSearchParams(window.location.search);
    roleId = params.get('id');

    if (roleId) {
      isEditMode = true;
      document.getElementById('form-title').textContent = 'Edit Role';
      document.getElementById('form-subtitle').textContent =
        'Modify role details and permissions';
      document.getElementById('submit-text').textContent = 'Update Role';
      loadRoleData(roleId);
    } else {
      document.getElementById('submit-text').textContent = 'Create Role';
    }
  }

  async function loadRoleData(id) {
    showLoading('Loading role data...');
    try {
      var res = await api('/admin/roles/' + encodeURIComponent(id));
      var role = res?.data || res || {};
      document.getElementById('input-name').value = role.name || '';
      document.getElementById('input-description').value =
        role.description || '';
      if (Array.isArray(role.permissions)) {
        setSelectedPermissions(role.permissions);
      }
    } catch (err) {
      alert('Failed to load role data: ' + (err.message || 'Unknown error'));
      window.location.href = './roles.html';
    } finally {
      hideLoading();
    }
  }

  function initSubmit() {
    document
      .getElementById('role-form')
      .addEventListener('submit', async function (e) {
        e.preventDefault();

        var name = document.getElementById('input-name').value.trim();
        var description = document
          .getElementById('input-description')
          .value.trim();
        var permissions = getSelectedPermissions();

        if (!name) {
          alert('Role name is required.');
          return;
        }

        var body = { name: name, permissions: permissions };
        if (description) body.description = description;

        showLoading(isEditMode ? 'Updating role...' : 'Creating role...');
        var submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;

        try {
          if (isEditMode) {
            await api('/admin/roles/' + encodeURIComponent(roleId), {
              method: 'PATCH',
              body: body,
            });
            redirectWithToast(
              './roles.html',
              'Role updated successfully',
              'success',
            );
          } else {
            await api('/admin/roles', { method: 'POST', body: body });
            redirectWithToast(
              './roles.html',
              'Role created successfully',
              'success',
            );
          }
        } catch (err) {
          hideLoading();
          submitBtn.disabled = false;
          alert(
            'Failed to ' +
              (isEditMode ? 'update' : 'create') +
              ' role: ' +
              (err.message || 'Unknown error'),
          );
        }
      });
  }

  updateSidebar();
  initTheme();
  renderPermissionGroups();
  initForm();
  initSubmit();
});
