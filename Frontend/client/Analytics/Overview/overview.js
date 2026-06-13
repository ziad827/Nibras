window.NibrasReact.run(function () {
  var navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      navLinks.forEach(function (n) {
        n.classList.remove('active');
      });
      link.classList.add('active');
    });
  });

  var statsContainer = document.getElementById('stats-container');
  var sumContainer = document.getElementById('summary-container');

  var services = window.NibrasServices;

  function getUserId() {
    try {
      var raw = localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  var user = getUserId();
  if (user && user._id && services && services.backendAnalyticsService) {
    services.backendAnalyticsService
      .getStudentPerformance(user._id)
      .then(function (res) {
        var data = res && (res.data || res);
        if (!data) return;

        var studentStats = data.studentStats || {};
        var coursesSummary = data.coursesGradeSummary || [];
        var activities = data.recentActivities || [];
        var submissionSum = data.submissionSummary || {};

        var enrolledCount = coursesSummary.length;
        var completedCourses = coursesSummary.filter(function (c) {
          return c.status === 'completed';
        }).length;
        var grades = coursesSummary
          .map(function (c) {
            return c.weightedGrade || 0;
          })
          .filter(function (g) {
            return g > 0;
          });
        var avgGrade =
          grades.length > 0
            ? Math.round(
                grades.reduce(function (a, b) {
                  return a + b;
                }, 0) / grades.length,
              )
            : 0;

        var stats = [
          {
            label: 'Courses Enrolled',
            value: String(enrolledCount),
            change: completedCourses + ' completed',
            isPos: true,
            icon: 'fa-solid fa-book-open',
          },
          {
            label: 'Average Grade',
            value: avgGrade + '%',
            change: 'across ' + grades.length + ' courses',
            isPos: true,
            icon: 'fa-solid fa-graduation-cap',
          },
          {
            label: 'Reputation',
            value: String(studentStats.reputation || 0),
            change: studentStats.studyStreak
              ? studentStats.studyStreak + ' day streak'
              : '',
            isPos: true,
            icon: 'fa-solid fa-star',
          },
          {
            label: 'Approved Subs',
            value: String(submissionSum.approved || 0),
            change: (submissionSum.pending || 0) + ' pending',
            isPos: true,
            icon: 'fa-regular fa-circle-check',
          },
        ];

        statsContainer.innerHTML = '';
        stats.forEach(function (s, i) {
          var changeClass = s.isPos ? 'pos' : 'neg';
          statsContainer.innerHTML += [
            '<div class="ana-stat-card" data-position="' + (i + 1) + '">',
            '<div class="as-label"><i class="' +
              s.icon +
              '"></i> ' +
              s.label +
              '</div>',
            '<div class="as-val">' + s.value + '</div>',
            '<div class="as-change ' + changeClass + '">' + s.change + '</div>',
            '</div>',
          ].join('');
        });

        setTimeout(function () {
          var statVals = statsContainer.querySelectorAll('.as-val');
          statVals.forEach(function (el, i) {
            setTimeout(function () {
              animateCounter(el, 700);
            }, i * 100);
          });
        }, 100);

        renderEnrollmentChart(coursesSummary);

        sumContainer.innerHTML = '';
        if (activities.length === 0) {
          sumContainer.innerHTML =
            '<p style="color:var(--text-secondary);padding:1rem;">No recent activity.</p>';
        } else {
          activities.slice(0, 10).forEach(function (a) {
            var colors = [
              '#3b82f6',
              '#10b981',
              '#f59e0b',
              '#a855f7',
              '#ec4899',
            ];
            var dotColor = colors[Math.floor(Math.random() * colors.length)];
            var timeAgo = a.createdAt ? timeSince(new Date(a.createdAt)) : '';
            sumContainer.innerHTML += [
              '<div class="sum-item">',
              '<div class="sum-left">',
              '<div class="sum-dot" style="background-color:' +
                dotColor +
                '"></div>',
              '<div class="sum-info">',
              '<h4>' + escapeHtml(a.title || a.type || 'Activity') + '</h4>',
              '<span class="sum-time">' + timeAgo + '</span>',
              '</div>',
              '</div>',
              '<span class="sum-badge" style="background-color:#991b1b">' +
                escapeHtml(a.statusTag || '') +
                '</span>',
              '</div>',
            ].join('');
          });
        }
      })
      .catch(function () {
        renderFallbackData();
        renderEnrollmentChart([]);
      });

    services.backendAnalyticsService
      .getStudentProgress(user._id)
      .then(function (res) {
        var progressData = res && (res.data || res);
        renderProgressChart(progressData);
      })
      .catch(function () {
        renderProgressChart(null);
      });
  }

  function renderEnrollmentChart(coursesSummary) {
    var canvas = document.getElementById('enrollmentChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (!coursesSummary || coursesSummary.length === 0) {
      canvas.style.display = 'none';
      return;
    }

    var labels = coursesSummary.map(function (c) {
      return c.title || c.courseCode || 'Course';
    });
    var gradeData = coursesSummary.map(function (c) {
      return c.weightedGrade || 0;
    });
    var bgColors = gradeData.map(function (g) {
      if (g >= 90) return '#10b981';
      if (g >= 75) return '#3b82f6';
      if (g >= 60) return '#eab308';
      if (g >= 45) return '#f97316';
      return '#ef4444';
    });

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    var tickColor = isDark ? '#94a3b8' : '#6b7280';

    new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Grade (%)',
            data: gradeData,
            backgroundColor: bgColors,
            borderColor: bgColors,
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: gridColor },
            ticks: { font: { family: 'Inter' }, color: tickColor },
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: tickColor },
          },
        },
      },
    });
  }

  function renderProgressChart(progressData) {
    var canvas = document.getElementById('progressTrendChart');
    if (!canvas || typeof Chart === 'undefined') return;

    var hasData =
      progressData && progressData.progress && progressData.progress.length > 0;

    if (!hasData) {
      var wrapper = canvas.parentElement;
      wrapper.innerHTML =
        '<div class="chart-empty"><i class="fa-solid fa-chart-line"></i><span>Progress data will appear once the backend aggregates your learning history</span></div>';
      return;
    }

    var points = progressData.progress;
    var labels = points.map(function (p) {
      return p.period || p.label || '';
    });
    var gradeData = points.map(function (p) {
      return p.grade || 0;
    });
    var completionData = points.map(function (p) {
      return p.completion || p.completionRate || 0;
    });

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    var tickColor = isDark ? '#94a3b8' : '#6b7280';

    new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Grade',
            data: gradeData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6',
          },
          {
            label: 'Completion',
            data: completionData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#10b981',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Inter', size: 12 }, color: tickColor },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: gridColor },
            ticks: { font: { family: 'Inter' }, color: tickColor },
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: tickColor },
          },
        },
      },
    });
  }

  function renderFallbackData() {
    var fallbackStats = [
      {
        label: 'Courses Enrolled',
        value: '8',
        change: '3 completed',
        isPos: true,
        icon: 'fa-solid fa-book-open',
      },
      {
        label: 'Average Grade',
        value: '72%',
        change: 'across 6 courses',
        isPos: true,
        icon: 'fa-solid fa-graduation-cap',
      },
      {
        label: 'Reputation',
        value: '1,250',
        change: '12 day streak',
        isPos: true,
        icon: 'fa-solid fa-star',
      },
      {
        label: 'Approved Subs',
        value: '42',
        change: '8 pending',
        isPos: true,
        icon: 'fa-regular fa-circle-check',
      },
    ];
    statsContainer.innerHTML = '';
    fallbackStats.forEach(function (s, i) {
      statsContainer.innerHTML +=
        '<div class="ana-stat-card" data-position="' +
        (i + 1) +
        '"><div class="as-label"><i class="' +
        s.icon +
        '"></i> ' +
        s.label +
        '</div><div class="as-val">' +
        s.value +
        '</div><div class="as-change pos">' +
        s.change +
        '</div></div>';
    });

    setTimeout(function () {
      var statVals = statsContainer.querySelectorAll('.as-val');
      statVals.forEach(function (el, i) {
        setTimeout(function () {
          animateCounter(el, 700);
        }, i * 100);
      });
    }, 100);

    var fallbackActivities = [
      {
        title: 'Completed "Data Structures" assignment',
        time: '2 hours ago',
        tag: 'Submitted',
      },
      {
        title: 'Achieved 90% on quiz "Sorting Algorithms"',
        time: '1 day ago',
        tag: 'Excellent',
      },
      {
        title: 'Started new course "Machine Learning"',
        time: '2 days ago',
        tag: 'In Progress',
      },
      {
        title: 'Earned "Fast Learner" badge',
        time: '3 days ago',
        tag: 'Achievement',
      },
    ];
    sumContainer.innerHTML = '';
    fallbackActivities.forEach(function (a) {
      var colors = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7'];
      var dotColor = colors[fallbackActivities.indexOf(a) % colors.length];
      sumContainer.innerHTML +=
        '<div class="sum-item"><div class="sum-left"><div class="sum-dot" style="background-color:' +
        dotColor +
        '"></div><div class="sum-info"><h4>' +
        escapeHtml(a.title) +
        '</h4><span class="sum-time">' +
        a.time +
        '</span></div></div><span class="sum-badge" style="background-color:#991b1b">' +
        escapeHtml(a.tag) +
        '</span></div>';
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function animateCounter(el, duration) {
    if (!el) return;
    var text = el.textContent.trim();
    var num = Number(text);
    if (isNaN(num) || text.indexOf('/') !== -1 || text.indexOf('days') !== -1)
      return;
    if (num === 0) return;
    var isInt = Number.isInteger(num);
    var startTime = performance.now();
    function update(now) {
      var elapsed = now - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = num * eased;
      el.textContent = isInt
        ? Math.round(current).toString()
        : current.toFixed(1);
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = text;
      }
    }
    el.textContent = isInt ? '0' : '0.0';
    requestAnimationFrame(update);
  }

  function timeSince(date) {
    var seconds = Math.floor((new Date() - date) / 1000);
    var intervals = [
      [31536000, 'year'],
      [2592000, 'month'],
      [604800, 'week'],
      [86400, 'day'],
      [3600, 'hour'],
      [60, 'minute'],
    ];
    for (var i = 0; i < intervals.length; i++) {
      var val = Math.floor(seconds / intervals[i][0]);
      if (val >= 1)
        return val + ' ' + intervals[i][1] + (val > 1 ? 's' : '') + ' ago';
    }
    return 'just now';
  }

  var themeBtn = document.getElementById('themeBtn');
  var themeIcon = themeBtn ? themeBtn.querySelector('i') : null;
  var appLogo = document.getElementById('app-logo');

  var savedTheme = localStorage.getItem('theme');
  if (savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme);

  var currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  if (currentTheme === 'dark') {
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
    if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var html = document.documentElement;
      var cur = html.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      if (themeIcon)
        themeIcon.className =
          next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      if (appLogo)
        appLogo.src =
          next === 'dark'
            ? '/Assets/images/logo-dark.png'
            : '/Assets/images/logo-light.png';
      themeBtn.classList.remove('rotating');
      void themeBtn.offsetWidth;
      themeBtn.classList.add('rotating');
      setTimeout(function () {
        themeBtn.classList.remove('rotating');
      }, 500);
    });
  }

  var anaTabs = document.querySelectorAll('.ana-tab');
  anaTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      anaTabs.forEach(function (t) {
        t.classList.remove('active');
      });
      tab.classList.add('active');
    });
  });

  // Export
  var exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      downloadExport(
        '/analytics/export/students?format=csv',
        'student-report.csv',
      );
    });
  }
});

function downloadExport(path, filename) {
  var token =
    localStorage.getItem('token') ||
    localStorage.getItem('nibras.webSession') ||
    localStorage.getItem('accessToken') ||
    '';
  var baseUrl =
    window.NIBRAS_API_SERVICES?.admin ||
    'https://nibras-backend.up.railway.app/api';
  fetch(baseUrl + path, { headers: { Authorization: 'Bearer ' + token } })
    .then(function (r) {
      if (!r.ok) throw new Error();
      return r.blob();
    })
    .then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 10000);
    })
    .catch(function () {
      window.open(
        baseUrl + path + '&token=' + encodeURIComponent(token),
        '_blank',
      );
    });
}
