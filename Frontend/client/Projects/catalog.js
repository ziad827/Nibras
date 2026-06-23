var roleState = { step: 1, template: null, projectId: null };
var catalogTemplates = [];

function esc(str) {
  if (!str && str !== 0) return '';
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

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

function renderCatalogCards(templates) {
  var grid = document.getElementById('projects-grid');
  if (!grid) return;

  if (!templates.length) {
    grid.innerHTML =
      '<p class="catalog-loading">No published project templates match your filters.</p>';
    return;
  }

  grid.innerHTML = templates
    .map(function (t) {
      var delivery = t.deliveryMode || 'individual';
      var difficulty = t.difficulty || 'intermediate';
      var roles = Array.isArray(t.roles) ? t.roles : [];
      var roleHtml = roles
        .map(function (r) {
          return (
            '<span class="role-pill" data-role-id="' +
            esc(r.id || r.key || '') +
            '">' +
            esc(r.label || r.key || 'Role') +
            ' <span class="slot">' +
            esc(String(r.count || 1)) +
            '</span></span>'
          );
        })
        .join('');
      var tags = (t.tags || [])
        .slice(0, 5)
        .map(function (tag) {
          return '<span class="tech-tag">' + esc(tag) + '</span>';
        })
        .join('');
      var canApply = Boolean(t.projectId);
      var applyBtn = canApply
        ? '<button class="btn-apply" type="button">Apply for Roles <i class="fas fa-arrow-right"></i></button>'
        : '<button class="btn-disabled" type="button" disabled>Not yet published</button>';

      return (
        '<div class="catalog-card" data-project-id="' +
        esc(t.projectId || '') +
        '" data-template-id="' +
        esc(t.id || '') +
        '" data-delivery="' +
        esc(delivery) +
        '" data-difficulty="' +
        esc(difficulty) +
        '">' +
        '<div class="card-top">' +
        '<span class="course-pill">' +
        esc(t.courseCode || 'Course') +
        '</span>' +
        '<span class="team-pill"><i class="fas fa-' +
        (delivery === 'team' ? 'users' : 'user') +
        '"></i> ' +
        (delivery === 'team' ? 'Team' : 'Individual') +
        '</span>' +
        '<span class="diff-pill ' +
        esc(difficulty) +
        '">' +
        esc(difficulty) +
        '</span></div>' +
        '<h3>' +
        esc(t.title || 'Project') +
        '</h3>' +
        '<p class="card-desc">' +
        esc(t.description || '') +
        '</p>' +
        '<p class="course-subtext">' +
        esc(t.courseName || '') +
        '</p>' +
        '<div class="card-meta">' +
        '<span><i class="far fa-clock"></i> ' +
        esc(t.estimatedDuration || 'Flexible') +
        '</span>' +
        '<span><i class="fas fa-users"></i> ' +
        esc(String(t.teamSize || (delivery === 'team' ? 'Team' : '1'))) +
        '</span>' +
        '<span><i class="fas fa-layer-group"></i> ' +
        esc(String((t.milestones || []).length)) +
        ' milestones</span></div>' +
        (roles.length
          ? '<div class="open-roles"><label>OPEN ROLES</label><div class="role-pills">' +
            roleHtml +
            '</div></div>'
          : '') +
        '<div class="tech-tags">' +
        tags +
        '</div>' +
        applyBtn +
        '</div>'
      );
    })
    .join('');

  document.querySelectorAll('.btn-apply').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var card = this.closest('.catalog-card');
      if (card) openRoleModal(card);
    });
  });
}

function getCatalogFilters() {
  var delivery = 'all';
  document.querySelectorAll('input[name="delivery"]').forEach(function (r) {
    if (r.checked) delivery = r.value;
  });
  var checkedDiffs = [];
  document.querySelectorAll('[id^="diff-"]').forEach(function (c) {
    if (c.checked) checkedDiffs.push(c.value);
  });
  return { delivery: delivery, diffs: checkedDiffs };
}

function applyFilters() {
  var filters = getCatalogFilters();
  var cards = document.querySelectorAll('.catalog-card');
  var visible = 0;
  cards.forEach(function (card) {
    var cardDelivery = card.getAttribute('data-delivery') || '';
    var cardDiff = card.getAttribute('data-difficulty') || '';
    var matchDelivery =
      filters.delivery === 'all' || cardDelivery === filters.delivery;
    var matchDiff =
      filters.diffs.length === 0 || filters.diffs.indexOf(cardDiff) !== -1;
    if (matchDelivery && matchDiff) {
      card.style.display = '';
      visible++;
    } else card.style.display = 'none';
  });
  var countEl = document.getElementById('results-count');
  if (countEl) countEl.textContent = visible;
}

async function loadCatalogFromApi() {
  var grid = document.getElementById('projects-grid');
  var svc = window.NibrasServices?.trackingProjectService;
  if (!svc) {
    if (grid) {
      grid.innerHTML =
        '<p class="catalog-loading">Catalog API is not configured.</p>';
    }
    return;
  }

  try {
    var filters = getCatalogFilters();
    var query = {};
    if (filters.delivery !== 'all') query.deliveryMode = filters.delivery;
    if (filters.diffs.length === 1) query.difficulty = filters.diffs[0];
    var resp = await svc.getCatalog(query);
    catalogTemplates = Array.isArray(resp) ? resp : resp?.data || [];
    renderCatalogCards(catalogTemplates);
    applyFilters();
  } catch (err) {
    if (grid) {
      grid.innerHTML =
        '<p class="catalog-loading">Failed to load catalog: ' +
        esc(err.message || 'Unknown error') +
        '</p>';
    }
  }
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
    themeToggle.addEventListener('click', function () {
      var cur = htmlEl.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      htmlEl.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateUI(themeIcon, next);
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

  document.querySelectorAll('input[name="delivery"]').forEach(function (r) {
    r.addEventListener('change', function () {
      void loadCatalogFromApi();
    });
  });
  document.querySelectorAll('[id^="diff-"]').forEach(function (c) {
    c.addEventListener('change', function () {
      void loadCatalogFromApi();
    });
  });

  ['role-motivation', 'role-availability'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      var countId =
        id === 'role-motivation' ? 'motivation-count' : 'availability-count';
      var counter = document.getElementById(countId);
      if (counter) counter.textContent = this.value.length;
    });
  });

  void loadCatalogFromApi();
});

function openRoleModal(card) {
  roleState.step = 1;
  roleState.cardData = card;
  roleState.projectId = card.getAttribute('data-project-id') || '';
  roleState.templateId = card.getAttribute('data-template-id') || '';
  roleState.template =
    catalogTemplates.find(function (t) {
      return (
        t.id === roleState.templateId ||
        t.projectId === roleState.projectId
      );
    }) || null;

  var title = card.querySelector('h3')?.textContent || 'Project';
  document.getElementById('role-modal-subtitle').textContent = title;

  var pills = card.querySelectorAll('.role-pill');
  var roles = [];
  pills.forEach(function (p) {
    roles.push({
      id: p.getAttribute('data-role-id') || '',
      label:
        p.childNodes[0]?.textContent?.trim() ||
        p.textContent.replace(/\d+/g, '').trim(),
    });
  });
  if (!roles.length && roleState.template?.roles) {
    roles = roleState.template.roles.map(function (r) {
      return { id: r.id || r.key, label: r.label || r.key };
    });
  }
  if (!roles.length) roles = [{ id: 'dev', label: 'Developer' }];
  while (roles.length < 3) roles.push({ id: '', label: '' });

  for (var i = 1; i <= 3; i++) {
    var sel = document.getElementById('role-choice-' + i);
    if (!sel) continue;
    sel.innerHTML = '<option value="">Select a role...</option>';
    roles.forEach(function (r) {
      if (!r.label) return;
      sel.innerHTML +=
        '<option value="' +
        esc(r.id || r.label) +
        '">' +
        esc(r.label) +
        '</option>';
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
    var val = sel ? sel.options[sel.selectedIndex]?.text : '';
    if (!val || val === 'Select a role...') continue;
    list.innerHTML +=
      '<div class="review-row"><div class="review-rank">' +
      labels[i - 1] +
      '</div><div class="review-name">' +
      esc(val) +
      '</div></div>';
  }
}

async function submitRoleApplication() {
  if (!confirm('Submit your application? You cannot edit it later.')) return;

  var svc = window.NibrasServices?.trackingProjectService;
  if (!svc) {
    alert('Catalog service unavailable.');
    return;
  }

  var projectId = roleState.projectId;
  if (!projectId) {
    alert('This template is not linked to a published project yet.');
    return;
  }

  var delivery =
    roleState.template?.deliveryMode ||
    roleState.cardData?.getAttribute('data-delivery') ||
    'individual';
  var motivation = document.getElementById('role-motivation').value.trim();
  var availability = document
    .getElementById('role-availability')
    .value.trim();

  try {
    if (delivery === 'team') {
      var preferences = [];
      for (var i = 1; i <= 3; i++) {
        var sel = document.getElementById('role-choice-' + i);
        var roleId = sel?.value;
        if (!roleId) continue;
        preferences.push({ templateRoleId: roleId, rank: preferences.length + 1 });
      }
      if (!preferences.length) {
        alert('Select at least one role preference.');
        return;
      }
      await svc.submitApplication(projectId, {
        statement: motivation,
        availabilityNote: availability,
        preferences: preferences,
      });
    } else {
      await svc.expressInterest(projectId, {
        message: motivation || availability || 'Interested in this project.',
      });
    }
    alert('Application submitted successfully!');
    closeRoleModal();
  } catch (err) {
    alert(err.message || 'Failed to submit application.');
  }
}

document.addEventListener('click', function (event) {
  var modal = document.getElementById('roleModal');
  if (modal && modal.classList.contains('active') && event.target === modal)
    closeRoleModal();
});
