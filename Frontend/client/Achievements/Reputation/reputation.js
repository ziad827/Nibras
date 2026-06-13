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

  var bdContainer = document.getElementById('breakdown-container');
  var lvContainer = document.getElementById('levels-container');
  var posContainer = document.getElementById('rules-pos-container');
  var actContainer = document.getElementById('activity-container');

  var levels = [
    { name: 'Novice', range: '0 - 100 points', dotColor: '#10b981' },
    { name: 'Learner', range: '100 - 500 points', dotColor: '#3b82f6' },
    { name: 'Contributor', range: '500 - 1000 points', dotColor: '#9333ea' },
    { name: 'Expert', range: '1000 - 2500 points', dotColor: '#ec4899' },
    { name: 'Master', range: '2500 - 5000 points', dotColor: '#f59e0b' },
    { name: 'Legend', range: '5000+ points', dotColor: '#ef4444' },
  ];

  var rulesPos = [
    { action: 'Solve a beginner problem', points: '+10' },
    { action: 'Solve a newbie problem', points: '+20' },
    { action: 'Solve an intermediate problem', points: '+35' },
    { action: 'Solve an advanced problem', points: '+50' },
    { action: 'Join a contest', points: '+15' },
    { action: 'Top 25% in contest', points: '+25' },
    { action: 'Top 10% in contest', points: '+50' },
    {
      action: 'Contest rating gain (per +10 Elo)',
      points: '+1',
      note: 'cap 30',
    },
    { action: 'Create a question', points: '+5' },
    { action: 'Create an answer', points: '+15' },
    { action: 'Have answer accepted', points: '+25' },
    { action: 'Receive question upvote', points: '+2', note: '20 pts/day max' },
    { action: 'Receive answer upvote', points: '+3', note: '30 pts/day max' },
    { action: 'Create a discussion thread', points: '+5' },
    { action: 'Earn a badge', points: '+15' },
  ];

  var levelThresholds = [0, 100, 500, 1000, 2500, 5000];

  function getLevelIndex(score) {
    for (var i = levelThresholds.length - 1; i >= 0; i--) {
      if (score >= levelThresholds[i]) return i;
    }
    return 0;
  }

  function renderLevels(score) {
    if (!lvContainer) return;
    lvContainer.innerHTML = '';
    levels.forEach(function (lvl, i) {
      var status = 'locked';
      if (i < getLevelIndex(score)) status = 'passed';
      else if (i === getLevelIndex(score)) status = 'active';
      var activeClass = status === 'active' ? 'active' : '';
      var liveBadge =
        status === 'active' ? '<span class="live-badge">LIVE</span>' : '';

      lvContainer.innerHTML += [
        '<div class="lvl-card ' + activeClass + '">',
        '<div class="lvl-header">',
        '<div class="lvl-title"><div class="status-dot" style="background-color:' +
          lvl.dotColor +
          '"></div>' +
          lvl.name +
          ' ' +
          liveBadge +
          '</div>',
        '<span class="lvl-points">' + lvl.range + '</span>',
        '</div>',
        '</div>',
      ].join('');
    });
  }

  function renderRules() {
    if (posContainer) {
      posContainer.innerHTML = '';
      rulesPos.forEach(function (r) {
        var noteHtml = r.note
          ? ' <span style="color:var(--text-muted);font-size:0.7rem;">(' +
            r.note +
            ')</span>'
          : '';
        posContainer.innerHTML +=
          '<div class="rule-row"><span>' +
          r.action +
          noteHtml +
          '</span><span class="rule-pts pos">' +
          r.points +
          '</span></div>';
      });
    }
  }

  function renderActivity() {
    if (!actContainer) return;

    var services = window.NibrasServices;
    if (!services || !services.reputationService) {
      actContainer.innerHTML =
        '<div class="act-item" style="justify-content:center;padding:2rem;"><p style="color:var(--text-secondary);">Activity feed will appear here once backend endpoints are connected.</p></div>';
      return;
    }

    services.reputationService
      .getActivityFeed(20)
      .then(function (result) {
        var data = result?.data || result?.activities || result || [];
        var activities = Array.isArray(data) ? data : [];

        if (activities.length === 0) {
          actContainer.innerHTML =
            '<div class="act-item" style="justify-content:center;padding:2rem;"><p style="color:var(--text-secondary);">No recent activity. Start earning points!</p></div>';
          return;
        }

        actContainer.innerHTML = '';
        activities.forEach(function (act) {
          var desc =
            act.description || act.activityType || act.action || 'Activity';
          var pts = act.points;
          var ptsHtml =
            pts != null
              ? '<span class="rule-pts ' +
                (pts > 0 ? 'pos' : 'neg') +
                '">' +
                (pts > 0 ? '+' : '') +
                pts +
                '</span>'
              : '';
          var timeHtml = '';
          if (act.createdAt) {
            var d = new Date(act.createdAt);
            var now = new Date();
            var diff = now - d;
            var mins = Math.floor(diff / 60000);
            var hours = Math.floor(diff / 3600000);
            var days = Math.floor(diff / 86400000);
            if (mins < 1) timeHtml = 'Just now';
            else if (mins < 60) timeHtml = mins + 'm ago';
            else if (hours < 24) timeHtml = hours + 'h ago';
            else if (days < 7) timeHtml = days + 'd ago';
            else timeHtml = d.toLocaleDateString();
          }

          actContainer.innerHTML +=
            '<div class="act-item" style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--border-color);">' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="font-size:0.9rem;">' +
            escapeHtml(desc) +
            '</span>' +
            (timeHtml
              ? '<span style="font-size:0.75rem;color:var(--text-muted);">' +
                timeHtml +
                '</span>'
              : '') +
            '</div>' +
            (ptsHtml || '') +
            '</div>';
        });
      })
      .catch(function () {
        actContainer.innerHTML =
          '<div class="act-item" style="justify-content:center;padding:2rem;"><p style="color:var(--text-secondary);">Could not load activity feed.</p></div>';
      });
  }

  function renderBreakdown(breakdown) {
    if (!bdContainer) return;
    bdContainer.innerHTML = '';
    var categories = [
      {
        label: 'Academic Performance',
        score: breakdown.course || 0,
        color: 'blue',
        icon: 'fa-solid fa-book',
      },
      {
        label: 'Community Contribution',
        score: breakdown.community || 0,
        color: 'green',
        icon: 'fa-solid fa-users',
      },
      {
        label: 'Challenge Solutions',
        score: breakdown.problem || 0,
        color: 'purple',
        icon: 'fa-regular fa-lightbulb',
      },
      {
        label: 'Competition Results',
        score: breakdown.contest || 0,
        color: 'orange',
        icon: 'fa-solid fa-trophy',
      },
    ];
    categories.forEach(function (cat) {
      var max = Math.max(cat.score * 2, 500);
      var pct = Math.min((cat.score / max) * 100, 100);
      var colorVar = 'var(--bar-' + cat.color + ')';

      bdContainer.innerHTML += [
        '<div class="bd-item">',
        '<div class="bd-head">',
        '<span><i class="' +
          cat.icon +
          '" style="color:' +
          colorVar +
          '"></i> ' +
          cat.label +
          '</span>',
        '<span class="bd-val">' +
          cat.score +
          ' <span class="bd-sub">/ ' +
          max +
          '</span></span>',
        '</div>',
        '<div class="bd-track"><div class="bd-fill" style="width:' +
          pct +
          '%;background-color:' +
          colorVar +
          '"></div></div>',
        '</div>',
      ].join('');
    });
  }

  var services = window.NibrasServices;
  services.reputationService
    .getMyReputation()
    .then(function (res) {
      var data = res && (res.data || res);
      var total = (data && data.total) || 0;
      var breakdown = (data && data.breakdown) || {
        problem: 0,
        community: 0,
        contest: 0,
        course: 0,
      };

      var nextLevelIdx = getLevelIndex(total) + 1;
      var nextThreshold =
        nextLevelIdx < levelThresholds.length
          ? levelThresholds[nextLevelIdx]
          : total;
      var prevThreshold = levelThresholds[getLevelIndex(total)] || 0;
      var progressToNext =
        nextThreshold > prevThreshold
          ? Math.round(
              ((total - prevThreshold) / (nextThreshold - prevThreshold)) * 100,
            )
          : 100;

      var currentRepCard = document.querySelector('.current-rep-card');
      if (currentRepCard) {
        var fill = currentRepCard.querySelector('.cr-fill');
        var info = currentRepCard.querySelector('.cr-info');
        if (fill) fill.style.width = Math.min(progressToNext, 100) + '%';
        if (info)
          info.innerHTML =
            '<strong>' +
            total +
            '</strong> / ' +
            nextThreshold +
            ' points to ' +
            (levels[nextLevelIdx] ? levels[nextLevelIdx].name : 'Max');
        var val = currentRepCard.querySelector('.cr-val');
        if (val) val.textContent = total;
      }

      renderBreakdown(breakdown);
      renderLevels(total);
      renderRules();
      renderActivity();
    })
    .catch(function () {
      renderLevels(0);
      renderRules();
      renderActivity();
    });

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
    themeBtn.classList.remove('rotating');
    void themeBtn.offsetWidth;
    themeBtn.addEventListener('click', function () {
      themeBtn.classList.add('rotating');
      setTimeout(function () {
        themeBtn.classList.remove('rotating');
      }, 500);
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
    });
  }

  var segTabs = document.querySelectorAll('.seg-btn');
  segTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      segTabs.forEach(function (t) {
        t.classList.remove('active');
      });
      tab.classList.add('active');
    });
  });
});
