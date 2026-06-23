window.NibrasReact.run(function () {
  console.log('[LEVEL.JS] Script started (via NibrasReact)');

  var progress = { level1: 0, level2: 0, level3: 0, level4: 0 };

  try {
    var saved = localStorage.getItem('levelProgress');
    if (saved) progress = JSON.parse(saved);
  } catch (_) {}

  var overallProgress = 0;
  var levelAccessCache = null;

  var levelOrder = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  var pathData = [
    {
      id: 1,
      title: 'Beginner Level',
      desc: 'Start your journey into computer science with fundamental concepts and programming basics.',
      topics: [
        'Introduction to Programming',
        'Variables and Data Types',
        'Control Structures',
        'Basic Algorithms',
        'Problem Solving Fundamentals',
      ],
      page: '../Courses/courses.html',
    },
    {
      id: 2,
      title: 'Intermediate Level',
      desc: 'Build upon your foundation with data structures, advanced programming concepts, and algorithm design.',
      topics: [
        'Data Structures (Arrays, Lists, Stacks)',
        'Object-Oriented Programming',
        'Algorithm Complexity (Big O)',
        'Recursion and Sorting',
        'File Handling and IO',
      ],
      page: '../Courses/courses.html',
    },
    {
      id: 3,
      title: 'Advanced Level',
      desc: 'Master advanced topics including system design, databases, networks, and software engineering principles.',
      topics: [
        'Advanced Data Structures (Trees, Graphs)',
        'Database Management Systems',
        'Computer Networking Basics',
        'Operating Systems Concepts',
        'Software Design Patterns',
      ],
      page: '../Courses/courses.html',
    },
    {
      id: 4,
      title: 'Expert Level',
      desc: 'Reach mastery with artificial intelligence, machine learning, distributed systems, and cutting-edge technologies.',
      topics: [
        'Artificial Intelligence Basics',
        'Distributed Systems',
        'Cloud Computing Architectures',
        'Advanced Algorithms Design',
        'Cyber Security Fundamentals',
      ],
      page: '../Courses/courses.html',
    },
  ];

  async function fetchLevelCompletionFromBackend() {
    var services = window.NibrasServices;
    if (!services || !services.levelsService) return null;

    try {
      var res = await services.levelsService.getProgress();
      var data = res && (res.data || res);
      if (!data || !Array.isArray(data.levels)) return null;

      var results = {};
      data.levels.forEach(function (level) {
        results[level.name] = {
          done: level.done || 0,
          total: level.total || 0,
          completed: !!level.completed,
          unlocked: !!level.unlocked,
        };
      });
      if (data.overallCompletionPercent != null) {
        overallProgress = Math.max(
          0,
          Math.min(100, Math.round(Number(data.overallCompletionPercent))),
        );
      }
      return results;
    } catch (err) {
      console.warn('[LEVEL.JS] Failed to fetch level completion data:', err);
      return null;
    }
  }

  function isLevelUnlocked(levelId, completionData) {
    if (levelId === 1) return true;

    if (completionData) {
      var levelName = levelOrder[levelId - 1];
      var current = completionData[levelName];
      if (current && current.unlocked === false) return false;
      if (current && current.unlocked === true) return true;

      var prevLevelName = levelOrder[levelId - 2];
      var prev = completionData[prevLevelName];
      if (prev && prev.total > 0) return prev.completed;
    }

    if (levelId === 2) return overallProgress >= 25;
    if (levelId === 3) return overallProgress >= 50;
    if (levelId === 4) return overallProgress >= 75;
    return false;
  }

  function getUnlockRequirement(levelId) {
    var unlocked = isLevelUnlocked(levelId, levelAccessCache);
    if (unlocked) return '';

    if (levelAccessCache) {
      var prevLevelName = levelOrder[levelId - 2];
      var prev = levelAccessCache[prevLevelName];
      if (prev && prev.total > 0) {
        return (
          'Complete all ' +
          prevLevelName +
          ' courses (' +
          prev.done +
          ' of ' +
          prev.total +
          ' completed) to unlock this level.'
        );
      }
    }

    return (
      'Reach ' +
      (levelId === 2 ? '25' : levelId === 3 ? '50' : '75') +
      '% overall progress to unlock this level.'
    );
  }

  function renderLevels() {
    var container = document.getElementById('levels-container');
    if (!container) {
      console.error('[LEVEL.JS] levels-container not found!');
      return;
    }
    container.innerHTML = '';

    pathData.forEach(function (level) {
      var unlocked = isLevelUnlocked(level.id, levelAccessCache);
      var isLocked = !unlocked;
      var cardClass = isLocked ? 'locked' : '';
      var icon = isLocked ? 'fa-solid fa-lock' : 'fa-solid fa-book-open';

      var buttonHtml = '';
      if (unlocked && level.page) {
        buttonHtml =
          '<a href="javascript:;" onclick="window.selectLevel(' +
          level.id +
          ", '" +
          level.page +
          '\')" class="btn-level-action btn-start">Start Learning</a>';
      } else if (unlocked) {
        buttonHtml =
          '<button class="btn-level-action btn-start">Start Learning</button>';
      }
      if (isLocked) {
        buttonHtml = [
          '<button class="btn-locked" onclick="window.showLockModal(' +
            level.id +
            ')">',
          '<div class="lock-overlay"><i class="fa-solid fa-lock"></i>',
          '<span>' + getUnlockRequirement(level.id) + '</span></div>',
          '</button>',
        ].join('');
      }

      var detailsHtml = '';
      if (unlocked) {
        var topicsLi = level.topics
          .map(function (t) {
            return '<li>' + t + '</li>';
          })
          .join('');
        detailsHtml = [
          '<button class="btn-toggle-details" onclick="window.toggleDetails(' +
            level.id +
            ', this)">',
          'See Level Details <i class="fa-solid fa-chevron-down"></i></button>',
          '<div class="lvl-details" id="details-' + level.id + '">',
          '<h4 class="topics-title">What you\'ll learn</h4>',
          '<ul class="topics-list">' + topicsLi + '</ul></div>',
        ].join('');
      }

      container.innerHTML += [
        '<div class="level-card ' + cardClass + '">',
        '<div class="lvl-card-header">',
        '<div class="lvl-icon-box"><i class="' + icon + '"></i></div>',
        '<div class="lvl-info"><h2>' +
          level.title +
          '</h2><p>' +
          level.desc +
          '</p></div>',
        '</div>',
        '<div class="lvl-actions">' + detailsHtml + buttonHtml + '</div>',
        '</div>',
      ].join('');
    });
  }

  function updateOverallProgressBar() {
    var completed = 0;
    [1, 2, 3, 4].forEach(function (id) {
      if (isLevelUnlocked(id, levelAccessCache)) completed++;
    });
    var pct = (completed / 4) * 100;
    var opSpan = document.querySelector('.op-header span');
    var opFill = document.querySelector('.op-fill');
    if (opSpan)
      opSpan.textContent =
        completed +
        ' of 4 levels' +
        (overallProgress > 0
          ? ' (' + overallProgress + '% course progress)'
          : '');
    if (opFill) opFill.style.width = pct + '%';
  }

  window.showLockModal = function (levelId) {
    var req = getUnlockRequirement(levelId);
    alert(
      '\uD83D\uDD12 Level Locked\n\n' +
        req +
        '\n\nCurrent Progress: ' +
        overallProgress +
        '%',
    );
  };

  window.selectLevel = function (levelId, page) {
    var levelNames = {
      1: 'Beginner',
      2: 'Intermediate',
      3: 'Advanced',
      4: 'Expert',
    };
    var levelName = levelNames[levelId] || 'Beginner';

    try {
      var u = JSON.parse(localStorage.getItem('user'));
      if (u) {
        u.selectedLevel = levelName;
        localStorage.setItem('user', JSON.stringify(u));
      }
    } catch (_) {}

    function navigate() {
      window.location.href = page;
    }

    var s = window.NibrasServices;
    if (s && s.usersService && s.usersService.updateStudyLevel) {
      s.usersService
        .updateStudyLevel(levelName)
        .then(navigate)
        .catch(navigate);
    } else {
      navigate();
    }
  };

  window.toggleDetails = function (id, btn) {
    var detailsDiv = document.getElementById('details-' + id);
    if (!detailsDiv) return;
    if (detailsDiv.classList.contains('open')) {
      detailsDiv.classList.remove('open');
      btn.innerHTML =
        'See Level Details <i class="fa-solid fa-chevron-down"></i>';
    } else {
      detailsDiv.classList.add('open');
      btn.innerHTML = 'Hide Details <i class="fa-solid fa-chevron-up"></i>';
    }
  };

  fetchLevelCompletionFromBackend()
    .then(function (completionData) {
      levelAccessCache = completionData;
    })
    .catch(function () {
      levelAccessCache = null;
    })
    .finally(function () {
      renderLevels();
      updateOverallProgressBar();
    });

  var themeBtn = document.getElementById('themeBtn');
  var themeIcon = themeBtn ? themeBtn.querySelector('i') : null;

  if (themeIcon) {
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      themeIcon.className = 'fa-regular fa-sun';
    } else {
      themeIcon.className = 'fa-regular fa-moon';
    }
    themeBtn.addEventListener('click', function () {
      var html = document.documentElement;
      var cur = html.getAttribute('data-theme');
      if (cur === 'light') {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeIcon.className = 'fa-regular fa-sun';
      } else {
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        themeIcon.className = 'fa-regular fa-moon';
      }
    });
  }

  var manualBtn = document.querySelector('.btn-manual');
  if (manualBtn) {
    manualBtn.addEventListener('click', function () {
      window.location.href = '../Courses/courses.html';
    });
  }

  console.log(
    '[LEVEL.JS] Initialization complete, overallProgress:',
    overallProgress,
  );
});
