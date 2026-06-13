(function () {
  'use strict';

  var S = window.NibrasServices;
  var courseId = localStorage.getItem('selectedCourseId');
  var selectedCourse = null;
  var assignments = [];
  var editingId = null;
  var testCaseIdCounter = 0;
  var rubricIdCounter = 0;

  function getCourseData() {
    if (
      window.NibrasCourses &&
      typeof window.NibrasCourses.getSelectedCourse === 'function'
    ) {
      return window.NibrasCourses.getSelectedCourse();
    }
    return null;
  }

  function init() {
    selectedCourse = getCourseData();
    if (!selectedCourse && courseId) {
      var fallback =
        window.NibrasCourses &&
        typeof window.NibrasCourses.getCourseById === 'function'
          ? window.NibrasCourses.getCourseById(courseId)
          : null;
      if (fallback) {
        selectedCourse = fallback;
        if (
          window.NibrasCourses &&
          typeof window.NibrasCourses.setSelectedCourseId === 'function'
        ) {
          window.NibrasCourses.setSelectedCourseId(courseId);
        }
      }
    }

    if (!selectedCourse) {
      document.getElementById('course-subtitle').textContent =
        'Course: ' + (courseId || 'Unknown');
      document.getElementById('sidebar-course-code').textContent =
        courseId || 'Course';
      document.getElementById('sidebar-term').textContent = 'Instructor View';
      loadAssignments();
      setupUI();
      return;
    }

    document.getElementById('sidebar-course-code').textContent =
      selectedCourse.code + ': ' + selectedCourse.title;
    document.getElementById('sidebar-term').textContent =
      (selectedCourse.overview?.term || '') +
      ' • Week ' +
      (selectedCourse.overview?.currentWeek || '');
    document.getElementById('course-subtitle').textContent =
      selectedCourse.code + ': ' + selectedCourse.title;
    loadAssignments();
    setupUI();

    var navLinkCourses = document.querySelector(
      '[data-nav-link="courseContent"]',
    );
    if (navLinkCourses && courseId) {
      navLinkCourses.href =
        '../../Courses/Course%20Description/courseContent.html?courseId=' +
        encodeURIComponent(courseId);
    }
    var navLinkGrades = document.querySelector('[data-nav-link="grades"]');
    if (navLinkGrades && courseId) {
      navLinkGrades.href =
        '../InstructorGrades/instructor-grades.html?courseId=' +
        encodeURIComponent(courseId);
    }
  }

  function setupUI() {
    document
      .getElementById('btn-create-assignment')
      .addEventListener('click', function () {
        openCreateModal();
      });
    document
      .getElementById('modal-close')
      .addEventListener('click', closeModal);
    document.getElementById('btn-cancel').addEventListener('click', closeModal);
    document
      .getElementById('btn-save')
      .addEventListener('click', saveAssignment);
    document
      .getElementById('btn-add-test-case')
      .addEventListener('click', function () {
        addTestCaseRow();
      });
    document
      .getElementById('btn-add-rubric')
      .addEventListener('click', function () {
        addRubricRow();
      });
    document
      .getElementById('btn-batch-import')
      .addEventListener('click', function () {
        document.getElementById('batch-file-input').click();
      });
    document
      .getElementById('batch-file-input')
      .addEventListener('change', handleBatchImport);

    // Theme toggle
    var themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      var themeIcon = themeBtn.querySelector('i');
      var themeText = themeBtn.querySelector('span');
      var curTheme =
        document.documentElement.getAttribute('data-theme') || 'light';
      if (curTheme === 'dark') {
        themeIcon.className = 'fa-solid fa-sun';
        themeText.textContent = 'Light Mode';
      }
      themeBtn.classList.remove('rotating');
      void themeBtn.offsetWidth;
      themeBtn.addEventListener('click', function () {
        themeBtn.classList.add('rotating');
        var html = document.documentElement;
        var current = html.getAttribute('data-theme');
        var newTheme = current === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
          themeIcon.className = 'fa-solid fa-sun';
          themeText.textContent = 'Light Mode';
        } else {
          themeIcon.className = 'fa-solid fa-moon';
          themeText.textContent = 'Dark Mode';
        }
        setTimeout(function () {
          themeBtn.classList.remove('rotating');
        }, 500);
      });
    }

    // Close modal on overlay click
    document
      .getElementById('assignment-modal')
      .addEventListener('click', function (e) {
        if (e.target === this) closeModal();
      });
  }

  function loadAssignments() {
    var container = document.getElementById('assignment-list');
    if (!S || !S.assignmentAdminService) {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>Assignment service unavailable.</p></div>';
      return;
    }

    var backendId =
      selectedCourse?.adminCourseId ||
      selectedCourse?.backendCourseId ||
      courseId;
    if (!backendId) {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>No course ID available. Select a course first.</p></div>';
      return;
    }

    S.assignmentAdminService
      .listByCourse(backendId)
      .then(function (res) {
        var items = res?.data || [];
        if (!Array.isArray(items)) items = [];
        assignments = items;
        renderAssignments();
      })
      .catch(function () {
        assignments = [
          {
            _id: 'fb1',
            title: 'Assignment 1: Arrays & Strings',
            description:
              'Implement array manipulation and string processing algorithms.',
            dueDate: new Date(Date.now() + 604800000).toISOString(),
            type: 'code',
            points: 100,
            testCaseCount: 8,
          },
          {
            _id: 'fb2',
            title: 'Assignment 2: Linked Lists',
            description: 'Build and manipulate singly and doubly linked lists.',
            dueDate: new Date(Date.now() + 1209600000).toISOString(),
            type: 'code',
            points: 100,
            testCaseCount: 6,
          },
          {
            _id: 'fb3',
            title: 'Project 1: Sorting Visualizer',
            description:
              'Create a visualizer for common sorting algorithms using a framework of your choice.',
            dueDate: new Date(Date.now() + 1814400000).toISOString(),
            type: 'project',
            points: 200,
            testCaseCount: 0,
          },
          {
            _id: 'fb4',
            title: 'Quiz 1: Time Complexity',
            description:
              'Multiple choice quiz on Big-O notation and complexity analysis.',
            dueDate: new Date(Date.now() + 259200000).toISOString(),
            type: 'quiz',
            points: 50,
            testCaseCount: 0,
          },
        ];
        renderAssignments();
      });
  }

  function renderAssignments() {
    var container = document.getElementById('assignment-list');
    if (!assignments.length) {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-solid fa-file-circle-plus"></i><p>No assignments yet. Click "Create Assignment" to get started.</p></div>';
      return;
    }

    container.innerHTML = assignments
      .map(function (a) {
        var due = a.dueDate
          ? new Date(a.dueDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'No due date';
        var typeLabel = a.type || 'code';
        var typeIcon =
          typeLabel === 'code'
            ? 'fa-solid fa-code'
            : typeLabel === 'quiz'
              ? 'fa-solid fa-question'
              : 'fa-solid fa-folder-open';
        return (
          '<div class="assignment-card" data-id="' +
          (a._id || a.id) +
          '">' +
          '<div class="card-top">' +
          '<div class="card-icon"><i class="' +
          typeIcon +
          '"></i></div>' +
          '<div class="card-info">' +
          '<h3>' +
          escapeHtml(a.title || 'Untitled') +
          '</h3>' +
          '<p>' +
          escapeHtml(a.description || '') +
          '</p>' +
          '</div>' +
          '<div class="card-points">' +
          (a.points || a.maxScore || '—') +
          ' pts</div>' +
          '</div>' +
          '<div class="card-meta">' +
          '<span><i class="fa-regular fa-calendar"></i> ' +
          due +
          '</span>' +
          '<span><i class="fa-solid fa-vial"></i> ' +
          (a.testCaseCount || 0) +
          ' tests</span>' +
          '</div>' +
          '<div class="card-actions">' +
          '<button class="action-btn edit-btn" data-id="' +
          (a._id || a.id) +
          '"><i class="fa-regular fa-pen-to-square"></i> Edit</button>' +
          '<button class="action-btn delete-btn" data-id="' +
          (a._id || a.id) +
          '"><i class="fa-regular fa-trash-can"></i> Delete</button>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    container.querySelectorAll('.edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        openEditModal(id);
      });
    });
    container.querySelectorAll('.delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        if (confirm('Delete this assignment? This cannot be undone.'))
          deleteAssignment(id);
      });
    });
  }

  function openCreateModal() {
    editingId = null;
    document.getElementById('modal-title').textContent = 'Create Assignment';
    document.getElementById('btn-save').innerHTML =
      '<i class="fa-solid fa-floppy-disk"></i> Save Assignment';
    resetForm();
    document.getElementById('assignment-modal').style.display = 'flex';
  }

  function openEditModal(id) {
    var a = assignments.find(function (x) {
      return (x._id || x.id) === id;
    });
    if (!a) return;
    editingId = id;
    document.getElementById('modal-title').textContent = 'Edit Assignment';
    document.getElementById('btn-save').innerHTML =
      '<i class="fa-solid fa-pen-to-square"></i> Update Assignment';

    resetForm();
    document.getElementById('edit-assignment-id').value = id;
    document.getElementById('field-title').value = a.title || '';
    document.getElementById('field-desc').value = a.description || '';
    if (a.dueDate) {
      var d = new Date(a.dueDate);
      document.getElementById('field-due-date').value = d
        .toISOString()
        .slice(0, 10);
      document.getElementById('field-due-time').value = d
        .toTimeString()
        .slice(0, 5);
    }
    document.getElementById('field-points').value =
      a.points || a.maxScore || 100;
    document.getElementById('field-type').value = a.type || 'code';
    document.getElementById('field-language').value = a.language || 'python';

    if (a.resourceLimits) {
      document.getElementById('field-cpu').value = a.resourceLimits.cpu || 1;
      document.getElementById('field-memory').value =
        a.resourceLimits.memory || 256;
      document.getElementById('field-time-limit').value =
        a.resourceLimits.time || 5;
      document.getElementById('field-disk').value = a.resourceLimits.disk || 50;
    }

    // Load test cases
    renderTestCases(a.testCases || []);
    renderRubric(a.rubric || a.rubricCriteria || []);

    document.getElementById('assignment-modal').style.display = 'flex';
  }

  function resetForm() {
    document.getElementById('edit-assignment-id').value = '';
    document.getElementById('field-title').value = '';
    document.getElementById('field-desc').value = '';
    document.getElementById('field-due-date').value = '';
    document.getElementById('field-due-time').value = '';
    document.getElementById('field-points').value = 100;
    document.getElementById('field-type').value = 'code';
    document.getElementById('field-language').value = 'python';
    document.getElementById('field-cpu').value = 1;
    document.getElementById('field-memory').value = 256;
    document.getElementById('field-time-limit').value = 5;
    document.getElementById('field-disk').value = 50;
    document.getElementById('form-status').textContent = '';
    document.getElementById('form-status').className = 'form-status';
    renderTestCases([]);
    renderRubric([]);
  }

  function closeModal() {
    document.getElementById('assignment-modal').style.display = 'none';
  }

  function collectFormData() {
    var data = {
      title: document.getElementById('field-title').value.trim(),
      description: document.getElementById('field-desc').value.trim(),
      dueDate: buildDueDateISO(),
      points: parseInt(document.getElementById('field-points').value) || 100,
      type: document.getElementById('field-type').value,
      language: document.getElementById('field-language').value,
      resourceLimits: {
        cpu: parseFloat(document.getElementById('field-cpu').value) || 1,
        memory: parseInt(document.getElementById('field-memory').value) || 256,
        time: parseInt(document.getElementById('field-time-limit').value) || 5,
        disk: parseInt(document.getElementById('field-disk').value) || 50,
      },
      testCases: collectTestCases(),
      rubricCriteria: collectRubric(),
    };
    if (!data.title) throw new Error('Title is required.');
    return data;
  }

  function buildDueDateISO() {
    var dateVal = document.getElementById('field-due-date').value;
    var timeVal = document.getElementById('field-due-time').value;
    if (!dateVal) return null;
    return dateVal + 'T' + (timeVal || '23:59') + ':00.000Z';
  }

  function collectTestCases() {
    var rows = document.querySelectorAll('.test-case-row');
    var cases = [];
    rows.forEach(function (row) {
      var input = row.querySelector('.tc-input')?.value || '';
      var expected = row.querySelector('.tc-expected')?.value || '';
      var isHidden = row.querySelector('.tc-hidden')?.checked || false;
      var weight = parseFloat(row.querySelector('.tc-weight')?.value) || 1;
      var timeLimit = parseInt(row.querySelector('.tc-time-limit')?.value) || 5;
      var memoryLimit =
        parseInt(row.querySelector('.tc-memory-limit')?.value) || 256;
      cases.push({
        input: input,
        expectedOutput: expected,
        isHidden: isHidden,
        weight: weight,
        timeLimit: timeLimit,
        memoryLimit: memoryLimit,
      });
    });
    return cases;
  }

  function collectRubric() {
    var rows = document.querySelectorAll('.rubric-row');
    var criteria = [];
    rows.forEach(function (row) {
      var name = row.querySelector('.rb-name')?.value || '';
      var desc = row.querySelector('.rb-desc')?.value || '';
      var maxPts = parseInt(row.querySelector('.rb-max')?.value) || 10;
      if (name)
        criteria.push({ name: name, description: desc, maxPoints: maxPts });
    });
    return criteria;
  }

  function saveAssignment() {
    var statusEl = document.getElementById('form-status');
    statusEl.textContent = '';
    statusEl.className = 'form-status';

    var data;
    try {
      data = collectFormData();
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.className = 'form-status form-status-error';
      return;
    }

    var backendId =
      selectedCourse?.adminCourseId ||
      selectedCourse?.backendCourseId ||
      courseId;
    data.courseId = backendId;

    var service = S.assignmentAdminService;
    var promise;
    if (editingId) {
      promise = service.update(editingId, data);
    } else {
      promise = service.create(data);
    }

    statusEl.textContent = 'Saving...';
    statusEl.className = 'form-status form-status-info';

    promise
      .then(function () {
        statusEl.textContent = 'Saved successfully!';
        statusEl.className = 'form-status form-status-success';
        closeModal();
        loadAssignments();
      })
      .catch(function (err) {
        statusEl.textContent =
          'Save failed: ' + (err?.message || 'Unknown error');
        statusEl.className = 'form-status form-status-error';
      });
  }

  function deleteAssignment(id) {
    var service = S.assignmentAdminService;
    if (!service) return;
    service
      .delete(id)
      .then(function () {
        loadAssignments();
      })
      .catch(function (err) {
        alert('Delete failed: ' + (err?.message || 'Unknown error'));
      });
  }

  // --- Test Case Rows ---
  function addTestCaseRow(tc) {
    var container = document.getElementById('test-cases-container');
    var id = 'tc-' + ++testCaseIdCounter;
    var div = document.createElement('div');
    div.className = 'test-case-row';
    div.id = id;
    div.innerHTML =
      '<div class="tc-fields">' +
      '<div class="tc-field"><label class="label-sm">Input</label><textarea class="form-input-sm tc-input" rows="2">' +
      escapeHtml(tc?.input || '') +
      '</textarea></div>' +
      '<div class="tc-field"><label class="label-sm">Expected Output</label><textarea class="form-input-sm tc-expected" rows="2">' +
      escapeHtml(tc?.expectedOutput || '') +
      '</textarea></div>' +
      '</div>' +
      '<div class="tc-options">' +
      '<label class="tc-check-label"><input type="checkbox" class="tc-hidden" ' +
      (tc?.isHidden ? 'checked' : '') +
      '> Hidden</label>' +
      '<div><label class="label-sm">Weight</label><input type="number" class="form-input-xs tc-weight" value="' +
      (tc?.weight || 1) +
      '" min="0.1" step="0.1"></div>' +
      '<div><label class="label-sm">Time (s)</label><input type="number" class="form-input-xs tc-time-limit" value="' +
      (tc?.timeLimit || 5) +
      '" min="1"></div>' +
      '<div><label class="label-sm">Memory (MB)</label><input type="number" class="form-input-xs tc-memory-limit" value="' +
      (tc?.memoryLimit || 256) +
      '" min="16"></div>' +
      '<button class="tc-remove" title="Remove test case"><i class="fa-solid fa-xmark"></i></button>' +
      '</div>';
    container.appendChild(div);
    div.querySelector('.tc-remove').addEventListener('click', function () {
      div.remove();
    });
  }

  function renderTestCases(testCases) {
    var container = document.getElementById('test-cases-container');
    container.innerHTML = '';
    testCaseIdCounter = 0;
    if (!testCases || !testCases.length) {
      container.innerHTML =
        '<p class="empty-hint">No test cases yet. Add one above.</p>';
      return;
    }
    testCases.forEach(function (tc) {
      addTestCaseRow(tc);
    });
  }

  function handleBatchImport(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        var text = ev.target.result;
        var data = JSON.parse(text);
        var cases = Array.isArray(data) ? data : data.testCases || [];
        cases.forEach(function (tc) {
          addTestCaseRow(tc);
        });
      } catch (_) {
        // Try CSV
        try {
          var lines = text.split('\n').filter(Boolean);
          for (var i = 1; i < lines.length; i++) {
            var parts = lines[i].split(',');
            if (parts.length >= 2) {
              addTestCaseRow({
                input: parts[0].trim(),
                expectedOutput: parts[1].trim(),
                weight: parseFloat(parts[2]) || 1,
              });
            }
          }
        } catch (_2) {
          alert('Could not parse file. Use JSON or CSV format.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // --- Rubric Rows ---
  function addRubricRow(criterion) {
    var container = document.getElementById('rubric-container');
    var id = 'rb-' + ++rubricIdCounter;
    var div = document.createElement('div');
    div.className = 'rubric-row';
    div.id = id;
    div.innerHTML =
      '<div class="rb-fields">' +
      '<div class="rb-field rb-field-wide"><label class="label-sm">Name</label><input type="text" class="form-input-sm rb-name" placeholder="e.g. Correctness" value="' +
      escapeHtml(criterion?.name || '') +
      '"></div>' +
      '<div class="rb-field"><label class="label-sm">Max Points</label><input type="number" class="form-input-sm rb-max" value="' +
      (criterion?.maxPoints || 10) +
      '" min="0"></div>' +
      '<button class="rb-remove" title="Remove criterion"><i class="fa-solid fa-xmark"></i></button>' +
      '</div>' +
      '<div class="rb-field"><label class="label-sm">Description</label><input type="text" class="form-input-sm rb-desc" placeholder="What this criterion measures" value="' +
      escapeHtml(criterion?.description || '') +
      '"></div>';
    container.appendChild(div);
    div.querySelector('.rb-remove').addEventListener('click', function () {
      div.remove();
    });
  }

  function renderRubric(criteria) {
    var container = document.getElementById('rubric-container');
    container.innerHTML = '';
    rubricIdCounter = 0;
    if (!criteria || !criteria.length) {
      container.innerHTML =
        '<p class="empty-hint">No rubric criteria yet. Add one above.</p>';
      return;
    }
    criteria.forEach(function (c) {
      addRubricRow(c);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
