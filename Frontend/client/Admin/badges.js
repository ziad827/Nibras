window.NibrasReact.run(function () {
  var container = document.getElementById('badge-list-container');
  var toastEl = document.getElementById('toast');
  var modal = document.getElementById('create-badge-modal');
  var badgeName = document.getElementById('badge-name');
  var badgeDescription = document.getElementById('badge-description');
  var badgeCategory = document.getElementById('badge-category');
  var badgeCriteria = document.getElementById('badge-criteria');
  var badgeColor = document.getElementById('badge-color');
  var submitBtn = document.getElementById('submit-badge-btn');
  var cancelBtn = document.getElementById('cancel-create-btn');
  var openBtn = document.getElementById('openCreateModalBtn');

  var tabBtns = document.querySelectorAll('.tab-btn');
  var manualContainer = document.getElementById('manual-award-container');
  var manualBadgeSelect = document.getElementById('manual-badge-select');
  var manualStudentInput = document.getElementById('manual-student-input');
  var awardBtn = document.getElementById('award-badge-btn');

  var services = window.NibrasServices;
  var ICONS = [
    'fa-star',
    'fa-trophy',
    'fa-medal',
    'fa-crown',
    'fa-gem',
    'fa-bolt',
    'fa-fire',
    'fa-rocket',
    'fa-brain',
    'fa-code',
    'fa-shield-halved',
    'fa-wand-magic-sparkles',
    'fa-book',
    'fa-pen-fancy',
    'fa-graduation-cap',
    'fa-flask',
    'fa-microchip',
    'fa-palette',
    'fa-music',
    'fa-leaf',
    'fa-heart',
    'fa-handshake',
    'fa-users',
    'fa-globe',
    'fa-infinity',
  ];
  var selectedIcon = 'fa-star';

  function showToast(message, type) {
    toastEl.textContent = message;
    toastEl.className = 'toast ' + type + ' show';
    setTimeout(function () {
      toastEl.classList.remove('show');
    }, 4000);
  }

  function esc(str) {
    if (!str && str !== 0) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function renderIconPicker() {
    var picker = document.getElementById('icon-picker');
    picker.innerHTML = '';
    ICONS.forEach(function (icon) {
      var div = document.createElement('div');
      div.className =
        'icon-option' + (icon === selectedIcon ? ' selected' : '');
      div.innerHTML = '<i class="fa-solid ' + icon + '"></i>';
      div.dataset.icon = icon;
      div.addEventListener('click', function () {
        picker.querySelectorAll('.icon-option').forEach(function (el) {
          el.classList.remove('selected');
        });
        div.classList.add('selected');
        selectedIcon = icon;
      });
      picker.appendChild(div);
    });
  }

  function loadBadges() {
    container.innerHTML =
      '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading badges...</p></div>';

    if (!services || !services.gamificationService) {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Gamification service not available.</p></div>';
      return;
    }

    services.gamificationService
      .getAllBadges()
      .then(function (res) {
        var data = res && (res.data || res);
        var badges = Array.isArray(data)
          ? data
          : Array.isArray(data.badges)
            ? data.badges
            : [];
        if (badges.length === 0) {
          container.innerHTML =
            '<div class="empty-state"><i class="fa-solid fa-medal"></i><p>No badges created yet.</p></div>';
          return;
        }
        renderBadges(badges);
        populateManualSelect(badges);
      })
      .catch(function (err) {
        console.error('Load badges error:', err);
        container.innerHTML =
          '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load badges: ' +
          esc(err.message || 'Unknown error') +
          '</p></div>';
      });
  }

  function renderBadges(badges) {
    var html = '<div class="badge-grid">';
    badges.forEach(function (b) {
      var id = b._id || b.id;
      var icon = b.icon || 'fa-medal';
      var name = b.name || 'Unnamed Badge';
      var description = b.description || '';
      var category = b.category || 'general';
      var criteria = b.criteria || '';
      var color = b.color || badgeColor.value;
      var awardCount = b.awardCount || b.count || 0;

      html += '<div class="badge-admin-card" data-id="' + esc(id) + '">';
      html +=
        '<span class="badge-icon" style="color:' +
        esc(color) +
        ';"><i class="fa-solid ' +
        esc(icon) +
        '"></i></span>';
      html += '<div class="badge-name">' + esc(name) + '</div>';
      if (description)
        html += '<div class="badge-description">' + esc(description) + '</div>';
      html += '<div class="badge-meta">';
      html +=
        '<span><i class="fa-solid fa-tag"></i> ' + esc(category) + '</span>';
      if (criteria)
        html +=
          '<span><i class="fa-solid fa-list-check"></i> ' +
          esc(criteria) +
          '</span>';
      html +=
        '<span><i class="fa-solid fa-users"></i> ' +
        esc(awardCount) +
        ' awarded</span>';
      html += '</div>';
      html += '<div class="badge-actions">';
      html +=
        '<button class="btn-edit" data-id="' +
        esc(id) +
        '"><i class="fa-regular fa-pen-to-square"></i> Edit</button>';
      html +=
        '<button class="btn-delete" data-id="' +
        esc(id) +
        '"><i class="fa-regular fa-trash-can"></i> Delete</button>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function populateManualSelect(badges) {
    manualBadgeSelect.innerHTML = '<option value="">Select a badge...</option>';
    badges.forEach(function (b) {
      var id = b._id || b.id;
      var opt = document.createElement('option');
      opt.value = id;
      opt.textContent = b.name || 'Unnamed';
      manualBadgeSelect.appendChild(opt);
    });
  }

  container.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn-delete');
    if (!btn) return;

    var badgeId = btn.dataset.id;
    if (!badgeId) return;
    if (!confirm('Delete this badge? This action cannot be undone.')) return;

    btn.disabled = true;
    btn.style.opacity = '0.5';

    services.gamificationService
      .deleteBadge(badgeId)
      .then(function () {
        showToast('Badge deleted.', 'success');
        loadBadges();
      })
      .catch(function (err) {
        console.error('Delete badge error:', err);
        showToast(err.message || 'Failed to delete badge.', 'error');
        btn.disabled = false;
        btn.style.opacity = '';
      });
  });

  function validateForm() {
    submitBtn.disabled =
      !badgeName.value.trim() || !badgeDescription.value.trim();
  }

  badgeName.addEventListener('input', validateForm);
  badgeDescription.addEventListener('input', validateForm);

  openBtn.addEventListener('click', function () {
    badgeName.value = '';
    badgeDescription.value = '';
    badgeCategory.value = 'academic';
    badgeCriteria.value = '';
    badgeColor.value = '#3b82f6';
    selectedIcon = 'fa-star';
    renderIconPicker();
    submitBtn.disabled = true;
    modal.classList.add('active');
    setTimeout(function () {
      badgeName.focus();
    }, 100);
  });

  cancelBtn.addEventListener('click', function () {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.classList.remove('active');
  });

  submitBtn.addEventListener('click', function () {
    var name = badgeName.value.trim();
    var description = badgeDescription.value.trim();
    if (!name || !description) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    var payload = {
      name: name,
      description: description,
      icon: selectedIcon,
      category: badgeCategory.value,
      criteria: badgeCriteria.value.trim() || undefined,
      color: badgeColor.value,
    };

    services.gamificationService
      .createBadge(payload)
      .then(function () {
        showToast('Badge created successfully!', 'success');
        modal.classList.remove('active');
        loadBadges();
        submitBtn.textContent = 'Create Badge';
      })
      .catch(function (err) {
        console.error('Create badge error:', err);
        showToast(err.message || 'Failed to create badge.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Badge';
      });
  });

  awardBtn.addEventListener('click', function () {
    var badgeId = manualBadgeSelect.value;
    var student = manualStudentInput.value.trim();
    if (!badgeId) {
      showToast('Please select a badge.', 'error');
      return;
    }
    if (!student) {
      showToast('Please enter a student email or ID.', 'error');
      return;
    }

    awardBtn.disabled = true;
    awardBtn.textContent = 'Awarding...';

    var payload = { badgeId: badgeId, student: student };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student)) {
      payload.email = student;
      delete payload.student;
    } else {
      payload.studentId = student;
      delete payload.student;
    }

    services.gamificationService
      .awardBadge(badgeId, payload)
      .then(function () {
        showToast('Badge awarded successfully!', 'success');
        manualStudentInput.value = '';
        awardBtn.disabled = false;
        awardBtn.textContent = 'Award Badge';
      })
      .catch(function (err) {
        console.error('Award badge error:', err);
        showToast(err.message || 'Failed to award badge.', 'error');
        awardBtn.disabled = false;
        awardBtn.textContent = 'Award Badge';
      });
  });

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      var tab = btn.dataset.tab;
      if (tab === 'all') {
        container.style.display = '';
        manualContainer.style.display = 'none';
      } else {
        container.style.display = '';
        manualContainer.style.display = 'block';
      }
    });
  });

  function initTheme() {
    var btn = document.getElementById('themeBtn'),
      icon = btn?.querySelector('i'),
      logo = document.getElementById('app-logo');
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    if (cur === 'dark') {
      if (icon) icon.className = 'fa-solid fa-sun';
      if (logo) logo.src = '../Assets/images/logo-dark.png';
    } else {
      if (icon) icon.className = 'fa-regular fa-moon';
      if (logo) logo.src = '../Assets/images/logo-light.png';
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
          if (logo) logo.src = '../Assets/images/logo-dark.png';
        } else {
          if (icon) icon.className = 'fa-regular fa-moon';
          if (logo) logo.src = '../Assets/images/logo-light.png';
        }
      });
  }

  initTheme();
  renderIconPicker();
  loadBadges();
});
