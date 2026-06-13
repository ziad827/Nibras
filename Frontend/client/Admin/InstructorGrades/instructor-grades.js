(function () {
  'use strict';

  var S = window.NibrasServices;
  var courseId = localStorage.getItem('selectedCourseId');
  var selectedCourse = null;
  var studentsData = [];
  var assignments = [];

  function init() {
    selectedCourse = null;
    if (
      window.NibrasCourses &&
      typeof window.NibrasCourses.getSelectedCourse === 'function'
    ) {
      selectedCourse = window.NibrasCourses.getSelectedCourse();
    }
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

    // Fix nav links
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

    loadData();
  }

  function loadData() {
    // Load assignments first
    var backendId =
      selectedCourse?.adminCourseId ||
      selectedCourse?.backendCourseId ||
      courseId;
    if (!backendId) {
      document.getElementById('grades-body').innerHTML =
        '<tr><td colspan="6" style="text-align:center;padding:48px 16px;color:var(--text-secondary)">No course ID available.</td></tr>';
      return;
    }

    var assignmentPromise;
    if (S && S.assignmentAdminService) {
      assignmentPromise = S.assignmentAdminService
        .listByCourse(backendId)
        .then(function (res) {
          assignments = res?.data || [];
          if (!Array.isArray(assignments)) assignments = [];
        })
        .catch(function () {
          assignments = [];
        });
    } else {
      assignmentPromise = Promise.resolve();
    }

    assignmentPromise.then(function () {
      // Use local data if available
      if (
        selectedCourse &&
        selectedCourse.assignments &&
        selectedCourse.assignments.items
      ) {
        var localAssignments = selectedCourse.assignments.items;
        if (!assignments.length && localAssignments.length) {
          assignments = localAssignments.map(function (item) {
            return { _id: item.id, title: item.title, points: item.points };
          });
        }
      }

      // Build demo student data from localStorage user or course data
      buildStudentData();
      renderGrades();
      renderStats();
    });
  }

  function buildStudentData() {
    studentsData = [];

    // Try to get enrolled students from selectedCourse
    var enrolled = [];
    if (
      selectedCourse &&
      selectedCourse.overview &&
      selectedCourse.overview.stats
    ) {
      var count = parseInt(selectedCourse.overview.stats.enrolled) || 5;
      for (var i = 1; i <= Math.min(count, 10); i++) {
        enrolled.push({
          name: 'Student ' + i,
          email: 'student' + i + '@nibras.edu',
        });
      }
    }
    if (!enrolled.length) {
      enrolled = [
        { name: 'Ahmed Hassan', email: 'ahmed.hassan@nibras.edu' },
        { name: 'Mariam Khalid', email: 'mariam.khalid@nibras.edu' },
        { name: 'Youssef Ibrahim', email: 'youssef.ibrahim@nibras.edu' },
        { name: 'Laila Mostafa', email: 'laila.mostafa@nibras.edu' },
        { name: 'Omar Abdelrahman', email: 'omar.abdelrahman@nibras.edu' },
      ];
    }

    enrolled.forEach(function (student) {
      var scores = {};
      var totalEarned = 0;
      var totalPossible = 0;

      assignments.forEach(function (a) {
        var pts = a.points || a.maxScore || 100;
        var score = Math.round(Math.random() * pts * 0.9 + pts * 0.1);
        scores[a._id || a.id || a.title] = score;
        totalEarned += score;
        totalPossible += pts;
      });

      var pct =
        totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
      var grade =
        pct >= 90
          ? 'A'
          : pct >= 80
            ? 'B'
            : pct >= 70
              ? 'C'
              : pct >= 60
                ? 'D'
                : 'F';

      studentsData.push({
        name: student.name,
        email: student.email,
        scores: scores,
        totalEarned: totalEarned,
        totalPossible: totalPossible,
        percentage: pct,
        grade: grade,
      });
    });
  }

  function renderGrades() {
    var tbody = document.getElementById('grades-body');
    var thead = document.getElementById('table-header');

    // Build assignment columns
    if (assignments.length) {
      assignments.forEach(function (a, idx) {
        var th = document.createElement('th');
        th.className = 'assign-th';
        th.textContent = a.title || 'Assignment';
        th.title = (a.title || '') + ' (' + (a.points || '') + ' pts)';
        thead.insertBefore(th, thead.children[2 + idx]);
      });
    }

    tbody.innerHTML = '';
    if (!studentsData.length) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--text-secondary)">No student data available.</td></tr>';
      return;
    }

    studentsData.forEach(function (s) {
      var tr = document.createElement('tr');

      // Name
      var tdName = document.createElement('td');
      tdName.className = 'student-name';
      tdName.textContent = s.name;
      tr.appendChild(tdName);

      // Email
      var tdEmail = document.createElement('td');
      tdEmail.className = 'student-email';
      tdEmail.textContent = s.email;
      tr.appendChild(tdEmail);

      // Assignment scores
      assignments.forEach(function (a) {
        var td = document.createElement('td');
        var score = s.scores[a._id || a.id || a.title];
        var maxPts = a.points || a.maxScore || 100;
        td.className = 'score-cell';
        if (score != null) {
          var pct = Math.round((score / maxPts) * 100);
          td.textContent = score + '/' + maxPts;
          if (pct >= 80) td.classList.add('score-high');
          else if (pct >= 60) td.classList.add('score-mid');
          else td.classList.add('score-low');
        } else {
          td.textContent = '—';
          td.classList.add('score-na');
        }
        tr.appendChild(td);
      });

      // Total
      var tdTotal = document.createElement('td');
      tdTotal.className = 'score-cell score-total';
      tdTotal.textContent = s.totalEarned + '/' + s.totalPossible;
      tr.appendChild(tdTotal);

      // Percentage
      var tdPct = document.createElement('td');
      tdPct.className = 'score-cell score-pct';
      tdPct.textContent = s.percentage + '%';
      if (s.percentage >= 80) tdPct.classList.add('score-high');
      else if (s.percentage >= 60) tdPct.classList.add('score-mid');
      else tdPct.classList.add('score-low');
      tr.appendChild(tdPct);

      // Grade
      var tdGrade = document.createElement('td');
      tdGrade.className = 'grade-cell grade-' + s.grade.toLowerCase();
      tdGrade.textContent = s.grade;
      tr.appendChild(tdGrade);

      tbody.appendChild(tr);
    });
  }

  function renderStats() {
    document.getElementById('stat-students').textContent = studentsData.length;
    document.getElementById('stat-assignments').textContent =
      assignments.length;

    if (studentsData.length) {
      var avg = Math.round(
        studentsData.reduce(function (sum, s) {
          return sum + s.percentage;
        }, 0) / studentsData.length,
      );
      document.getElementById('stat-avg').textContent = avg + '%';
      var passed = studentsData.filter(function (s) {
        return s.percentage >= 60;
      }).length;
      document.getElementById('stat-pass').textContent =
        Math.round((passed / studentsData.length) * 100) + '%';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
