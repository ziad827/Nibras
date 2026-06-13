var roleState = { step: 1 };

function updateSidebarUser() {
  try {
    var u = JSON.parse(localStorage.getItem('user'));
    if (!u || !u.name) return;
    var nameEl = document.querySelector('.user-info h4');
    if (nameEl) nameEl.textContent = u.name;
    var roleEl = document.querySelector('.user-info span');
    if (roleEl) {
      var r = u.role;
      roleEl.textContent =
        typeof r === 'object' && r
          ? r.name || r.title || 'student'
          : r || 'student';
    }
    var avatarEl = document.querySelector('.avatar-circle');
    if (avatarEl) {
      var initials = u.name
        .split(' ')
        .map(function (n) {
          return n.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2);
      avatarEl.textContent = initials || 'U';
    }
    var smallAvatar = document.querySelector('.profile-circle-small');
    if (smallAvatar) smallAvatar.textContent = initials || 'U';
  } catch (_) {}
}

window.NibrasReact.run(function () {
  updateSidebarUser();
  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    var htmlEl = document.documentElement;
    var themeIcon = themeToggle.querySelector('i');
    var saved = localStorage.getItem('theme') || 'light';
    htmlEl.setAttribute('data-theme', saved);
    updateUI(themeIcon, saved);
    themeToggle.classList.remove('rotating');
    void themeToggle.offsetWidth;
    themeToggle.addEventListener('click', function () {
      var cur = htmlEl.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      htmlEl.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateUI(themeIcon, next);
      themeToggle.classList.add('rotating');
      setTimeout(function () {
        themeToggle.classList.remove('rotating');
      }, 500);
    });
  }
  function updateUI(el, theme) {
    if (!el) return;
    el.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    var logo = document.querySelector('.sidebar-logo');
    if (logo)
      logo.src =
        theme === 'dark'
          ? '../Assets/images/logo-dark.png'
          : '../Assets/images/logo-light.png';
  }

  // Filters
  var deliveryRadios = document.querySelectorAll('input[name="delivery"]');
  var diffCheckboxes = document.querySelectorAll('[id^="diff-"]');
  var cards = document.querySelectorAll('.catalog-card');
  var countEl = document.getElementById('results-count');

  function applyFilters() {
    var delivery = 'all';
    deliveryRadios.forEach(function (r) {
      if (r.checked) delivery = r.value;
    });
    var checkedDiffs = [];
    diffCheckboxes.forEach(function (c) {
      if (c.checked) checkedDiffs.push(c.value);
    });
    var visible = 0;
    cards.forEach(function (card) {
      var cardDelivery = card.getAttribute('data-delivery') || '';
      var cardDiff = card.getAttribute('data-difficulty') || '';
      var matchDelivery = delivery === 'all' || cardDelivery === delivery;
      var matchDiff =
        checkedDiffs.length === 0 || checkedDiffs.indexOf(cardDiff) !== -1;
      if (matchDelivery && matchDiff) {
        card.style.display = '';
        visible++;
      } else card.style.display = 'none';
    });
    if (countEl) countEl.textContent = visible;
  }

  deliveryRadios.forEach(function (r) {
    r.addEventListener('change', applyFilters);
  });
  diffCheckboxes.forEach(function (c) {
    c.addEventListener('change', applyFilters);
  });

  // Apply buttons open modal
  document.querySelectorAll('.btn-apply').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var card = this.closest('.catalog-card');
      if (card) openRoleModal(card);
    });
  });

  // Char counters
  ['role-motivation', 'role-availability'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      var countId =
        id === 'role-motivation' ? 'motivation-count' : 'availability-count';
      var c = document.getElementById(countId);
      if (c) c.textContent = this.value.length;
    });
  });
});

function openRoleModal(card) {
  roleState.step = 1;
  roleState.cardData = card;
  var title = card.querySelector('h3')?.textContent || 'Project';
  document.getElementById('role-modal-subtitle').textContent = title;

  var pills = card.querySelectorAll('.role-pill');
  var roles = [];
  pills.forEach(function (p) {
    var text =
      p.childNodes[0]?.textContent?.trim() ||
      p.textContent.replace(/\d+/g, '').trim();
    if (text) roles.push(text);
  });
  if (roles.length === 0) roles = ['Developer', 'Designer', 'Tester'];
  if (roles.length > 3) roles = roles.slice(0, 3);
  while (roles.length < 3) roles.push(roles[0] || 'Role');

  for (var i = 1; i <= 3; i++) {
    var sel = document.getElementById('role-choice-' + i);
    if (!sel) continue;
    sel.innerHTML = '<option value="">Select a role...</option>';
    roles.forEach(function (r) {
      sel.innerHTML += '<option value="' + r + '">' + r + '</option>';
    });
  }

  document.getElementById('role-modal-title').textContent = 'Apply for Roles';
  document.getElementById('role-step-1').style.display = '';
  document.getElementById('role-step-2').style.display = 'none';
  document.getElementById('role-step-3').style.display = 'none';
  document.getElementById('role-btn-back').style.display = 'none';
  document.getElementById('role-btn-next').style.display = '';
  document.getElementById('role-btn-submit').style.display = 'none';
  document.getElementById('role-motivation').value = '';
  document.getElementById('role-availability').value = '';
  document.getElementById('motivation-count').textContent = '0';
  document.getElementById('availability-count').textContent = '0';
  updateStepDots(1);

  var modal = document.getElementById('roleModal');
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function closeRoleModal() {
  var modal = document.getElementById('roleModal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function updateStepDots(step) {
  document.querySelectorAll('.step-dot').forEach(function (d) {
    var s = parseInt(d.getAttribute('data-step'));
    d.classList.toggle('active', s === step);
    d.classList.toggle('done', s < step);
  });
  document.querySelectorAll('.step-line').forEach(function (l, i) {
    l.classList.toggle('done', i < step - 1);
  });
}

function roleStep(dir) {
  if (dir === 'next' && roleState.step === 1) {
    if (!document.getElementById('role-choice-1').value) {
      alert('Please select your first choice role.');
      return;
    }
  }
  roleState.step += dir === 'next' ? 1 : -1;
  roleState.step = Math.max(1, Math.min(3, roleState.step));

  document.getElementById('role-step-1').style.display =
    roleState.step === 1 ? '' : 'none';
  document.getElementById('role-step-2').style.display =
    roleState.step === 2 ? '' : 'none';
  document.getElementById('role-step-3').style.display =
    roleState.step === 3 ? '' : 'none';
  document.getElementById('role-btn-back').style.display =
    roleState.step > 1 ? '' : 'none';
  document.getElementById('role-btn-next').style.display =
    roleState.step < 3 ? '' : 'none';
  document.getElementById('role-btn-submit').style.display =
    roleState.step === 3 ? '' : 'none';
  if (roleState.step === 3) buildReview();
  updateStepDots(roleState.step);
}

function buildReview() {
  var list = document.getElementById('role-review-list');
  list.innerHTML = '';
  var labels = ['#1', '#2', '#3'];
  for (var i = 1; i <= 3; i++) {
    var sel = document.getElementById('role-choice-' + i);
    var val = sel ? sel.value : '';
    if (!val) continue;
    list.innerHTML +=
      '<div class="review-row"><div class="review-rank">' +
      labels[i - 1] +
      '</div><div class="review-name">' +
      val +
      '</div></div>';
  }
}

function submitRoleApplication() {
  if (!confirm('Submit your application? You cannot edit it later.')) return;
  alert('Application submitted!');
  closeRoleModal();
}

document.addEventListener('click', function (event) {
  var modal = document.getElementById('roleModal');
  if (modal && modal.classList.contains('active') && event.target === modal)
    closeRoleModal();
});
