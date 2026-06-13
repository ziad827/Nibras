window.NibrasReact.run(function () {
  var configCache = null;

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

  function formatLabel(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, function (s) {
        return s.toUpperCase();
      })
      .replace(/[_-]/g, ' ')
      .trim();
  }

  function isBoolean(val) {
    return typeof val === 'boolean';
  }
  function isNumber(val) {
    return typeof val === 'number' && !isNaN(val);
  }
  function isObject(val) {
    return val && typeof val === 'object' && !Array.isArray(val);
  }

  function getGroupIcon(groupName) {
    var map = {
      featureFlags: 'fa-solid fa-flag',
      flags: 'fa-solid fa-flag',
      gamification: 'fa-solid fa-trophy',
      gamificationRules: 'fa-solid fa-trophy',
      thresholds: 'fa-solid fa-ladder',
      reputationThresholds: 'fa-solid fa-ladder',
      reputation: 'fa-solid fa-star',
    };
    return map[groupName] || 'fa-solid fa-gear';
  }

  function getGroupDisplayName(groupName) {
    var map = {
      featureFlags: 'Feature Flags',
      flags: 'Feature Flags',
      gamification: 'Gamification Rules',
      gamificationRules: 'Gamification Rules',
      thresholds: 'Reputation Thresholds',
      reputationThresholds: 'Reputation Thresholds',
      reputation: 'Reputation',
    };
    return map[groupName] || formatLabel(groupName);
  }

  async function loadConfig() {
    var cc = document.getElementById('config-container');
    cc.innerHTML =
      '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading configuration...</p></div>';
    try {
      var res = await api('/admin/config');
      var data = res?.data || res || {};
      configCache = JSON.parse(JSON.stringify(data));
      renderConfig(data);
    } catch (err) {
      cc.innerHTML =
        '<div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load configuration: ' +
        esc(err.message || 'Unknown error') +
        '</p><p style="font-size:0.82rem;color:var(--text-secondary);margin-top:0.5rem;">Config endpoints may not be implemented on the backend yet.</p><button class="btn-primary" onclick="location.reload()" style="margin-top:1rem;"><i class="fa-solid fa-rotate"></i> Retry</button></div>';
    }
  }

  function renderConfig(config) {
    var cc = document.getElementById('config-container');
    var groups = findConfigGroups(config);
    if (groups.length === 0) {
      cc.innerHTML =
        '<div class="config-empty-state"><i class="fa-solid fa-sliders"></i><p>No configuration data available</p></div>';
      return;
    }
    var html = '';
    groups.forEach(function (g) {
      html += renderGroupCard(g.name, g.data);
    });
    cc.innerHTML = html;

    cc.querySelectorAll('.edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        enterEditMode(btn.dataset.group);
      });
    });
    cc.querySelectorAll('.cancel-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        cancelEdit(btn.dataset.group);
      });
    });
    cc.querySelectorAll('.save-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        saveGroup(btn.dataset.group);
      });
    });
  }

  function findConfigGroups(config) {
    var knownGroups = [
      'featureFlags',
      'flags',
      'gamification',
      'gamificationRules',
      'thresholds',
      'reputationThresholds',
      'reputation',
    ];
    var groups = [];
    var seen = {};
    knownGroups.forEach(function (name) {
      if (config[name] && isObject(config[name]) && !seen[name]) {
        var displayName = getGroupDisplayName(name);
        if (!seen[displayName]) {
          groups.push({ name: name, data: config[name] });
          seen[name] = true;
          seen[displayName] = true;
        }
      }
    });
    Object.keys(config).forEach(function (key) {
      if (
        knownGroups.indexOf(key) === -1 &&
        config[key] &&
        isObject(config[key])
      ) {
        groups.push({ name: key, data: config[key] });
      }
    });
    return groups;
  }

  function renderGroupCard(groupName, data) {
    var icon = getGroupIcon(groupName);
    var displayName = getGroupDisplayName(groupName);
    var keys = Object.keys(data);
    var rowsHtml = '';
    keys.forEach(function (key) {
      var val = data[key];
      if (isObject(val)) {
        rowsHtml +=
          '<div class="config-row"><span class="config-label">' +
          esc(formatLabel(key)) +
          '</span><span class="config-value" style="font-size:0.78rem;">object</span></div>';
        return;
      }
      var valDisplay,
        valClass = 'config-value';
      if (isBoolean(val)) {
        valDisplay = val
          ? '<span class="toggle-switch"><input type="checkbox" checked disabled><span class="toggle-slider"></span></span>'
          : '<span class="toggle-switch"><input type="checkbox" disabled><span class="toggle-slider"></span></span>';
        valClass += ' boolean';
      } else if (isNumber(val)) {
        valDisplay = esc(String(val));
        valClass += ' number';
      } else {
        valDisplay = esc(String(val));
        valClass += ' string';
      }
      rowsHtml +=
        '<div class="config-row" data-key="' +
        esc(key) +
        '">' +
        '<div><div class="config-label">' +
        esc(formatLabel(key)) +
        '</div></div>' +
        '<div class="' +
        valClass +
        ' config-view-value">' +
        valDisplay +
        '</div>' +
        '</div>';
    });
    return (
      '<div class="config-card" data-group="' +
      esc(groupName) +
      '">' +
      '<div class="config-card-header">' +
      '<h3 class="config-card-title"><i class="' +
      icon +
      '"></i> ' +
      esc(displayName) +
      '</h3>' +
      '<div class="config-card-actions">' +
      '<button class="btn-sm btn-sm-edit edit-btn" data-group="' +
      esc(groupName) +
      '"><i class="fa-solid fa-pen"></i> Edit</button>' +
      '</div>' +
      '</div>' +
      '<div class="config-card-body">' +
      rowsHtml +
      '</div>' +
      '</div>'
    );
  }

  function enterEditMode(groupName) {
    var card = document.querySelector(
      '.config-card[data-group="' + esc(groupName) + '"]',
    );
    if (!card) return;

    var cacheData = configCache ? findConfigGroupData(groupName) : null;
    if (!cacheData) return;

    card.querySelectorAll('.config-row').forEach(function (row) {
      var key = row.dataset.key;
      if (!key || cacheData[key] === undefined) return;
      var val = cacheData[key];
      var viewVal = row.querySelector('.config-view-value');
      if (!viewVal) return;

      var inputHtml = '';
      if (isBoolean(val)) {
        var checked = val ? 'checked' : '';
        inputHtml =
          '<label class="toggle-switch"><input type="checkbox" class="config-edit-toggle" ' +
          checked +
          '><span class="toggle-slider"></span></label>';
      } else if (isNumber(val)) {
        inputHtml =
          '<input type="number" class="config-edit-input number" value="' +
          esc(String(val)) +
          '">';
      } else {
        inputHtml =
          '<input type="text" class="config-edit-input string" value="' +
          esc(String(val || '')) +
          '">';
      }
      viewVal.innerHTML = inputHtml;
      row.classList.add('config-edit-row');
    });

    var actions = card.querySelector('.config-card-actions');
    if (actions) {
      actions.innerHTML =
        '<button class="btn-sm btn-sm-save save-btn" data-group="' +
        esc(groupName) +
        '"><i class="fa-solid fa-floppy-disk"></i> Save</button>' +
        '<button class="btn-sm btn-sm-cancel cancel-btn" data-group="' +
        esc(groupName) +
        '"><i class="fa-solid fa-xmark"></i> Cancel</button>';
      actions.querySelector('.save-btn').addEventListener('click', function () {
        saveGroup(groupName);
      });
      actions
        .querySelector('.cancel-btn')
        .addEventListener('click', function () {
          cancelEdit(groupName);
        });
    }
  }

  function findConfigGroupData(groupName) {
    if (!configCache) return null;
    var parts = groupName.split('.');
    var current = configCache;
    for (var i = 0; i < parts.length; i++) {
      if (current[parts[i]] === undefined) return null;
      current = current[parts[i]];
    }
    return current;
  }

  function collectGroupData(groupName) {
    var card = document.querySelector(
      '.config-card[data-group="' + esc(groupName) + '"]',
    );
    if (!card) return null;
    var data = {};
    card.querySelectorAll('.config-row').forEach(function (row) {
      var key = row.dataset.key;
      if (!key) return;
      var toggle = row.querySelector('.config-edit-toggle');
      var input = row.querySelector('.config-edit-input');
      if (toggle) {
        data[key] = toggle.checked;
      } else if (input) {
        var raw = input.value;
        if (input.classList.contains('number')) {
          data[key] = raw === '' ? 0 : Number(raw);
        } else {
          data[key] = raw;
        }
      }
    });
    return data;
  }

  async function saveGroup(groupName) {
    var card = document.querySelector(
      '.config-card[data-group="' + esc(groupName) + '"]',
    );
    if (!card) return;
    var btn = card.querySelector('.save-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    }

    var newData = collectGroupData(groupName);
    if (!newData) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save';
      }
      return;
    }

    try {
      var body = {};
      body[groupName] = newData;
      await api('/admin/config', { method: 'PATCH', body: body });
      toast('Configuration updated successfully', 'success');
      if (configCache) {
        var target = findConfigGroupRef(configCache, groupName);
        if (target !== null) Object.assign(target, newData);
      }
      exitEditMode(groupName, newData);
    } catch (err) {
      toast('Failed to update config: ' + (err.message || 'Error'), 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save';
      }
    }
  }

  function findConfigGroupRef(obj, groupName) {
    var parts = groupName.split('.');
    var current = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined) return null;
      current = current[parts[i]];
    }
    return current;
  }

  function exitEditMode(groupName, newData) {
    var card = document.querySelector(
      '.config-card[data-group="' + esc(groupName) + '"]',
    );
    if (!card) return;

    card.querySelectorAll('.config-row').forEach(function (row) {
      var key = row.dataset.key;
      if (!key || !newData || newData[key] === undefined) return;
      var viewVal = row.querySelector('.config-view-value');
      if (!viewVal) return;
      var val = newData[key];
      var valDisplay;
      if (isBoolean(val)) {
        valDisplay = val
          ? '<span class="toggle-switch"><input type="checkbox" checked disabled><span class="toggle-slider"></span></span>'
          : '<span class="toggle-switch"><input type="checkbox" disabled><span class="toggle-slider"></span></span>';
      } else {
        valDisplay = esc(String(val));
      }
      viewVal.innerHTML = valDisplay;
      row.classList.remove('config-edit-row');
    });

    var actions = card.querySelector('.config-card-actions');
    if (actions) {
      actions.innerHTML =
        '<button class="btn-sm btn-sm-edit edit-btn" data-group="' +
        esc(groupName) +
        '"><i class="fa-solid fa-pen"></i> Edit</button>';
      actions.querySelector('.edit-btn').addEventListener('click', function () {
        enterEditMode(groupName);
      });
    }
  }

  function cancelEdit(groupName) {
    var card = document.querySelector(
      '.config-card[data-group="' + esc(groupName) + '"]',
    );
    if (!card) return;
    var cacheData = configCache ? findConfigGroupData(groupName) : null;
    if (cacheData) {
      exitEditMode(groupName, cacheData);
    } else {
      loadConfig();
    }
  }

  document
    .getElementById('reloadConfigBtn')
    .addEventListener('click', loadConfig);

  updateSidebar();
  initTheme();
  loadConfig();
});
