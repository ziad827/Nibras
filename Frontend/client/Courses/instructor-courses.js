(function () {
  'use strict';

  var S = window.NibrasServices;
  var allCourses = [];
  var currentFilter = 'all';

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

    var sidebarAvatar = document.querySelector('.sidebar .avatar-circle');
    var sidebarName = document.querySelector('.sidebar .user-info h4');
    var sidebarRole = document.querySelector('.sidebar .user-info span');
    if (sidebarAvatar) sidebarAvatar.textContent = initials;
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarRole) sidebarRole.textContent = role;

    var headerAvatars = document.querySelectorAll(
      '.header-actions .avatar-circle',
    );
    if (headerAvatars.length) {
      headerAvatars[headerAvatars.length - 1].textContent = initials;
    }
  }

  function renderCourseCard(c) {
    var cid = c._id || c.id || '';
    var cname = c.name || c.title || 'Untitled';
    var cstatus = (c.status || 'active').toLowerCase();
    var isDraft = cstatus === 'draft';
    var students =
      c.enrolledCount ||
      c.studentsCount ||
      c.enrolledStudents ||
      (isDraft ? 0 : '--');
    var pendingCount = c.pendingReviews || c.pendingSubmissions || 0;
    var recentSub = c.recentSubmission || c.latestSubmission || null;

    var pendingBadge =
      pendingCount > 0
        ? '<span class="inst-pending-badge">' + pendingCount + ' pending</span>'
        : '';

    var recentSubHtml = '';
    if (recentSub && !isDraft) {
      var sname = recentSub.studentName || recentSub.name || 'Student';
      var stitle = recentSub.title || recentSub.assignmentTitle || '';
      var stime = '';
      if (recentSub.submittedAt) {
        try {
          var sd = Date.now() - new Date(recentSub.submittedAt).getTime();
          var sh = Math.floor(sd / 3600000);
          stime =
            sh < 1
              ? 'Just now'
              : sh < 24
                ? sh + ' hours ago'
                : Math.floor(sh / 24) + ' days ago';
        } catch (_) {}
      }
      recentSubHtml =
        '<div class="inst-recent-sub">' +
        '<div class="inst-sub-icon"><i class="fa-solid fa-file-lines"></i></div>' +
        '<div class="inst-sub-text">' +
        '<p><strong>' +
        sname +
        '</strong> submitted</p>' +
        '<p class="inst-sub-title">' +
        stitle +
        '</p>' +
        '<span class="inst-sub-time">' +
        stime +
        '</span>' +
        '</div></div>';
    }

    if (isDraft) {
      return (
        '<div class="inst-course-card inst-draft" data-id="' +
        cid +
        '" data-status="draft">' +
        '<div class="inst-card-top">' +
        '<h3>' +
        cname +
        ' <span class="inst-draft-badge">DRAFT</span></h3>' +
        '</div>' +
        '<div class="inst-course-stats-row">' +
        '<span><i class="fa-solid fa-user"></i> 0 students</span>' +
        '</div>' +
        '<div class="inst-draft-content">' +
        '<button class="inst-action-btn inst-continue-btn">Continue Setup</button>' +
        '</div>' +
        '</div>'
      );
    }

    return (
      '<div class="inst-course-card" data-id="' +
      cid +
      '" data-status="' +
      cstatus +
      '">' +
      '<div class="inst-card-top">' +
      '<h3>' +
      cname +
      '</h3>' +
      pendingBadge +
      '</div>' +
      '<div class="inst-course-stats-row">' +
      '<span><i class="fa-solid fa-user"></i> ' +
      students +
      ' students</span>' +
      '</div>' +
      recentSubHtml +
      '<div class="inst-card-actions">' +
      '<button class="inst-action-btn inst-view-btn" data-id="' +
      cid +
      '">View Course</button>' +
      '<button class="inst-action-btn inst-grade-btn" data-id="' +
      cid +
      '">Grade Work</button>' +
      '<button class="inst-settings-icon" data-id="' +
      cid +
      '"><i class="fa-solid fa-gear"></i></button>' +
      '</div></div>'
    );
  }

  function renderCourses(courses) {
    var grid = document.querySelector('.inst-course-grid');
    if (!grid) return;
    if (!courses.length) {
      grid.innerHTML =
        '<div class="inst-empty-state"><p>No courses found for this filter.</p></div>';
      return;
    }
    grid.innerHTML = courses.map(renderCourseCard).join('');
  }

  function applyFilter(filter) {
    currentFilter = filter;
    var filtered = [];
    if (filter === 'all') {
      filtered = allCourses;
    } else {
      filtered = allCourses.filter(function (c) {
        var status = (c.status || 'active').toLowerCase();
        if (filter === 'active')
          return (
            status === 'active' ||
            status === 'published' ||
            status === 'in_progress'
          );
        if (filter === 'drafts') return status === 'draft';
        if (filter === 'archived') return status === 'archived';
        return true;
      });
    }
    renderCourses(filtered);

    // Update filter button active state
    document.querySelectorAll('.inst-filter-btn').forEach(function (btn) {
      btn.classList.remove('inst-filter-active');
    });
    var activeBtn = document.querySelector(
      '.inst-filter-btn[data-filter="' + filter + '"]',
    );
    if (activeBtn) activeBtn.classList.add('inst-filter-active');
  }

  async function init() {
    // 1. User info
    var user = getUser();
    if (user.name) updateUserUI(user);

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

    // 2. Fetch courses from instructor course management
    try {
      var coursesResp = await S.instructorCourseManagementService.listCourses({
        page: 1,
        limit: 100,
      });
      var coursesData =
        coursesResp &&
        ((coursesResp.data && coursesResp.data.items) ||
          coursesResp.data ||
          coursesResp.courses ||
          []);
      if (Array.isArray(coursesData) && coursesData.length) {
        allCourses = coursesData;
      }
    } catch (_) {
      // Fallback: try regular courses service
      try {
        var fallbackResp = await S.coursesService.list({ page: 1, limit: 100 });
        var fallbackData =
          fallbackResp &&
          ((fallbackResp.data && fallbackResp.data.items) ||
            fallbackResp.data ||
            fallbackResp.courses ||
            []);
        if (Array.isArray(fallbackData) && fallbackData.length) {
          allCourses = fallbackData;
        }
      } catch (_2) {}
    }

    // 4. Show empty state when backend returned nothing
    if (!allCourses.length) {
      applyFilter('active');
      var grid = document.querySelector('.inst-courses-grid');
      if (grid) {
        grid.innerHTML =
          '<div class="empty-state" style="grid-column:1/-1;padding:2rem;text-align:center;color:var(--text-secondary);">No instructor courses found. Create a course from the admin panel.</div>';
      }
      return;
    }

    // 5. Render default view (active courses) — removed hardcoded demo fallback
    applyFilter('active');

    // 6. Setup filter buttons
    document.querySelectorAll('.inst-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = this.getAttribute('data-filter') || 'all';
        applyFilter(filter);
      });
    });

    // 6. Setup search input
    var searchInput = document.querySelector('.inst-search-wrapper input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var query = this.value.toLowerCase().trim();
        if (!query) {
          applyFilter(currentFilter);
          return;
        }
        var filtered = allCourses.filter(function (c) {
          var name = (c.name || c.title || '').toLowerCase();
          var code = (c.code || c.courseCode || '').toLowerCase();
          return name.indexOf(query) !== -1 || code.indexOf(query) !== -1;
        });
        // Further filter by current status filter
        if (currentFilter !== 'all') {
          filtered = filtered.filter(function (c) {
            var s = (c.status || 'active').toLowerCase();
            if (currentFilter === 'active')
              return s === 'active' || s === 'published' || s === 'in_progress';
            if (currentFilter === 'drafts') return s === 'draft';
            if (currentFilter === 'archived') return s === 'archived';
            return true;
          });
        }
        renderCourses(filtered);
      });
    }

    // 7. Delegate button clicks
    document.addEventListener('click', function (e) {
      var btn = e.target.closest(
        '.inst-view-btn, .inst-grade-btn, .inst-continue-btn',
      );
      if (btn) {
        var courseId = btn.getAttribute('data-id');
        if (courseId) {
          localStorage.setItem('selectedCourseId', courseId);
          var isGradeBtn = btn.classList.contains('inst-grade-btn');
          var target = isGradeBtn
            ? '../Admin/Grading/grading.html?courseId=' +
              encodeURIComponent(courseId)
            : '../Courses/Course%20Description/courseContent.html?courseId=' +
              encodeURIComponent(courseId);
          window.location.href = target;
        }
      }

      // Create new course
      var createBtn = e.target.closest('.inst-primary-btn');
      if (createBtn) {
        window.location.href = '../Courses/create-course.html';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
