(function () {
  'use strict';

  var S = window.NibrasServices;
  var courseId = localStorage.getItem('selectedCourseId');
  var selectedCourse = null;
  var assignments = [];
  var submissions = [];
  var currentSubmission = null;
  var currentRubric = [];

  function init() {
    selectedCourse =
      window.NibrasCourses &&
      typeof window.NibrasCourses.getSelectedCourse === 'function'
        ? window.NibrasCourses.getSelectedCourse()
        : null;
    if (
      !selectedCourse &&
      courseId &&
      window.NibrasCourses &&
      typeof window.NibrasCourses.getCourseById === 'function'
    ) {
      selectedCourse = window.NibrasCourses.getCourseById(courseId);
      if (selectedCourse && window.NibrasCourses.setSelectedCourseId) {
        window.NibrasCourses.setSelectedCourseId(courseId);
      }
    }

    if (selectedCourse) {
      document.getElementById('sidebar-course-code').textContent =
        selectedCourse.code + ': ' + selectedCourse.title;
      document.getElementById('sidebar-term').textContent =
        (selectedCourse.overview?.term || '') +
        ' • Week ' +
        (selectedCourse.overview?.currentWeek || '');
      document.getElementById('course-subtitle').textContent =
        selectedCourse.code + ': ' + selectedCourse.title;
    } else {
      document.getElementById('sidebar-course-code').textContent =
        courseId || 'Course';
      document.getElementById('sidebar-term').textContent = 'Instructor View';
      document.getElementById('course-subtitle').textContent =
        'Course: ' + (courseId || 'Unknown');
    }

    fixNavLinks();
    setupUI();
    loadAssignments();
  }

  function fixNavLinks() {
    var navCourse = document.querySelector('[data-nav-link="courseContent"]');
    if (navCourse && courseId)
      navCourse.href =
        '../../Courses/Course%20Description/courseContent.html?courseId=' +
        encodeURIComponent(courseId);
    var navAssign = document.querySelector('[data-nav-link="assignments"]');
    if (navAssign && courseId)
      navAssign.href =
        '../AssignmentBuilder/assignment-builder.html?courseId=' +
        encodeURIComponent(courseId);
    var navGrades = document.querySelector('[data-nav-link="grades"]');
    if (navGrades && courseId)
      navGrades.href =
        '../InstructorGrades/instructor-grades.html?courseId=' +
        encodeURIComponent(courseId);
  }

  function setupUI() {
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
      themeBtn.addEventListener('click', function () {
        themeBtn.classList.remove('rotating');
        void themeBtn.offsetWidth;
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
      });
    }

    // Assignment selector
    document
      .getElementById('assignment-select')
      .addEventListener('change', function () {
        var val = this.value;
        if (val) loadSubmissions(val);
        else {
          document.getElementById('grade-stats').style.display = 'none';
          document.getElementById('table-wrapper').style.display = 'none';
          document.getElementById('empty-state').style.display = 'block';
        }
      });

    // Modal
    document
      .getElementById('modal-close')
      .addEventListener('click', closeModal);

    // Detail tabs
    document.querySelectorAll('.detail-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.detail-tab').forEach(function (t) {
          t.classList.remove('active');
        });
        this.classList.add('active');
        document.querySelectorAll('.detail-panel').forEach(function (p) {
          p.classList.remove('active');
        });
        var panel = document.getElementById('panel-' + this.dataset.tab);
        if (panel) panel.classList.add('active');
      });
    });

    // Submit grade
    document
      .getElementById('btn-submit-grade')
      .addEventListener('click', submitGrade);
    document
      .getElementById('btn-assign-peer')
      .addEventListener('click', assignPeerReview);

    // Close on overlay click
    document
      .getElementById('detail-modal')
      .addEventListener('click', function (e) {
        if (e.target === this) closeModal();
      });
  }

  function loadAssignments() {
    var select = document.getElementById('assignment-select');
    var backendId =
      selectedCourse?.adminCourseId ||
      selectedCourse?.backendCourseId ||
      courseId;
    if (!backendId) return;

    if (S && S.assignmentAdminService) {
      S.assignmentAdminService
        .listByCourse(backendId)
        .then(function (res) {
          var items = res?.data || [];
          if (!Array.isArray(items)) items = [];
          assignments = items;
          populateSelect(select, items);
          // Fallback: use local assignment data
          if (
            !items.length &&
            selectedCourse &&
            selectedCourse.assignments &&
            selectedCourse.assignments.items
          ) {
            assignments = selectedCourse.assignments.items;
            populateSelect(select, assignments);
          }
          if (!items.length) {
            document.getElementById('empty-state').innerHTML =
              '<i class="fa-solid fa-file-circle-plus"></i><p>No assignments yet. Create one in the Assignment Builder first.</p>';
            document.getElementById('empty-state').style.display = 'block';
          }
        })
        .catch(function () {
          // Fallback to local data
          if (
            selectedCourse &&
            selectedCourse.assignments &&
            selectedCourse.assignments.items
          ) {
            assignments = selectedCourse.assignments.items;
            populateSelect(select, assignments);
          } else {
            assignments = [
              {
                _id: 'hw1',
                title: 'Homework 1: Arrays & Strings',
                points: 100,
              },
              { _id: 'hw2', title: 'Homework 2: Linked Lists', points: 100 },
              { _id: 'hw3', title: 'Homework 3: Trees & Graphs', points: 100 },
              {
                _id: 'project1',
                title: 'Project 1: Sorting Visualizer',
                points: 150,
              },
              { _id: 'project2', title: 'Project 2: Pathfinding', points: 200 },
            ];
            populateSelect(select, assignments);
          }
        });
    }
  }

  function populateSelect(select, items) {
    select.innerHTML = '<option value="">— Select an assignment —</option>';
    items.forEach(function (a) {
      var opt = document.createElement('option');
      opt.value = a._id || a.id || a.title;
      opt.textContent =
        (a.title || 'Untitled') + ' (' + (a.points || '—') + ' pts)';
      select.appendChild(opt);
    });
  }

  function loadSubmissions(assignmentId) {
    var tbody = document.getElementById('submissions-body');
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:32px">Loading submissions...</td></tr>';

    var backendId =
      selectedCourse?.adminCourseId ||
      selectedCourse?.backendCourseId ||
      courseId;

    if (S && S.evaluationService && S.evaluationService.listByAssignment) {
      S.evaluationService
        .listByAssignment(assignmentId)
        .then(function (res) {
          var items = res?.data || [];
          if (!Array.isArray(items)) items = [];
          submissions = items;
          if (!submissions.length) generateDemoSubmissions(assignmentId);
          renderSubmissions();
        })
        .catch(function () {
          generateDemoSubmissions(assignmentId);
          renderSubmissions();
        });
    } else {
      generateDemoSubmissions(assignmentId);
      renderSubmissions();
    }
  }

  function generateDemoSubmissions(assignmentId) {
    var demoStudents = [
      'Ahmed Hassan',
      'Mariam Khalid',
      'Youssef Ibrahim',
      'Laila Mostafa',
      'Omar Abdelrahman',
      'Nour El-Din',
      'Hana Youssef',
      'Karim Samir',
    ];
    var statuses = ['pending', 'evaluated', 'graded'];
    submissions = [];
    var a = assignments.find(function (x) {
      return (x._id || x.id || x.title) === assignmentId;
    });
    var maxPts = a ? a.points || a.maxScore || 100 : 100;

    demoStudents.forEach(function (name, idx) {
      var status = statuses[idx % 3];
      var score =
        status === 'graded'
          ? Math.round(Math.random() * maxPts * 0.8 + maxPts * 0.2)
          : null;
      var daysAgo = Math.floor(Math.random() * 7);
      var date = new Date(Date.now() - daysAgo * 86400000);
      submissions.push({
        studentName: name,
        studentEmail: name.toLowerCase().replace(/\s+/g, '.') + '@nibras.edu',
        status: status,
        score: score,
        maxScore: maxPts,
        submittedAt: date.toISOString(),
        code: generateDemoCode(name),
        language: 'python',
        testCases: generateDemoTestCases(status),
        styleIssues: status !== 'pending' ? generateDemoStyleIssues() : [],
        rubric: a?.rubricCriteria || [
          { name: 'Correctness', maxPoints: 40 },
          { name: 'Code Quality', maxPoints: 30 },
          { name: 'Documentation', maxPoints: 20 },
          { name: 'Efficiency', maxPoints: 10 },
        ],
      });
    });
    currentRubric = submissions[0]?.rubric || [];
  }

  function generateDemoCode(name) {
    return (
      '# Submission by ' +
      name +
      '\n\ndef solve(arr):\n    """\n    Find the maximum subarray sum.\n    """\n    max_sum = arr[0]\n    current_sum = arr[0]\n\n    for num in arr[1:]:\n        current_sum = max(num, current_sum + num)\n        max_sum = max(max_sum, current_sum)\n\n    return max_sum\n\n\nif __name__ == "__main__":\n    test_arr = [-2, 1, -3, 4, -1, 2, 1, -5, 4]\n    result = solve(test_arr)\n    print(f"Maximum subarray sum: {result}")'
    );
  }

  function generateDemoTestCases(status) {
    if (status === 'pending') return [];
    var tests = [
      {
        name: 'Basic positive',
        input: '[1, 2, 3]',
        expected: '6',
        passed: Math.random() > 0.2,
        timeMs: Math.round(Math.random() * 50 + 5),
        memoryKb: Math.round(Math.random() * 4096 + 1024),
      },
      {
        name: 'Mixed values',
        input: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]',
        expected: '6',
        passed: Math.random() > 0.3,
        timeMs: Math.round(Math.random() * 80 + 10),
        memoryKb: Math.round(Math.random() * 4096 + 1024),
      },
      {
        name: 'All negative',
        input: '[-5, -2, -8, -1]',
        expected: '-1',
        passed: Math.random() > 0.1,
        timeMs: Math.round(Math.random() * 30 + 2),
        memoryKb: Math.round(Math.random() * 2048 + 512),
      },
      {
        name: 'Edge case (hidden)',
        input: '[100]',
        expected: '100',
        passed: Math.random() > 0.3,
        timeMs: Math.round(Math.random() * 20 + 1),
        memoryKb: Math.round(Math.random() * 1024 + 256),
        isHidden: true,
      },
    ];
    return tests;
  }

  function generateDemoStyleIssues() {
    return [
      {
        message: 'Missing docstring for module',
        line: 1,
        severity: 'warning',
        ruleId: 'missing-module-docstring',
      },
      {
        message: 'Line too long (92 > 79 characters)',
        line: 8,
        severity: 'warning',
        ruleId: 'line-too-long',
      },
      {
        message: 'Variable name "arr" is too short',
        line: 4,
        severity: 'warning',
        ruleId: 'invalid-name',
      },
    ];
  }

  function renderSubmissions() {
    document.getElementById('grade-stats').style.display = 'grid';
    document.getElementById('table-wrapper').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';

    var tbody = document.getElementById('submissions-body');
    var total = submissions.length;
    var graded = submissions.filter(function (s) {
      return s.status === 'graded';
    }).length;
    var pending = submissions.filter(function (s) {
      return s.status === 'pending';
    }).length;
    var scores = submissions
      .filter(function (s) {
        return s.score != null;
      })
      .map(function (s) {
        return s.score;
      });
    var avg = scores.length
      ? Math.round(
          scores.reduce(function (a, b) {
            return a + b;
          }, 0) / scores.length,
        )
      : 0;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-graded').textContent = graded;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-avg').textContent = scores.length
      ? avg + '/' + Math.round(submissions[0]?.maxScore || 100)
      : '--';

    tbody.innerHTML = submissions
      .map(function (s, idx) {
        var statusLabel = s.status.charAt(0).toUpperCase() + s.status.slice(1);
        var statusClass = 'status-' + s.status;
        var scoreDisplay = s.score != null ? s.score + '/' + s.maxScore : '—';
        var dateDisplay = s.submittedAt
          ? new Date(s.submittedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : '—';
        return (
          '<tr>' +
          '<td class="student-name">' +
          escapeHtml(s.studentName) +
          '</td>' +
          '<td><span class="status-badge ' +
          statusClass +
          '">' +
          statusLabel +
          '</span></td>' +
          '<td class="score-cell">' +
          scoreDisplay +
          '</td>' +
          '<td class="date-cell">' +
          dateDisplay +
          '</td>' +
          '<td><button class="grade-action-btn" data-idx="' +
          idx +
          '">' +
          (s.status === 'graded' ? 'Review' : 'Grade') +
          '</button></td>' +
          '</tr>'
        );
      })
      .join('');

    tbody.querySelectorAll('.grade-action-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-idx'));
        openSubmission(idx);
      });
    });
  }

  function openSubmission(idx) {
    currentSubmission = submissions[idx];
    if (!currentSubmission) return;

    document.getElementById('detail-student-name').textContent =
      escapeHtml(currentSubmission.studentName) + "'s Submission";
    document.getElementById('detail-language').textContent =
      currentSubmission.language || 'python';

    // Code
    document.getElementById('code-viewer').innerHTML =
      '<code>' +
      escapeHtml(currentSubmission.code || '// No code available') +
      '</code>';

    // Tests
    renderDetailTests(currentSubmission.testCases || []);

    // Style
    renderDetailStyle(currentSubmission.styleIssues || []);

    // Grade form
    renderGradeForm(
      currentSubmission.rubric || currentRubric,
      currentSubmission,
    );

    // Peer reviews
    renderPeerReviews(currentSubmission);

    // Clear previous grade status
    document.getElementById('grade-status').textContent = '';
    document.getElementById('grade-status').className = 'form-status';

    document.getElementById('detail-modal').style.display = 'flex';

    // Activate first tab
    document.querySelectorAll('.detail-tab').forEach(function (t) {
      t.classList.remove('active');
    });
    document
      .querySelector('.detail-tab[data-tab="code"]')
      .classList.add('active');
    document.querySelectorAll('.detail-panel').forEach(function (p) {
      p.classList.remove('active');
    });
    document.getElementById('panel-code').classList.add('active');
  }

  function renderDetailTests(testCases) {
    var passed = testCases.filter(function (t) {
      return t.passed;
    }).length;
    var failed = testCases.length - passed;
    document.getElementById('detail-test-pass').textContent =
      passed + ' passed';
    document.getElementById('detail-test-fail').textContent =
      failed + ' failed';
    document.getElementById('detail-test-total').textContent =
      testCases.length + ' total';

    var container = document.getElementById('detail-test-cases');
    container.innerHTML = '';
    if (!testCases.length) {
      container.innerHTML =
        '<p class="empty-hint">No test results available.</p>';
      return;
    }
    testCases.forEach(function (tc) {
      var cls = tc.passed ? 'tc-pass' : 'tc-fail';
      var icon = tc.passed ? 'fa-circle-check' : 'fa-circle-xmark';
      container.innerHTML +=
        '<div class="test-case ' +
        cls +
        '">' +
        '<div class="tc-header"><span class="tc-icon"><i class="fa-regular ' +
        icon +
        '"></i></span>' +
        '<span class="tc-name">' +
        escapeHtml(tc.name || 'Test Case') +
        '</span>' +
        (tc.isHidden ? '<span class="tc-hidden-badge">Hidden</span>' : '') +
        '</div>' +
        '<div class="tc-details">' +
        (tc.input
          ? '<div class="tc-detail-row"><span class="tc-label">Input:</span><code>' +
            escapeHtml(tc.input) +
            '</code></div>'
          : '') +
        (tc.expected
          ? '<div class="tc-detail-row"><span class="tc-label">Expected:</span><code>' +
            escapeHtml(tc.expected) +
            '</code></div>'
          : '') +
        (tc.actualOutput
          ? '<div class="tc-detail-row"><span class="tc-label">Actual:</span><code>' +
            escapeHtml(tc.actualOutput) +
            '</code></div>'
          : '') +
        '<div class="tc-metrics">' +
        (tc.timeMs != null
          ? '<span><i class="fa-regular fa-clock"></i> ' +
            tc.timeMs +
            'ms</span>'
          : '') +
        (tc.memoryKb != null
          ? '<span><i class="fa-solid fa-memory"></i> ' +
            tc.memoryKb +
            'KB</span>'
          : '') +
        '</div></div></div>';
    });
  }

  function renderDetailStyle(issues) {
    document.getElementById('detail-style-tool').textContent = 'Pylint';
    var container = document.getElementById('detail-style-issues');
    container.innerHTML = '';
    if (!issues || !issues.length) {
      container.innerHTML =
        '<div class="style-clean"><i class="fa-solid fa-circle-check"></i> No style issues found!</div>';
      return;
    }
    issues.forEach(function (issue) {
      var sev = issue.severity || 'warning';
      var sevIcon =
        sev === 'error' ? 'fa-circle-exclamation' : 'fa-triangle-exclamation';
      var sevClass =
        sev === 'error' ? 'style-issue-error' : 'style-issue-warning';
      container.innerHTML +=
        '<div class="style-issue ' +
        sevClass +
        '">' +
        '<span class="style-issue-icon"><i class="fa-solid ' +
        sevIcon +
        '"></i></span>' +
        '<div class="style-issue-body">' +
        '<span class="style-issue-msg">' +
        escapeHtml(issue.message || '') +
        '</span>' +
        (issue.line != null
          ? '<span class="style-issue-loc">Line ' + issue.line + '</span>'
          : '') +
        (issue.ruleId
          ? '<span class="style-issue-rule">[' +
            escapeHtml(issue.ruleId) +
            ']</span>'
          : '') +
        '</div></div>';
    });
  }

  function renderGradeForm(rubric, submission) {
    var container = document.getElementById('grade-rubric-scores');
    container.innerHTML = '';
    if (!rubric || !rubric.length) {
      container.innerHTML =
        '<p class="empty-hint">No rubric defined for this assignment.</p>';
      return;
    }

    rubric.forEach(function (criterion, idx) {
      var existingScore = submission.rubricScores
        ? submission.rubricScores[idx] || 0
        : 0;
      var maxPts = criterion.maxPoints || criterion.maxScore || 10;
      var div = document.createElement('div');
      div.className = 'rubric-score-row';
      div.innerHTML =
        '<div class="rubric-score-top">' +
        '<span class="rubric-score-name">' +
        escapeHtml(criterion.name || 'Criterion ' + (idx + 1)) +
        '</span>' +
        '<span class="rubric-score-max">/ ' +
        maxPts +
        '</span>' +
        '</div>' +
        '<input type="number" class="rubric-score-input" data-idx="' +
        idx +
        '" data-max="' +
        maxPts +
        '" value="' +
        existingScore +
        '" min="0" max="' +
        maxPts +
        '" step="0.5">';
      container.appendChild(div);
    });

    updateGradeTotal();

    // Auto-update total on input
    container.querySelectorAll('.rubric-score-input').forEach(function (input) {
      input.addEventListener('input', updateGradeTotal);
    });

    // Load existing feedback if any
    document.getElementById('grade-feedback-text').value =
      submission.feedbackText || '';
    document.getElementById('grade-video-url').value =
      submission.videoUrl || '';
  }

  function updateGradeTotal() {
    var inputs = document.querySelectorAll('.rubric-score-input');
    var total = 0;
    var maxTotal = 0;
    inputs.forEach(function (input) {
      total += parseFloat(input.value) || 0;
      maxTotal += parseFloat(input.getAttribute('data-max')) || 0;
    });
    var pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
    document.getElementById('grade-total').textContent =
      'Total: ' + total + ' / ' + maxTotal + ' (' + pct + '%)';
  }

  function renderPeerReviews(submission) {
    var container = document.getElementById('peer-review-list');
    var reviews = submission.peerReviews || [];
    if (!reviews.length) {
      container.innerHTML =
        '<p class="empty-hint">No peer reviews assigned yet.</p>';
      return;
    }
    container.innerHTML = reviews
      .map(function (pr) {
        return (
          '<div class="peer-item">' +
          '<div class="peer-header"><strong>' +
          escapeHtml(pr.reviewerName || 'Anonymous') +
          '</strong>' +
          (pr.score != null
            ? '<span class="peer-score">' + pr.score + '/5</span>'
            : '') +
          '</div>' +
          (pr.comment
            ? '<p class="peer-comment">' + escapeHtml(pr.comment) + '</p>'
            : '') +
          '</div>'
        );
      })
      .join('');
  }

  function submitGrade() {
    var statusEl = document.getElementById('grade-status');
    statusEl.textContent = '';
    statusEl.className = 'form-status';

    if (!currentSubmission) return;

    var inputs = document.querySelectorAll('.rubric-score-input');
    var rubricScores = [];
    var totalScore = 0;
    inputs.forEach(function (input) {
      var score = parseFloat(input.value) || 0;
      rubricScores.push(score);
      totalScore += score;
    });

    var feedbackText = document
      .getElementById('grade-feedback-text')
      .value.trim();
    var videoUrl = document.getElementById('grade-video-url').value.trim();

    statusEl.textContent = 'Saving...';
    statusEl.className = 'form-status form-status-info';

    // Try backend, fallback to local
    var submissionId = currentSubmission._id || currentSubmission.id;
    var promise;

    if (S && S.feedbackService && submissionId) {
      promise = S.feedbackService.submitGrade(submissionId, {
        rubricScores: rubricScores,
        totalScore: totalScore,
        comment: feedbackText,
        videoUrl: videoUrl || undefined,
      });
    } else {
      // Local fallback
      promise = new Promise(function (resolve) {
        setTimeout(function () {
          currentSubmission.status = 'graded';
          currentSubmission.score = totalScore;
          currentSubmission.feedbackText = feedbackText;
          currentSubmission.videoUrl = videoUrl;
          resolve({ ok: true });
        }, 500);
      });
    }

    promise
      .then(function () {
        statusEl.textContent = 'Grade saved successfully!';
        statusEl.className = 'form-status form-status-success';
        renderSubmissions();
        setTimeout(function () {
          statusEl.textContent = '';
        }, 3000);
      })
      .catch(function (err) {
        statusEl.textContent = 'Failed to save: ' + (err?.message || 'Error');
        statusEl.className = 'form-status form-status-error';
      });
  }

  function assignPeerReview() {
    var statusEl = document.getElementById('grade-status');
    statusEl.textContent = '';
    statusEl.className = 'form-status';

    if (!currentSubmission) return;

    // Demo: assign 2 random reviewers
    var reviewers = [
      'Ahmed Hassan',
      'Mariam Khalid',
      'Youssef Ibrahim',
      'Laila Mostafa',
    ];
    var shuffled = reviewers.sort(function () {
      return 0.5 - Math.random();
    });
    var selected = shuffled.slice(0, 2);

    currentSubmission.peerReviews = (
      currentSubmission.peerReviews || []
    ).concat(
      selected.map(function (name) {
        return {
          reviewerName: name,
          score: null,
          comment: null,
          status: 'pending',
        };
      }),
    );

    renderPeerReviews(currentSubmission);
    statusEl.textContent = 'Assigned ' + selected.length + ' reviewer(s).';
    statusEl.className = 'form-status form-status-success';
    setTimeout(function () {
      statusEl.textContent = '';
    }, 3000);
  }

  function closeModal() {
    document.getElementById('detail-modal').style.display = 'none';
    currentSubmission = null;
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
