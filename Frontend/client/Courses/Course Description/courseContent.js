console.log('[COURSE-CONTENT] Script started (direct execution)');

var _safeHtml =
  window.NibrasShared?.safeHtml ||
  function (v) {
    return String(v ?? '').replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c];
    });
  };

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? '';
}

function showCourseLoadError(message) {
  setText('header-title', 'Unable to load course');
  setText(
    'header-desc',
    message ||
      'Course catalog failed to load. Please hard-refresh or return to the courses list.',
  );
  const breadcrumb = document.querySelector('.breadcrumbs');
  if (breadcrumb) breadcrumb.textContent = 'Dashboard / Course unavailable';
}

function populateDashboard(data, selected) {
  setText('header-code', data.code);
  setText('sidebar-course-code', data.code);
  setText('header-title', data.title);
  setText('header-desc', data.description);
  setText(
    'sidebar-term',
    `${data.term} • Lecture ${data.currentWeek} of ${data.totalWeeks}`,
  );
  setText('header-duration', `${data.stats.duration}`);
  setText('header-commitment', data.stats.commitment);
  setText(
    'header-students',
    `${data.stats.enrolled} ${data.stats.enrolled === 1 ? 'lecture' : 'lectures'} in catalog`,
  );
  setText('current-week-num', data.currentWeek);
  setText('total-weeks', data.totalWeeks);
  setText(
    'sidebar-progress-text',
    `${data.progress.completedLectures} of ${data.progress.totalLectures} lectures completed`,
  );
  setText('progress-percent-text', `${data.progress.percent}%`);
  setText('stat-score', data.progress.avgScore);
  setText('stat-assignments', data.progress.assignmentsDone);
  setText('instructor-initials', data.instructor.initials);
  setText('instructor-name', data.instructor.name);
  setText('instructor-role', data.instructor.role);
  if (data.instructor.rating != null) {
    setText('instructor-rating', data.instructor.rating);
  } else {
    setText('instructor-rating', data.code || selected.code || '');
  }
  setText('instructor-bio', data.instructor.bio);

  const breadcrumb = document.querySelector('.breadcrumbs');
  if (breadcrumb) {
    breadcrumb.textContent = `Dashboard / ${selected.title}`;
  }

  const totalLectures = Number(data.progress.totalLectures) || 0;
  const completedLectures = Number(data.progress.completedLectures) || 0;
  const sidebarFill = document.getElementById('sidebar-progress-fill');
  if (sidebarFill && totalLectures > 0) {
    sidebarFill.style.width = `${(completedLectures / totalLectures) * 100}%`;
  }

  const progressFillMain = document.getElementById('progress-fill-main');
  if (progressFillMain) {
    progressFillMain.style.width = `${data.progress.percent}%`;
  }

  const announceContainer = document.getElementById('announcements-container');
  if (announceContainer) {
    announceContainer.innerHTML = '';
    (data.announcements || []).forEach((item) => {
      announceContainer.innerHTML += `
        <div class="announcement-item">
          <div class="announcement-header">
            <h4>${_safeHtml(item.title)}</h4>
            <span class="announcement-date">${_safeHtml(item.date)}</span>
          </div>
          <p>${_safeHtml(item.content)}</p>
        </div>`;
    });
  }

  const objContainer = document.getElementById('objectives-container');
  if (objContainer) {
    objContainer.innerHTML = '';
    (data.objectives || []).forEach((obj) => {
      objContainer.innerHTML += `<li><i class="fa-regular fa-circle-check"></i> ${_safeHtml(obj)}</li>`;
    });
  }

  const preContainer = document.getElementById('prereq-container');
  if (preContainer) {
    preContainer.innerHTML = '';
    (data.prerequisites || []).forEach((pre) => {
      preContainer.innerHTML += `<li><span>•</span> ${_safeHtml(pre)}</li>`;
    });
  }

  const currContainer = document.getElementById('curriculum-container');
  if (currContainer) {
    currContainer.innerHTML = '';
    (data.curriculum || []).forEach((week) => {
      let iconHtml;
      let activeClass = '';
      if (week.status === 'completed') {
        iconHtml = `<div class="week-icon completed"><i class="fa-solid fa-check"></i></div>`;
      } else if (week.status === 'current') {
        iconHtml = `<div class="week-icon current">${week.week}</div>`;
        activeClass = 'week-card-active';
      } else {
        iconHtml = `<div class="week-icon upcoming">${week.week}</div>`;
      }

      const tagsHtml = (week.tags || [])
        .map((tag) => `<span class="tag">${_safeHtml(tag)}</span>`)
        .join('');
      const badgeHtml =
        week.status === 'current'
          ? `<span class="status-badge">Current</span>`
          : '';

      currContainer.innerHTML += `
        <div class="curriculum-week">
          ${iconHtml}
          <div class="week-content ${activeClass}">
            <div class="week-header">
              <span class="week-title">Lecture ${week.week}: ${_safeHtml(week.title)}</span>
              ${badgeHtml}
            </div>
            <div class="week-tags">${tagsHtml}</div>
            <div class="week-activity">
              <i class="fa-regular fa-file-code"></i> ${_safeHtml(week.activity)}
            </div>
          </div>
        </div>`;
    });
  }
}

function setCourseLinks(courseId) {
  var _role = '';
  try {
    var _u = JSON.parse(localStorage.getItem('user') || '{}');
    _role = String(_u?.role?.name || _u?.role || '').toLowerCase();
  } catch (_) {}
  var isInstructor = _role === 'instructor';

  var navLinks = [
    { key: 'courseContent', path: './courseContent.html' },
    { key: 'videos', path: isInstructor ? '' : '../Videos/videos.html' },
    {
      key: 'assignments',
      path: isInstructor
        ? '../../Admin/AssignmentBuilder/assignment-builder.html'
        : '../Assignments/Assignments.html',
    },
    {
      key: 'grades',
      path: isInstructor
        ? '../../Admin/InstructorGrades/instructor-grades.html'
        : '../Grades/grades.html',
    },
  ];

  navLinks.forEach(({ key, path }) => {
    const el = document.querySelector(`[data-nav-link="${key}"]`);
    if (!el || !path) return;
    el.setAttribute('href', window.NibrasCourses.withCourseId(path, courseId));
  });

  const backBtn = document.querySelector('.back-btn');
  if (backBtn) {
    backBtn.setAttribute(
      'href',
      window.NibrasCourses.withCourseId('../courses.html', courseId),
    );
  }

  const forumLink = document.querySelector('#discussion-forum-link');
  if (forumLink) {
    forumLink.setAttribute(
      'href',
      window.NibrasCourses.withCourseId(
        '../../Community/CourseDiscussions/discussions.html',
        courseId,
      ),
    );
  }

  const videosLink = document.querySelector('#videos-link');
  if (videosLink) {
    videosLink.setAttribute(
      'href',
      window.NibrasCourses.withCourseId('../Videos/videos.html', courseId),
    );
  }

  const playgroundLink = document.querySelector('#playground-link');
  if (playgroundLink) {
    playgroundLink.setAttribute(
      'href',
      '../../Competitions/Practice/practice.html',
    );
  }
}

function initThemeToggle() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn?.querySelector('i');
  const themeText = themeBtn?.querySelector('span');
  const appLogo = document.getElementById('app-logo');

  function updateThemeBtn(theme) {
    if (!themeIcon || !themeText) return;
    if (theme === 'dark') {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
      themeText.textContent = 'Light Mode';
    } else {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
      themeText.textContent = 'Dark Mode';
    }
  }

  function updateLogo(theme) {
    if (!appLogo) return;
    appLogo.src =
      theme === 'dark'
        ? '/Assets/images/logo-dark.png'
        : '/Assets/images/logo-light.png';
  }

  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeBtn(currentTheme);
  updateLogo(currentTheme);

  if (themeBtn) {
    themeBtn.classList.remove('rotating');
    void themeBtn.offsetWidth;
    themeBtn.addEventListener('click', () => {
      themeBtn.classList.add('rotating');
      setTimeout(() => themeBtn.classList.remove('rotating'), 500);
      const htmlEl = document.documentElement;
      const current = htmlEl.getAttribute('data-theme');
      const newTheme = current === 'light' ? 'dark' : 'light';
      htmlEl.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeBtn(newTheme);
      updateLogo(newTheme);
    });
  }
}

async function resolveBackendCourseSlug() {
  try {
    var rawId = localStorage.getItem('selectedCourseId');
    if (!rawId) return;
    var fallback = window.NibrasCourses?.getCourseById?.(rawId);
    if (fallback && fallback.id !== rawId) {
      var slug =
        await window.NibrasCourses?.resolveLocalCourseIdByBackendId?.(rawId);
      if (slug) {
        window.NibrasCourses.setSelectedCourseId(slug);
        var refreshed = window.NibrasCourses?.getSelectedCourse?.();
        if (refreshed?.overview) {
          populateDashboard(refreshed.overview, refreshed);
          setCourseLinks(refreshed.id);
        }
      }
    }
  } catch (_) {}
}

async function hydrateOverviewFromAdmin(courseId, selectedCourse) {
  if (selectedCourse?.overview?.description) return;

  const backendCourseId =
    selectedCourse?.adminCourseId || selectedCourse?.backendCourseId || null;
  const coursesService = window.NibrasServices?.coursesService;

  if (
    !backendCourseId ||
    !coursesService ||
    typeof coursesService.getById !== 'function'
  ) {
    return;
  }

  try {
    const payload = await coursesService.getById(backendCourseId);
    const course = payload?.data || payload;
    if (!course || typeof course !== 'object') return;

    if (Number.isFinite(Number(course.overallPercentage))) {
      const pct = Math.max(
        0,
        Math.min(100, Math.round(Number(course.overallPercentage))),
      );
      setText('progress-percent-text', `${pct}%`);
      const progressFillMain = document.getElementById('progress-fill-main');
      if (progressFillMain) progressFillMain.style.width = `${pct}%`;
    }
  } catch (error) {
    console.warn(
      '[COURSE-CONTENT] Failed to hydrate overview from admin backend:',
      error?.message || error,
    );
  }
}

async function hydrateProgressFromCoursesBackend(selectedCourse) {
  const coursesService = window.NibrasServices?.coursesService;
  const backendCourseId =
    selectedCourse?.adminCourseId || selectedCourse?.backendCourseId || null;

  if (
    !coursesService ||
    typeof coursesService.getProgress !== 'function' ||
    !backendCourseId
  ) {
    return;
  }

  try {
    const payload = await coursesService.getProgress(backendCourseId);
    const progress = payload?.data || payload;
    if (!progress || typeof progress !== 'object') return;

    const percentage = Number(progress.percentage);
    if (Number.isFinite(percentage)) {
      const clamped = Math.max(0, Math.min(100, percentage));
      setText('progress-percent-text', `${clamped}%`);
      const progressFillMain = document.getElementById('progress-fill-main');
      if (progressFillMain) {
        progressFillMain.style.width = `${clamped}%`;
      }
    }

    const sectionItems = Array.isArray(progress.items)
      ? progress.items.filter((item) => item?.itemType === 'section')
      : [];
    const completedSections = Array.isArray(progress.completedSections)
      ? progress.completedSections.length
      : 0;
    if (sectionItems.length > 0) {
      setText(
        'sidebar-progress-text',
        `${completedSections} of ${sectionItems.length} lectures completed`,
      );
      const sidebarFill = document.getElementById('sidebar-progress-fill');
      if (sidebarFill) {
        sidebarFill.style.width = `${(completedSections / sectionItems.length) * 100}%`;
      }
    }
  } catch (error) {
    if (Number(error?.status) === 404) {
      console.warn(
        '[COURSE-CONTENT] Progress routes are not mounted on this deployment yet.',
      );
      return;
    }
    console.warn(
      '[COURSE-CONTENT] Failed to hydrate progress from courses backend:',
      error?.message || error,
    );
  }
}

function hydrateProgressInBackground(selectedCourse) {
  var run = function () {
    resolveBackendCourseSlug();
    hydrateOverviewFromAdmin(selectedCourse.id, selectedCourse);
    hydrateProgressFromCoursesBackend(selectedCourse);
  };

  if (window.NibrasReact?.run) {
    window.NibrasReact.run(run);
  } else if (window.bootstrapReactPage) {
    window.bootstrapReactPage(run);
  } else {
    run();
  }
}

function initCourseContent() {
  if (!window.NibrasCourses) {
    showCourseLoadError(
      'Course catalog failed to load. Please hard-refresh the page.',
    );
    return;
  }

  window.NibrasCourses.resolveCourseId?.();

  try {
    var _u = JSON.parse(localStorage.getItem('user') || '{}');
    var _role = String(_u?.role?.name || _u?.role || '').toLowerCase();
    if (_role === 'instructor') {
      var videosLink = document.querySelector('[data-nav-link="videos"]');
      if (videosLink) videosLink.style.display = 'none';
    }
  } catch (_) {}

  const selectedCourse = window.NibrasCourses.getSelectedCourse?.();
  if (!selectedCourse || !selectedCourse.overview) {
    showCourseLoadError(
      'The requested course was not found in the catalog.',
    );
    return;
  }

  initThemeToggle();
  populateDashboard(selectedCourse.overview, selectedCourse);
  setCourseLinks(selectedCourse.id);
  hydrateProgressInBackground(selectedCourse);

  console.log(
    '[COURSE-CONTENT] Initialized for',
    selectedCourse.id,
    '(' + selectedCourse.overview.progress.totalLectures + ' lectures)',
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCourseContent);
} else {
  initCourseContent();
}
