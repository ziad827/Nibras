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

  var currentState = {
    type: 'overall',
    period: 'all-time',
    scope: 'global',
    page: 1,
  };
  var userContainer = document.getElementById('user-rank-container');
  var listContainer = document.getElementById('leaderboard-container');

  var services = window.NibrasServices;

  function getReputationScore(item) {
    if (item && item.reputation && item.reputation.total != null)
      return item.reputation.total;
    return item.score || 0;
  }

  function getLeaderboardFn(type) {
    if (type === 'academic')
      return services.gamificationService.getAcademicLeaderboard;
    if (type === 'competitive')
      return services.gamificationService.getCompetitiveLeaderboard;
    if (type === 'community')
      return services.gamificationService.getCommunityLeaderboard;
    return services.gamificationService.getLeaderboard;
  }

  function getMyRankFn(type) {
    if (type === 'overall' || !type)
      return services.gamificationService.getMyLeaderboardRank;
    return null;
  }

  function loadLeaderboard() {
    var type = currentState.type;
    var period = currentState.period;
    var scope = currentState.scope;
    var page = currentState.page;

    var lbFn = getLeaderboardFn(type);
    var myFn = getMyRankFn(type);

    var promises = [
      lbFn({ period: period, scope: scope, page: page, limit: 20 }).catch(
        function (err) {
          console.error('[Leaderboard] Error fetching:', err?.message || err);
          return null;
        },
      ),
    ];

    if (myFn) {
      promises.push(
        myFn({ period: period, scope: scope }).catch(function () {
          return null;
        }),
      );
    } else {
      promises.push(Promise.resolve(null));
    }
    promises.push(
      services.reputationService.getMyReputation().catch(function () {
        return null;
      }),
    );

    Promise.all(promises).then(async function (results) {
      var lbRes = results[0];
      var myRes = results[1];
      var repRes = results[2];

      var lbData = (lbRes && (lbRes.data || lbRes)) || null;
      var myData = (myRes && (myRes.data || myRes)) || null;

      var entries = (lbData && lbData.entries) || [];

      if (!entries.length && services.gamificationService) {
        try {
          var fbFn = getLeaderboardFn(type);
          var fbRes = await fbFn({ period: period, scope: scope });
          var fbData = (fbRes && (fbRes.data || fbRes)) || null;
          if (fbData && fbData.entries) entries = fbData.entries;
        } catch (_) {}
      }

      if (entries.length) {
        entries = entries.filter(function (e) {
          return (e.user?.role || '').toLowerCase() === 'student';
        });
        entries.forEach(function (e, i) {
          e.rank = i + 1;
        });
      }

      var currentUser = myData || null;
      var pagination = (lbData && lbData.pagination) || null;

      var totalReputation = 0;
      if (repRes && repRes.data) totalReputation = repRes.data.total || 0;
      else if (repRes && repRes.total) totalReputation = repRes.total;
      if (!totalReputation && currentUser && currentUser.reputation)
        totalReputation = currentUser.reputation.total || 0;

      var storedUser = null;
      try {
        var raw = localStorage.getItem('user');
        if (raw) storedUser = JSON.parse(raw);
      } catch (_) {}

      var userName =
        (storedUser && storedUser.name) ||
        (currentUser && currentUser.name) ||
        'You';
      var userInitials = userName
        .split(' ')
        .map(function (w) {
          return w.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2);

      if (userContainer) {
        var uRank =
          currentUser && currentUser.rank != null ? currentUser.rank : '-';
        userContainer.innerHTML = [
          '<div class="ur-left">',
          '<div class="ur-avatar">' + escapeHtml(userInitials) + '</div>',
          '<div class="ur-rank">#' + uRank + '</div>',
          '<div class="ur-info"><h3>' +
            escapeHtml(userName) +
            ' <span class="ur-badge">student</span></h3></div>',
          '</div>',
          '<div class="ur-right">',
          '<div class="ur-points">' + totalReputation + '</div>',
          '<span class="ur-sub">reputation points</span>',
          '</div>',
        ].join('');
      }

      if (listContainer) {
        listContainer.innerHTML = '';
        if (!entries || entries.length === 0) {
          listContainer.innerHTML =
            '<p style="color:var(--text-secondary);padding:1rem;text-align:center;">No leaderboard entries yet. Start earning points!</p>';
          return;
        }

        entries.forEach(function (item) {
          var rank = item.rank || 0;
          var entryName = item.user?.name || item.name || 'User';
          var initials = entryName
            .split(' ')
            .map(function (w) {
              return w.charAt(0);
            })
            .join('')
            .toUpperCase()
            .slice(0, 2);
          var repScore = getReputationScore(item);
          var role = 'student';
          var meta = '';
          if (item.activeDays) meta += item.activeDays + ' active days';
          if (item.reputation && item.reputation.breakdown) {
            var brk = item.reputation.breakdown;
            var parts = [];
            if (brk.course) parts.push('Course: ' + brk.course);
            if (brk.community) parts.push('Community: ' + brk.community);
            if (brk.problem) parts.push('Problems: ' + brk.problem);
            if (brk.contest) parts.push('Contests: ' + brk.contest);
            if (parts.length)
              meta = (meta ? meta + ' &bull; ' : '') + parts.join(' | ');
          }

          var rankHtml = '<div class="rank-box">#' + rank + '</div>';
          if (rank === 1)
            rankHtml =
              '<div class="rank-box"><i class="fa-solid fa-crown rank-icon gold"></i></div>';
          else if (rank === 2)
            rankHtml =
              '<div class="rank-box"><i class="fa-solid fa-shield rank-icon silver"></i></div>';
          else if (rank === 3)
            rankHtml =
              '<div class="rank-box"><i class="fa-solid fa-gem rank-icon bronze"></i></div>';

          var isMe =
            userName === entryName
              ? 'style="border: 2px solid var(--accent-blue);"'
              : '';

          listContainer.innerHTML += [
            '<div class="lb-row" ' + isMe + '>',
            '<div class="lb-left">',
            rankHtml,
            '<div class="lb-avatar">' + escapeHtml(initials) + '</div>',
            '<div class="lb-user-info">',
            '<h4>' +
              escapeHtml(entryName) +
              ' <span class="ur-badge" style="font-size:0.7rem">' +
              role +
              '</span></h4>',
            '<span class="lb-meta">' + escapeHtml(meta) + '</span>',
            '</div>',
            '</div>',
            '<div class="lb-right">',
            '<div class="lb-points">' + repScore + '</div>',
            '<span class="lb-meta">reputation points</span>',
            '</div>',
            '</div>',
          ].join('');
        });

        if (pagination && pagination.totalPages > 1) {
          var pagHtml =
            '<div class="pagination" style="display:flex;justify-content:center;gap:0.5rem;padding:1rem;">';
          if (pagination.page > 1) {
            pagHtml +=
              '<button class="pill-btn active" data-page="' +
              (pagination.page - 1) +
              '">Prev</button>';
          }
          pagHtml +=
            '<span style="padding:0.5rem;color:var(--text-secondary)">Page ' +
            pagination.page +
            ' of ' +
            pagination.totalPages +
            '</span>';
          if (pagination.page < pagination.totalPages) {
            pagHtml +=
              '<button class="pill-btn active" data-page="' +
              (pagination.page + 1) +
              '">Next</button>';
          }
          pagHtml += '</div>';
          listContainer.innerHTML += pagHtml;

          listContainer.querySelectorAll('[data-page]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              currentState.page = parseInt(this.getAttribute('data-page'));
              loadLeaderboard();
            });
          });
        }
      }
    });
  }

  loadLeaderboard();

  var pills = document.querySelectorAll('.pill-btn:not(.type-btn)');
  pills.forEach(function (p) {
    p.addEventListener('click', function () {
      var text = this.textContent.trim().toLowerCase();
      if (
        text === 'overall' ||
        text === 'all time' ||
        this.id === 'overall-btn'
      ) {
        currentState.period = 'all-time';
      } else if (
        text === 'this week' ||
        text === 'weekly' ||
        this.id === 'week-btn'
      ) {
        currentState.period = 'weekly';
      } else if (
        text === 'this month' ||
        text === 'monthly' ||
        this.id === 'month-btn'
      ) {
        currentState.period = 'monthly';
      }

      pills.forEach(function (btn) {
        btn.classList.remove('active');
      });
      this.classList.add('active');
      currentState.page = 1;
      loadLeaderboard();
    });
  });

  var typeTabs = document.querySelectorAll('.type-btn');
  typeTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var type = this.dataset.type || 'overall';
      currentState.type = type;

      typeTabs.forEach(function (t) {
        t.classList.remove('active');
      });
      this.classList.add('active');
      currentState.page = 1;
      loadLeaderboard();
    });
  });

  var segTabs = document.querySelectorAll('.seg-btn');
  segTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var scope = this.dataset.scope || 'global';
      currentState.scope = scope;

      segTabs.forEach(function (t) {
        t.classList.remove('active');
      });
      tab.classList.add('active');
      currentState.page = 1;
      loadLeaderboard();
    });
  });

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
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
});
