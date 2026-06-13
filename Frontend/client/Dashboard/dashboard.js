console.log('[DASHBOARD.JS] Script started (direct execution)');

// Role-based routing and sidebar gating
(function () {
  try {
    var _user = JSON.parse(localStorage.getItem('user') || '{}');
    var _role = String(_user?.role?.name || _user?.role || '').toLowerCase();
    if (_role === 'instructor') {
      window.location.replace('./instructor-dashboard.html');
    }
    if (_role === 'admin' || _role === 'super-admin') {
      window.location.replace('../Admin/Dashboard/dashboard.html');
    }
  } catch (_) {}
})();

// Gate sidebar nav items based on user role
(function () {
  try {
    var _user = JSON.parse(localStorage.getItem('user') || '{}');
    var _role = String(_user?.role?.name || _user?.role || '').toLowerCase();
    var adminOnlySelectors = ['a[href*="/Admin/"]', 'a[href*="admin-"]'];
    var isAdmin = _role === 'super-admin' || _role === 'admin';
    if (!isAdmin) {
      adminOnlySelectors.forEach(function (selector) {
        document.querySelectorAll(selector).forEach(function (el) {
          var li = el.closest('.nav-item');
          if (li) li.style.display = 'none';
        });
      });
    }
  } catch (_) {}
})();

// --- 2. BACKEND DATA ---
let savedGPA = localStorage.getItem('calculatedGPA');
let selectedCourseId = localStorage.getItem('selectedCourseId') || '';
let dashboardData = {};

// Helper to resolve tracking service base URL
function getTrackingBaseUrl() {
  const shared = window.NibrasShared || {};
  return (
    (typeof shared.resolveServiceUrl === 'function'
      ? shared.resolveServiceUrl('tracking')
      : null) ||
    window.NibrasApi?.resolveServiceUrl?.('tracking') ||
    window.NibrasApiConfig?.getServiceUrl?.('tracking') ||
    window.NIBRAS_TRACKING_API_URL ||
    window.NIBRAS_API_URL ||
    (/^https?:/i.test(window.location?.origin || '')
      ? window.location.origin.replace(/\/+$/, '')
      : '')
  );
}

// Helper to create a requestJson function for tracking service
function createTrackingRequestJson() {
  const shared = window.NibrasShared || {};
  return shared.apiFetch
    ? shared.apiFetch.bind(shared)
    : async (path, options = {}) => {
        const headers = Object.assign(
          { 'Content-Type': 'application/json' },
          options.headers || {},
        );
        const token =
          shared?.auth?.getToken?.() || window.NibrasApi?.getToken?.() || null;
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const baseUrl = getTrackingBaseUrl();
        const response = await fetch(`${baseUrl}${path}`, {
          method: options.method || 'GET',
          headers,
          body: options.body,
        });
        const payload = await response.json();
        if (!response.ok) {
          const error = new Error(
            payload?.message || `Request failed (${response.status})`,
          );
          error.status = response.status;
          error.payload = payload;
          throw error;
        }
        return payload;
      };
}

// Resolve user name: competitions user.name first, then tracking session, then hardcoded default
async function resolveUserName() {
  // Check competitions user object first (has .name field from competitions login)
  try {
    const competitionsUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (competitionsUser && competitionsUser.name) {
      return competitionsUser.name.split(' ')[0];
    }
  } catch (_) {}

  // Check nibras/tracking cached user
  try {
    const cachedUser = JSON.parse(
      localStorage.getItem('nibras_user') || 'null',
    );
    if (cachedUser && cachedUser.login) {
      return cachedUser.login;
    }
  } catch (_) {}

  // Try fetching from tracking session service
  try {
    const requestJson = createTrackingRequestJson();
    const sessionData = await requestJson('/v1/web/session', { method: 'GET' });
    if (sessionData && sessionData.login) {
      localStorage.setItem('nibras_user', JSON.stringify(sessionData));
      return sessionData.login;
    }
  } catch (err) {
    console.warn(
      '[DASHBOARD.JS] Could not fetch tracking session:',
      err.message,
    );
  }

  return 'Student';
}

// Load courses for switcher and fetch dashboard data
async function loadCourseSwitcher() {
  try {
    const requestJson = createTrackingRequestJson();
    const courses = await requestJson('/v1/tracking/courses', {
      method: 'GET',
    });
    const courseList = Array.isArray(courses) ? courses : [];
    const selector = document.getElementById('course-switcher');
    if (!selector) return;
    // Clear existing options except the first "All Courses"
    selector.innerHTML = '<option value="">All Courses</option>';
    courseList.forEach((course) => {
      const option = document.createElement('option');
      option.value = course.id || course._id || '';
      option.textContent = course.title || course.name || 'Untitled Course';
      selector.appendChild(option);
    });
    // Set selected course if matches localStorage
    if (selectedCourseId) {
      selector.value = selectedCourseId;
    }
  } catch (error) {
    console.warn('[DASHBOARD.JS] Failed to load courses for switcher:', error);
  }
}

async function fetchDashboardData(courseId) {
  const requestJson = createTrackingRequestJson();
  let path = '/v1/tracking/dashboard/student';
  if (courseId) {
    path += `?courseId=${encodeURIComponent(courseId)}`;
  }
  return await requestJson(path, { method: 'GET' });
}

// Fetch from new courses backend (GitHub backend: Dummy-Nibras)
async function fetchDashboardFromCoursesBackend() {
  const coursesService = window.NibrasServices?.coursesService;
  if (!coursesService) {
    throw new Error('Courses service unavailable');
  }

  var currentUserLevel = 'Beginner';
  try {
    var u = JSON.parse(localStorage.getItem('user'));
    if (u && u.selectedLevel) currentUserLevel = u.selectedLevel;
  } catch (_) {}
  var currentLevelLower = currentUserLevel.toLowerCase();

  if (typeof coursesService.getDashboard === 'function') {
    try {
      const response = await coursesService.getDashboard();
      if (response?.success && response?.data) {
        var dashData = response.data;
        var dashCourses = dashData.courses || [];
        var filteredDash = dashCourses.filter(function (c) {
          return (c.level || '').toLowerCase() === currentLevelLower;
        });
        if (dashData.stats)
          dashData.stats.coursesEnrolled = filteredDash.length;
        if (dashData.courses) dashData.courses = filteredDash;
        return dashData;
      }
    } catch (error) {
      console.warn(
        '[DASHBOARD.JS] /courses/my-dashboard unavailable, falling back to list/global progress:',
        error?.message || error,
      );
    }
  }

  if (typeof coursesService.list !== 'function') {
    throw new Error('Courses list endpoint unavailable');
  }

  const coursesResponse = await coursesService.list({ page: 1, limit: 100 });
  const courses = Array.isArray(coursesResponse?.data)
    ? coursesResponse.data
    : Array.isArray(coursesResponse?.data?.courses)
      ? coursesResponse.data.courses
      : Array.isArray(coursesResponse?.courses)
        ? coursesResponse.courses
        : [];

  let overallProgress = 0;
  if (typeof coursesService.getGlobalProgress === 'function') {
    try {
      const globalProgressResponse = await coursesService.getGlobalProgress();
      const progressPayload =
        globalProgressResponse?.data || globalProgressResponse || {};
      const value = Number(progressPayload.overallPercentage);
      if (Number.isFinite(value)) {
        overallProgress = Math.max(0, Math.min(100, Math.round(value)));
      }
    } catch (error) {
      console.warn(
        '[DASHBOARD.JS] /courses/progress/global unavailable:',
        error?.message || error,
      );
    }
  }

  var levelCourses = courses.filter(function (c) {
    return (c.level || '').toLowerCase() === currentLevelLower;
  });

  if (overallProgress === 0 && levelCourses.length > 0) {
    var totalPct = 0;
    var countWithProgress = 0;
    levelCourses.forEach(function (c) {
      try {
        var uid2 = '';
        try {
          var u2 = JSON.parse(localStorage.getItem('user'));
          uid2 = u2?._id || u2?.id || '';
        } catch (_) {}
        var localKey = 'nibras_course_progress_' + uid2 + '_' + (c.id || c._id);
        var stored = JSON.parse(localStorage.getItem(localKey) || '{}');
        if (stored.percentage > 0) {
          totalPct += stored.percentage;
          countWithProgress++;
        }
      } catch (_) {}
    });
    if (countWithProgress > 0) {
      overallProgress = Math.round(totalPct / countWithProgress);
    }
  }

  return {
    stats: {
      coursesEnrolled: levelCourses.length,
      overallProgress,
    },
    courses: levelCourses.map((course) => ({
      _id: course?._id || course?.id || '',
      title: course?.title || course?.name || 'Untitled Course',
      assignmentsCount: Array.isArray(course?.assignments)
        ? course.assignments.length
        : Number.isFinite(Number(course?.assignmentsCount))
          ? Number(course.assignmentsCount)
          : 0,
    })),
  };
}

// Transform courses backend response to match dashboard format
function transformCoursesDashboardToDashboard(response) {
  const { stats = {}, courses = [] } = response;
  return {
    projects: courses.map((course) => ({
      id: course._id || course.id,
      title: course.title,
      stats: {
        total: course.assignmentsCount || 0,
        approved: 0,
      },
      milestones: [],
    })),
    stats: {
      coursesEnrolled: stats.coursesEnrolled || courses.length,
      overallProgress: stats.overallProgress || 0,
    },
  };
}

// Initialize user session display on page load
function initUserSession() {
  const session = window.NibrasShared?.session;
  if (session && typeof session.updateUserInfoDisplay === 'function') {
    session.updateUserInfoDisplay();
  }
}

function initDashboard() {
  console.log('[DASHBOARD.JS] Initializing dashboard page');

  // Initialize user session display (avatar, name, role)
  initUserSession();

  // --- 1. SIDEBAR LOGIC ---
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      navLinks.forEach((n) => n.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // --- 2. FETCH USER NAME FROM API ---
  resolveUserName()
    .then((name) => {
      dashboardData.user = name;
      const welcomeMsg = document.getElementById('welcome-msg');
      if (welcomeMsg) {
        welcomeMsg.textContent = `Welcome back, ${name}!`;
      }
    })
    .catch(() => {
      // Silent fail — default name already set
    });

  // NOTE: renderDashboard is called by the async data fetcher, not here
  // This initDashboard function only handles UI setup (sidebar, theme, etc.)

  // --- 5. THEME TOGGLE ---
  console.log('[DASHBOARD.JS] Theme toggle section starting...');

  // Ensure theme is set on page load
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
  console.log(
    '[DASHBOARD.JS] Theme after load:',
    document.documentElement.getAttribute('data-theme'),
  );

  const themeBtn = document.getElementById('themeBtn');
  console.log('[DASHBOARD.JS] themeBtn found:', !!themeBtn);

  const themeIcon = themeBtn?.querySelector('i');
  const appLogo = document.getElementById('app-logo');

  if (themeBtn) {
    themeBtn.classList.remove('rotating');
    void themeBtn.offsetWidth;
  }

  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  if (currentTheme === 'dark') {
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
    if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  }

  if (themeBtn) {
    console.log('[DASHBOARD.JS] Attaching click listener to themeBtn');
    themeBtn.addEventListener('click', () => {
      console.log('[DASHBOARD.JS] Theme button clicked!');
      // Rotation animation
      themeBtn.classList.add('rotating');
      setTimeout(() => {
        themeBtn.classList.remove('rotating');
      }, 500);

      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const newTheme = current === 'light' ? 'dark' : 'light';

      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);

      if (newTheme === 'dark') {
        if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
        if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
      } else {
        if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
        if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
      }
    });
  }

  console.log('[DASHBOARD.JS] Initialization complete');
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

function renderDashboard(data) {
  if (!data || !data.stats) {
    console.warn(
      '[DASHBOARD.JS] renderDashboard called with invalid data:',
      data,
    );
    return;
  }

  const welcomeMsg = document.getElementById('welcome-msg');
  if (!welcomeMsg) {
    console.error('[DASHBOARD.JS] ERROR: welcome-msg not found!');
    return;
  }

  welcomeMsg.textContent = `Welcome back, ${data.user}!`;

  // Render Stats
  const statsContainer = document.getElementById('stats-container');
  statsContainer.innerHTML = '';

  data.stats.forEach((stat) => {
    let bgVar, textVar;
    if (stat.color === 'pink') {
      bgVar = 'var(--stat-icon-bg-pink)';
      textVar = 'var(--stat-icon-text-pink)';
    }
    if (stat.color === 'orange') {
      bgVar = 'var(--stat-icon-bg-orange)';
      textVar = 'var(--stat-icon-text-orange)';
    }
    if (stat.color === 'green') {
      bgVar = 'var(--stat-icon-bg-green)';
      textVar = 'var(--stat-icon-text-green)';
    }
    if (stat.color === 'blue') {
      bgVar = 'var(--stat-icon-bg-blue)';
      textVar = 'var(--stat-icon-text-blue)';
    }
    if (stat.color === 'purple') {
      bgVar = 'var(--stat-icon-bg-purple)';
      textVar = 'var(--stat-icon-text-purple)';
    }

    const pointerClass = stat.isClickable ? 'cursor-pointer' : '';
    const idAttr = stat.id ? `id="${stat.id}"` : '';
    const valueId = stat.id ? `id="${stat.id}-value"` : '';

    statsContainer.innerHTML += `
            <div class="stat-card ${pointerClass}" ${idAttr} data-color="${stat.color}">
                <div class="stat-info">
                    <span>${stat.label}</span>
                    <h2 ${valueId}>${stat.value}</h2>
                </div>
                <div class="stat-icon" style="background-color: ${bgVar}; color: ${textVar}">
                    <i class="${stat.icon}"></i>
                </div>
            </div>
        `;
  });

  // Animate stat counters with stagger
  var statValues = statsContainer.querySelectorAll('.stat-info h2');
  statValues.forEach(function (el, i) {
    setTimeout(function () {
      animateCounter(el, 700);
    }, i * 100);
  });

  console.log('[DASHBOARD.JS] Rendered stats and dashboard');
  initGPAModal();
  renderLists(data);
  renderMilestones(data.milestones);
}

function renderLists(data) {
  // Progress
  const progContainer = document.getElementById('progress-container');
  progContainer.innerHTML = '';
  data.progress.forEach((prog) => {
    progContainer.innerHTML += `<div class="prog-item"><div class="prog-header"><span>${prog.subject}</span><span class="prog-percent">${prog.percent}%</span></div><div class="prog-track"><div class="prog-fill" style="width: ${prog.percent}%"></div></div></div>`;
  });

  // Deadlines
  const deadContainer = document.getElementById('deadlines-container');
  deadContainer.innerHTML = '';
  data.deadlines.forEach((item) => {
    deadContainer.innerHTML += `<div class="deadline-item"><i class="fa-solid fa-circle bullet"></i><div class="deadline-details"><h4>${item.title}</h4><span class="course-code">${item.code}</span><span class="due-date">${item.date}</span></div></div>`;
  });

  // Achievements
  const achieveContainer = document.getElementById('achievements-container');
  achieveContainer.innerHTML = '';
  data.achievements.forEach((item) => {
    achieveContainer.innerHTML += `<div class="achieve-item"><i class="${item.icon} achieve-icon"></i><span class="achieve-text">${item.title}</span></div>`;
  });
}

// Render Milestones
function renderMilestones(milestones) {
  const container = document.getElementById('milestone-container');
  container.innerHTML = '';

  milestones.forEach((ms) => {
    let statusClass = 'status-track';
    if (ms.status === 'Reviewing' || ms.completed > 90)
      statusClass = 'status-completed';
    if (ms.status === 'At Risk') statusClass = 'status-atrisk';

    container.innerHTML += `
            <div class="milestone-item">
                <div class="ms-header">
                    <span class="ms-title">${ms.title}</span>
                    <span class="ms-percentage">${ms.completed}%</span>
                </div>
                <div class="ms-bar-track">
                    <div class="ms-bar-fill" style="width: ${ms.completed}%; background-color: ${ms.color}"></div>
                </div>
                <div class="ms-meta">
                    <span class="ms-status ${statusClass}">${ms.status}</span>
                    <span>Due: ${ms.due}</span>
                </div>
            </div>
        `;
  });
}

// --- 4. GPA CALCULATOR LOGIC ---
function initGPAModal() {
  const gpaBox = document.getElementById('gpa-box');
  const gpaModal = document.getElementById('gpaModal');
  const closeBtn = document.getElementById('closeGpaModal');
  const addCourseBtn = document.getElementById('addCourseBtn');
  const calculateBtn = document.getElementById('calculateGpaBtn');
  const courseInputs = document.getElementById('courseInputs');
  const gpaResult = document.getElementById('gpaResult');
  const gpaResultValue = document.getElementById('gpaResultValue');
  const gpaResultDetails = document.getElementById('gpaResultDetails');

  if (!gpaBox) return;

  gpaBox.addEventListener('click', () => {
    gpaModal.style.display = 'flex';
  });
  closeBtn.addEventListener('click', () => {
    gpaModal.style.display = 'none';
  });
  window.addEventListener('click', (e) => {
    if (e.target === gpaModal) gpaModal.style.display = 'none';
  });

  addCourseBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'course-input-row';
    row.innerHTML = `
            <input type="text" placeholder="Course Name" class="course-name">
            <select class="course-grade">
                <option value="" disabled selected>Grade</option>
                <option value="4.0">A</option>
                <option value="3.7">A-</option>
                <option value="3.3">B+</option>
                <option value="3.0">B</option>
                <option value="2.7">B-</option>
                <option value="2.3">C+</option>
                <option value="2.0">C</option>
                <option value="1.7">C-</option>
                <option value="1.0">D</option>
                <option value="0.0">F</option>
            </select>
            <input type="number" placeholder="Credits" class="course-credits" min="1" max="6">
        `;
    courseInputs.appendChild(row);
  });

  calculateBtn.addEventListener('click', () => {
    const rows = document.querySelectorAll('.course-input-row');
    let totalPoints = 0,
      totalCredits = 0,
      count = 0;

    rows.forEach((row) => {
      const grade = parseFloat(row.querySelector('.course-grade').value);
      const credits = parseInt(row.querySelector('.course-credits').value);
      if (!isNaN(grade) && !isNaN(credits) && credits > 0) {
        totalPoints += grade * credits;
        totalCredits += credits;
        count++;
      }
    });

    if (count === 0 || totalCredits === 0) {
      alert('Please enter valid data.');
      return;
    }

    const finalGPA = (totalPoints / totalCredits).toFixed(2);
    gpaResultValue.textContent = finalGPA;
    gpaResultDetails.innerHTML = `<span>${count} Courses</span> <span>${totalCredits} Credits</span>`;
    gpaResult.style.display = 'block';
    document.getElementById('gpa-box-value').textContent = `${finalGPA}/4.0`;
    localStorage.setItem('calculatedGPA', finalGPA);
    savedGPA = finalGPA;
  });
}

async function fetchGPAFromBackend() {
  try {
    var user = JSON.parse(localStorage.getItem('user'));
    var userId = user?._id || user?.id || user?.userId;
    if (!userId) return;
    var svc = window.NibrasServices?.backendAnalyticsService;
    if (!svc || typeof svc.getStudentPerformance !== 'function') return;
    var res = await svc.getStudentPerformance(userId);
    var data = res?.data || res || {};
    var gradeSummary = data.coursesGradeSummary || [];
    var grades = gradeSummary
      .map(function (c) {
        return c.weightedGrade;
      })
      .filter(function (g) {
        return g > 0;
      });
    if (grades.length > 0) {
      var avg =
        grades.reduce(function (a, b) {
          return a + b;
        }, 0) / grades.length;
      var gpa = (avg / 25).toFixed(2);
      savedGPA = gpa;
      localStorage.setItem('calculatedGPA', gpa);
      var gpaBox = document.getElementById('gpa-box-value');
      if (gpaBox) gpaBox.textContent = gpa + '/4.0';
    }
  } catch (_) {}
}

// Run when DOM is ready - wrapped in bootstrapReactPage to ensure services are loaded
const runDashboardInit = () => {
  // Run the async IIFE that fetches dashboard data
  (async () => {
    try {
      const userName = await resolveUserName();
      const shared = window.NibrasShared || {};
      const trackingApiBase =
        (typeof shared.resolveServiceUrl === 'function'
          ? shared.resolveServiceUrl('tracking')
          : null) ||
        window.NibrasApi?.resolveServiceUrl?.('tracking') ||
        window.NibrasApiConfig?.getServiceUrl?.('tracking') ||
        window.NIBRAS_TRACKING_API_URL ||
        window.NIBRAS_API_URL ||
        (/^https?:/i.test(window.location?.origin || '')
          ? window.location.origin.replace(/\/+$/, '')
          : '');

      const requestJson = shared.apiFetch
        ? shared.apiFetch.bind(shared)
        : async (path, options = {}) => {
            const headers = Object.assign(
              { 'Content-Type': 'application/json' },
              options.headers || {},
            );
            const token =
              shared?.auth?.getToken?.() ||
              window.NibrasApi?.getToken?.() ||
              null;
            if (token) {
              headers.Authorization = `Bearer ${token}`;
            }
            const response = await fetch(`${trackingApiBase}${path}`, {
              method: options.method || 'GET',
              headers,
              body: options.body,
            });
            const payload = await response.json();
            if (!response.ok) {
              const error = new Error(
                payload?.message || `Request failed (${response.status})`,
              );
              error.status = response.status;
              error.payload = payload;
              throw error;
            }
            return payload;
          };

      // Load courses for switcher
      await loadCourseSwitcher();

      let rawCoursesResponse = null;
      let dashboardPayload;
      let dashboardSource = 'tracking';
      try {
        rawCoursesResponse = await fetchDashboardFromCoursesBackend();
        dashboardPayload =
          transformCoursesDashboardToDashboard(rawCoursesResponse);
        dashboardSource = 'courses';
        console.log('[DASHBOARD.JS] Using new courses backend');
      } catch (coursesError) {
        console.warn(
          '[DASHBOARD.JS] Courses backend unavailable, falling back to tracking:',
          coursesError.message,
        );
        // Fall back to tracking backend
        const courseId = selectedCourseId;
        let path = '/v1/tracking/dashboard/student';
        if (courseId) {
          path += `?courseId=${encodeURIComponent(courseId)}`;
        }
        dashboardPayload = await requestJson(path, { method: 'GET' });
      }

      // Process the dashboardPayload to build dashboardData
      let courseCount = 0;
      let totalMilestones = 0;
      let approvedMilestones = 0;

      const projects = dashboardPayload.projects || [];

      courseCount = projects.length;

      projects.forEach((project) => {
        const stats = project.stats || {};
        totalMilestones += stats.total || 0;
        approvedMilestones += stats.approved || 0;
      });

      const statsArray = [
        {
          label: 'Courses Enrolled',
          value: courseCount,
          icon: 'fa-solid fa-book-bookmark',
          color: 'pink',
        },
        {
          label: 'Milestones Completed',
          value: approvedMilestones,
          icon: 'fa-solid fa-bullseye',
          color: 'orange',
        },
        {
          label: 'Total Milestones',
          value: totalMilestones,
          icon: 'fa-solid fa-heart',
          color: 'green',
        },
        {
          label: 'Study Streak',
          value: '12 days',
          icon: 'fa-regular fa-clock',
          color: 'blue',
        },
        {
          label:
            dashboardSource === 'courses' ? 'Overall Progress' : 'Total GPA',
          value:
            dashboardSource === 'courses'
              ? `${dashboardPayload.stats?.overallProgress || 0}%`
              : savedGPA
                ? `${savedGPA}/4.0`
                : 'Calculate',
          icon: 'fa-solid fa-graduation-cap',
          color: 'purple',
          id: dashboardSource !== 'courses' ? 'gpa-box' : undefined,
          isClickable: dashboardSource !== 'courses',
        },
      ];

      // Flatten milestones from all projects and take first 3
      const allMilestones = [];
      projects.forEach((project) => {
        (project.milestones || []).forEach((milestone) => {
          allMilestones.push(milestone);
        });
      });

      const dashboardMilestones = allMilestones.slice(0, 3).map((milestone) => {
        let statusLabel = milestone.status || 'pending';
        let statusColor = '#6b7280';
        let completedPercent = 0;

        switch (statusLabel) {
          case 'approved':
          case 'complete':
            statusLabel = 'Complete';
            statusColor = '#10b981';
            completedPercent = 100;
            break;
          case 'in_review':
            statusLabel = 'In Review';
            statusColor = '#10b981';
            completedPercent = 0;
            break;
          case 'needs_changes':
            statusLabel = 'Needs Changes';
            statusColor = '#f97316';
            completedPercent = 0;
            break;
          case 'pending':
          default:
            statusLabel = 'Pending';
            statusColor = '#6b7280';
            completedPercent = 0;
            break;
        }

        return {
          title: milestone.title || 'Milestone',
          completed: completedPercent,
          status: statusLabel,
          color: statusColor,
          due: milestone.dueLabel || 'TBD',
        };
      });

      var progressArray = [];
      if (dashboardSource === 'courses' && rawCoursesResponse) {
        var courseList = Array.isArray(rawCoursesResponse.courses)
          ? rawCoursesResponse.courses
          : [];
        console.log(
          '[DASHBOARD.JS] Dashboard courses:',
          JSON.stringify(
            courseList.map(function (c) {
              return {
                id: c._id || c.id,
                title: c.title,
                progress: c.progressPercentage || c.progress,
                level: c.level,
              };
            }),
          ),
        );
        if (courseList.length > 0) {
          var svc = window.NibrasServices?.coursesService;
          var coursesWithProgress = await Promise.all(
            courseList.map(async function (c) {
              var pct = Number(c.progressPercentage) || Number(c.progress) || 0;
              if (!Number.isFinite(pct)) pct = 0;
              var bid = c._id || c.id || '';
              if (svc && typeof svc.getProgress === 'function' && bid) {
                try {
                  var r = await svc.getProgress(bid);
                  var pd = r?.data || r || {};
                  var apiPct = Number.isFinite(Number(pd.percentage))
                    ? Number(pd.percentage)
                    : 0;
                  if (apiPct > 0) pct = apiPct;
                } catch (_) {}
              }
              return {
                subject: c.title || c.name || 'Untitled',
                percent: Math.max(0, Math.min(100, Math.round(pct))),
                _sortPct: pct,
              };
            }),
          );
          coursesWithProgress.sort(function (a, b) {
            return b._sortPct - a._sortPct;
          });
          progressArray = coursesWithProgress.slice(0, 4).map(function (c) {
            return { subject: c.subject, percent: c.percent };
          });
        }
      }

      dashboardData = {
        user: userName,
        stats: statsArray,
        milestones: dashboardMilestones,
        activities: [],
        progress: progressArray,
        deadlines: [],
        achievements: [],
      };

      renderDashboard(dashboardData);
      fetchGPAFromBackend();
    } catch (error) {
      console.warn(
        '[DASHBOARD.JS] Failed to fetch dashboard data, using hardcoded data:',
        error,
      );
      // Fallback to hardcoded data when both backends fail
      const userName = await resolveUserName();
      const fallbackData = {
        user: userName,
        stats: [
          {
            label: 'Courses Enrolled',
            value: '0',
            icon: 'fa-solid fa-book-bookmark',
            color: 'pink',
          },
          {
            label: 'Milestones Completed',
            value: '0',
            icon: 'fa-solid fa-bullseye',
            color: 'orange',
          },
          {
            label: 'Total Milestones',
            value: '0',
            icon: 'fa-solid fa-heart',
            color: 'green',
          },
          {
            label: 'Study Streak',
            value: '0 days',
            icon: 'fa-regular fa-clock',
            color: 'blue',
          },
          {
            label: 'Overall Progress',
            value: '0%',
            icon: 'fa-solid fa-graduation-cap',
            color: 'purple',
          },
        ],
        milestones: [],
        progress: [],
        deadlines: [],
        achievements: [],
      };
      renderDashboard(fallbackData);
    }

    // Fetch analytics data to update study streak & milestones
    try {
      var analyticsUser = null;
      try {
        var raw2 = localStorage.getItem('user');
        if (raw2) analyticsUser = JSON.parse(raw2);
      } catch (_) {}
      if (
        analyticsUser &&
        analyticsUser._id &&
        window.NibrasServices?.backendAnalyticsService
      ) {
        var anaRes =
          await window.NibrasServices.backendAnalyticsService.getStudentPerformance(
            analyticsUser._id,
          );
        var anaData = anaRes && (anaRes.data || anaRes);
        if (anaData) {
          var studyStreak =
            (anaData.studentStats && anaData.studentStats.studyStreak) || 0;
          var approvedSubs =
            (anaData.submissionSummary && anaData.submissionSummary.approved) ||
            0;

          var statsContainer2 = document.getElementById('stats-container');
          if (statsContainer2) {
            var cards = statsContainer2.querySelectorAll('.stat-card');
            cards.forEach(function (card) {
              var labelEl = card.querySelector('.stat-info span');
              if (!labelEl) return;
              var label = labelEl.textContent.trim();
              var valueEl = card.querySelector('.stat-info h2');
              if (!valueEl) return;

              if (label === 'Study Streak') {
                valueEl.textContent = studyStreak + ' days';
              } else if (label === 'Milestones Completed') {
                valueEl.textContent = approvedSubs;
              }
            });
          }
        }
      }
    } catch (_e) {
      /* non-critical */
    }

    // Fetch gamification data for achievements section
    try {
      if (window.NibrasServices?.gamificationService) {
        const [badgesRes, awardRes, repRes] = await Promise.all([
          window.NibrasServices.gamificationService
            .getAllBadges()
            .catch(() => null),
          window.NibrasServices.gamificationService
            .checkAwardBadges()
            .catch(() => null),
          window.NibrasServices.reputationService
            ?.getMyReputation()
            .catch(() => null),
        ]);

        var allBadges = (badgesRes && (badgesRes.data || badgesRes)) || [];
        if (!Array.isArray(allBadges)) allBadges = [];
        var awardedIds = new Set();
        if (awardRes) {
          var awarded = awardRes.data || awardRes;
          if (Array.isArray(awarded))
            awarded.forEach(function (b) {
              if (b && b._id) awardedIds.add(b._id.toString());
            });
        }
        var repTotal = 0;
        if (repRes && repRes.data) repTotal = repRes.data.total || 0;
        else if (repRes && repRes.total) repTotal = repRes.total;

        var achieveContainer = document.getElementById(
          'achievements-container',
        );
        if (achieveContainer) {
          achieveContainer.innerHTML = '';
          if (awardedIds.size > 0) {
            allBadges
              .filter(function (b) {
                return awardedIds.has(b._id.toString());
              })
              .slice(0, 5)
              .forEach(function (b) {
                var icon = b.badgeIcon || 'fa-solid fa-medal';
                achieveContainer.innerHTML +=
                  '<div class="achieve-item"><i class="' +
                  icon +
                  ' achieve-icon"></i><span class="achieve-text">' +
                  (b.name || 'Badge') +
                  '</span></div>';
              });
          } else {
            var earnedCount = allBadges.filter(function (b) {
              return awardedIds.has(b._id.toString());
            }).length;
            achieveContainer.innerHTML =
              '<div class="achieve-item" style="justify-content:center;width:100%;"><span class="achieve-text" style="color:var(--text-secondary)">' +
              allBadges.length +
              ' achievements available &bull; ' +
              repTotal +
              ' reputation</span></div>';
          }
        }
      }
    } catch (_g) {
      /* non-critical */
    }
  })();

  // Also run initDashboard for the UI initialization
  initDashboard();
};

if (typeof window.bootstrapReactPage === 'function') {
  window.bootstrapReactPage(runDashboardInit);
} else {
  // Fallback if bootstrapReactPage not available
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDashboardInit);
  } else {
    runDashboardInit();
  }
}
