var plannerState = { placements: {} };

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

  initPaletteDrag();
  initCellDrop();
  initEnrollButton();
});

function initPaletteDrag() {
  document.querySelectorAll('.palette-item').forEach(function (item) {
    item.draggable = true;
    item.addEventListener('dragstart', function (e) {
      e.dataTransfer.setData('text/plain', this.textContent);
      this.classList.add('dragging');
    });
    item.addEventListener('dragend', function () {
      this.classList.remove('dragging');
    });
  });
}

function initCellDrop() {
  document.querySelectorAll('.grid-cell').forEach(function (cell) {
    cell.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('drag-over');
    });
    cell.addEventListener('dragleave', function () {
      this.classList.remove('drag-over');
    });
    cell.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('drag-over');
      var courseName = e.dataTransfer.getData('text/plain');
      if (!courseName) return;

      var year = this.getAttribute('data-year');
      var term = this.getAttribute('data-term');
      var key = 'year' + year + '-' + term;

      if (!plannerState.placements[key]) plannerState.placements[key] = [];
      if (plannerState.placements[key].indexOf(courseName) !== -1) return;

      plannerState.placements[key].push(courseName);
      removeFromPalette(courseName);
      renderCellContents();
      updateUnitCounts();
    });
  });
}

function removeFromPalette(name) {
  var list = document.querySelector('.palette-list');
  var items = list.querySelectorAll('.palette-item');
  for (var i = 0; i < items.length; i++) {
    if (items[i].textContent === name) {
      items[i].style.display = 'none';
      break;
    }
  }
  document.querySelector('.palette-count').textContent = list.querySelectorAll(
    '.palette-item:not([style*="display: none"])',
  ).length;
}

function restoreToPalette(name) {
  var list = document.querySelector('.palette-list');
  var items = list.querySelectorAll('.palette-item');
  for (var i = 0; i < items.length; i++) {
    if (items[i].textContent === name && items[i].style.display === 'none') {
      items[i].style.display = '';
      break;
    }
  }
  document.querySelector('.palette-count').textContent = list.querySelectorAll(
    '.palette-item:not([style*="display: none"])',
  ).length;
}

function renderCellContents() {
  var keys = Object.keys(plannerState.placements);
  keys.forEach(function (key) {
    var parts = key.replace('year', '').split('-');
    var year = parts[0];
    var term = parts[1];
    var cells = document.querySelectorAll(
      '.grid-cell[data-year="' + year + '"][data-term="' + term + '"]',
    );
    if (!cells.length) return;
    var cell = cells[0];
    cell.innerHTML = '';
    (plannerState.placements[key] || []).forEach(function (course) {
      var div = document.createElement('div');
      div.className = 'placed-course';
      div.textContent = course;
      div.draggable = true;
      div.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', course);
        e.dataTransfer.setData('source-cell', key);
        this.classList.add('dragging');
      });
      div.addEventListener('dragend', function () {
        this.classList.remove('dragging');
      });
      var rmBtn = document.createElement('span');
      rmBtn.className = 'remove-course';
      rmBtn.innerHTML = '&times;';
      rmBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeFromCell(key, course);
      });
      div.appendChild(rmBtn);
      cell.appendChild(div);
    });
  });

  document.querySelectorAll('.grid-cell').forEach(function (c) {
    c.addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('drag-over');
    });
    c.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('drag-over');
      var course = e.dataTransfer.getData('text/plain');
      if (!course) return;
      var sourceKey = e.dataTransfer.getData('source-cell');
      var targetYear = this.getAttribute('data-year');
      var targetTerm = this.getAttribute('data-term');
      var targetKey = 'year' + targetYear + '-' + targetTerm;

      if (sourceKey) {
        removeFromCell(sourceKey, course);
      } else {
        removeFromPalette(course);
      }

      if (!plannerState.placements[targetKey])
        plannerState.placements[targetKey] = [];
      if (plannerState.placements[targetKey].indexOf(course) === -1) {
        plannerState.placements[targetKey].push(course);
      }
      renderCellContents();
      updateUnitCounts();
    });
  });
}

function removeFromCell(key, course) {
  if (!plannerState.placements[key]) return;
  var idx = plannerState.placements[key].indexOf(course);
  if (idx !== -1) {
    plannerState.placements[key].splice(idx, 1);
    restoreToPalette(course);
    renderCellContents();
    updateUnitCounts();
  }
}

function updateUnitCounts() {
  var totals = { 1: 0, 2: 0, 3: 4, 4: 0 };
  for (var y = 1; y <= 4; y++) {
    var count = 0;
    ['fall', 'spring'].forEach(function (term) {
      var key = 'year' + y + '-' + term;
      count += (plannerState.placements[key] || []).length;
    });
    var units = document.querySelectorAll('.unit-count');
    if (units[y - 1]) units[y - 1].textContent = count + ' / ' + totals[y];
  }
}

// Planner tab switching
function switchPlannerTab(tabId) {
  document.querySelectorAll('.tab-pill').forEach(function (btn) {
    btn.classList.remove('active');
    if (btn.innerText.toLowerCase() === tabId) btn.classList.add('active');
  });
  document.querySelectorAll('.planner-tab-content').forEach(function (c) {
    c.classList.remove('active');
  });
  var tab = document.getElementById('tab-' + tabId);
  if (tab) tab.classList.add('active');

  var heroTitle = document.getElementById('heroTitle');
  var heroDesc = document.getElementById('heroDesc');
  var heroActions = document.getElementById('heroActions');
  var data = {
    overview: {
      title: 'University-style program planning',
      desc: 'Organize your degree path, choose a track when eligible, file petitions, and keep a printable record of requirement progress.',
      html: '<button class="btn-outline" onclick="switchPlannerTab(\'track\')">Choose Track</button><button class="btn-planner-primary" onclick="switchPlannerTab(\'sheet\')">Printable Sheet</button>',
    },
    track: {
      title: 'Choose your academic track',
      desc: 'Select the specialization path attached to your program version.',
      html: '<button class="btn-outline" onclick="switchPlannerTab(\'overview\')">Back to planner</button>',
    },
    petitions: {
      title: 'Petitions and exceptions',
      desc: 'Request transfer credit, substitutions, or waivers.',
      html: '<button class="btn-outline" onclick="switchPlannerTab(\'overview\')">Back to planner</button>',
    },
    sheet: {
      title: 'Printable program sheet',
      desc: 'Generate a snapshot of your requirement matches.',
      html: '<button class="btn-outline" onclick="window.print()">Print</button><button class="btn-planner-primary">Generate snapshot</button>',
    },
  };
  var d = data[tabId] || data.overview;
  heroTitle.innerText = d.title;
  heroDesc.innerText = d.desc;
  heroActions.innerHTML = d.html;
}

// Enroll button shows degree plan
function initEnrollButton() {
  var btn = document.getElementById('btn-enroll-now');
  if (!btn) return;
  btn.addEventListener('click', function () {
    document.getElementById('enroll-section').style.display = 'none';
    document.getElementById('degree-plan-section').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
