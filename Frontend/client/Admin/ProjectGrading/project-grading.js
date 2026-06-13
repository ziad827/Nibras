(function () {
  'use strict';

  var S = window.NibrasServices;
  var courseId = localStorage.getItem('selectedCourseId');
  var selectedCourse = null;
  var projects = [];
  var submissions = [];
  var currentSubmission = null;
  var currentProject = null;

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
    loadProjects();
  }

  function fixNavLinks() {
    var navCourse = document.querySelector('[data-nav-link="courseContent"]');
    if (navCourse && courseId)
      navCourse.href =
        '../../Courses/Course%20Description/courseContent.html?courseId=' +
        encodeURIComponent(courseId);
    var navGrades = document.querySelector('[data-nav-link="grades"]');
    if (navGrades && courseId)
      navGrades.href =
        '../InstructorGrades/instructor-grades.html?courseId=' +
        encodeURIComponent(courseId);
  }

  function setupUI() {
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
        var btn = document.getElementById('themeBtn');
        btn.classList.remove('rotating');
        void btn.offsetWidth;
        btn.classList.add('rotating');
      });
    }

    document
      .getElementById('project-select')
      .addEventListener('change', function () {
        var val = this.value;
        if (val) loadSubmissions(val);
        else {
          document.getElementById('grade-stats').style.display = 'none';
          document.getElementById('table-wrapper').style.display = 'none';
          document.getElementById('empty-state').style.display = 'block';
        }
      });

    document
      .getElementById('modal-close')
      .addEventListener('click', closeModal);

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

    document
      .getElementById('btn-submit-grade')
      .addEventListener('click', submitGrade);

    document
      .getElementById('detail-modal')
      .addEventListener('click', function (e) {
        if (e.target === this) closeModal();
      });
  }

  function loadProjects() {
    var select = document.getElementById('project-select');
    var backendId =
      selectedCourse?.adminCourseId ||
      selectedCourse?.backendCourseId ||
      courseId;
    if (!backendId) return;

    if (S && S.projectService) {
      S.projectService
        .listByCourse(backendId)
        .then(function (res) {
          var items = res?.data || [];
          if (!Array.isArray(items)) items = [];
          projects = items;
          populateSelect(select, items);
          if (!items.length) {
            document.getElementById('empty-state').innerHTML =
              '<i class="fa-solid fa-diagram-project"></i><p>No projects yet. Create one in the Project Builder first.</p>';
            document.getElementById('empty-state').style.display = 'block';
          }
        })
        .catch(function () {
          // Fallback demo projects
          projects = generateDemoProjects();
          populateSelect(select, projects);
        });
    }
  }

  function generateDemoProjects() {
    return [
      {
        _id: 'demo-p1',
        title: 'Capstone Project',
        points: 200,
        teamSize: 3,
        milestones: [
          {
            name: 'Proposal',
            weight: 10,
            dueDate: new Date(Date.now() - 14 * 86400000).toISOString(),
          },
          {
            name: 'Design Document',
            weight: 20,
            dueDate: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
          {
            name: 'Implementation',
            weight: 40,
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          },
          {
            name: 'Final Report',
            weight: 30,
            dueDate: new Date(Date.now() + 21 * 86400000).toISOString(),
          },
        ],
      },
      {
        _id: 'demo-p2',
        title: 'Data Analysis Project',
        points: 150,
        teamSize: 2,
        milestones: [
          {
            name: 'Data Collection',
            weight: 25,
            dueDate: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
          {
            name: 'Analysis',
            weight: 50,
            dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
          },
          {
            name: 'Presentation',
            weight: 25,
            dueDate: new Date(Date.now() + 28 * 86400000).toISOString(),
          },
        ],
      },
    ];
  }

  function populateSelect(select, items) {
    select.innerHTML = '<option value="">— Select a project —</option>';
    items.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p._id || p.id;
      opt.textContent =
        (p.title || 'Untitled') + ' (' + (p.points || '—') + ' pts)';
      select.appendChild(opt);
    });
  }

  function loadSubmissions(projectId) {
    currentProject = projects.find(function (p) {
      return (p._id || p.id) === projectId;
    });
    var tbody = document.getElementById('submissions-body');
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:32px">Loading submissions...</td></tr>';

    if (S && S.projectService) {
      S.projectService
        .getSubmissions(projectId)
        .then(function (res) {
          var items = res?.data || [];
          if (!Array.isArray(items)) items = [];
          submissions = items;
          if (!submissions.length) generateDemoSubmissions(projectId);
          renderSubmissions();
        })
        .catch(function () {
          generateDemoSubmissions(projectId);
          renderSubmissions();
        });
    } else {
      generateDemoSubmissions(projectId);
      renderSubmissions();
    }
  }

  function generateDemoSubmissions(projectId) {
    var demoTeams = [
      {
        name: 'Team Alpha',
        members: ['Ahmed Hassan', 'Mariam Khalid', 'Youssef Ibrahim'],
      },
      { name: 'Team Beta', members: ['Laila Mostafa', 'Omar Abdelrahman'] },
      {
        name: 'Team Gamma',
        members: ['Nour El-Din', 'Hana Youssef', 'Karim Samir'],
      },
    ];
    var statuses = ['pending', 'evaluated', 'graded'];
    var p = currentProject || { points: 100, milestones: [] };
    var milestones = p.milestones || [];

    submissions = demoTeams.map(function (team, idx) {
      var status = statuses[idx % 3];
      var msStatuses = milestones.map(function (ms) {
        var done = status !== 'pending';
        var score = done ? Math.round(Math.random() * 100) : null;
        return {
          name: ms.name,
          weight: ms.weight,
          completed: done,
          score: score,
          maxScore: 100,
        };
      });
      var weightedScore = msStatuses.reduce(function (sum, ms) {
        return sum + ((ms.score || 0) * (ms.weight || 0)) / 100;
      }, 0);

      return {
        teamName: team.name,
        members: team.members,
        status: status,
        score:
          status === 'graded'
            ? Math.round((weightedScore * (p.points || 100)) / 100)
            : status === 'evaluated'
              ? Math.round((weightedScore * (p.points || 100)) / 100)
              : null,
        maxScore: p.points || 100,
        milestoneStatuses: msStatuses,
        contribution: team.members.map(function (m) {
          return {
            name: m,
            commits: Math.floor(Math.random() * 30 + 5),
            linesAdded: Math.floor(Math.random() * 1000 + 100),
            linesRemoved: Math.floor(Math.random() * 500 + 50),
            percentage: 0,
          };
        }),
        githubRepo:
          'https://github.com/nibras/' +
          team.name.toLowerCase().replace(/\s+/g, '-'),
        commits: [
          {
            message: 'Initial project setup',
            author: team.members[0],
            date: new Date(Date.now() - 20 * 86400000).toISOString(),
          },
          {
            message: 'Implement core algorithm',
            author: team.members[1],
            date: new Date(Date.now() - 12 * 86400000).toISOString(),
          },
          {
            message: 'Add unit tests',
            author: team.members[0],
            date: new Date(Date.now() - 8 * 86400000).toISOString(),
          },
          {
            message: 'Fix edge cases in parser',
            author: team.members[2] || team.members[1],
            date: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
          {
            message: 'Update documentation',
            author: team.members[1],
            date: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
        ],
        submittedAt: new Date(
          Date.now() - Math.random() * 10 * 86400000,
        ).toISOString(),
      };
    });

    // Calculate contribution percentages
    submissions.forEach(function (s) {
      var total = s.contribution.reduce(function (sum, c) {
        return sum + c.commits;
      }, 0);
      s.contribution.forEach(function (c) {
        c.percentage = total > 0 ? Math.round((c.commits / total) * 100) : 0;
      });
    });
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
        var completedMs = (s.milestoneStatuses || []).filter(function (m) {
          return m.completed;
        }).length;
        var totalMs = (s.milestoneStatuses || []).length;
        return (
          '<tr>' +
          '<td class="team-name">' +
          escapeHtml(s.teamName || 'Unknown Team') +
          '</td>' +
          '<td class="members-cell">' +
          (s.members || []).join(', ') +
          '</td>' +
          '<td class="milestone-cell">' +
          completedMs +
          '/' +
          totalMs +
          '</td>' +
          '<td><span class="status-badge ' +
          statusClass +
          '">' +
          statusLabel +
          '</span></td>' +
          '<td class="score-cell">' +
          scoreDisplay +
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

    document.getElementById('detail-team-name').textContent =
      escapeHtml(currentSubmission.teamName || 'Team') + "'s Project";

    renderMilestones(currentSubmission.milestoneStatuses || []);
    renderContribution(currentSubmission.contribution || []);
    renderTeam(currentSubmission);
    renderGradeForm(currentSubmission);

    document.getElementById('grade-status').textContent = '';
    document.getElementById('grade-status').className = 'form-status';

    document.getElementById('detail-modal').style.display = 'flex';

    document.querySelectorAll('.detail-tab').forEach(function (t) {
      t.classList.remove('active');
    });
    document
      .querySelector('.detail-tab[data-tab="milestones"]')
      .classList.add('active');
    document.querySelectorAll('.detail-panel').forEach(function (p) {
      p.classList.remove('active');
    });
    document.getElementById('panel-milestones').classList.add('active');
  }

  function renderMilestones(msStatuses) {
    var completed = msStatuses.filter(function (m) {
      return m.completed;
    }).length;
    document.getElementById('ms-completed').textContent = completed;
    document.getElementById('ms-total').textContent = msStatuses.length;

    var container = document.getElementById('milestone-list');
    container.innerHTML = '';
    if (!msStatuses.length) {
      container.innerHTML = '<p class="empty-hint">No milestones defined.</p>';
      return;
    }
    msStatuses.forEach(function (ms) {
      var cls = ms.completed ? 'ms-complete' : 'ms-pending';
      var icon = ms.completed ? 'fa-circle-check' : 'fa-regular fa-circle';
      var scoreDisplay = ms.score != null ? ms.score + '/' + ms.maxScore : '—';
      container.innerHTML +=
        '<div class="milestone-item ' +
        cls +
        '">' +
        '<span class="ms-icon"><i class="fa-regular ' +
        icon +
        '"></i></span>' +
        '<div class="ms-info"><strong>' +
        escapeHtml(ms.name || 'Milestone') +
        '</strong>' +
        '<span class="ms-weight">Weight: ' +
        (ms.weight || 0) +
        '%</span></div>' +
        '<span class="ms-score">' +
        scoreDisplay +
        '</span>' +
        '</div>';
    });
  }

  function renderContribution(contribution) {
    if (!contribution || !contribution.length) {
      document.getElementById('contribution-chart').innerHTML =
        '<p class="empty-hint">No contribution data available.</p>';
      document.getElementById('contribution-table').innerHTML = '';
      document.getElementById('adjustment-inputs').innerHTML = '';
      return;
    }

    // Bar chart
    var chartHtml = '<div class="contrib-bars">';
    contribution.forEach(function (c) {
      chartHtml +=
        '<div class="contrib-bar-row">' +
        '<span class="contrib-name">' +
        escapeHtml(c.name) +
        '</span>' +
        '<div class="contrib-bar-track"><div class="contrib-bar-fill" style="width:' +
        c.percentage +
        '%"></div></div>' +
        '<span class="contrib-pct">' +
        c.percentage +
        '%</span>' +
        '</div>';
    });
    chartHtml += '</div>';
    document.getElementById('contribution-chart').innerHTML = chartHtml;

    // Table
    var tableHtml =
      '<table class="contrib-table"><thead><tr><th>Member</th><th>Commits</th><th>Lines Added</th><th>Lines Removed</th><th>Est. Contribution</th></tr></thead><tbody>';
    contribution.forEach(function (c) {
      tableHtml +=
        '<tr><td>' +
        escapeHtml(c.name) +
        '</td><td>' +
        c.commits +
        '</td><td>' +
        c.linesAdded +
        '</td><td>' +
        c.linesRemoved +
        '</td><td>' +
        c.percentage +
        '%</td></tr>';
    });
    tableHtml += '</tbody></table>';
    document.getElementById('contribution-table').innerHTML = tableHtml;

    // Adjustment inputs
    var adjustHtml = '';
    contribution.forEach(function (c, idx) {
      adjustHtml +=
        '<div class="adjust-row"><label>' +
        escapeHtml(c.name) +
        '</label>' +
        '<input type="range" class="adjust-slider" data-idx="' +
        idx +
        '" min="0" max="100" value="' +
        c.percentage +
        '">' +
        '<input type="number" class="adjust-input" data-idx="' +
        idx +
        '" min="0" max="100" value="' +
        c.percentage +
        '" style="width:60px">' +
        '<span class="adjust-pct">%</span></div>';
    });
    document.getElementById('adjustment-inputs').innerHTML = adjustHtml;

    // Sync sliders and number inputs
    document.querySelectorAll('.adjust-slider').forEach(function (slider) {
      slider.addEventListener('input', function () {
        var idx = this.getAttribute('data-idx');
        var input = document.querySelector(
          '.adjust-input[data-idx="' + idx + '"]',
        );
        if (input) input.value = this.value;
      });
    });
    document.querySelectorAll('.adjust-input').forEach(function (input) {
      input.addEventListener('input', function () {
        var idx = this.getAttribute('data-idx');
        var slider = document.querySelector(
          '.adjust-slider[data-idx="' + idx + '"]',
        );
        if (slider) slider.value = this.value;
      });
    });
  }

  function renderTeam(submission) {
    var container = document.getElementById('team-members');
    container.innerHTML = '';
    if (!submission.members || !submission.members.length) {
      container.innerHTML = '<p class="empty-hint">No team members.</p>';
      return;
    }
    submission.members.forEach(function (member) {
      container.innerHTML +=
        '<div class="team-member-chip"><i class="fa-solid fa-user"></i> ' +
        escapeHtml(member) +
        '</div>';
    });

    document.getElementById('team-github-repo').innerHTML =
      submission.githubRepo
        ? '<a href="' +
          escapeHtml(submission.githubRepo) +
          '" target="_blank"><i class="fa-brands fa-github"></i> ' +
          escapeHtml(submission.githubRepo) +
          '</a>'
        : 'No repo connected';

    var commitContainer = document.getElementById('team-commits');
    var commits = submission.commits || [];
    if (!commits.length) {
      commitContainer.innerHTML = '<p class="empty-hint">No commits yet.</p>';
      return;
    }
    commitContainer.innerHTML = commits
      .map(function (c) {
        return (
          '<div class="commit-item">' +
          '<div class="commit-message"><i class="fa-solid fa-code-commit"></i> ' +
          escapeHtml(c.message) +
          '</div>' +
          '<div class="commit-meta"><span>' +
          escapeHtml(c.author) +
          '</span>' +
          '<span>' +
          (c.date
            ? new Date(c.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : '') +
          '</span></div>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderGradeForm(submission) {
    var container = document.getElementById('weighted-score-breakdown');
    container.innerHTML = '';
    var msStatuses = submission.milestoneStatuses || [];
    if (!msStatuses.length) {
      container.innerHTML =
        '<p class="empty-hint">No milestones defined for this project.</p>';
      return;
    }

    var totalWeighted = 0;
    var maxWeighted = 0;
    msStatuses.forEach(function (ms) {
      var row = document.createElement('div');
      row.className = 'weighted-row';
      var score = ms.score || 0;
      var max = ms.maxScore || 100;
      var weighted = (score * (ms.weight || 0)) / 100;
      var maxWeightedMs = (max * (ms.weight || 0)) / 100;
      totalWeighted += weighted;
      maxWeighted += maxWeightedMs;

      row.innerHTML =
        '<div class="weighted-top">' +
        '<span class="weighted-name">' +
        escapeHtml(ms.name || 'Milestone') +
        '</span>' +
        '<span class="weighted-pct">Weight: ' +
        (ms.weight || 0) +
        '%</span>' +
        '</div>' +
        '<div class="weighted-input-row">' +
        '<label>Score</label>' +
        '<input type="number" class="weighted-score-input ms-score-input" data-weight="' +
        (ms.weight || 0) +
        '" data-max="' +
        max +
        '" value="' +
        score +
        '" min="0" max="' +
        max +
        '" step="1">' +
        '<span class="weighted-max">/ ' +
        max +
        '</span>' +
        '<span class="weighted-contribution">Weighted: <strong>' +
        weighted.toFixed(1) +
        '</strong></span>' +
        '</div>';
      container.appendChild(row);
    });

    updateGradeTotal();
    container.querySelectorAll('.ms-score-input').forEach(function (input) {
      input.addEventListener('input', function () {
        updateMilestoneScore(this);
        updateGradeTotal();
      });
    });

    document.getElementById('grade-feedback-text').value =
      submission.feedbackText || '';
  }

  function updateMilestoneScore(input) {
    var weight = parseFloat(input.getAttribute('data-weight')) || 0;
    var score = parseFloat(input.value) || 0;
    var row = input.closest('.weighted-row');
    if (row) {
      var contrib = row.querySelector('.weighted-contribution strong');
      if (contrib) contrib.textContent = ((score * weight) / 100).toFixed(1);
    }
  }

  function updateGradeTotal() {
    var inputs = document.querySelectorAll('.ms-score-input');
    var totalWeighted = 0;
    var maxWeighted = 0;
    inputs.forEach(function (input) {
      var weight = parseFloat(input.getAttribute('data-weight')) || 0;
      var max = parseFloat(input.getAttribute('data-max')) || 100;
      var score = parseFloat(input.value) || 0;
      totalWeighted += (score * weight) / 100;
      maxWeighted += (max * weight) / 100;
    });
    var pct =
      maxWeighted > 0 ? Math.round((totalWeighted / maxWeighted) * 100) : 0;
    document.getElementById('grade-total').textContent =
      'Overall: ' +
      totalWeighted.toFixed(1) +
      ' / ' +
      maxWeighted.toFixed(1) +
      ' (' +
      pct +
      '%)';
  }

  function submitGrade() {
    var statusEl = document.getElementById('grade-status');
    statusEl.textContent = '';
    statusEl.className = 'form-status';

    if (!currentSubmission) return;

    var msInputs = document.querySelectorAll('.ms-score-input');
    var milestoneScores = [];
    msInputs.forEach(function (input) {
      milestoneScores.push(parseFloat(input.value) || 0);
    });

    var feedbackText = document
      .getElementById('grade-feedback-text')
      .value.trim();

    // Collect per-member adjustments
    var adjustments = {};
    document.querySelectorAll('.adjust-input').forEach(function (input) {
      var idx = parseInt(input.getAttribute('data-idx'));
      var name =
        currentSubmission.contribution && currentSubmission.contribution[idx]
          ? currentSubmission.contribution[idx].name
          : 'Member ' + idx;
      adjustments[name] = parseFloat(input.value) || 0;
    });

    var totalScore = milestoneScores.reduce(function (a, b) {
      return a + b;
    }, 0);

    statusEl.textContent = 'Saving...';
    statusEl.className = 'form-status form-status-info';

    var submissionId = currentSubmission._id || currentSubmission.id;
    var promise;

    if (
      S &&
      S.projectService &&
      S.projectService.gradeSubmission &&
      submissionId
    ) {
      promise = S.projectService.gradeSubmission(submissionId, {
        milestoneScores: milestoneScores,
        totalScore: totalScore,
        comment: feedbackText,
        adjustments: adjustments,
      });
    } else {
      promise = new Promise(function (resolve) {
        setTimeout(function () {
          currentSubmission.status = 'graded';
          currentSubmission.score = totalScore;
          currentSubmission.feedbackText = feedbackText;
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
