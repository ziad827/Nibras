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

var overviewState = {
  trackingId: null,
  isInstructor: false,
  instructorUserId: null,
  staticAnnouncements: [],
  staticPrerequisites: [],
};

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? '';
}

function parseArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function formatAnnouncementDate(value) {
  if (!value) return '';
  var date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function instructorInitials(name) {
  var parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function findLocalCourseByTrackingId(trackingCourseId) {
  if (!trackingCourseId || !window.NibrasCourses?.getAllCoursesList) return null;
  var courses = window.NibrasCourses.getAllCoursesList();
  return (
    courses.find(function (course) {
      return (
        course.trackingCourseId === trackingCourseId ||
        course.trackingCourseIdForApi === trackingCourseId ||
        course.id === trackingCourseId
      );
    }) || null
  );
}

function setOverviewNotice(message, type) {
  var notice = document.getElementById('announcements-notice');
  if (!notice) return;
  var sharedUiStates = window.NibrasShared?.uiStates;
  if (sharedUiStates?.render && message) {
    sharedUiStates.render(notice, {
      state: sharedUiStates.normalize ? sharedUiStates.normalize(type || 'info') : type || 'info',
      message: message,
      mode: 'notice',
    });
    notice.hidden = false;
    return;
  }
  if (!message) {
    notice.hidden = true;
    notice.textContent = '';
    return;
  }
  notice.hidden = false;
  notice.textContent = message;
}

function renderGradingBreakdown(weights) {
  const container = document.getElementById('grading-breakdown-container');
  const section = document.getElementById('grading-breakdown-section');
  if (!container) return;

  const rows = (weights || []).filter(function (w) {
    return w && w.cat;
  });
  if (!rows.length) {
    if (section) section.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  if (section) section.style.display = '';
  container.innerHTML = '';
  rows.forEach(function (w) {
    container.innerHTML +=
      '<div class="grading-row"><span>' +
      _safeHtml(w.cat) +
      '</span><span style="font-weight: 600;">' +
      _safeHtml(w.pct || '—') +
      '</span></div>';
  });
}

function renderInstructor(instructor) {
  if (!instructor) return;

  var displayName =
    instructor.displayName ||
    instructor.name ||
    instructor.username ||
    'Course instructor';
  var roleLabel =
    instructor.role === 'ta'
      ? 'Teaching Assistant'
      : instructor.role || instructor.title || 'Instructor';

  setText('instructor-name', displayName);
  setText('instructor-role', roleLabel);
  setText('instructor-bio', instructor.bio || '');

  var initialsEl = document.getElementById('instructor-initials');
  var avatarImg = document.getElementById('instructor-avatar');
  var initials = instructor.initials || instructorInitials(displayName);
  if (initialsEl) initialsEl.textContent = initials;

  if (avatarImg) {
    if (instructor.avatarUrl) {
      avatarImg.src = instructor.avatarUrl;
      avatarImg.alt = displayName;
      avatarImg.hidden = false;
      if (initialsEl) initialsEl.style.display = 'none';
    } else {
      avatarImg.hidden = true;
      avatarImg.removeAttribute('src');
      if (initialsEl) initialsEl.style.display = '';
    }
  }

  var ratingEl = document.getElementById('instructor-rating');
  var ratingWrap = ratingEl?.closest('.rating');
  if (instructor.rating != null) {
    setText('instructor-rating', instructor.rating);
    if (ratingWrap) ratingWrap.style.display = '';
  } else {
    setText('instructor-rating', '—');
    if (ratingWrap) ratingWrap.style.display = 'none';
  }

  overviewState.instructorUserId = instructor.userId || null;

  var messageBtn = document.getElementById('instructor-message-btn');
  if (messageBtn) {
    messageBtn.onclick = function () {
      if (overviewState.instructorUserId) {
        window.location.href =
          '/Portfolio/portfolio.html?userId=' +
          encodeURIComponent(overviewState.instructorUserId);
        return;
      }
      if (instructor.email) {
        window.location.href = 'mailto:' + encodeURIComponent(instructor.email);
      }
    };
  }
}

function renderPrerequisites(prerequisites, staticFallback) {
  var preContainer = document.getElementById('prereq-container');
  if (!preContainer) return;

  var courses = prerequisites?.courses || [];
  var notes = prerequisites?.notes || [];
  var html = '';

  courses.forEach(function (course) {
    var label =
      _safeHtml(course.subjectCode) +
      ' ' +
      _safeHtml(course.catalogNumber) +
      ' — ' +
      _safeHtml(course.title);
    var localCourse = course.trackingCourseId
      ? findLocalCourseByTrackingId(course.trackingCourseId)
      : null;
    if (localCourse) {
      html +=
        '<li><span>•</span> <a class="prereq-course-link" href="./courseContent.html" data-prereq-course-id="' +
        _safeHtml(localCourse.id) +
        '">' +
        label +
        '</a></li>';
    } else {
      html += '<li><span>•</span> ' + label + '</li>';
    }
  });

  notes.forEach(function (note) {
    html += '<li><span>•</span> ' + _safeHtml(note) + '</li>';
  });

  if (!html && Array.isArray(staticFallback) && staticFallback.length) {
    staticFallback.forEach(function (pre) {
      html += '<li><span>•</span> ' + _safeHtml(pre) + '</li>';
    });
  }

  if (!html) {
    html =
      '<li class="overview-empty"><span>•</span> No prerequisites listed.</li>';
  }

  preContainer.innerHTML = html;

  preContainer.querySelectorAll('[data-prereq-course-id]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      var courseId = link.getAttribute('data-prereq-course-id');
      if (courseId && window.NibrasCourses?.setSelectedCourseId) {
        window.NibrasCourses.setSelectedCourseId(courseId);
      }
      window.location.href = './courseContent.html';
    });
  });
}

function renderAnnouncements(items, options) {
  var announceContainer = document.getElementById('announcements-container');
  var newBtn = document.getElementById('new-announcement-btn');
  if (!announceContainer) return;

  options = options || {};
  var isInstructor = Boolean(options.isInstructor);
  if (newBtn) newBtn.hidden = !isInstructor;

  announceContainer.innerHTML = '';
  var list = Array.isArray(items) ? items : [];

  if (!list.length) {
    announceContainer.innerHTML =
      '<p class="overview-empty">No announcements yet.</p>';
    return;
  }

  list.forEach(function (item) {
    var title = item.title || 'Announcement';
    var date = item.date || formatAnnouncementDate(item.publishedAt);
    var content = item.content || item.body || '';
    var actionsHtml = '';
    if (isInstructor && item.id) {
      actionsHtml =
        '<div class="announcement-actions">' +
        '<button type="button" class="icon-btn announcement-edit-btn" data-id="' +
        _safeHtml(item.id) +
        '" title="Edit"><i class="fa-regular fa-pen-to-square"></i></button>' +
        '<button type="button" class="icon-btn announcement-delete-btn" data-id="' +
        _safeHtml(item.id) +
        '" title="Delete"><i class="fa-regular fa-trash-can"></i></button>' +
        '</div>';
    }
    announceContainer.innerHTML +=
      '<div class="announcement-item" data-announcement-id="' +
      _safeHtml(item.id || '') +
      '">' +
      '<div class="announcement-header">' +
      '<h4>' +
      _safeHtml(title) +
      '</h4>' +
      '<div class="announcement-meta">' +
      '<span class="announcement-date">' +
      _safeHtml(date) +
      '</span>' +
      actionsHtml +
      '</div>' +
      '</div>' +
      '<p>' +
      _safeHtml(content) +
      '</p>' +
      '</div>';
  });

  if (isInstructor) {
    announceContainer.querySelectorAll('.announcement-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openAnnouncementModal(btn.getAttribute('data-id'));
      });
    });
    announceContainer.querySelectorAll('.announcement-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        void deleteAnnouncement(btn.getAttribute('data-id'));
      });
    });
  }
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
  var lectureCount = data.stats.enrolled || data.progress?.totalLectures || 0;
  setText(
    'header-students',
    `${lectureCount} ${lectureCount === 1 ? 'lecture' : 'lectures'}`,
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

  overviewState.staticAnnouncements = data.announcements || [];
  overviewState.staticPrerequisites = data.prerequisites || [];

  renderInstructor(data.instructor);
  renderAnnouncements(overviewState.staticAnnouncements, {
    isInstructor: overviewState.isInstructor,
  });

  const breadcrumb = document.querySelector('.breadcrumbs');
  if (breadcrumb) {
    breadcrumb.textContent = `Dashboard / ${selected.title}`;
  }

  const totalLectures = Number(data.progress.totalLectures) || 0;
  const completedLectures = Number(data.progress.completedLectures) || 0;
  window.NibrasCourseSidebar?.updateSidebarProgress?.({
    text: `${completedLectures} of ${totalLectures} lectures completed`,
    percent: data.progress.percent,
  });

  renderGradingBreakdown(selected?.grades?.weights);

  const objContainer = document.getElementById('objectives-container');
  if (objContainer) {
    objContainer.innerHTML = '';
    (data.objectives || []).forEach((obj) => {
      objContainer.innerHTML += `<li><i class="fa-regular fa-circle-check"></i> ${_safeHtml(obj)}</li>`;
    });
  }

  renderPrerequisites(null, overviewState.staticPrerequisites);

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
          window.NibrasCourseSidebar?.applyCourseNav?.({
            activeKey: 'courseContent',
            pageRoot: 'courseContent',
            courseId: refreshed.id,
            extraLinks: { forum: true, videosQuick: true },
          });
        }
      }
    }
  } catch (_) {}
}

function mapTrackingInstructor(entry) {
  if (!entry) return null;
  return {
    userId: entry.userId,
    name: entry.displayName || entry.username,
    displayName: entry.displayName,
    username: entry.username,
    role: entry.role === 'ta' ? 'Teaching Assistant' : 'Instructor',
    bio: entry.bio || '',
    avatarUrl: entry.avatarUrl,
    initials: instructorInitials(entry.displayName || entry.username),
    rating: null,
  };
}

async function hydrateOverviewFromTracking(selectedCourse) {
  var trackingSvc = window.NibrasServices?.trackingCourseService;
  var trackingId = window.NibrasCourseSidebar?.resolveTrackingId?.(selectedCourse);
  overviewState.trackingId = trackingId || null;
  if (!trackingSvc || !trackingId) return;

  try {
    var payload = await trackingSvc.getDetail(trackingId);
    var detail = payload?.data || payload;
    if (!detail || typeof detail !== 'object') return;

    if (detail.description) setText('header-desc', detail.description);
    if (detail.termLabel) {
      setText(
        'sidebar-term',
        detail.termLabel +
          ' • Lecture ' +
          (selectedCourse.overview?.currentWeek || 1) +
          ' of ' +
          (selectedCourse.overview?.totalWeeks || detail.videoCount || 0),
      );
    }
    if (detail.videoCount != null) {
      var vc = Number(detail.videoCount);
      setText(
        'header-students',
        `${vc} ${vc === 1 ? 'video' : 'videos'}`,
      );
    }
    if (detail.syllabusJson?.objectives?.length) {
      var objContainer = document.getElementById('objectives-container');
      if (objContainer) {
        objContainer.innerHTML = '';
        detail.syllabusJson.objectives.forEach(function (obj) {
          objContainer.innerHTML +=
            '<li><i class="fa-regular fa-circle-check"></i> ' +
            _safeHtml(obj) +
            '</li>';
        });
      }
    }
    if (detail.syllabusJson?.gradingWeights?.length) {
      renderGradingBreakdown(detail.syllabusJson.gradingWeights);
    }

    if (Array.isArray(detail.instructors) && detail.instructors.length) {
      renderInstructor(mapTrackingInstructor(detail.instructors[0]));
    }

    if (detail.prerequisites) {
      renderPrerequisites(detail.prerequisites, overviewState.staticPrerequisites);
    } else if (detail.syllabusJson?.prerequisites?.length) {
      renderPrerequisites(
        { courses: [], notes: detail.syllabusJson.prerequisites },
        overviewState.staticPrerequisites,
      );
    }
  } catch (error) {
    console.warn(
      '[COURSE-CONTENT] Failed to hydrate overview from tracking:',
      error?.message || error,
    );
  }
}

async function hydrateOverviewFromAdmin(selectedCourse) {
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

    if (course.description) setText('header-desc', course.description);

    if (Number.isFinite(Number(course.overallPercentage))) {
      const pct = Math.max(
        0,
        Math.min(100, Math.round(Number(course.overallPercentage))),
      );
      window.NibrasCourseSidebar?.updateSidebarProgress?.({
        text: pct + '% complete',
        percent: pct,
      });
    }

    if (!overviewState.instructorUserId && course.instructor?.name) {
      renderInstructor({
        name: course.instructor.name,
        role: 'Instructor',
        bio: selectedCourse.overview?.instructor?.bio || course.description || '',
        initials: instructorInitials(course.instructor.name),
        rating: selectedCourse.overview?.instructor?.rating ?? null,
      });
    }
  } catch (error) {
    console.warn(
      '[COURSE-CONTENT] Failed to hydrate overview from admin backend:',
      error?.message || error,
    );
  }

  if (!overviewState.instructorUserId && window.NibrasCourses?.getAdminCourseByLocalId) {
    try {
      var remote = await window.NibrasCourses.getAdminCourseByLocalId(selectedCourse.id);
      if (remote?.instructorName) {
        renderInstructor({
          name: remote.instructorName,
          role: 'Instructor',
          bio: selectedCourse.overview?.instructor?.bio || '',
          initials: instructorInitials(remote.instructorName),
          rating: selectedCourse.overview?.instructor?.rating ?? null,
        });
      }
    } catch (_) {}
  }
}

async function hydrateAnnouncements(selectedCourse) {
  var trackingSvc = window.NibrasServices?.trackingCourseService;
  var trackingId =
    overviewState.trackingId ||
    window.NibrasCourseSidebar?.resolveTrackingId?.(selectedCourse);
  if (!trackingSvc || !trackingId || typeof trackingSvc.listAnnouncements !== 'function') {
    return;
  }

  try {
    var payload = await trackingSvc.listAnnouncements(trackingId);
    var items = parseArrayPayload(payload);
    if (items.length) {
      renderAnnouncements(items, { isInstructor: overviewState.isInstructor });
    } else {
      renderAnnouncements([], { isInstructor: overviewState.isInstructor });
    }
  } catch (error) {
    console.warn(
      '[COURSE-CONTENT] Failed to hydrate announcements:',
      error?.message || error,
    );
    renderAnnouncements(overviewState.staticAnnouncements, {
      isInstructor: overviewState.isInstructor,
    });
  }
}

function openAnnouncementModal(announcementId) {
  var modal = document.getElementById('announcement-modal');
  var titleInput = document.getElementById('announcement-title-input');
  var bodyInput = document.getElementById('announcement-body-input');
  var editIdInput = document.getElementById('announcement-edit-id');
  var modalTitle = document.getElementById('announcement-modal-title');
  if (!modal || !titleInput || !bodyInput || !editIdInput) return;

  editIdInput.value = announcementId || '';
  if (announcementId) {
    var itemEl = document.querySelector(
      '[data-announcement-id="' + announcementId + '"]',
    );
    var title = itemEl?.querySelector('h4')?.textContent || '';
    var body = itemEl?.querySelector('p')?.textContent || '';
    titleInput.value = title;
    bodyInput.value = body;
    if (modalTitle) modalTitle.textContent = 'Edit Announcement';
  } else {
    titleInput.value = '';
    bodyInput.value = '';
    if (modalTitle) modalTitle.textContent = 'New Announcement';
  }
  modal.hidden = false;
}

function closeAnnouncementModal() {
  var modal = document.getElementById('announcement-modal');
  if (modal) modal.hidden = true;
}

async function saveAnnouncement(event) {
  event.preventDefault();
  var trackingId = overviewState.trackingId;
  var trackingSvc = window.NibrasServices?.trackingCourseService;
  if (!trackingId || !trackingSvc) return;

  var title = document.getElementById('announcement-title-input')?.value?.trim();
  var body = document.getElementById('announcement-body-input')?.value?.trim();
  var editId = document.getElementById('announcement-edit-id')?.value?.trim();
  if (!title || !body) return;

  try {
    if (editId) {
      await trackingSvc.updateAnnouncement(trackingId, editId, { title, body });
    } else {
      await trackingSvc.createAnnouncement(trackingId, { title, body });
    }
    closeAnnouncementModal();
    setOverviewNotice('', 'info');
    await hydrateAnnouncements(window.NibrasCourses.getSelectedCourse());
  } catch (error) {
    setOverviewNotice(
      error?.message || 'Failed to save announcement.',
      'error',
    );
  }
}

async function deleteAnnouncement(announcementId) {
  if (!announcementId) return;
  if (!window.confirm('Delete this announcement?')) return;
  var trackingId = overviewState.trackingId;
  var trackingSvc = window.NibrasServices?.trackingCourseService;
  if (!trackingId || !trackingSvc) return;

  try {
    await trackingSvc.deleteAnnouncement(trackingId, announcementId);
    await hydrateAnnouncements(window.NibrasCourses.getSelectedCourse());
  } catch (error) {
    setOverviewNotice(
      error?.message || 'Failed to delete announcement.',
      'error',
    );
  }
}

function initAnnouncementControls() {
  var newBtn = document.getElementById('new-announcement-btn');
  var form = document.getElementById('announcement-form');
  var closeBtn = document.getElementById('announcement-modal-close');
  var cancelBtn = document.getElementById('announcement-cancel-btn');
  var modal = document.getElementById('announcement-modal');

  if (newBtn) {
    newBtn.addEventListener('click', function () {
      openAnnouncementModal('');
    });
  }
  if (form) form.addEventListener('submit', saveAnnouncement);
  if (closeBtn) closeBtn.addEventListener('click', closeAnnouncementModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeAnnouncementModal);
  if (modal) {
    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeAnnouncementModal();
    });
  }
}

function hydrateProgressInBackground(selectedCourse) {
  var run = async function () {
    await resolveBackendCourseSlug();
    await hydrateOverviewFromTracking(selectedCourse);
    await hydrateAnnouncements(selectedCourse);
    await hydrateOverviewFromAdmin(selectedCourse);
    await window.NibrasCourseSidebar?.hydrateSidebarProgress?.(selectedCourse);
  };

  if (window.NibrasReact?.run) {
    window.NibrasReact.run(run);
  } else if (window.bootstrapReactPage) {
    window.bootstrapReactPage(run);
  } else {
    run();
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

function initCourseContent() {
  if (!window.NibrasCourses) {
    showCourseLoadError(
      'Course catalog failed to load. Please hard-refresh the page.',
    );
    return;
  }

  overviewState.isInstructor =
    window.NibrasCourseSidebar?.isInstructor?.() || false;

  window.NibrasCourseSidebar?.initCoursePageChrome?.({
    activeKey: 'courseContent',
    pageRoot: 'courseContent',
    extraLinks: { forum: true, videosQuick: true },
    deferProgress: true,
  });

  const selectedCourse = window.NibrasCourses.getSelectedCourse?.();
  if (!selectedCourse || !selectedCourse.overview) {
    showCourseLoadError(
      'The requested course was not found in the catalog.',
    );
    return;
  }

  initThemeToggle();
  initAnnouncementControls();
  populateDashboard(selectedCourse.overview, selectedCourse);
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
