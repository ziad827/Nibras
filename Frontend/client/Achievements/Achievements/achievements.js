window.NibrasReact.run(function () {
  var STORAGE_KEY = 'nibras_earned_badges';

  var BACKEND_BADGES = [
    {
      name: 'First Steps',
      description: 'Solve your first problem or gain reputation.',
      points: 10,
      badgeIcon: '',
    },
    {
      name: 'Problem Solver',
      description: 'Solve 10 coding problems.',
      points: 25,
      badgeIcon: '',
    },
    {
      name: '7-Day Streak',
      description: 'Maintain a 7-day study streak.',
      points: 30,
      badgeIcon: '',
    },
    {
      name: 'Team Player',
      description: 'Help 5 classmates with answers.',
      points: 20,
      badgeIcon: '',
    },
    {
      name: 'Top Contributor',
      description: 'Post 10 answers or reach 100 reputation.',
      points: 50,
      badgeIcon: '',
    },
  ];

  var statsEl = document.getElementById('stats-container');
  var sectionsEl = document.getElementById('badge-sections');

  function getStoredEarnedIds() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function addStoredEarnedIds(newIds) {
    var existing = getStoredEarnedIds();
    var all = existing.slice();
    newIds.forEach(function (id) {
      if (all.indexOf(id) === -1) all.push(id);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all;
  }

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function rarityClass(idx) {
    var rarities = [
      'badge-card--common',
      'badge-card--rare',
      'badge-card--epic',
      'badge-card--legendary',
    ];
    return rarities[idx % rarities.length];
  }

  function showLoading() {
    if (statsEl)
      statsEl.innerHTML =
        '<div class="loading-skeleton" aria-hidden="true"><div class="loading-skeleton-stats loading-shimmer"></div></div>';
  }

  function renderStats(repTotal, totalBadges, earnedCount) {
    if (!statsEl) return;
    var completionPct =
      totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0;
    statsEl.innerHTML = [
      renderStatTile({
        icon: 'fa-solid fa-trophy',
        value: earnedCount,
        caption: 'of ' + totalBadges,
        label: 'Badges Earned',
      }),
      renderStatTile({
        icon: 'fa-solid fa-star',
        value: repTotal,
        label: 'Reputation',
      }),
      renderStatTile({
        icon: 'fa-solid fa-ranking-star',
        value: completionPct + '%',
        label: 'Completion',
        caption: totalBadges + ' total',
      }),
      renderStatTile({
        icon: 'fa-solid fa-gem',
        value: 0,
        label: 'Legendary',
        caption: 'Rarest unlocks',
      }),
    ].join('');
  }

  function renderStatTile(o) {
    var captionHtml = o.caption
      ? '<span class="stat-tile-caption">' + escapeHtml(o.caption) + '</span>'
      : '';
    return [
      '<div class="stat-tile">',
      '<div class="stat-tile-head">',
      '<i class="' + o.icon + ' stat-tile-icon"></i>',
      '<span class="stat-tile-label">' + escapeHtml(o.label) + '</span>',
      '</div>',
      '<div class="stat-tile-value">' + escapeHtml(String(o.value)) + '</div>',
      '<div class="stat-tile-foot">' + captionHtml + '</div>',
      '</div>',
    ].join('');
  }

  function annotateBadges(allBackendBadges, earnedIds) {
    if (!sectionsEl) return;

    var backendMap = {};
    allBackendBadges.forEach(function (b) {
      var name = (b.name || '').trim().toLowerCase();
      if (name) backendMap[name] = b;
    });

    var matchedNames = {};

    var cards = sectionsEl.querySelectorAll('.badge-card');
    cards.forEach(function (card) {
      var nameEl = card.querySelector('.badge-name');
      if (!nameEl) return;
      var cardName = (nameEl.textContent || '').trim().toLowerCase();
      if (!cardName) return;

      var backendBadge = backendMap[cardName];

      card.classList.remove(
        'badge-card--earned',
        'badge-card--locked',
        'badge-card--coming-soon',
      );

      var earnedLabels = card.querySelectorAll('.badge-earned-label');
      earnedLabels.forEach(function (el) {
        el.remove();
      });

      if (backendBadge) {
        matchedNames[cardName] = true;
        var id = backendBadge._id ? backendBadge._id.toString() : '';
        var isEarned = earnedIds.indexOf(id) >= 0;

        var oldTrack = card.querySelector('.badge-progress-track');
        var oldLabel = card.querySelector('.badge-progress-label');
        if (oldTrack) oldTrack.remove();
        if (oldLabel) oldLabel.remove();

        if (isEarned) {
          card.classList.add('badge-card--earned');
          var label = document.createElement('span');
          label.className = 'badge-progress-label badge-earned-label';
          label.style.cssText =
            'margin-top:4px;color:var(--primary-strong);font-weight:600;';
          label.textContent = 'Earned';
          card.appendChild(label);
        } else {
          card.classList.add('badge-card--locked');
        }
      } else {
        card.classList.add('badge-card--coming-soon');
      }
    });

    var blocks = sectionsEl.querySelectorAll(':scope > .badge-block');
    var earnedBlock = null;
    var lockedBlock = null;
    for (var i = 0; i < blocks.length; i++) {
      var title = blocks[i].querySelector('.badge-section-title');
      if (!title) continue;
      var text = (title.textContent || '').trim().toLowerCase();
      if (text === 'earned') earnedBlock = blocks[i];
      else if (text === 'locked') lockedBlock = blocks[i];
    }

    var oldComingSoon = sectionsEl.querySelector('.badge-block-coming-soon');
    if (oldComingSoon) oldComingSoon.remove();

    var earnedGrid = earnedBlock
      ? earnedBlock.querySelector('.badge-grid')
      : null;
    var lockedGrid = lockedBlock
      ? lockedBlock.querySelector('.badge-grid')
      : null;

    if (!earnedBlock) {
      earnedBlock = createBadgeBlock('Earned', '0 unlocked');
      sectionsEl.insertBefore(earnedBlock, sectionsEl.firstChild);
      earnedGrid = earnedBlock.querySelector('.badge-grid');
    }
    if (!lockedBlock) {
      lockedBlock = createBadgeBlock('Locked', '0 to go');
      if (earnedBlock) {
        sectionsEl.insertBefore(lockedBlock, earnedBlock.nextSibling);
      } else {
        sectionsEl.appendChild(lockedBlock);
      }
      lockedGrid = lockedBlock.querySelector('.badge-grid');
    }

    allBackendBadges.forEach(function (b) {
      var name = (b.name || '').trim().toLowerCase();
      if (!name || matchedNames[name]) return;

      var id = b._id ? b._id.toString() : '';
      var isEarned = earnedIds.indexOf(id) >= 0;
      var grid = isEarned ? earnedGrid : lockedGrid;
      if (!grid) return;

      var card = createBadgeCardElement(
        b,
        allBackendBadges.indexOf(b),
        earnedIds,
      );
      grid.appendChild(card);
    });

    updateSectionCounts(
      earnedBlock,
      lockedBlock,
      earnedIds,
      allBackendBadges.length,
    );

    if (
      earnedBlock &&
      earnedBlock.querySelectorAll('.badge-card--earned').length === 0
    ) {
      earnedBlock.style.display = 'none';
    }
    if (
      lockedBlock &&
      lockedBlock.querySelectorAll('.badge-card--locked').length === 0
    ) {
      lockedBlock.style.display = 'none';
    }

    sectionsEl.insertAdjacentHTML('beforeend', comingSoonHtml());
  }

  function createBadgeBlock(title, meta) {
    var div = document.createElement('div');
    div.className = 'badge-block';
    div.innerHTML = [
      '<div class="badge-section-head">',
      '<h3 class="badge-section-title">' + escapeHtml(title) + '</h3>',
      '<span class="badge-section-meta">' + escapeHtml(meta) + '</span>',
      '</div>',
      '<div class="panel">',
      '<div class="badge-grid"></div>',
      '</div>',
      '</div>',
    ].join('');
    return div;
  }

  function createBadgeCardElement(item, index, earnedIds) {
    var name = item.name || '';
    var desc = item.description || '';
    var id = item._id ? item._id.toString() : '';
    var isEarned = earnedIds.indexOf(id) >= 0;

    var card = document.createElement('button');
    card.type = 'button';
    card.className =
      'badge-card ' +
      rarityClass(index) +
      ' ' +
      (isEarned ? 'badge-card--earned' : 'badge-card--locked');
    card.setAttribute('aria-pressed', isEarned ? 'true' : 'false');

    var iconHolder = document.createElement('div');
    iconHolder.className = 'badge-icon-holder';
    iconHolder.innerHTML = renderIcon(item.badgeIcon);
    card.appendChild(iconHolder);

    var nameEl = document.createElement('strong');
    nameEl.className = 'badge-name';
    nameEl.textContent = name;
    card.appendChild(nameEl);

    var descEl = document.createElement('span');
    descEl.className = 'badge-desc';
    descEl.textContent = desc;
    card.appendChild(descEl);

    if (isEarned) {
      var label = document.createElement('span');
      label.className = 'badge-progress-label badge-earned-label';
      label.style.cssText =
        'margin-top:4px;color:var(--primary-strong);font-weight:600;';
      label.textContent = 'Earned';
      card.appendChild(label);
    }

    return card;
  }

  function updateSectionCounts(
    earnedBlock,
    lockedBlock,
    earnedIds,
    totalBackendBadges,
  ) {
    var earnedCount = earnedIds.length;
    var lockedCount = totalBackendBadges - earnedCount;

    var earnedMeta = earnedBlock
      ? earnedBlock.querySelector('.badge-section-meta')
      : null;
    var lockedMeta = lockedBlock
      ? lockedBlock.querySelector('.badge-section-meta')
      : null;

    if (earnedMeta) earnedMeta.textContent = earnedCount + ' unlocked';
    if (lockedMeta) lockedMeta.textContent = lockedCount + ' to go';
  }

  function checkBadgesLocally(badges, user) {
    var stats = {
      problemsSolved: Number(user.problemsSolved || 0),
      answers: Number(user.answers || 0),
      studyStreak: Number(user.studyStreak || 0),
      reputationScore: Number(user.reputationScore || 0),
    };
    var existingIds = getStoredEarnedIds();
    var newIds = [];
    badges.forEach(function (b) {
      var name = (b.name || '').trim().toLowerCase();
      var id = b._id ? b._id.toString() : name;
      if (!id || existingIds.indexOf(id) >= 0) return;
      var earned = false;
      if (name === 'first steps')
        earned = stats.problemsSolved > 0 || stats.reputationScore > 0;
      else if (name === 'problem solver') earned = stats.problemsSolved >= 10;
      else if (name === '7-day streak') earned = stats.studyStreak >= 7;
      else if (name === 'team player') earned = stats.answers >= 5;
      else if (name === 'top contributor')
        earned = stats.answers >= 10 || stats.reputationScore >= 100;
      if (earned) newIds.push(id);
    });
    return newIds;
  }

  function renderIcon(icon) {
    if (!icon) {
      return '<svg class="badge-icon-default" viewBox="0 0 32 32" fill="none"><path d="M16 4l3 7 7.5.7-5.7 5 1.7 7.5L16 20.7 9.5 24.2 11.2 16.7 5.5 11.7 13 11z" fill="currentColor" opacity=".85"/></svg>';
    }
    if (
      icon.startsWith('http') ||
      icon.startsWith('/') ||
      icon.startsWith('data:')
    ) {
      return '<img src="' + escapeHtml(icon) + '" alt="" class="badge-icon">';
    }
    return '<i class="' + escapeHtml(icon) + '" style="font-size:22px;"></i>';
  }

  function comingSoonHtml() {
    return [
      '<div class="badge-block badge-block-coming-soon">',
      '<div class="badge-section-head">',
      '<h3 class="badge-section-title">More Coming Soon</h3>',
      '<span class="badge-section-meta">Additional badges in development</span>',
      '</div>',
      '<div class="panel">',
      '<div style="padding:24px 20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">',
      '<p style="margin-bottom:6px;">More badges for courses, projects, contests, and community participation are being developed.</p>',
      '<p>Keep using Nibras to unlock future achievements!</p>',
      '</div>',
      '</div>',
      '</div>',
    ].join('');
  }

  function loadBadges() {
    showLoading();
    var services = window.NibrasServices;
    if (!services) return;

    var repPromise = services.reputationService
      ? services.reputationService
          .getMyReputation()
          .then(function (r) {
            return r?.data?.total ?? r?.total ?? 0;
          })
          .catch(function () {
            return 0;
          })
      : Promise.resolve(0);

    var badgesPromise = services.gamificationService
      ? services.gamificationService
          .getBadges()
          .then(function (r) {
            var data = r?.data || r || [];
            if (Array.isArray(data) && data.length > 0) return data;
            return services.gamificationService
              .getAllBadges()
              .then(function (r2) {
                var data2 = r2?.data || r2 || [];
                return Array.isArray(data2) && data2.length > 0
                  ? data2
                  : BACKEND_BADGES;
              })
              .catch(function () {
                return BACKEND_BADGES;
              });
          })
          .catch(function () {
            return services.gamificationService
              .getAllBadges()
              .then(function (r2) {
                var data2 = r2?.data || r2 || [];
                return Array.isArray(data2) && data2.length > 0
                  ? data2
                  : BACKEND_BADGES;
              })
              .catch(function () {
                return BACKEND_BADGES;
              });
          })
      : Promise.resolve(BACKEND_BADGES);

    var userPromise = services.usersService
      ? services.usersService
          .getMe()
          .then(function (r) {
            return r?.user || r || {};
          })
          .catch(function () {
            return {};
          })
      : Promise.resolve({});

    Promise.all([repPromise, userPromise, badgesPromise]).then(
      function (results) {
        var repTotal = results[0];
        var user = results[1];
        var allBadges = results[2];

        var earnedIds;
        var serverEarned = [];
        if (allBadges.length > 0 && allBadges[0].earned !== undefined) {
          allBadges.forEach(function (b) {
            if (b.earned && b._id) serverEarned.push(b._id.toString());
          });
          earnedIds = serverEarned;
        } else {
          var newIds = checkBadgesLocally(allBadges, user);
          earnedIds = addStoredEarnedIds(newIds);
        }

        renderStats(repTotal, allBadges.length, earnedIds.length);
        annotateBadges(allBadges, earnedIds);
      },
    );
  }

  function initSocketBadgeListener() {
    if (
      typeof io === 'undefined' ||
      typeof window.NIBRAS_BACKEND_URL === 'undefined'
    )
      return;
    try {
      var backendUrl = window.NIBRAS_BACKEND_URL || window.NIBRAS_API_URL || '';
      var baseUrl = backendUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
      if (!baseUrl) return;
      var socket = io(baseUrl, { transports: ['websocket', 'polling'] });
      socket.on('badge:earned', function (data) {
        var badgeName = data?.badge?.name || data?.name || 'New badge';
        var toast = document.createElement('div');
        toast.style.cssText =
          'position:fixed;bottom:24px;right:24px;z-index:99999;background:linear-gradient(135deg,#6c5ce7,#a855f7);color:#fff;padding:16px 24px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:sans-serif;display:flex;align-items:center;gap:12px;animation:slideIn 0.3s ease;max-width:380px;';
        toast.innerHTML =
          '<i class="fa-solid fa-trophy" style="font-size:1.5rem;"></i><div><strong style="font-size:1rem;display:block;">Badge Unlocked!</strong><span style="opacity:0.9;font-size:0.9rem;">' +
          badgeName +
          '</span></div>';
        document.body.appendChild(toast);
        setTimeout(function () {
          toast.style.transition = 'opacity 0.3s, transform 0.3s';
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(100px)';
          setTimeout(function () {
            toast.remove();
          }, 300);
        }, 4000);
        loadBadges();
      });
      socket.on('connect_error', function () {});
    } catch (e) {}
  }

  loadBadges();
  initSocketBadgeListener();

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
