(function () {
  'use strict';

  var PAGE_ROOTS = {
    courseContent: {
      courseContent: './courseContent.html',
      videos: '../Videos/videos.html',
      assignments: '../Assignments/Assignments.html',
      assignmentsInstructor:
        '../../Admin/AssignmentBuilder/assignment-builder.html',
      grading: '../../Admin/Grading/grading.html',
      grades: '../Grades/grades.html',
      gradesInstructor: '../../Admin/InstructorGrades/instructor-grades.html',
      coursesList: '../courses.html',
      forum: '../../Community/CourseDiscussions/discussions.html',
      videosQuick: '../Videos/videos.html',
    },
    videos: {
      courseContent: '../Course Description/courseContent.html',
      videos: './videos.html',
      assignments: '../Assignments/Assignments.html',
      assignmentsInstructor:
        '../../Admin/AssignmentBuilder/assignment-builder.html',
      grading: '../../Admin/Grading/grading.html',
      grades: '../Grades/grades.html',
      gradesInstructor: '../../Admin/InstructorGrades/instructor-grades.html',
      coursesList: '../courses.html',
    },
    assignments: {
      courseContent: '../Course Description/courseContent.html',
      videos: '../Videos/videos.html',
      assignments: './Assignments.html',
      assignmentsInstructor:
        '../../Admin/AssignmentBuilder/assignment-builder.html',
      grading: '../../Admin/Grading/grading.html',
      grades: '../Grades/grades.html',
      gradesInstructor: '../../Admin/InstructorGrades/instructor-grades.html',
      coursesList: '../courses.html',
    },
    assignmentContent: {
      courseContent: '../../Course Description/courseContent.html',
      videos: '../../Videos/videos.html',
      assignments: '../Assignments.html',
      assignmentsInstructor:
        '../../../Admin/AssignmentBuilder/assignment-builder.html',
      grading: '../../../Admin/Grading/grading.html',
      grades: '../../Grades/grades.html',
      gradesInstructor:
        '../../../Admin/InstructorGrades/instructor-grades.html',
      coursesList: '../../courses.html',
      assignmentsList: '../Assignments.html',
    },
    grades: {
      courseContent: '../Course Description/courseContent.html',
      videos: '../Videos/videos.html',
      assignments: '../Assignments/Assignments.html',
      assignmentsInstructor:
        '../../Admin/AssignmentBuilder/assignment-builder.html',
      grading: '../../Admin/Grading/grading.html',
      grades: './grades.html',
      gradesInstructor: '../../Admin/InstructorGrades/instructor-grades.html',
      coursesList: '../courses.html',
    },
  };

  function getUserRole() {
    try {
      var sharedUser = window.NibrasShared?.auth?.getUser?.();
      if (sharedUser) {
        return String(
          sharedUser?.role?.name || sharedUser?.role || '',
        ).toLowerCase();
      }
      var u = JSON.parse(localStorage.getItem('user') || '{}');
      return String(u?.role?.name || u?.role || '').toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function isInstructor() {
    return getUserRole() === 'instructor';
  }

  function withCourseId(path, courseId) {
    if (!path || !courseId) return path || '#';
    if (window.NibrasCourses?.withCourseId) {
      return window.NibrasCourses.withCourseId(path, courseId);
    }
    if (path.includes('courseId=')) return path;
    var sep = path.includes('?') ? '&' : '?';
    return path + sep + 'courseId=' + encodeURIComponent(courseId);
  }

  function persistCourseIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var courseId =
      params.get('courseId') || localStorage.getItem('selectedCourseId');
    if (courseId) {
      localStorage.setItem('selectedCourseId', courseId);
      if (
        window.NibrasCourses?.isValidCourseId?.(courseId) &&
        window.NibrasCourses?.setSelectedCourseId
      ) {
        window.NibrasCourses.setSelectedCourseId(courseId);
      }
    } else {
      window.NibrasCourses?.resolveCourseId?.();
    }
    return localStorage.getItem('selectedCourseId');
  }

  function getNavItems(pageRoot) {
    var roots = PAGE_ROOTS[pageRoot] || PAGE_ROOTS.courseContent;
    var instructor = isInstructor();
    return [
      { key: 'courseContent', path: roots.courseContent },
      {
        key: 'videos',
        path: instructor ? '' : roots.videos,
      },
      {
        key: 'assignments',
        path: instructor ? roots.assignmentsInstructor : roots.assignments,
      },
      {
        key: 'grading',
        path: instructor ? roots.grading : '',
      },
      {
        key: 'grades',
        path: instructor ? roots.gradesInstructor : roots.grades,
      },
    ];
  }

  function setTextContent(el, text) {
    if (el) el.textContent = text ?? '';
  }

  function updateSidebarProgress(opts) {
    var text = opts?.text || '';
    var percent = Number(opts?.percent);
    var textEl = document.getElementById('sidebar-progress-text');
    var fillEl = document.getElementById('sidebar-progress-fill');
    if (textEl) textEl.textContent = text;
    if (fillEl && Number.isFinite(percent)) {
      fillEl.style.width = Math.max(0, Math.min(100, percent)) + '%';
    }
    var mainPct = document.getElementById('progress-percent-text');
    var mainFill = document.getElementById('progress-fill-main');
    if (mainPct && Number.isFinite(percent)) {
      mainPct.textContent = Math.round(percent) + '%';
    }
    if (mainFill && Number.isFinite(percent)) {
      mainFill.style.width = Math.max(0, Math.min(100, percent)) + '%';
    }
  }

  function updateCourseMeta(selectedCourse) {
    if (!selectedCourse) return;
    var overview = selectedCourse.overview || {};
    var codeTitle =
      (selectedCourse.code ? selectedCourse.code + ': ' : '') +
      (selectedCourse.title || 'Course');
    var termLine =
      (overview.term || 'Current term') +
      (overview.currentWeek
        ? ' • Week ' + overview.currentWeek
        : '');

    var metaTitle =
      document.querySelector('.course-meta h4') ||
      document.getElementById('sidebar-course-code');
    var metaSubtitle =
      document.querySelector('.course-meta span') ||
      document.getElementById('sidebar-term');
    if (metaTitle) metaTitle.textContent = codeTitle;
    if (metaSubtitle) metaSubtitle.textContent = termLine;

    var courseTerm = document.getElementById('course-term');
    if (courseTerm) {
      courseTerm.textContent = codeTitle + ' • ' + (overview.term || '');
    }
    var headerSub = document.querySelector('.header-text p');
    if (headerSub) {
      headerSub.textContent = codeTitle + ' • ' + (overview.term || '');
    }
  }

  function applyCourseNav(options) {
    var activeKey = options?.activeKey || 'courseContent';
    var pageRoot = options?.pageRoot || 'courseContent';
    var courseId =
      options?.courseId ||
      localStorage.getItem('selectedCourseId') ||
      window.NibrasCourses?.getSelectedCourse?.()?.id;
  if (!courseId) return;

    var navItems = getNavItems(pageRoot);
    navItems.forEach(function (item) {
      var el = document.querySelector('[data-nav-link="' + item.key + '"]');
      if (!el) return;
      var navItem = el.closest('.nav-item');
      if (item.path) {
        if (navItem) navItem.style.display = '';
        el.setAttribute('href', withCourseId(item.path, courseId));
        el.style.display = '';
      } else if (navItem) {
        navItem.style.display = 'none';
      }
    });

    document.querySelectorAll('[data-nav-link]').forEach(function (link) {
      var key = link.getAttribute('data-nav-link');
      link.classList.toggle('active', key === activeKey);
    });

    var roots = PAGE_ROOTS[pageRoot] || PAGE_ROOTS.courseContent;
    var backBtn = document.querySelector('.back-btn');
    if (backBtn) {
      backBtn.setAttribute('href', withCourseId(roots.coursesList, courseId));
    }

    var extra = options?.extraLinks || {};
    if (extra.forum && roots.forum) {
      var forumLink = document.querySelector('#discussion-forum-link');
      if (forumLink) {
        forumLink.setAttribute('href', withCourseId(roots.forum, courseId));
      }
    }
    if (extra.videosQuick && roots.videosQuick) {
      var videosLink = document.querySelector('#videos-link');
      if (videosLink) {
        videosLink.setAttribute(
          'href',
          withCourseId(roots.videosQuick, courseId),
        );
      }
    }
    if (extra.assignmentsCrumb && roots.assignmentsList) {
      var crumbLink = document.querySelector('.crumb-link');
      if (crumbLink) {
        crumbLink.setAttribute(
          'href',
          withCourseId(roots.assignmentsList, courseId),
        );
      }
    }
    var playgroundLink = document.querySelector('#playground-link');
    if (playgroundLink) {
      playgroundLink.setAttribute(
        'href',
        '../../Competitions/Practice/practice.html',
      );
    }

    var selectedCourse = window.NibrasCourses?.getSelectedCourse?.();
    if (selectedCourse) updateCourseMeta(selectedCourse);
  }

  function resolveTrackingId(selectedCourse) {
    var identifiers =
      window.NibrasCourses?.resolveCourseIdentifiers?.(selectedCourse?.id) ||
      null;
    return (
      selectedCourse?.trackingCourseId ||
      selectedCourse?.trackingCourseIdForApi ||
      identifiers?.trackingCourseIdForApi ||
      identifiers?.trackingCourseId ||
      null
    );
  }

  async function hydrateSidebarProgress(selectedCourse) {
    if (!selectedCourse) return false;

    var trackingSvc = window.NibrasServices?.trackingCourseService;
    var trackingId = resolveTrackingId(selectedCourse);

    if (trackingSvc && typeof trackingSvc.getDetail === 'function' && trackingId) {
      try {
        var payload = await trackingSvc.getDetail(trackingId);
        var detail = payload?.data || payload;
        var percentage = Number(detail?.videoProgressPercent);
        if (Number.isFinite(percentage)) {
          var clamped = Math.max(0, Math.min(100, percentage));
          var videoCount = Number(detail?.videoCount || 0);
          var text =
            videoCount > 0
              ? Math.round((clamped / 100) * videoCount) +
                ' of ' +
                videoCount +
                ' videos watched'
              : Math.round(clamped) + '% complete';
          updateSidebarProgress({ text: text, percent: clamped });
          return true;
        }
      } catch (error) {
        console.warn(
          '[course-sidebar] Tracking progress hydrate failed:',
          error?.message || error,
        );
      }
    }

    var coursesService = window.NibrasServices?.coursesService;
    var backendCourseId =
      selectedCourse?.adminCourseId || selectedCourse?.backendCourseId || null;
    if (
      coursesService &&
      typeof coursesService.getProgress === 'function' &&
      backendCourseId
    ) {
      try {
        var progressPayload = await coursesService.getProgress(backendCourseId);
        var progress = progressPayload?.data || progressPayload;
        if (progress && typeof progress === 'object') {
          var pct = Number(progress.percentage);
          var sectionItems = Array.isArray(progress.items)
            ? progress.items.filter(function (item) {
                return item?.itemType === 'section';
              })
            : [];
          var completedSections = Array.isArray(progress.completedSections)
            ? progress.completedSections.length
            : 0;
          if (sectionItems.length > 0) {
            updateSidebarProgress({
              text:
                completedSections +
                ' of ' +
                sectionItems.length +
                ' lectures completed',
              percent: Number.isFinite(pct)
                ? pct
                : (completedSections / sectionItems.length) * 100,
            });
            return true;
          }
          if (Number.isFinite(pct)) {
            updateSidebarProgress({
              text: Math.round(pct) + '% complete',
              percent: pct,
            });
            return true;
          }
        }
      } catch (error) {
        if (Number(error?.status) !== 404) {
          console.warn(
            '[course-sidebar] Legacy progress hydrate failed:',
            error?.message || error,
          );
        }
      }
    }

    var overview = selectedCourse.overview;
    if (overview?.progress) {
      var total = Number(overview.progress.totalLectures) || 0;
      var completed = Number(overview.progress.completedLectures) || 0;
      if (total > 0) {
        updateSidebarProgress({
          text: completed + ' of ' + total + ' lectures completed',
          percent: overview.progress.percent || (completed / total) * 100,
        });
        return true;
      }
    }
    return false;
  }

  function hideAppNavForInstructor() {
    if (!isInstructor()) return;
    var hideTexts = ['CLI', 'Competitions', 'Achievements', 'AI Tutor'];
    document.querySelectorAll('.nav-link').forEach(function (link) {
      if (
        hideTexts.some(function (t) {
          return link.textContent.trim().includes(t);
        })
      ) {
        var item = link.closest('.nav-item');
        if (item) item.style.display = 'none';
      }
    });
  }

  function initCoursePageChrome(options) {
    var pageRoot = options?.pageRoot || 'courseContent';
    var activeKey = options?.activeKey || 'courseContent';
    var courseId = persistCourseIdFromUrl();
    applyCourseNav({
      activeKey: activeKey,
      pageRoot: pageRoot,
      courseId: courseId,
      extraLinks: options?.extraLinks,
    });
    hideAppNavForInstructor();

    var selectedCourse = window.NibrasCourses?.getSelectedCourse?.();
    if (selectedCourse) {
      var runHydrate = function () {
        hydrateSidebarProgress(selectedCourse);
      };
      if (options?.deferProgress) {
        return runHydrate;
      }
      if (window.NibrasReact?.run) {
        window.NibrasReact.run(runHydrate);
      } else {
        runHydrate();
      }
    }
    return null;
  }

  window.NibrasCourseSidebar = {
    PAGE_ROOTS: PAGE_ROOTS,
    getUserRole: getUserRole,
    isInstructor: isInstructor,
    persistCourseIdFromUrl: persistCourseIdFromUrl,
    getNavItems: getNavItems,
    applyCourseNav: applyCourseNav,
    updateSidebarProgress: updateSidebarProgress,
    updateCourseMeta: updateCourseMeta,
    hydrateSidebarProgress: hydrateSidebarProgress,
    resolveTrackingId: resolveTrackingId,
    initCoursePageChrome: initCoursePageChrome,
    withCourseId: withCourseId,
  };
})();
