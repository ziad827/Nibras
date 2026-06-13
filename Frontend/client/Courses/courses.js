console.log('[COURSES.JS] Script started (direct execution)');

// Redirect instructors to instructor courses page
(function () {
  try {
    var _u = JSON.parse(localStorage.getItem('user') || '{}');
    var _r = String(_u?.role?.name || _u?.role || '').toLowerCase();
    if (_r === 'instructor') {
      window.location.replace('./instructor-courses.html');
    }
  } catch (_) {}
})();

let coursesData = [];
let currentLevel = null;

async function initCourses() {
  console.log('[COURSES.JS] Initializing courses page');

  var storedUser = null;
  try {
    storedUser = JSON.parse(localStorage.getItem('user'));
  } catch (_) {}

  var levelFromStorage = storedUser?.selectedLevel || null;

  if (!levelFromStorage) {
    var levelFetched = false;
    try {
      var token2 = localStorage.getItem('token');
      if (!token2) {
        window.location.replace('../Login/loginPage/login.html');
        return;
      }
      var apiBase =
        window.NibrasShared?.resolveServiceUrl?.('admin') ||
        window.NIBRAS_API_URL ||
        'https://nibras-backend.up.railway.app/api';
      var resp = await fetch(apiBase.replace(/\/+$/, '') + '/auth/me', {
        headers: { Authorization: 'Bearer ' + token2 },
      });
      if (resp.ok) {
        var data = await resp.json();
        var userData = data?.user || data?.data?.user || data?.data || {};
        if (userData.selectedLevel) {
          var merged = storedUser || {};
          merged.selectedLevel = userData.selectedLevel;
          if (userData.name) merged.name = userData.name;
          if (userData.email) merged.email = userData.email;
          if (userData.role) merged.role = userData.role;
          localStorage.setItem('user', JSON.stringify(merged));
          levelFromStorage = userData.selectedLevel;
          levelFetched = true;
        }
      }
    } catch (_) {}
    if (!levelFetched) {
      window.location.replace('../Levels/level.html');
      return;
    }
  }

  currentLevel = levelFromStorage;

  var levelTitleEl = document.getElementById('page-level-title');
  if (levelTitleEl) {
    levelTitleEl.textContent = currentLevel + ' Courses';
  }
  var levelBadgeEl = document.getElementById('page-level-badge');
  if (levelBadgeEl) {
    levelBadgeEl.textContent = currentLevel;
  }

  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.forEach((n) => n.classList.remove('active'));
      link.classList.add('active');
    });
  });

  const grid = document.getElementById('courses-container');
  const countBadge = document.getElementById('course-count');
  const tabs = document.querySelectorAll('.tab-btn');

  if (!grid) {
    console.error('[COURSES.JS] ERROR: courses-container not found!');
    return;
  }

  console.log(
    '[COURSES.JS] Found container, rendering courses for level:',
    currentLevel,
  );
  let activeCategory = 'all';

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.category;
      filterAndRender(activeCategory);
    });
  });

  var mappedCoursesAll = [];

  hydrateCoursesFromAdmin(currentLevel);

  function checkLevelComplete() {
    var banner = document.getElementById('level-complete-banner');
    var msgEl = document.getElementById('banner-message');
    var btn = document.getElementById('btn-next-level');
    if (!banner || !msgEl || !btn) return;

    var incomplete = mappedCoursesAll.filter(function (c) {
      if (c.type === 'practice_lab') return false;
      var p = Number(c.progress);
      if (!Number.isFinite(p)) return false;
      return p < 100;
    });

    if (incomplete.length > 0 || mappedCoursesAll.length === 0) {
      banner.style.display = 'none';
      return;
    }

    var levelOrder = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    var currentIdx = levelOrder.indexOf(currentLevel);
    if (currentIdx === -1 || currentIdx >= levelOrder.length - 1) {
      banner.style.display = 'none';
      return;
    }

    var dismissedKey = 'nibras_level_complete_dismissed_' + currentLevel;
    if (localStorage.getItem(dismissedKey) === '1') {
      banner.style.display = 'none';
      return;
    }

    var nextLevel = levelOrder[currentIdx + 1];
    msgEl.textContent =
      "You've completed all " +
      currentLevel +
      ' courses! Ready for ' +
      nextLevel +
      '?';
    btn.onclick = function () {
      var s = window.NibrasServices;
      if (s && s.coursesService && s.coursesService.updateLevel) {
        btn.disabled = true;
        btn.textContent = 'Updating...';
        s.coursesService
          .updateLevel(nextLevel)
          .then(function () {
            try {
              var u = JSON.parse(localStorage.getItem('user'));
              if (u) {
                u.selectedLevel = nextLevel;
                localStorage.setItem('user', JSON.stringify(u));
              }
            } catch (_) {}
            window.location.href = '../Levels/level.html';
          })
          .catch(function () {
            window.location.href = '../Levels/level.html';
          });
      } else {
        window.location.href = '../Levels/level.html';
      }
    };
    banner.style.display = 'flex';
  }

  var dismissBtn = document.getElementById('banner-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', function () {
      var banner = document.getElementById('level-complete-banner');
      if (banner) banner.style.display = 'none';
      try {
        localStorage.setItem(
          'nibras_level_complete_dismissed_' + currentLevel,
          '1',
        );
      } catch (_) {}
    });
  }

  function filterAndRender(category) {
    grid.innerHTML = '';
    const filteredData = coursesData.filter((course) => {
      if (category === 'all') return true;
      return course.category === category;
    });
    countBadge.textContent = filteredData.length;
    console.log(
      '[COURSES.JS] Rendering ' +
        filteredData.length +
        ' courses for category: ' +
        category,
    );
    filteredData.forEach((course) => {
      if (course.type === 'practice_lab') {
        renderPracticeCard(course);
      } else {
        renderStandardCard(course);
      }
    });
  }

  function renderStandardCard(course) {
    const popularBadge = course.isPopular
      ? '<span class="badge-popular">POPULAR</span>'
      : '';
    const coursePage =
      window.NibrasCourses?.withCourseId?.(
        './Course Description/courseContent.html',
        course.id,
      ) || './Course Description/courseContent.html';
    const buttonHTML =
      '<a href="' + coursePage + '" class="btn-continue">Continue Learning</a>';

    var html = [
      '<div class="course-card">',
      '<div class="card-header"><div><h3>' +
        course.title +
        '</h3><span class="instructor">' +
        course.instructor +
        '</span></div>' +
        popularBadge +
        '</div>',
      '<div class="progress-section"><div class="progress-label"><span>Progress</span><span>' +
        course.progress +
        '%</span></div><div class="progress-track"><div class="progress-fill" style="width: ' +
        course.progress +
        '%"></div></div></div>',
      '<div class="meta-info"><div class="rating"><i class="fa-solid fa-star"></i> ' +
        course.rating +
        ' / 5</div><span class="level-tag">' +
        course.level +
        '</span></div>',
      '<div class="deadline-info"><i class="fa-regular fa-file-lines"></i> ' +
        course.deadline +
        '</div>',
      buttonHTML,
      '</div>',
    ].join('');
    grid.innerHTML += html;
  }

  function renderPracticeCard(course) {
    const pageLink = course.page || '../Competitions/Practice/practice.html';
    var html = [
      '<div class="course-card">',
      '<div class="card-header"><div><h3>' +
        course.title +
        '</h3><span class="instructor">' +
        course.instructor +
        '</span></div><div style="display:flex; gap:5px"><span class="badge-practice">Practice-Focused</span><span class="badge-popular">POPULAR</span></div></div>',
      '<div class="practice-features"><p>Practice curated Codeforces problems with AI guidance, timed labs, and performance analytics.</p>',
      course.features
        .map(function (f) {
          return '<li><i class="fa-solid fa-check"></i> ' + f + '</li>';
        })
        .join(''),
      '</div>',
      '<div class="problem-count"><i class="fa-regular fa-file-lines"></i> ' +
        course.deadline +
        '</div>',
      '<a href="' + pageLink + '" class="btn-continue">Start Practice</a>',
      '</div>',
    ].join('');
    grid.innerHTML += html;
  }

  async function hydrateCoursesFromAdmin(level) {
    var levelFilter = level || 'Beginner';

    var loadAdminCourses = window.NibrasCourses?.getAdminCoursesList;
    if (typeof loadAdminCourses !== 'function') return;

    try {
      var adminCourses = await loadAdminCourses();
      if (!Array.isArray(adminCourses) || !adminCourses.length) return;

      var mappedCourses = adminCourses.filter(function (c) {
        return (
          (c.adminCourseId || c.backendCourseId || c.remoteCourseId) &&
          c.level === levelFilter
        );
      });

      var coursesService = window.NibrasServices?.coursesService;
      if (coursesService && typeof coursesService.getProgress === 'function') {
        var progressResults = await Promise.allSettled(
          mappedCourses.map(function (c) {
            var bid = c.adminCourseId || c.backendCourseId || c.remoteCourseId;
            return bid
              ? coursesService.getProgress(bid)
              : Promise.resolve(null);
          }),
        );
        mappedCourses.forEach(function (c, i) {
          var result = progressResults[i];
          if (result.status === 'fulfilled' && result.value) {
            var pct =
              result.value?.data?.percentage ??
              result.value?.percentage ??
              result.value?.data?.overallPercentage;
            if (Number.isFinite(Number(pct))) {
              c.progress = Math.max(0, Math.min(100, Math.round(Number(pct))));
            }
          }
          if (
            c.progress === undefined ||
            c.progress === null ||
            c.progress === 0
          ) {
            try {
              var uid = '';
              try {
                var u = JSON.parse(localStorage.getItem('user'));
                uid = u?._id || u?.id || '';
              } catch (_) {}
              var localKey = 'nibras_course_progress_' + uid + '_' + c.id;
              var stored = JSON.parse(localStorage.getItem(localKey) || '{}');
              if (stored.percentage > 0) c.progress = stored.percentage;
            } catch (_) {}
          }
        });
      }

      var backendCourses = {};
      if (coursesService && typeof coursesService.getByLevel === 'function') {
        try {
          var response = await coursesService.getByLevel(levelFilter);
          var rawList = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.courses)
              ? response.data.courses
              : Array.isArray(response?.courses)
                ? response.courses
                : [];
          rawList.forEach(function (c) {
            var bid = c?._id || c?.id;
            if (bid) backendCourses[bid] = c;
          });
        } catch (_) {}
      }

      mappedCourses.forEach(function (c) {
        var bid = c.adminCourseId || c.backendCourseId || c.remoteCourseId;
        if (bid && backendCourses[bid]) delete backendCourses[bid];
      });

      var extraCourses = Object.values(backendCourses).map(function (course) {
        return {
          id: course?._id || course?.id,
          title: course?.title || 'Untitled',
          instructor:
            course?.instructor?.name || course?.instructorName || 'Instructor',
          progress: 0,
          rating: 0,
          level: course?.level || levelFilter,
          deadline: 'No deadline set',
          isPopular: false,
          category: (course?.category || 'core').toLowerCase(),
          type: course?.type || 'standard',
        };
      });

      coursesData = mappedCourses.concat(extraCourses);
      mappedCoursesAll = mappedCourses.concat(extraCourses);
      filterAndRender(activeCategory);
      checkLevelComplete();
    } catch (error) {
      console.warn('[COURSES.JS] Failed to hydrate:', error?.message || error);
    }
  }

  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn?.querySelector('i');
  const appLogo = document.getElementById('app-logo');

  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    if (themeIcon) themeIcon.className = 'fa-regular fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
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
      var current = html.getAttribute('data-theme');

      if (current === 'light') {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (themeIcon) themeIcon.className = 'fa-regular fa-sun';
        if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
      } else {
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
        if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
      }
    });
  }

  var searchInput = document.getElementById('course-search');
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      var term = e.target.value.toLowerCase();
      var cards = document.querySelectorAll('.course-card');
      cards.forEach(function (card) {
        var title = card.querySelector('h3').textContent.toLowerCase();
        card.style.display = title.indexOf(term) !== -1 ? 'flex' : 'none';
      });
    });
  }

  console.log('[COURSES.JS] Initialization complete for level:', currentLevel);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCourses);
} else {
  initCourses();
}
