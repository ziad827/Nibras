var plannerState = {
  plan: null,
  catalogById: {},
  placements: {},
  availablePrograms: [],
  saveTimer: null,
  validationIssues: [],
};

function getProgramService() {
  return window.NibrasServices && window.NibrasServices.programService;
}

function unwrapPlan(res) {
  if (!res) return null;
  if (res.data && res.data.id) return res.data;
  if (res.id) return res;
  return res;
}

function catalogLabel(course) {
  if (!course) return '';
  var code =
    (course.subjectCode || '') +
    (course.catalogNumber ? ' ' + course.catalogNumber : '');
  return (code.trim() ? code.trim() + ' · ' : '') + (course.title || '');
}

function placementsFromPlanned(plannedCourses) {
  var placements = {};
  (plannedCourses || []).forEach(function (pc) {
    var key = 'year' + pc.plannedYear + '-' + pc.plannedTerm;
    if (!placements[key]) placements[key] = [];
    if (placements[key].indexOf(pc.catalogCourseId) === -1) {
      placements[key].push(pc.catalogCourseId);
    }
  });
  return placements;
}

function plannedCoursesFromPlacements() {
  var out = [];
  Object.keys(plannerState.placements).forEach(function (key) {
    var parts = key.replace('year', '').split('-');
    var year = parseInt(parts[0], 10);
    var term = parts[1];
    (plannerState.placements[key] || []).forEach(function (catalogCourseId) {
      out.push({
        catalogCourseId: catalogCourseId,
        plannedYear: year,
        plannedTerm: term,
        sourceType: 'standard',
        note: null,
      });
    });
  });
  return out;
}

function setValidationNotice(issues) {
  plannerState.validationIssues = Array.isArray(issues) ? issues : [];
  var el = document.getElementById('planner-validation-notice');
  if (!el) return;
  if (!plannerState.validationIssues.length) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  el.style.display = 'block';
  el.innerHTML =
    '<strong>Plan issues:</strong><ul>' +
    plannerState.validationIssues
      .map(function (i) {
        var msg = typeof i === 'string' ? i : i.message || i.code || '';
        return '<li>' + msg + '</li>';
      })
      .join('') +
    '</ul>';
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

function showEnrollView() {
  var enroll = document.getElementById('enroll-section');
  var plan = document.getElementById('degree-plan-section');
  if (enroll) enroll.style.display = '';
  if (plan) plan.style.display = 'none';
}

function showPlanView() {
  var enroll = document.getElementById('enroll-section');
  var plan = document.getElementById('degree-plan-section');
  if (enroll) enroll.style.display = 'none';
  if (plan) plan.style.display = 'block';
}

function applyPlanToState(plan) {
  plannerState.plan = plan;
  plannerState.catalogById = {};
  (plan.catalogCourses || []).forEach(function (c) {
    plannerState.catalogById[c.id] = c;
  });
  plannerState.placements = placementsFromPlanned(plan.plannedCourses || []);
}

function buildPalette() {
  var list = document.querySelector('.palette-list');
  if (!list) return;
  var placedIds = {};
  Object.keys(plannerState.placements).forEach(function (key) {
    (plannerState.placements[key] || []).forEach(function (id) {
      placedIds[id] = true;
    });
  });
  var courses = plannerState.plan
    ? plannerState.plan.catalogCourses || []
    : Object.keys(plannerState.catalogById).map(function (id) {
        return plannerState.catalogById[id];
      });
  list.innerHTML = '';
  courses.forEach(function (course) {
    if (placedIds[course.id]) return;
    var item = document.createElement('div');
    item.className = 'palette-item';
    item.setAttribute('data-catalog-id', course.id);
    item.textContent = catalogLabel(course);
    item.draggable = true;
    item.addEventListener('dragstart', onPaletteDragStart);
    item.addEventListener('dragend', onPaletteDragEnd);
    list.appendChild(item);
  });
  var countEl = document.querySelector('.palette-count');
  if (countEl) countEl.textContent = String(list.children.length);
}

function onPaletteDragStart(e) {
  var id = this.getAttribute('data-catalog-id');
  e.dataTransfer.setData('catalogCourseId', id);
  e.dataTransfer.setData('text/plain', this.textContent);
  this.classList.add('dragging');
}

function onPaletteDragEnd() {
  this.classList.remove('dragging');
}

function renderCellContents() {
  document.querySelectorAll('.grid-cell').forEach(function (cell) {
    cell.innerHTML = '';
  });
  Object.keys(plannerState.placements).forEach(function (key) {
    var parts = key.replace('year', '').split('-');
    var year = parts[0];
    var term = parts[1];
    var cell = document.querySelector(
      '.grid-cell[data-year="' + year + '"][data-term="' + term + '"]',
    );
    if (!cell) return;
    (plannerState.placements[key] || []).forEach(function (catalogCourseId) {
      var course = plannerState.catalogById[catalogCourseId];
      var label = course ? catalogLabel(course) : catalogCourseId;
      var div = document.createElement('div');
      div.className = 'placed-course';
      div.setAttribute('data-catalog-id', catalogCourseId);
      div.textContent = label;
      div.draggable = true;
      div.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('catalogCourseId', catalogCourseId);
        e.dataTransfer.setData('text/plain', label);
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
        removeFromCell(key, catalogCourseId);
      });
      div.appendChild(rmBtn);
      cell.appendChild(div);
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
    cell.addEventListener('drop', onCellDrop);
  });
}

function onCellDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  var catalogCourseId = e.dataTransfer.getData('catalogCourseId');
  if (!catalogCourseId) return;
  var sourceKey = e.dataTransfer.getData('source-cell');
  var targetYear = this.getAttribute('data-year');
  var targetTerm = this.getAttribute('data-term');
  var targetKey = 'year' + targetYear + '-' + targetTerm;

  if (sourceKey) {
    removeFromCell(sourceKey, catalogCourseId, false);
  }

  if (!plannerState.placements[targetKey]) {
    plannerState.placements[targetKey] = [];
  }
  if (plannerState.placements[targetKey].indexOf(catalogCourseId) === -1) {
    plannerState.placements[targetKey].push(catalogCourseId);
  }
  renderCellContents();
  buildPalette();
  updateUnitCounts();
  scheduleSavePlan();
}

function removeFromCell(key, catalogCourseId, refresh) {
  if (refresh === undefined) refresh = true;
  if (!plannerState.placements[key]) return;
  var idx = plannerState.placements[key].indexOf(catalogCourseId);
  if (idx === -1) return;
  plannerState.placements[key].splice(idx, 1);
  if (refresh) {
    renderCellContents();
    buildPalette();
    updateUnitCounts();
    scheduleSavePlan();
  }
}

function updateUnitCounts() {
  var totals = { 1: 0, 2: 0, 3: 0, 4: 0 };
  if (plannerState.plan && plannerState.plan.version) {
    var dur = plannerState.plan.version.durationYears || 4;
    for (var y = 1; y <= dur; y++) totals[y] = 0;
  }
  for (var y = 1; y <= 4; y++) {
    var count = 0;
    ['fall', 'spring'].forEach(function (term) {
      var key = 'year' + y + '-' + term;
      count += (plannerState.placements[key] || []).length;
    });
    var units = document.querySelectorAll('.unit-count');
    if (units[y - 1]) {
      var target = totals[y] || 0;
      units[y - 1].textContent = count + ' / ' + (target || '—');
    }
  }
}

function scheduleSavePlan() {
  if (plannerState.saveTimer) clearTimeout(plannerState.saveTimer);
  plannerState.saveTimer = setTimeout(savePlanToServer, 600);
}

function savePlanToServer() {
  var svc = getProgramService();
  if (!svc || !plannerState.plan) return;
  var planned = plannedCoursesFromPlacements();
  svc
    .updatePlan(planned)
    .then(function (res) {
      var plan = unwrapPlan(res);
      if (plan) {
        applyPlanToState(plan);
        if (plan.validation && plan.validation.issues) {
          setValidationNotice(plan.validation.issues);
        }
      }
      return svc.validatePlan(planned);
    })
    .then(function (validation) {
      var v = validation && (validation.data || validation);
      if (v && v.issues) setValidationNotice(v.issues);
      else if (v && v.isValid) setValidationNotice([]);
    })
    .catch(function (err) {
      console.warn('[planner] save failed:', err);
    });
}

function renderEnrollPrograms(programs) {
  var grid = document.querySelector('.enroll-grid');
  var countText = document.querySelector('#enroll-section .count-text');
  if (!grid) return;
  var list = Array.isArray(programs) ? programs : [];
  plannerState.availablePrograms = list;
  if (countText) countText.textContent = list.length + ' available';
  grid.innerHTML = '';
  if (!list.length) {
    grid.innerHTML =
      '<p style="color:var(--text-secondary);">No programs available yet.</p>';
    return;
  }
  list.forEach(function (prog) {
    var card = document.createElement('div');
    card.className = 'program-card';
    card.innerHTML =
      '<span class="prog-tag">' +
      (prog.code || 'CS') +
      '</span>' +
      '<h2>' +
      (prog.title || 'Program') +
      '</h2>' +
      '<p class="prog-year">' +
      (prog.academicYear || '') +
      '</p>' +
      '<p class="prog-units">' +
      (prog.totalUnitRequirement || 120) +
      ' total units</p>' +
      '<button class="btn-planner-primary btn-enroll-program" data-program-id="' +
      prog.id +
      '">Enroll</button>';
    grid.appendChild(card);
  });
  grid.querySelectorAll('.btn-enroll-program').forEach(function (btn) {
    btn.addEventListener('click', function () {
      enrollInProgram(btn.getAttribute('data-program-id'));
    });
  });
}

function enrollInProgram(programId) {
  var svc = getProgramService();
  if (!svc || !programId) return;
  svc
    .enroll(programId)
    .then(function (res) {
      var plan = unwrapPlan(res);
      if (!plan) throw new Error('Enroll failed');
      applyPlanToState(plan);
      showPlanView();
      updatePlanHeader();
      buildPalette();
      renderCellContents();
      updateUnitCounts();
    })
    .catch(function (err) {
      alert(err.message || 'Could not enroll in program.');
    });
}

function updatePlanHeader() {
  if (!plannerState.plan || !plannerState.plan.program) return;
  var subtitle = document.querySelector('.plan-subtitle');
  if (subtitle) {
    subtitle.textContent =
      (plannerState.plan.program.code || '') +
      ' · ' +
      (plannerState.plan.program.title || '');
  }
}

function loadPlannerFromApi() {
  var svc = getProgramService();
  if (!svc) {
    showEnrollView();
    return;
  }
  svc
    .listPrograms()
    .then(function (programsRes) {
      var programs = Array.isArray(programsRes)
        ? programsRes
        : programsRes && programsRes.data
          ? programsRes.data
          : [];
      renderEnrollPrograms(programs);
      return svc.getMyPlan();
    })
    .then(function (planRes) {
      var plan = unwrapPlan(planRes);
      if (!plan) {
        showEnrollView();
        return;
      }
      applyPlanToState(plan);
      showPlanView();
      updatePlanHeader();
      buildPalette();
      renderCellContents();
      updateUnitCounts();
      if (plan.validation && plan.validation.issues) {
        setValidationNotice(plan.validation.issues);
      }
      renderTrackTab();
      renderPetitionsTab();
      renderSheetTab();
    })
    .catch(function (err) {
      if (err && (err.status === 404 || err.statusCode === 404)) {
        showEnrollView();
        return;
      }
      console.warn('[planner] load failed:', err);
      showEnrollView();
    });
}

function renderTrackTab() {
  if (!plannerState.plan) return;
  var plan = plannerState.plan;
  var statusCards = document.querySelectorAll('#tab-track .status-card h3');
  if (statusCards[0]) {
    statusCards[0].textContent = plan.selectedTrack
      ? plan.selectedTrack.title
      : 'Not selected';
  }
  if (statusCards[1]) {
    statusCards[1].textContent = plan.canSelectTrack ? 'Unlocked' : 'Locked';
  }
  var grid = document.querySelector('#tab-track .tracks-grid');
  if (!grid) return;
  grid.innerHTML = '';
  (plan.availableTracks || []).forEach(function (track) {
    var selected =
      plan.selectedTrack && plan.selectedTrack.id === track.id;
    var card = document.createElement('div');
    card.className = 'track-card';
    card.innerHTML =
      '<span class="track-id">' +
      (track.slug || track.id) +
      '</span>' +
      '<h4>' +
      (track.title || '') +
      '</h4>' +
      '<p>' +
      (track.description || 'Specialization track') +
      '</p>' +
      '<span class="track-unlock">Opens from Year ' +
      (plan.version && plan.version.trackSelectionMinYear
        ? plan.version.trackSelectionMinYear
        : 2) +
      '</span>';
    var btn = document.createElement('button');
    if (selected) {
      btn.className = 'btn-track-selected';
      btn.textContent = 'Selected';
      btn.disabled = true;
    } else if (plan.canSelectTrack && !plan.isLocked) {
      btn.className = 'btn-track-select';
      btn.textContent = 'Select track';
      btn.addEventListener('click', function () {
        selectTrack(track.id);
      });
    } else {
      btn.className = 'btn-track-locked';
      btn.textContent = 'Track locked';
      btn.disabled = true;
    }
    card.appendChild(btn);
    grid.appendChild(card);
  });
}

function selectTrack(trackId) {
  var svc = getProgramService();
  if (!svc) return;
  svc
    .selectTrack(trackId)
    .then(function (res) {
      var plan = unwrapPlan(res);
      if (plan) {
        applyPlanToState(plan);
        renderTrackTab();
        updatePlanHeader();
      }
    })
    .catch(function (err) {
      alert(err.message || 'Could not select track.');
    });
}

function renderPetitionsTab() {
  if (!plannerState.plan) return;
  var petitions = plannerState.plan.petitions || [];
  var submitted = petitions.length;
  var pending = petitions.filter(function (p) {
    return (
      p.status === 'pending_advisor' || p.status === 'pending_department'
    );
  }).length;
  var statVals = document.querySelectorAll(
    '#tab-petitions .stat-box-planner .stat-value',
  );
  if (statVals[0]) statVals[0].textContent = String(submitted);
  if (statVals[1]) statVals[1].textContent = String(pending);

  var listEl = document.getElementById('petition-list');
  if (!listEl) return;
  if (!petitions.length) {
    listEl.innerHTML =
      '<p style="color:var(--text-secondary);">No petitions submitted yet.</p>';
    return;
  }
  listEl.innerHTML = petitions
    .map(function (p) {
      return (
        '<div class="petition-item"><strong>' +
        p.type +
        '</strong> — ' +
        p.status +
        '<p>' +
        (p.justification || '') +
        '</p></div>'
      );
    })
    .join('');
}

function submitPetition() {
  var svc = getProgramService();
  if (!svc) return;
  var typeSelect = document.querySelector('#tab-petitions select');
  var justification = document.getElementById('petition-justification');
  var groupSelect = document.querySelector(
    '#tab-petitions .form-group:nth-child(2) select',
  );
  var originalId = document.getElementById('originalCatalogCourseId');
  var substituteId = document.getElementById('substituteCatalogCourseId');
  var typeMap = {
    'Transfer / AP credit': 'transfer_credit',
    'Course substitution': 'substitution',
    'Requirement waiver': 'waiver',
  };
  var typeLabel = typeSelect ? typeSelect.value : 'transfer_credit';
  var payload = {
    type: typeMap[typeLabel] || 'transfer_credit',
    justification: justification ? justification.value.trim() : '',
    attachmentUrl: null,
    targetRequirementGroupId: null,
    originalCatalogCourseId: originalId && originalId.value ? originalId.value : null,
    substituteCatalogCourseId:
      substituteId && substituteId.value ? substituteId.value : null,
  };
  if (!payload.justification) {
    alert('Please enter a justification.');
    return;
  }
  if (groupSelect && groupSelect.value && groupSelect.value !== 'Optional target') {
    var groups = plannerState.plan.requirementGroups || [];
    var match = groups.find(function (g) {
      return g.title === groupSelect.value;
    });
    if (match) payload.targetRequirementGroupId = match.id;
  }
  svc
    .createPetition(payload)
    .then(function () {
      return svc.getMyPlan();
    })
    .then(function (res) {
      var plan = unwrapPlan(res);
      if (plan) {
        plannerState.plan = plan;
        renderPetitionsTab();
      }
      if (justification) justification.value = '';
      alert('Petition submitted.');
    })
    .catch(function (err) {
      alert(err.message || 'Could not submit petition.');
    });
}

function renderSheetTab() {
  var svc = getProgramService();
  if (!svc || !plannerState.plan) return;
  svc
    .getSheet()
    .then(function (sheetRes) {
      var sheet = sheetRes && (sheetRes.data || sheetRes);
      var container = document.getElementById('sheet-content');
      if (!container || !sheet) return;
      var header = sheet.header || {};
      container.innerHTML =
        '<h3>' +
        (header.programTitle || plannerState.plan.program.title) +
        '</h3>' +
        '<p>Student: ' +
        (header.studentName || '') +
        '</p>' +
        '<p>Track: ' +
        (header.trackTitle || 'Not selected') +
        '</p>';
    })
    .catch(function () {
      /* sheet may not exist until generated */
    });
}

function generateSheetSnapshot() {
  var svc = getProgramService();
  if (!svc) return;
  svc
    .generateSheet()
    .then(function () {
      renderSheetTab();
      alert('Sheet snapshot generated.');
    })
    .catch(function (err) {
      alert(err.message || 'Could not generate sheet.');
    });
}

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
      html:
        '<button class="btn-outline" onclick="switchPlannerTab(\'track\')">Choose Track</button><button class="btn-planner-primary" onclick="switchPlannerTab(\'sheet\')">Printable Sheet</button>',
    },
    track: {
      title: 'Choose your academic track',
      desc: 'Select the specialization path attached to your program version.',
      html:
        '<button class="btn-outline" onclick="switchPlannerTab(\'overview\')">Back to planner</button>',
    },
    petitions: {
      title: 'Petitions and exceptions',
      desc: 'Request transfer credit, substitutions, or waivers.',
      html:
        '<button class="btn-outline" onclick="switchPlannerTab(\'overview\')">Back to planner</button>',
    },
    sheet: {
      title: 'Printable program sheet',
      desc: 'Generate a snapshot of your requirement matches.',
      html:
        '<button class="btn-outline" onclick="window.print()">Print</button><button class="btn-planner-primary" onclick="generateSheetSnapshot()">Generate snapshot</button>',
    },
  };
  var d = data[tabId] || data.overview;
  if (heroTitle) heroTitle.innerText = d.title;
  if (heroDesc) heroDesc.innerText = d.desc;
  if (heroActions) heroActions.innerHTML = d.html;

  if (tabId === 'track') renderTrackTab();
  if (tabId === 'petitions') renderPetitionsTab();
  if (tabId === 'sheet') renderSheetTab();
}

window.switchPlannerTab = switchPlannerTab;
window.generateSheetSnapshot = generateSheetSnapshot;

function initSavePlanButton() {
  var btn = document.querySelector('#degree-plan-section .btn-planner-primary');
  if (!btn || btn.id === 'btn-enroll-now') return;
  btn.addEventListener('click', function () {
    savePlanToServer();
    alert('Plan saved.');
  });
}

function initPetitionForm() {
  var btn = document.getElementById('btn-submit-petition');
  if (btn) btn.addEventListener('click', submitPetition);
}

window.NibrasReact.run(function () {
  updateSidebarUser();
  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    var htmlEl = document.documentElement;
    var themeIcon = themeToggle.querySelector('i');
    var saved = localStorage.getItem('theme') || 'light';
    htmlEl.setAttribute('data-theme', saved);
    themeIcon.className = saved === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    themeToggle.addEventListener('click', function () {
      var cur = htmlEl.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      htmlEl.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      themeIcon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      var logo = document.querySelector('.sidebar-logo');
      if (logo) {
        logo.src =
          next === 'dark'
            ? '../Assets/images/logo-dark.png'
            : '../Assets/images/logo-light.png';
      }
    });
  }

  initCellDrop();
  initSavePlanButton();
  initPetitionForm();
  loadPlannerFromApi();
});
