window.NibrasReact.run(function () {
  var parsedUsers = [];
  var warnings = [];

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
    var c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toast-container';
      c.id = 'toast-container';
      c.style.cssText = 'position:fixed;bottom:2rem;right:2rem;z-index:2000;';
      document.body.appendChild(c);
    }
    var t = document.createElement('div');
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

  function parseCSV(text) {
    var lines = text
      .split('\n')
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    if (lines.length < 2)
      return { users: [], warnings: ['No data rows found'] };

    var headers = parseCSVLine(lines[0]);
    var colMap = {};
    headers.forEach(function (h, i) {
      colMap[h.toLowerCase()] = i;
    });

    if (!colMap.name && !colMap.email) {
      return {
        users: [],
        warnings: [
          'CSV must have at least "name" or "email" column. Found: ' +
            headers.join(', '),
        ],
      };
    }

    var result = [],
      warns = [];
    for (var i = 1; i < lines.length; i++) {
      var vals = parseCSVLine(lines[i]);
      var row = {};
      Object.keys(colMap).forEach(function (key) {
        var val = vals[colMap[key]];
        if (val != null) row[key] = val.trim();
      });

      var name = row.name || row['display name'] || row['student name'] || '';
      var email = row.email || row['e-mail'] || row['mail'] || '';
      var password = row.password || row.pass || '';
      var role = row.role || row.type || 'student';
      var institution =
        row.institution || row.affiliation || row.school || row.org || '';

      if (!name && !email) {
        warns.push('Row ' + (i + 1) + ': missing both name and email, skipped');
        continue;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        warns.push('Row ' + (i + 1) + ': invalid email format "' + email + '"');
      }

      result.push({
        name: name,
        email: email,
        password: password || undefined,
        role: role.toLowerCase(),
        institution: institution,
      });
    }

    if (result.length === 0) warns.push('No valid user records found');

    return { users: result, warnings: warns };
  }

  function parseCSVLine(line) {
    var result = [],
      current = '',
      inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current);
    return result;
  }

  function getActiveTab() {
    var tab = document.querySelector('.tab-btn.active');
    return tab ? tab.dataset.tab : 'csv';
  }

  function getDataFromActiveTab() {
    var tab = getActiveTab();
    if (tab === 'csv') {
      var input = document.getElementById('csv-file-input');
      if (!input.files || !input.files[0]) return null;
      return input.files[0];
    }
    var textarea = document.getElementById('paste-textarea');
    return textarea ? textarea.value : '';
  }

  function renderPreview(result) {
    var section = document.getElementById('preview-section');
    var summary = document.getElementById('import-summary');
    var tableContainer = document.getElementById('preview-table-container');
    var importBtn = document.getElementById('import-btn');

    section.style.display = 'block';

    if (result.users.length === 0) {
      summary.innerHTML =
        '<div class="warning-text">No valid users to import</div>';
      tableContainer.innerHTML = '';
      importBtn.disabled = true;
      return;
    }

    parsedUsers = result.users;
    warnings = result.warnings;

    var validCount = result.users.length;
    var warnCount = result.warnings.length;

    summary.innerHTML =
      '<div class="import-summary-item">Found <strong>' +
      validCount +
      '</strong> valid user' +
      (validCount !== 1 ? 's' : '') +
      '</div>' +
      (warnCount > 0
        ? '<div class="import-summary-item warning-text"><i class="fa-solid fa-triangle-exclamation"></i> ' +
          warnCount +
          ' warning' +
          (warnCount !== 1 ? 's' : '') +
          '</div>'
        : '');

    var html =
      '<table class="import-preview-table"><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Institution</th></tr></thead><tbody>';
    var display = result.users.slice(0, 15);
    display.forEach(function (u, i) {
      html +=
        '<tr>' +
        '<td>' +
        (i + 1) +
        '</td>' +
        '<td>' +
        esc(u.name) +
        '</td>' +
        '<td style="color:var(--text-secondary);font-size:0.82rem;">' +
        esc(u.email) +
        '</td>' +
        '<td><span class="role-badge ' +
        (u.role || 'student') +
        '">' +
        esc(u.role || 'student') +
        '</span></td>' +
        '<td style="font-size:0.82rem;color:var(--text-secondary);">' +
        esc(u.institution || '—') +
        '</td>' +
        '</tr>';
    });
    if (result.users.length > 15) {
      html +=
        '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);font-size:0.82rem;">... and ' +
        (result.users.length - 15) +
        ' more</td></tr>';
    }
    html += '</tbody></table>';
    tableContainer.innerHTML = html;

    if (result.warnings.length > 0) {
      var warnHtml =
        '<div style="margin-top:0.75rem;padding:0.75rem;background:rgba(245,158,11,0.08);border-radius:8px;">';
      result.warnings.forEach(function (w) {
        warnHtml +=
          '<div class="warning-text" style="margin-bottom:4px;"><i class="fa-solid fa-circle-exclamation" style="font-size:0.7rem;"></i> ' +
          esc(w) +
          '</div>';
      });
      warnHtml += '</div>';
      tableContainer.innerHTML += warnHtml;
    }

    importBtn.disabled = false;
    document.getElementById('import-btn-text').textContent =
      'Import ' +
      result.users.length +
      ' User' +
      (result.users.length !== 1 ? 's' : '');
  }

  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(function (c) {
          c.classList.remove('active');
        });
        btn.classList.add('active');
        var tab = document.getElementById('tab-' + btn.dataset.tab);
        if (tab) tab.classList.add('active');
        document.getElementById('preview-section').style.display = 'none';
        parsedUsers = [];
        document.getElementById('import-btn').disabled = true;
      });
    });
  }

  function initCSVUpload() {
    var area = document.getElementById('csv-upload-area');
    var input = document.getElementById('csv-file-input');
    area.addEventListener('click', function () {
      input.click();
    });
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) {
        area.querySelector('p').innerHTML =
          'Selected: <strong>' + input.files[0].name + '</strong>';
        // Auto-parse on file select
        parseFromActiveTab();
      }
    });
  }

  function parseFromActiveTab() {
    var data = getDataFromActiveTab();
    if (!data) {
      alert('Please provide data first.');
      return;
    }

    if (typeof data === 'string') {
      var result = parseCSV(data);
      renderPreview(result);
    } else {
      var reader = new FileReader();
      reader.onload = function (e) {
        var result = parseCSV(e.target.result);
        renderPreview(result);
      };
      reader.onerror = function () {
        alert('Failed to read file.');
      };
      reader.readAsText(data);
    }
  }

  function initParseBtn() {
    document
      .getElementById('parse-btn')
      .addEventListener('click', parseFromActiveTab);
  }

  function initImport() {
    document
      .getElementById('import-btn')
      .addEventListener('click', async function () {
        if (parsedUsers.length === 0) return;
        var btn = this;
        btn.disabled = true;
        btn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Importing...';

        var overlay = document.getElementById('loading-overlay');
        var loadingText = document.getElementById('loading-text');
        if (loadingText)
          loadingText.textContent =
            'Importing ' + parsedUsers.length + ' users...';
        if (overlay) overlay.classList.add('active');

        try {
          await api('/admin/users/bulk-create', {
            method: 'POST',
            body: { users: parsedUsers },
          });
          if (overlay) overlay.classList.remove('active');
          try {
            localStorage.setItem(
              'adminToast',
              JSON.stringify({
                message:
                  parsedUsers.length +
                  ' user' +
                  (parsedUsers.length !== 1 ? 's' : '') +
                  ' created successfully',
                type: 'success',
              }),
            );
          } catch (_) {}
          window.location.href = './users.html';
        } catch (error) {
          if (overlay) overlay.classList.remove('active');
          btn.disabled = false;
          btn.innerHTML =
            '<i class="fa-solid fa-upload"></i> <span id="import-btn-text">Import Users</span>';
          toast(
            'Import failed: ' + (error.message || 'Unknown error'),
            'error',
          );
        }
      });
  }

  updateSidebar();
  initTheme();
  initTabs();
  initCSVUpload();
  initParseBtn();
  initImport();
});
