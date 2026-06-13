(function () {
  'use strict';

  const S = window.NibrasServices;

  function getInitials(name) {
    if (!name) return 'U';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map(function (n) {
        return n[0];
      })
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    try {
      var diff = Date.now() - new Date(dateStr).getTime();
      var minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return minutes + ' min ago';
      var hours = Math.floor(minutes / 60);
      if (hours < 24) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
      var days = Math.floor(hours / 24);
      return days + ' day' + (days > 1 ? 's' : '') + ' ago';
    } catch (_) {
      return dateStr;
    }
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (_) {
      return {};
    }
  }

  function getRoleLabel(role) {
    if (!role) return 'Instructor';
    if (typeof role === 'object') return role.name || 'Instructor';
    if (typeof role === 'string')
      return role.charAt(0).toUpperCase() + role.slice(1);
    return 'Instructor';
  }

  function updateUserUI(user) {
    var initials = getInitials(user.name);
    var name = user.name || 'Instructor';
    var role = getRoleLabel(user.role);

    // Sidebar profile
    var sidebarAvatar = document.querySelector('.sidebar .avatar-circle');
    var sidebarName = document.querySelector('.sidebar .user-info h4');
    var sidebarRole = document.querySelector('.sidebar .user-info span');
    if (sidebarAvatar) sidebarAvatar.textContent = initials;
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarRole) sidebarRole.textContent = role;

    // Header avatar
    var headerAvatars = document.querySelectorAll(
      '.header-actions .avatar-circle',
    );
    if (headerAvatars.length) {
      headerAvatars[headerAvatars.length - 1].textContent = initials;
    }

    // Welcome message
    var welcomeEl = document.getElementById('welcome-msg');
    if (welcomeEl) {
      welcomeEl.textContent = 'Welcome back, ' + name.split(/\s+/)[0] + '!';
    }
  }

  async function init() {
    // 1. User info from localStorage first (fast)
    var user = getUser();
    if (user.name) updateUserUI(user);

    // 2. Fetch fresh user data from backend
    try {
      var meData = await S.authService.getMe();
      var freshUser =
        meData &&
        (meData.user ||
          (meData.data && meData.data.user) ||
          meData.data ||
          meData);
      if (freshUser && freshUser.name) {
        localStorage.setItem('user', JSON.stringify(freshUser));
        updateUserUI(freshUser);
        user = freshUser;
      }
    } catch (_) {}

    // 3. Fetch instructor dashboard
    try {
      var dashResp = await S.instructorDashboardService.getDashboard();
      var dash = dashResp && (dashResp.data || dashResp);

      // Stats
      var stats = (dash && dash.stats) || {};
      var statValues = document.querySelectorAll(
        '#stats-container .stat-card h2',
      );
      if (statValues[0] && stats.activeCourses != null)
        statValues[0].textContent = stats.activeCourses;
      if (statValues[1] && stats.totalStudents != null)
        statValues[1].textContent = stats.totalStudents;
      if (statValues[2] && stats.pendingReviews != null)
        statValues[2].textContent = stats.pendingReviews;
      if (statValues[3] && stats.questionsAsked != null)
        statValues[3].textContent = stats.questionsAsked;

      // Course overview
      var courses = (dash && (dash.courses || dash.recentCourses)) || [];
      var courseContainer = document.getElementById(
        'course-overview-container',
      );
      if (courses.length && courseContainer) {
        courseContainer.innerHTML = courses
          .map(function (c) {
            var cid = c._id || c.id || '';
            var cname = c.name || c.title || 'Untitled';
            var cstudents = c.studentsCount || c.enrolledStudents || 0;
            var ccompletion = c.averageCompletion || c.completionRate || 0;
            var ccode = c.code || c.courseCode || '';
            return (
              '<div class="inst-course-item">' +
              '<div class="inst-course-main">' +
              '<span class="inst-course-name">' +
              cname +
              '</span>' +
              '<div class="inst-course-meta">' +
              '<span><i class="fa-solid fa-user"></i> ' +
              cstudents +
              ' students</span>' +
              '<span>' +
              ccompletion +
              '% avg completion</span>' +
              '</div></div>' +
              '<div class="inst-course-actions">' +
              '<span class="inst-course-code">' +
              ccode +
              '</span>' +
              '<button class="inst-manage-btn" data-id="' +
              cid +
              '">Manage</button>' +
              '</div></div>'
            );
          })
          .join('');
      }

      // Recent submissions
      var submissions =
        (dash && (dash.submissions || dash.recentSubmissions)) || [];
      var subContainer = document.getElementById('submissions-container');
      if (submissions.length && subContainer) {
        subContainer.innerHTML = submissions
          .map(function (s) {
            var sname = s.studentName || s.name || 'Unknown';
            var stitle = s.title || s.assignmentTitle || '';
            var scode = s.courseCode || '';
            var stime = s.timeAgo || formatTimeAgo(s.submittedAt) || '';
            var isPending = s.status === 'pending';
            return (
              '<div class="inst-submission-item">' +
              '<div class="inst-sub-info">' +
              '<span class="inst-sub-name">' +
              sname +
              '</span>' +
              '<span class="inst-sub-title">' +
              stitle +
              '</span>' +
              '<span class="inst-sub-meta">' +
              (scode ? scode + ' \u2022 ' : '') +
              stime +
              '</span>' +
              '</div>' +
              '<button class="inst-' +
              (isPending ? 'review' : 'view') +
              '-btn">' +
              (isPending ? 'Review' : 'View') +
              '</button>' +
              '</div>'
            );
          })
          .join('');
      }

      // Performance analytics
      var analytics = (dash && (dash.analytics || dash.performance)) || {};
      var analyticItems = document.querySelectorAll(
        '#analytics-container .inst-analytic-item .inst-analytic-val',
      );
      if (analyticItems[0] && analytics.averageScore != null)
        analyticItems[0].textContent = analytics.averageScore + '%';
      if (analyticItems[1] && analytics.completionRate != null)
        analyticItems[1].textContent = analytics.completionRate + '%';
      if (analyticItems[2] && analytics.averageRating != null)
        analyticItems[2].textContent = analytics.averageRating;
    } catch (_) {
      // Backend not ready, will fallback below
    }

    // Fallback: if containers still have skeletons (backend failed or returned empty)
    (function renderHardcodedFallback() {
      var courseContainer = document.getElementById(
        'course-overview-container',
      );
      if (courseContainer && courseContainer.querySelector('.skeleton')) {
        courseContainer.innerHTML = [
          {
            name: 'Data Structures & Algorithms',
            students: 89,
            completion: 78,
            code: 'CS 201',
          },
          {
            name: 'Database Systems',
            students: 67,
            completion: 85,
            code: 'CS 301',
          },
          {
            name: 'Web Development',
            students: 92,
            completion: 72,
            code: 'CS 350',
          },
          {
            name: 'Competitive Programming',
            students: 39,
            completion: 91,
            code: 'CS 401',
          },
        ]
          .map(function (c) {
            return (
              '<div class="inst-course-item">' +
              '<div class="inst-course-main">' +
              '<span class="inst-course-name">' +
              c.name +
              '</span>' +
              '<div class="inst-course-meta">' +
              '<span><i class="fa-solid fa-user"></i> ' +
              c.students +
              ' students</span>' +
              '<span>' +
              c.completion +
              '% avg completion</span>' +
              '</div></div>' +
              '<div class="inst-course-actions">' +
              '<span class="inst-course-code">' +
              c.code +
              '</span>' +
              '<button class="inst-manage-btn">Manage</button>' +
              '</div></div>'
            );
          })
          .join('');
      }

      var subContainer = document.getElementById('submissions-container');
      if (subContainer && subContainer.querySelector('.skeleton')) {
        subContainer.innerHTML = [
          {
            name: 'Alice Johnson',
            title: 'Binary Tree Implementation',
            meta: 'CS 201 \u2022 2 hours ago',
            pending: true,
          },
          {
            name: 'Bob Smith',
            title: 'Database Design Project',
            meta: 'CS 301 \u2022 4 hours ago',
            pending: false,
          },
          {
            name: 'Carol Davis',
            title: 'React Portfolio',
            meta: 'CS 350 \u2022 1 day ago',
            pending: true,
          },
          {
            name: 'David Wilson',
            title: 'Algorithm Analysis',
            meta: 'CS 401 \u2022 2 days ago',
            pending: false,
          },
        ]
          .map(function (s) {
            return (
              '<div class="inst-submission-item">' +
              '<div class="inst-sub-info">' +
              '<span class="inst-sub-name">' +
              s.name +
              '</span>' +
              '<span class="inst-sub-title">' +
              s.title +
              '</span>' +
              '<span class="inst-sub-meta">' +
              s.meta +
              '</span>' +
              '</div>' +
              '<button class="inst-' +
              (s.pending ? 'review' : 'view') +
              '-btn">' +
              (s.pending ? 'Review' : 'View') +
              '</button>' +
              '</div>'
            );
          })
          .join('');
      }
    })();

    // 5. Fallback: Active Courses count
    try {
      var coursesResp = await S.coursesService.list({ page: 1, limit: 1 });
      var totalCourses =
        coursesResp?.meta?.total ?? coursesResp?.data?.meta?.total;
      if (totalCourses > 0) {
        document.querySelectorAll(
          '#stats-container .stat-card h2',
        )[0].textContent = totalCourses;
      }
    } catch (_) {}

    // 6. Fallback: Questions Asked count (public endpoint, total across all users)
    try {
      var qResp = await S.questionService.list({ page: 1, limit: 1 });
      var totalQ = qResp?.data?.pagination?.total;
      if (totalQ != null) {
        document.querySelectorAll(
          '#stats-container .stat-card h2',
        )[3].textContent = totalQ;
      }
    } catch (_) {}

    // 7. Delegate clicks: Manage buttons and quick action cards
    document.addEventListener('click', function (e) {
      var manageBtn = e.target.closest('.inst-manage-btn');
      if (manageBtn) {
        var courseId = manageBtn.getAttribute('data-id');
        if (courseId) {
          localStorage.setItem('selectedCourseId', courseId);
          window.location.href =
            '../Courses/Course Description/courseContent.html';
        }
        return;
      }
      var actionCard = e.target.closest('.inst-action-card[data-nav]');
      if (actionCard) {
        window.location.href = actionCard.getAttribute('data-nav');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
