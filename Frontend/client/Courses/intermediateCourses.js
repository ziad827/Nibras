// Initialize intermediate courses page - direct execution, no dependency on react-bootstrap.js
console.log('[INTERMEDIATE-COURSES.JS] Script started');

// --- 1. SIDEBAR ACTIVE LOGIC ---
const initSidebarLogic = () => {
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.forEach((n) => n.classList.remove('active'));
      link.classList.add('active');
    });
  });
};

// --- 2. DATA ---
let coursesData = window.NibrasCourses?.getIntermediateCoursesList?.() || [];

// --- 3. RENDER LOGIC ---
const initCoursesLogic = () => {
  const grid = document.getElementById('courses-container');
  const countBadge = document.getElementById('course-count');
  const tabs = document.querySelectorAll('.tab-btn');

  if (!grid || !countBadge) {
    console.error(
      '[INTERMEDIATE-COURSES.JS] ERROR: courses-container or course-count not found!',
    );
    return;
  }

  console.log(
    '[INTERMEDIATE-COURSES.JS] Found grid, rendering',
    coursesData.length,
    'courses',
  );

  let activeCategory = 'all';
  filterAndRender(activeCategory);

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.category;
      filterAndRender(activeCategory);
    });
  });

  hydrateCoursesFromAdmin();

  function filterAndRender(category) {
    grid.innerHTML = '';
    const filteredData = coursesData.filter((course) => {
      if (category === 'all') return true;
      return course.category === category;
    });

    if (filteredData.length === 0) {
      countBadge.textContent = '0';
      grid.innerHTML =
        '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">No Intermediate courses in this category yet.</div>';
      return;
    }

    countBadge.textContent = filteredData.length;
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
      ? `<span class="badge-popular">POPULAR</span>`
      : '';
    const href =
      window.NibrasCourses?.withCourseId?.(
        './Course Description/courseContent.html',
        course.id,
      ) || './Course Description/courseContent.html';
    const html = `
            <div class="course-card">
                <div class="card-header"><div><h3>${course.title}</h3><span class="instructor">${course.instructor}</span></div>${popularBadge}</div>
                <div class="progress-section"><div class="progress-label"><span>Progress</span><span>${course.progress}%</span></div><div class="progress-track"><div class="progress-fill" style="width: ${course.progress}%"></div></div></div>
                <div class="meta-info"><div class="rating"><i class="fa-solid fa-star"></i> ${course.rating} / 5</div><span class="level-tag">${course.level}</span></div>
                <div class="deadline-info"><i class="fa-regular fa-file-lines"></i> ${course.deadline}</div>
                <a href="${href}" class="btn-continue">Continue Learning</a>
            </div>`;
    grid.innerHTML += html;
  }

  function renderPracticeCard(course) {
    const html = `
            <div class="course-card">
                <div class="card-header"><div><h3>${course.title}</h3><span class="instructor">${course.instructor}</span></div><div style="display:flex; gap:5px"><span class="badge-practice">Practice-Focused</span><span class="badge-popular">POPULAR</span></div></div>
                <div class="practice-features"><p>Practice curated Codeforces problems with AI guidance, timed labs, and performance analytics.</p>${course.features.map((f) => `<li><i class="fa-solid fa-check"></i> ${f}</li>`).join('')}</div>
                <div class="problem-count"><i class="fa-regular fa-file-lines"></i> ${course.deadline}</div>
                <a href="${course.page}" class="btn-continue">Start Practice</a>
            </div>`;
    grid.innerHTML += html;
  }

  async function hydrateCoursesFromAdmin() {
    // Step 1: Get admin merged courses (preserves local IDs for navigation)
    const loadAdminCourses = window.NibrasCourses?.getAdminCoursesList;
    if (typeof loadAdminCourses !== 'function') return;

    try {
      const adminCourses = await loadAdminCourses();
      if (!Array.isArray(adminCourses) || !adminCourses.length) return;

      const mappedCourses = adminCourses.filter(
        (c) =>
          (c.adminCourseId || c.backendCourseId || c.remoteCourseId) &&
          c.level === 'Intermediate',
      );

      // Fetch real progress for each mapped course
      const coursesService = window.NibrasServices?.coursesService;
      if (coursesService && typeof coursesService.getProgress === 'function') {
        const progressResults = await Promise.allSettled(
          mappedCourses.map((c) => {
            const bid =
              c.adminCourseId || c.backendCourseId || c.remoteCourseId;
            return bid
              ? coursesService.getProgress(bid)
              : Promise.resolve(null);
          }),
        );
        mappedCourses.forEach((c, i) => {
          const result = progressResults[i];
          if (result.status === 'fulfilled' && result.value) {
            const pct =
              result.value?.data?.percentage ??
              result.value?.percentage ??
              result.value?.data?.overallPercentage;
            if (Number.isFinite(Number(pct))) {
              c.progress = Math.max(0, Math.min(100, Math.round(Number(pct))));
            }
          }
        });
      }

      // Step 2: Add unmapped backend courses with Intermediate level
      const backendCourses = {};
      if (coursesService && typeof coursesService.list === 'function') {
        try {
          const response = await coursesService.list({ page: 1, limit: 100 });
          const rawList = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.courses)
              ? response.data.courses
              : Array.isArray(response?.courses)
                ? response.courses
                : [];
          rawList.forEach((c) => {
            const bid = c?._id || c?.id;
            if (bid) backendCourses[bid] = c;
          });
        } catch (_) {}
      }

      mappedCourses.forEach((c) => {
        const bid = c.adminCourseId || c.backendCourseId || c.remoteCourseId;
        if (bid && backendCourses[bid]) delete backendCourses[bid];
      });

      coursesData = mappedCourses;
      filterAndRender(activeCategory);
    } catch (error) {
      console.warn(
        '[INTERMEDIATE-COURSES.JS] Failed to hydrate:',
        error?.message || error,
      );
    }
  }
};

// --- 4. THEME TOGGLE (WITH LOGO SWAP) ---
const initThemeToggle = () => {
  const themeBtn = document.getElementById('themeBtn');
  if (!themeBtn) return;

  const themeIcon = themeBtn.querySelector('i');
  const appLogo = document.getElementById('app-logo');

  // Check initial state
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    themeIcon.className = 'fa-regular fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  }

  themeBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');

    if (current === 'light') {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      themeIcon.className = 'fa-regular fa-sun';
      if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
    } else {
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      themeIcon.className = 'fa-regular fa-moon';
      if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
    }
  });
};

// --- 5. SEARCH ---
const initSearch = () => {
  const searchInput = document.getElementById('course-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.course-card');
    cards.forEach((card) => {
      const title = card.querySelector('h3').textContent.toLowerCase();
      card.style.display = title.includes(term) ? 'flex' : 'none';
    });
  });
};

// --- 6. BACK BUTTON ---
const initBackButton = () => {
  const backLink = document.querySelector('.back-link');
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.back();
    });
  }
};

// --- 7. MAIN INITIALIZATION ---
function initIntermediateCourses() {
  console.log('[INTERMEDIATE-COURSES.JS] Initializing page');

  initSidebarLogic();
  initCoursesLogic();
  initThemeToggle();
  initSearch();
  initBackButton();

  console.log('[INTERMEDIATE-COURSES.JS] Initialization complete');
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIntermediateCourses);
} else {
  initIntermediateCourses();
}
