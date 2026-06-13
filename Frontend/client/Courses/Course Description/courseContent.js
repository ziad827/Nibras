window.NibrasReact.run(async () => {
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

  // If a backend MongoDB ID is stored (e.g. from instructor pages),
  // resolve it to a local slug so the correct course renders
  try {
    var rawId = localStorage.getItem('selectedCourseId');
    if (rawId) {
      var fallback = window.NibrasCourses?.getCourseById?.(rawId);
      if (fallback && fallback.id !== rawId) {
        var slug =
          await window.NibrasCourses?.resolveLocalCourseIdByBackendId?.(rawId);
        if (slug) {
          window.NibrasCourses.setSelectedCourseId(slug);
        }
      }
    }
  } catch (_) {}

  // Hide videos nav for instructors
  try {
    var _u = JSON.parse(localStorage.getItem('user') || '{}');
    var _role = String(_u?.role?.name || _u?.role || '').toLowerCase();
    if (_role === 'instructor') {
      var videosLink = document.querySelector('[data-nav-link="videos"]');
      if (videosLink) videosLink.style.display = 'none';
    }
  } catch (_) {}

  const selectedCourse = window.NibrasCourses?.getSelectedCourse?.();
  if (!selectedCourse) return;

  const courseId = selectedCourse.id;
  const courseData = selectedCourse.overview;

  // Ensure theme is set on page load
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
  }
  themeBtn?.addEventListener('click', () => {
    if (themeBtn) {
      themeBtn.classList.add('rotating');
      setTimeout(() => {
        themeBtn.classList.remove('rotating');
      }, 500);
    }
    const htmlEl = document.documentElement;
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    htmlEl.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeBtn(newTheme);
    updateLogo(newTheme);
  });

  function setCourseLinks() {
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
      if (el)
        el.setAttribute(
          'href',
          window.NibrasCourses.withCourseId(path, courseId),
        );
    });

    // Also update back button and discussion forum
    const backBtn = document.querySelector('.back-btn');
    if (backBtn)
      backBtn.setAttribute(
        'href',
        window.NibrasCourses.withCourseId('../courses.html', courseId),
      );

    const forumLink = document.querySelector('#discussion-forum-link');
    if (forumLink)
      forumLink.setAttribute(
        'href',
        window.NibrasCourses.withCourseId(
          '../../Community/CourseDiscussions/discussions.html',
          courseId,
        ),
      );

    const videosLink = document.querySelector('#videos-link');
    if (videosLink)
      videosLink.setAttribute(
        'href',
        window.NibrasCourses.withCourseId('../Videos/videos.html', courseId),
      );

    const playgroundLink = document.querySelector('#playground-link');
    if (playgroundLink)
      playgroundLink.setAttribute(
        'href',
        '../../Competitions/Practice/practice.html',
      );
  }

  setCourseLinks();
  populateDashboard(courseData, selectedCourse);
  hydrateOverviewFromAdmin();
  hydrateProgressFromCoursesBackend();

  function populateDashboard(data, selected) {
    setText('header-code', data.code);
    setText('sidebar-course-code', data.code);
    setText('header-title', data.title);
    setText('header-desc', data.description);
    setText('sidebar-term', `${data.term} • Week ${data.currentWeek}`);
    setText('header-duration', `${data.term} • ${data.stats.duration}`);
    setText('header-commitment', data.stats.commitment);
    setText('header-students', `${data.stats.enrolled} Students Enrolled`);
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
    setText('instructor-rating', data.instructor.rating);
    setText('instructor-bio', data.instructor.bio);

    const breadcrumb = document.querySelector('.breadcrumbs');
    if (breadcrumb) {
      breadcrumb.textContent = `Dashboard / ${selected.title}`;
    }

    const sidebarFill = document.getElementById('sidebar-progress-fill');
    if (sidebarFill) {
      sidebarFill.style.width = `${(data.progress.completedLectures / data.progress.totalLectures) * 100}%`;
    }

    const progressFillMain = document.getElementById('progress-fill-main');
    if (progressFillMain) {
      progressFillMain.style.width = `${data.progress.percent}%`;
    }

    const announceContainer = document.getElementById(
      'announcements-container',
    );
    if (announceContainer) {
      announceContainer.innerHTML = '';
      data.announcements.forEach((item) => {
        announceContainer.innerHTML += `
                    <div class="announcement-item">
                        <div class="announcement-header">
                            <h4>${item.title}</h4>
                            <span class="announcement-date">${item.date}</span>
                        </div>
                        <p>${item.content}</p>
                    </div>`;
      });
    }

    const objContainer = document.getElementById('objectives-container');
    if (objContainer) {
      objContainer.innerHTML = '';
      data.objectives.forEach((obj) => {
        objContainer.innerHTML += `<li><i class="fa-regular fa-circle-check"></i> ${obj}</li>`;
      });
    }

    const preContainer = document.getElementById('prereq-container');
    if (preContainer) {
      preContainer.innerHTML = '';
      data.prerequisites.forEach((pre) => {
        preContainer.innerHTML += `<li><span>•</span> ${pre}</li>`;
      });
    }

    const currContainer = document.getElementById('curriculum-container');
    if (currContainer) {
      currContainer.innerHTML = '';
      data.curriculum.forEach((week) => {
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

        const tagsHtml = week.tags
          .map((tag) => `<span class="tag">${tag}</span>`)
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
                                <span class="week-title">Week ${week.week}: ${week.title}</span>
                                ${badgeHtml}
                            </div>
                            <div class="week-tags">${tagsHtml}</div>
                            <div class="week-activity">
                                <i class="fa-regular fa-file-code"></i> ${week.activity}
                            </div>
                        </div>
                    </div>`;
      });
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  async function hydrateOverviewFromAdmin() {
    const selectedCourse = window.NibrasCourses?.getSelectedCourse?.();
    if (selectedCourse?.overview?.description) return;

    const backendCourseId =
      selectedCourse?.adminCourseId || selectedCourse?.backendCourseId || null;
    const coursesService = window.NibrasServices?.coursesService;

    if (
      !backendCourseId ||
      !coursesService ||
      typeof coursesService.getById !== 'function'
    ) {
      const loadRemoteCourse = window.NibrasCourses?.getAdminCourseByLocalId;
      if (typeof loadRemoteCourse !== 'function') return;
      const fallback = await loadRemoteCourse(courseId);
      if (!fallback) return;
      if (fallback.title) {
        setText('header-title', fallback.title);
        const breadcrumb = document.querySelector('.breadcrumbs');
        if (breadcrumb)
          breadcrumb.textContent = `Dashboard / ${fallback.title}`;
      }
      if (fallback.description) setText('header-desc', fallback.description);
      if (fallback.instructorName)
        setText('instructor-name', fallback.instructorName);
      return;
    }

    try {
      const payload = await coursesService.getById(backendCourseId);
      const course = payload?.data || payload;
      if (!course || typeof course !== 'object') return;

      if (course.title) {
        setText('header-title', course.title);
        const breadcrumb = document.querySelector('.breadcrumbs');
        if (breadcrumb) breadcrumb.textContent = `Dashboard / ${course.title}`;
      }
      if (course.description) setText('header-desc', course.description);
      if (course.courseCode) {
        setText('header-code', course.courseCode);
        setText('sidebar-course-code', course.courseCode);
      }

      const stats = course.stats || {};
      if (stats.duration) {
        const term = stats.term || '';
        setText(
          'header-duration',
          `${term ? term + ' • ' : ''}${stats.duration}`,
        );
      }
      if (stats.hoursPerWeek)
        setText('header-commitment', `${stats.hoursPerWeek} hrs/week`);
      if (stats.enrolledStudents)
        setText(
          'header-students',
          `${stats.enrolledStudents} Students Enrolled`,
        );
      if (stats.term) {
        const sCount = Array.isArray(course.sections)
          ? course.sections.length
          : 0;
        setText(
          'sidebar-term',
          `${stats.term}${sCount ? ' • ' + sCount + ' sections' : ''}`,
        );
      }

      const instrName = course.instructorName || course.instructor?.name || '';
      if (instrName) {
        setText('instructor-name', instrName);
        const parts = instrName.trim().split(/\s+/);
        const initials =
          parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0][0].toUpperCase();
        setText('instructor-initials', initials);
      }

      const sections = Array.isArray(course.sections) ? course.sections : [];
      if (sections.length > 0) {
        const container = document.getElementById('curriculum-container');
        if (container) {
          const completedCount = sections.filter(
            (s) => s.status === 'completed',
          ).length;
          container.innerHTML = sections
            .map((s, i) => {
              const isComplete = s.status === 'completed';
              const isAvailable = s.status === 'available' || isComplete;
              const iconHtml = isComplete
                ? '<div class="week-icon completed"><i class="fa-solid fa-check"></i></div>'
                : isAvailable
                  ? `<div class="week-icon current">${i + 1}</div>`
                  : `<div class="week-icon upcoming">${i + 1}</div>`;
              const badgeHtml =
                isAvailable && !isComplete
                  ? '<span class="status-badge">Available</span>'
                  : isComplete
                    ? '<span class="status-badge" style="background:#16a34a">Completed</span>'
                    : '';
              const activeClass =
                isAvailable && !isComplete ? 'week-card-active' : '';
              return `<div class="curriculum-week">${iconHtml}<div class="week-content ${activeClass}"><div class="week-header"><span class="week-title">${_safeHtml(s.title || 'Section ' + (i + 1))}</span>${badgeHtml}</div></div></div>`;
            })
            .join('');

          if (completedCount > 0 || sections.length > 0) {
            setText(
              'sidebar-progress-text',
              `${completedCount} of ${sections.length} lectures completed`,
            );
            setText('current-week-num', String(completedCount));
            setText('total-weeks', String(sections.length));
            const sidebarFill = document.getElementById(
              'sidebar-progress-fill',
            );
            if (sidebarFill)
              sidebarFill.style.width = `${(completedCount / sections.length) * 100}%`;
          }
        }
      }

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

  async function hydrateProgressFromCoursesBackend() {
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
});
