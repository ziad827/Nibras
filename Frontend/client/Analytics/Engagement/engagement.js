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
  var commContainer = document.getElementById('community-metrics-container');
  var contestContainer = document.getElementById('contest-metrics-container');
  var platformStatsContainer = document.getElementById(
    'platform-stats-container',
  );

  var services = window.NibrasServices;
  var activeCharts = [];

  function destroyCharts() {
    activeCharts.forEach(function (c) {
      try {
        c.destroy();
      } catch (_) {}
    });
    activeCharts = [];
  }

  function getUserId() {
    try {
      var raw = localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  var user = getUserId();

  function renderStats(data) {
    if (!statsContainer) return;
    if (!data) {
      statsContainer.innerHTML =
        '<p style="color:var(--text-secondary);padding:2rem;text-align:center;">Failed to load engagement data.</p>';
      return;
    }

    var studentStats = data.studentStats || {};
    var problemProg = data.problemProgress || {};
    var submissionSum = data.submissionSummary || {};
    var coursesSummary = data.coursesGradeSummary || [];

    var enrolledCount = coursesSummary.length;
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
    var problemsSolved = studentStats.problemsSolved || 0;
    var contestRating = studentStats.contestRating || 0;

    var stats = [
      {
        label: 'Courses Enrolled',
        value: String(enrolledCount),
        change: 'avg grade ' + avgGrade + '%',
        isPos: true,
        icon: 'fa-solid fa-book-open',
      },
      {
        label: 'Problems Solved',
        value: String(problemsSolved),
        change: 'coding progress',
        isPos: true,
        icon: 'fa-solid fa-code',
      },
      {
        label: 'Contest Rating',
        value: String(contestRating),
        change: 'competitive rank',
        isPos: contestRating > 0,
        icon: 'fa-solid fa-trophy',
      },
      {
        label: 'Submissions',
        value: String(submissionSum.total || 0),
        change: (submissionSum.approved || 0) + ' approved',
        isPos: true,
        icon: 'fa-regular fa-paper-plane',
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
  }

  function renderContestEngagement(data) {
    if (!contestContainer) return;
    if (!data) {
      contestContainer.innerHTML =
        '<p style="color:var(--text-secondary);padding:1rem;">No contest data available.</p>';
      return;
    }

    var studentStats = data.studentStats || {};
    var problemProg = data.problemProgress || {};
    var contestRating = studentStats.contestRating || 0;

    var totalProblems = 0;
    Object.keys(problemProg).forEach(function (key) {
      totalProblems += problemProg[key].solved || 0;
    });

    contestContainer.innerHTML = '';
    contestContainer.innerHTML +=
      '<div class="metric-row"><span class="metric-label">Contest Rating</span><span class="metric-val">' +
      contestRating +
      '</span></div>';
    contestContainer.innerHTML +=
      '<div class="metric-row"><span class="metric-label">Problems Solved</span><span class="metric-val">' +
      totalProblems +
      '</span></div>';
    contestContainer.innerHTML +=
      '<div class="metric-row"><span class="metric-label">Study Streak</span><span class="metric-val">' +
      (studentStats.studyStreak || 0) +
      ' days</span></div>';

    var difficultyCounts = {
      beginner: 0,
      newbie: 0,
      intermediate: 0,
      advanced: 0,
    };
    Object.keys(problemProg).forEach(function (key) {
      difficultyCounts[key] = problemProg[key].solved || 0;
    });
    var sorted = Object.keys(difficultyCounts).filter(function (k) {
      return difficultyCounts[k] > 0;
    });
    if (sorted.length === 0) {
      contestContainer.innerHTML +=
        '<div class="metric-row"><span class="metric-label">Hardest Solved</span><span class="metric-val">—</span></div>';
    } else {
      var hardest = sorted[sorted.length - 1];
      var labels = {
        beginner: 'Beginner',
        newbie: 'Newbie',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
      };
      contestContainer.innerHTML +=
        '<div class="metric-row"><span class="metric-label">Hardest Solved</span><span class="metric-val" style="color:var(--green);">' +
        (labels[hardest] || hardest) +
        '</span></div>';
    }
  }

  function renderPlatformStats(platformData) {
    if (!platformStatsContainer) return;

    if (!platformData) {
      platformStatsContainer.innerHTML =
        '<p style="color:var(--text-secondary);padding:1rem;">Platform data unavailable (Phase 9 API not ready).</p>';
      return;
    }

    var activeUsers = platformData.activeUsers || {};
    var totalQuestions =
      platformData.questionsAsked ||
      platformData.totalQuestions ||
      platformData.questions ||
      0;
    var totalAnswers =
      platformData.answersProvided ||
      platformData.totalAnswers ||
      platformData.answers ||
      0;
    var contestsHeld =
      platformData.contestsHeld ||
      platformData.totalContests ||
      platformData.contests ||
      0;
    var totalSubs =
      platformData.totalSubmissions || platformData.submissions || 0;

    var dailyUsers =
      activeUsers.daily ||
      activeUsers.dau ||
      platformData.dailyActiveUsers ||
      0;
    var weeklyUsers =
      activeUsers.weekly ||
      activeUsers.wau ||
      platformData.weeklyActiveUsers ||
      0;
    var monthlyUsers =
      activeUsers.monthly ||
      activeUsers.mau ||
      platformData.monthlyActiveUsers ||
      0;

    platformStatsContainer.innerHTML = '';
    var platformStats = [
      {
        label: 'Daily Active Users',
        value: String(dailyUsers),
        icon: 'fa-solid fa-users',
      },
      {
        label: 'Weekly Active Users',
        value: String(weeklyUsers),
        icon: 'fa-solid fa-users-gear',
      },
      {
        label: 'Monthly Active Users',
        value: String(monthlyUsers),
        icon: 'fa-solid fa-users-rays',
      },
      {
        label: 'Total Questions',
        value: String(totalQuestions),
        icon: 'fa-solid fa-question-circle',
      },
      {
        label: 'Answers Given',
        value: String(totalAnswers),
        icon: 'fa-solid fa-reply-all',
      },
      {
        label: 'Contests Held',
        value: String(contestsHeld),
        icon: 'fa-solid fa-trophy',
      },
    ];
    if (totalSubs > 0) {
      platformStats.push({
        label: 'Total Submissions',
        value: String(totalSubs),
        icon: 'fa-regular fa-paper-plane',
      });
    }

    platformStats.forEach(function (s) {
      platformStatsContainer.innerHTML += [
        '<div class="trend-stat">',
        '<div class="trend-stat-icon"><i class="' + s.icon + '"></i></div>',
        '<div class="trend-stat-body">',
        '<span class="trend-stat-val">' + s.value + '</span>',
        '<span class="trend-stat-label">' + s.label + '</span>',
        '</div>',
        '</div>',
      ].join('');
    });
  }

  function renderCommunityMetrics(platformData, studentPerfData) {
    if (!commContainer) return;

    if (!platformData && !studentPerfData) {
      commContainer.innerHTML = [
        '<div class="metric-row"><span class="metric-label">Questions Asked</span><span class="metric-val">—</span></div>',
        '<div class="metric-row"><span class="metric-label">Answers Provided</span><span class="metric-val">—</span></div>',
        '<div class="metric-row"><span class="metric-label">Community Score</span><span class="metric-val">—</span></div>',
      ].join('');
      return;
    }

    var questions =
      (studentPerfData &&
        studentPerfData.studentStats &&
        studentPerfData.studentStats.questionsAsked) ||
      (platformData && platformData.questionsAsked) ||
      '—';
    var answers =
      (studentPerfData &&
        studentPerfData.studentStats &&
        studentPerfData.studentStats.answersProvided) ||
      (platformData && platformData.answersProvided) ||
      '—';
    var communityScore =
      (studentPerfData &&
        studentPerfData.studentStats &&
        studentPerfData.studentStats.reputation) ||
      (platformData && platformData.communityScore) ||
      '—';
    var votesCast =
      (platformData && (platformData.votesCast || platformData.votes)) || null;
    var activeUsers =
      (platformData &&
        platformData.activeUsers &&
        platformData.activeUsers.total) ||
      null;

    commContainer.innerHTML = '';
    commContainer.innerHTML +=
      '<div class="metric-row"><span class="metric-label">Questions Asked</span><span class="metric-val">' +
      questions +
      '</span></div>';
    commContainer.innerHTML +=
      '<div class="metric-row"><span class="metric-label">Answers Provided</span><span class="metric-val">' +
      answers +
      '</span></div>';
    if (votesCast !== null) {
      commContainer.innerHTML +=
        '<div class="metric-row"><span class="metric-label">Votes Cast</span><span class="metric-val">' +
        votesCast +
        '</span></div>';
    }
    if (activeUsers !== null) {
      commContainer.innerHTML +=
        '<div class="metric-row"><span class="metric-label">Active Users</span><span class="metric-val">' +
        activeUsers +
        '</span></div>';
    }
    var scoreClass =
      communityScore !== '—' && communityScore > 0 ? 'metric-green' : '';
    commContainer.innerHTML +=
      '<div class="metric-row"><span class="metric-label">Community Score</span><span class="metric-val ' +
      scoreClass +
      '">' +
      communityScore +
      '</span></div>';
  }

  function renderEngagementTrendChart(trendData) {
    var canvas = document.getElementById('engagementTrendChart');
    if (!canvas || typeof Chart === 'undefined') return;

    var hasData =
      trendData &&
      ((trendData.trends && trendData.trends.length > 0) ||
        (Array.isArray(trendData) && trendData.length > 0));
    if (!hasData) {
      var wrapper = canvas.parentElement;
      wrapper.innerHTML =
        '<div class="chart-empty"><i class="fa-solid fa-chart-line"></i><span>Engagement trends will appear once the backend aggregates platform activity</span></div>';
      return;
    }

    var points = trendData.trends || trendData;
    var labels = points.map(function (p) {
      return p.period || p.date || p.label || '';
    });
    var userData = points.map(function (p) {
      return p.activeUsers || p.users || p.dau || 0;
    });
    var questionData = points.map(function (p) {
      return p.questions || p.questionsAsked || 0;
    });
    var answerData = points.map(function (p) {
      return p.answers || p.answersProvided || 0;
    });

    var datasets = [
      {
        label: 'Active Users',
        data: userData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#3b82f6',
      },
    ];

    if (
      questionData.some(function (v) {
        return v > 0;
      })
    ) {
      datasets.push({
        label: 'Questions',
        data: questionData,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#f59e0b',
      });
    }
    if (
      answerData.some(function (v) {
        return v > 0;
      })
    ) {
      datasets.push({
        label: 'Answers',
        data: answerData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#10b981',
      });
    }

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    var tickColor = isDark ? '#94a3b8' : '#6b7280';

    activeCharts.push(
      new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels: labels, datasets: datasets },
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
              grid: { color: gridColor },
              ticks: { font: { family: 'Inter' }, color: tickColor },
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Inter', size: 11 }, color: tickColor },
            },
          },
        },
      }),
    );
  }

  if (user && user._id && services && services.backendAnalyticsService) {
    var studentPerfPromise = services.backendAnalyticsService
      .getStudentPerformance(user._id)
      .then(function (res) {
        var data = res && (res.data || res);
        renderStats(data);
        renderContestEngagement(data);
        return data;
      })
      .catch(function () {
        renderStats(null);
        renderContestEngagement(null);
        return null;
      });

    var platformPromise = services.backendAnalyticsService
      .getPlatformMetrics()
      .then(function (res) {
        var data = res && (res.data || res);
        return data;
      })
      .catch(function () {
        return null;
      });

    Promise.all([studentPerfPromise, platformPromise]).then(function (results) {
      renderPlatformStats(results[1]);
      renderCommunityMetrics(results[1], results[0]);
    });

    services.backendAnalyticsService
      .getPlatformEngagement()
      .then(function (res) {
        var trendData = res && (res.data || res);
        renderEngagementTrendChart(trendData);
      })
      .catch(function () {
        renderEngagementTrendChart(null);
      });
  } else {
    renderFallbackData();
    renderEngagementTrendChart(null);
  }

  function renderFallbackData() {
    var fallbackStats = [
      {
        label: 'Courses Enrolled',
        value: '6',
        change: 'avg grade 74%',
        isPos: true,
        icon: 'fa-solid fa-book-open',
      },
      {
        label: 'Problems Solved',
        value: '45',
        change: 'coding progress',
        isPos: true,
        icon: 'fa-solid fa-code',
      },
      {
        label: 'Contest Rating',
        value: '1,200',
        change: 'competitive rank',
        isPos: true,
        icon: 'fa-solid fa-trophy',
      },
      {
        label: 'Submissions',
        value: '52',
        change: '38 approved',
        isPos: true,
        icon: 'fa-regular fa-paper-plane',
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

    var platformStats = [
      { label: 'Daily Active Users', value: '340', icon: 'fa-solid fa-users' },
      {
        label: 'Weekly Active Users',
        value: '1,200',
        icon: 'fa-solid fa-users-gear',
      },
      {
        label: 'Monthly Active Users',
        value: '3,500',
        icon: 'fa-solid fa-users-rays',
      },
      {
        label: 'Total Questions',
        value: '890',
        icon: 'fa-solid fa-question-circle',
      },
      { label: 'Answers Given', value: '2,100', icon: 'fa-solid fa-reply-all' },
      { label: 'Contests Held', value: '24', icon: 'fa-solid fa-trophy' },
    ];
    if (platformStatsContainer) {
      platformStatsContainer.innerHTML = '';
      platformStats.forEach(function (s) {
        platformStatsContainer.innerHTML +=
          '<div class="trend-stat"><div class="trend-stat-icon"><i class="' +
          s.icon +
          '"></i></div><div class="trend-stat-body"><span class="trend-stat-val">' +
          s.value +
          '</span><span class="trend-stat-label">' +
          s.label +
          '</span></div></div>';
      });
    }

    if (commContainer) {
      commContainer.innerHTML = '';
      commContainer.innerHTML +=
        '<div class="metric-row"><span class="metric-label">Questions Asked</span><span class="metric-val">12</span></div>';
      commContainer.innerHTML +=
        '<div class="metric-row"><span class="metric-label">Answers Provided</span><span class="metric-val">38</span></div>';
      commContainer.innerHTML +=
        '<div class="metric-row"><span class="metric-label">Votes Cast</span><span class="metric-val">156</span></div>';
      commContainer.innerHTML +=
        '<div class="metric-row"><span class="metric-label">Community Score</span><span class="metric-val metric-green">980</span></div>';
    }

    if (contestContainer) {
      contestContainer.innerHTML = '';
      contestContainer.innerHTML +=
        '<div class="metric-row"><span class="metric-label">Contest Rating</span><span class="metric-val">1,200</span></div>';
      contestContainer.innerHTML +=
        '<div class="metric-row"><span class="metric-label">Problems Solved</span><span class="metric-val">45</span></div>';
      contestContainer.innerHTML +=
        '<div class="metric-row"><span class="metric-label">Study Streak</span><span class="metric-val">12 days</span></div>';
      contestContainer.innerHTML +=
        '<div class="metric-row"><span class="metric-label">Hardest Solved</span><span class="metric-val" style="color:var(--green);">Advanced</span></div>';
    }
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
