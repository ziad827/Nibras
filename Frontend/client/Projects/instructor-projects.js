(function () {
  'use strict';

  var S = window.NibrasServices;
  var allCourses = [];
  var activeCourseId = null;
  var activeCourseData = null;
  var trackingCourseId = null;
  var projects = [];
  var submissions = [];
  var projectMilestoneCounts = {};
  var editingProjectId = null;

  /* ── Helpers ─────────────────────────────────────── */

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

  function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    try {
      var diff = Date.now() - new Date(dateStr).getTime();
      var minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return minutes + ' min ago';
      var hours = Math.floor(minutes / 60);
      if (hours < 24) return hours + 'h ago';
      var days = Math.floor(hours / 24);
      return days + 'd ago';
    } catch (_) {
      return dateStr;
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (_) {
      return dateStr;
    }
  }

  function getStatusClass(status) {
    var s = (status || '').toLowerCase();
    if (s === 'published' || s === 'approved' || s === 'active')
      return 'status-published';
    if (s === 'draft') return 'status-draft';
    if (s === 'archived') return 'status-archived';
    if (s === 'pending') return 'status-pending';
    if (s === 'needs_changes') return 'status-needs-changes';
    return 'status-draft';
  }

  /* ── Helpers ─────────────────────────────────────── */

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Tracking helpers ───────────────────────────── */

  function normalizeList(resp) {
    if (Array.isArray(resp)) return resp;
    var raw = resp && (resp.data !== undefined ? resp.data : resp);
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    if (raw && Array.isArray(raw.submissions)) return raw.submissions;
    if (raw && Array.isArray(raw.projects)) return raw.projects;
    return [];
  }

  function extractId(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj.id || obj._id || (obj.data && (obj.data.id || obj.data._id)) || '';
  }

  function slugifyTitle(title) {
    return (
      String(title || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'project'
    );
  }

  function mapFormStatusToTracking(status) {
    var s = (status || '').toLowerCase();
    if (s === 'active') return 'published';
    if (s === 'archived') return 'archived';
    return 'draft';
  }

  function mapTrackingStatusToForm(status) {
    var s = (status || '').toLowerCase();
    if (s === 'published') return 'active';
    if (s === 'archived') return 'archived';
    return 'draft';
  }

  function mapFormReviewStatus(status) {
    var s = (status || '').toLowerCase();
    if (s === 'needs_changes') return 'changes_requested';
    if (s === 'approved') return 'approved';
    if (s === 'graded') return 'graded';
    return 'pending';
  }

  function mapReviewStatusToForm(status) {
    var s = (status || '').toLowerCase();
    if (s === 'changes_requested') return 'needs_changes';
    if (s === 'graded') return 'approved';
    return s || 'pending';
  }

  function toIsoDateTime(dateStr) {
    if (!dateStr) return null;
    try {
      return new Date(dateStr + 'T23:59:59').toISOString();
    } catch (_) {
      return null;
    }
  }

  function deliveryModeFromTeamSize(teamSize) {
    return teamSize > 0 ? 'team' : 'individual';
  }

  async function resolveTrackingCourseId(courseId) {
    if (!courseId) return '';
    if (typeof window.NibrasCourses?.resolveCourseIdentifiersAsync === 'function') {
      var ids = await window.NibrasCourses.resolveCourseIdentifiersAsync(
        courseId,
        { loadRemote: true },
      );
      if (ids && ids.trackingCourseIdForApi) return ids.trackingCourseIdForApi;
    }
    return courseId;
  }

  function findProject(projectId) {
    for (var i = 0; i < projects.length; i++) {
      if ((projects[i].id || projects[i]._id) === projectId) return projects[i];
    }
    return null;
  }

  function getProjectTitle(projectId) {
    var p = findProject(projectId);
    return p ? p.title || p.name || p.projectKey || 'Project' : 'Project';
  }

  function getSubmissionStudentName(s) {
    return (
      s.teamName ||
      s.studentName ||
      s.name ||
      s.student?.name ||
      'Student'
    );
  }

  function getSubmissionProjectTitle(s) {
    return (
      s.projectTitle ||
      getProjectTitle(s.projectId) ||
      s.projectKey ||
      s.assignmentTitle ||
      s.title ||
      'Project'
    );
  }

  function getSubmissionGrade(s) {
    if (s.score != null) return s.score;
    if (s.grade != null) return s.grade;
    if (s.reviewScore != null) return s.reviewScore;
    return null;
  }

  /* ── Course Loading ─────────────────────────────── */

  async function loadCourses() {
    var sel = document.getElementById('course-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Loading...</option>';

    try {
      var resp = await S.backendCoursesService.list({ page: 1, limit: 100 });
      var data = resp && (resp.data || resp);
      var items = Array.isArray(data)
        ? data
        : data && Array.isArray(data.items)
          ? data.items
          : [];

      if (items.length) {
        allCourses = items;
        sel.innerHTML =
          '<option value="">Select a course</option>' +
          items
            .map(function (c) {
              var cid = c._id || c.id || '';
              var cname = c.title || c.name || 'Untitled';
              var ccode = c.courseCode || c.code || '';
              var label = ccode ? ccode + ' — ' + cname : cname;
              return '<option value="' + cid + '">' + label + '</option>';
            })
            .join('');
        document.getElementById('available-count').textContent =
          items.length + ' course' + (items.length > 1 ? 's' : '');
      } else {
        sel.innerHTML = '<option value="">No courses available</option>';
      }
    } catch (_) {
      try {
        var fallbackResp = await S.coursesService.list({ page: 1, limit: 100 });
        var fallbackData = fallbackResp && (fallbackResp.data || fallbackResp);
        var fallbackItems = Array.isArray(fallbackData)
          ? fallbackData
          : fallbackData && Array.isArray(fallbackData.items)
            ? fallbackData.items
            : [];
        if (fallbackItems.length) {
          allCourses = fallbackItems;
          sel.innerHTML =
            '<option value="">Select a course</option>' +
            fallbackItems
              .map(function (c) {
                var cid = c._id || c.id || '';
                var cname = c.title || c.name || 'Untitled';
                var ccode = c.courseCode || c.code || '';
                var label = ccode ? ccode + ' — ' + cname : cname;
                return '<option value="' + cid + '">' + label + '</option>';
              })
              .join('');
          document.getElementById('available-count').textContent =
            fallbackItems.length +
            ' course' +
            (fallbackItems.length > 1 ? 's' : '');
        } else {
          sel.innerHTML = '<option value="">No courses available</option>';
        }
      } catch (_2) {
        sel.innerHTML = '<option value="">Failed to load courses</option>';
      }
    }

    /* Restore previously selected course */
    var storedId =
      localStorage.getItem('selectedCourseId') || getQueryParam('courseId');
    if (storedId) {
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === storedId) {
          sel.value = storedId;
          activeCourseId = storedId;
          break;
        }
      }
    }
    if (activeCourseId) {
      loadCourseData(activeCourseId);
    }
  }

  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  /* ── Course Data Loading ─────────────────────────── */

  async function loadCourseData(courseId) {
    if (!courseId) {
      trackingCourseId = null;
      showEmpty();
      return;
    }

    activeCourseId = courseId;
    localStorage.setItem('selectedCourseId', courseId);
    updateBreadcrumb(courseId);
    showLoading();

    try {
      activeCourseData = await S.backendCoursesService.getById(courseId);
    } catch (_) {
      activeCourseData = null;
    }

    try {
      trackingCourseId = await resolveTrackingCourseId(courseId);
    } catch (_) {
      trackingCourseId = courseId;
    }

    await Promise.all([loadProjects(courseId), loadSubmissions(courseId)]);
    updateStats();
  }

  function updateBreadcrumb(courseId) {
    var crumbEl = document.getElementById('crumb-course-name');
    if (!crumbEl) return;
    for (var i = 0; i < allCourses.length; i++) {
      var c = allCourses[i];
      if ((c._id || c.id) === courseId) {
        crumbEl.textContent = c.title || c.name || 'Projects';
        return;
      }
    }
    crumbEl.textContent = 'Projects';
  }

  function showLoading() {
    document.getElementById('project-list').innerHTML =
      '<div class="inst-proj-loading">Loading projects...</div>';
    document.getElementById('review-list').innerHTML =
      '<div class="inst-proj-loading">Loading submissions...</div>';
  }

  function showEmpty() {
    document.getElementById('project-list').innerHTML =
      '<div class="inst-proj-empty"><i class="fa-solid fa-diagram-project"></i><p>Select a course to view its projects.</p></div>';
    document.getElementById('review-list').innerHTML =
      '<div class="inst-proj-empty"><i class="fa-regular fa-circle-check"></i><p>Select a course to view submissions.</p></div>';
  }

  async function loadProjects(courseId) {
    var listEl = document.getElementById('project-list');
    if (!S || !S.trackingProjectService) {
      projects = [];
      projectMilestoneCounts = {};
      listEl.innerHTML =
        '<div class="inst-proj-empty"><i class="fa-solid fa-diagram-project"></i><p>Projects service unavailable.</p></div>';
      return;
    }

    var courseKey = trackingCourseId || (await resolveTrackingCourseId(courseId));
    if (!courseKey) {
      projects = [];
      projectMilestoneCounts = {};
      renderProjects();
      return;
    }

    try {
      var resp = await S.trackingProjectService.listByCourse(courseKey);
      projects = normalizeList(resp);
      projectMilestoneCounts = {};
      await Promise.all(
        projects.map(async function (p) {
          var pid = extractId(p);
          if (!pid) return;
          try {
            var msResp = await S.trackingProjectService.getMilestones(pid);
            var ms = normalizeList(msResp);
            projectMilestoneCounts[pid] = ms.length;
          } catch (_) {
            projectMilestoneCounts[pid] = 0;
          }
        }),
      );
    } catch (err) {
      projects = [];
      projectMilestoneCounts = {};
      listEl.innerHTML =
        '<div class="inst-proj-empty"><i class="fa-solid fa-diagram-project"></i><p>' +
        escapeHtml(err.message || 'Failed to load projects.') +
        '</p></div>';
      return;
    }
    renderProjects();
  }

  async function loadSubmissions(courseId) {
    if (!S || !S.trackingProjectService) {
      submissions = [];
      renderReviewQueue();
      renderSubmissionsTable();
      return;
    }

    var courseKey = trackingCourseId || (await resolveTrackingCourseId(courseId));
    try {
      var resp = await S.trackingProjectService.getReviewQueue({
        courseId: courseKey,
        limit: 50,
      });
      var raw = resp && (resp.submissions !== undefined ? resp : resp.data || resp);
      submissions = normalizeList(raw);
    } catch (_) {
      submissions = [];
    }
    renderReviewQueue();
    renderSubmissionsTable();
  }

  /* ── Rendering ───────────────────────────────────── */

  function renderProjects() {
    var listEl = document.getElementById('project-list');
    var countEl = document.getElementById('project-count');

    if (!projects.length) {
      listEl.innerHTML =
        '<div class="inst-proj-empty"><i class="fa-solid fa-diagram-project"></i><p>No projects yet. Create your first project!</p></div>';
      if (countEl) countEl.textContent = '0 total';
      return;
    }

    if (countEl) countEl.textContent = projects.length + ' total';

    listEl.innerHTML = projects
      .map(function (p) {
        var pid = extractId(p);
        var ptitle = p.title || p.name || 'Untitled';
        var pstatus = (p.status || 'draft').toLowerCase();
        var dueDate = p.endDate
          ? formatDate(p.endDate)
          : p.teamLockAt
            ? formatDate(p.teamLockAt)
            : 'No due date';
        var rubricTotal = Array.isArray(p.rubric)
          ? p.rubric.reduce(function (sum, item) {
              return sum + (Number(item.maxScore) || 0);
            }, 0)
          : 0;
        var maxScore = rubricTotal || Number(p.gradeWeight) || 100;
        var teamSize = p.teamSize || 0;
        var deliveryMode = p.deliveryMode || deliveryModeFromTeamSize(teamSize);
        var milestoneCount = projectMilestoneCounts[pid];
        var statusClass = getStatusClass(pstatus);

        return (
          '<div class="inst-proj-row" data-id="' +
          pid +
          '">' +
          '<span class="inst-proj-status-badge ' +
          statusClass +
          '">' +
          pstatus +
          '</span>' +
          '<div class="inst-proj-info">' +
          '<strong>' +
          escapeHtml(ptitle) +
          '</strong>' +
          '<div class="inst-proj-meta">' +
          '<span><i class="fa-regular fa-calendar"></i> ' +
          dueDate +
          '</span>' +
          '<span><i class="fa-solid fa-star"></i> ' +
          maxScore +
          ' pts</span>' +
          '<span><i class="fa-solid fa-list-check"></i> ' +
          (milestoneCount != null ? milestoneCount : '—') +
          ' milestones</span>' +
          '<span><i class="fa-solid fa-user"></i> ' +
          (deliveryMode === 'team' && teamSize > 0
            ? 'Team: ' + teamSize
            : 'Individual') +
          '</span>' +
          '</div></div>' +
          '<div class="inst-proj-actions">' +
          (deliveryMode === 'team'
            ? '<button class="inst-proj-action-btn" data-action="teams" data-id="' +
              pid +
              '" title="Form teams"><i class="fa-solid fa-users"></i></button>'
            : '') +
          '<button class="inst-proj-action-btn" data-action="edit" data-id="' +
          pid +
          '" title="Edit"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="inst-proj-action-btn danger" data-action="delete" data-id="' +
          pid +
          '" title="Unpublish"><i class="fa-solid fa-trash-can"></i></button>' +
          '</div></div>'
        );
      })
      .join('');
  }

  function renderReviewQueue() {
    var listEl = document.getElementById('review-list');
    var pending = submissions.filter(function (s) {
      var st = (s.status || '').toLowerCase();
      return (
        st === 'needs_review' ||
        st === 'queued' ||
        st === 'running' ||
        st === 'submitted' ||
        st === 'pending'
      );
    });

    if (!pending.length) {
      listEl.innerHTML =
        '<div class="inst-proj-review-empty"><i class="fa-regular fa-circle-check"></i><p style="margin-top:0.5rem;">No pending submissions!</p></div>';
      return;
    }

    listEl.innerHTML = pending
      .slice(0, 10)
      .map(function (s) {
        var sid = extractId(s);
        var sname = getSubmissionStudentName(s);
        var ptitle = getSubmissionProjectTitle(s);
        var stime = formatTimeAgo(
          s.submittedAt || s.createdAt || s.submissionDate,
        );
        return (
          '<div class="inst-proj-review-item" data-id="' +
          sid +
          '">' +
          '<div class="review-item-info">' +
          '<strong>' +
          escapeHtml(sname) +
          '</strong>' +
          '<div class="review-item-meta"><span>' +
          escapeHtml(ptitle) +
          '</span><span>' +
          stime +
          '</span></div>' +
          '</div>' +
          '<button class="inst-proj-review-btn" data-action="review" data-id="' +
          sid +
          '">Review</button>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderSubmissionsTable() {
    var tbody = document.getElementById('submissions-tbody');
    if (!submissions.length) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-secondary);">No submissions yet.</td></tr>';
      return;
    }
    tbody.innerHTML = submissions
      .map(function (s) {
        var sid = extractId(s);
        var sname = getSubmissionStudentName(s);
        var ptitle = getSubmissionProjectTitle(s);
        var sstatus = (s.status || 'pending').toLowerCase();
        var gradeVal = getSubmissionGrade(s);
        var grade = gradeVal != null ? gradeVal + '/100' : '—';
        var stime = formatTimeAgo(
          s.submittedAt || s.createdAt || s.submissionDate,
        );
        var statusClass = getStatusClass(sstatus);
        return (
          '<tr data-id="' +
          sid +
          '">' +
          '<td class="sub-student">' +
          escapeHtml(sname) +
          '</td>' +
          '<td>' +
          escapeHtml(ptitle) +
          '</td>' +
          '<td><span class="inst-proj-status-badge ' +
          statusClass +
          '">' +
          sstatus.replace(/_/g, ' ') +
          '</span></td>' +
          '<td>' +
          grade +
          '</td>' +
          '<td class="sub-mono">' +
          stime +
          '</td>' +
          '<td><button class="inst-proj-review-btn" data-action="review" data-id="' +
          sid +
          '">Review</button></td>' +
          '</tr>'
        );
      })
      .join('');
  }

  function updateStats() {
    var total = projects.length;
    var pending = submissions.filter(function (s) {
      var st = (s.status || '').toLowerCase();
      return (
        st === 'needs_review' ||
        st === 'queued' ||
        st === 'running' ||
        st === 'submitted' ||
        st === 'pending'
      );
    }).length;
    var approved = submissions.filter(function (s) {
      var st = (s.status || '').toLowerCase();
      return st === 'approved' || st === 'graded' || st === 'passed';
    }).length;
    var studentSet = {};
    submissions.forEach(function (s) {
      var uid =
        s.userId ||
        s.submittedByUserId ||
        s.studentId ||
        s.student?._id ||
        s.student?.id;
      if (uid) studentSet[uid] = true;
      if (s.teamMemberUserIds && s.teamMemberUserIds.length) {
        s.teamMemberUserIds.forEach(function (tid) {
          if (tid) studentSet[tid] = true;
        });
      }
    });
    var studentCount = Object.keys(studentSet).length || '—';

    document.getElementById('stat-projects').textContent = total;
    document.getElementById('stat-students').textContent = studentCount;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-approved').textContent = approved;
  }

  function filterSubmissionsTable(filter) {
    var rows = document.querySelectorAll('#submissions-tbody tr');
    for (var i = 0; i < rows.length; i++) {
      var sid = rows[i].getAttribute('data-id');
      var s = findSubmission(sid);
      if (!s) continue;
      var st = (s.status || '').toLowerCase();
      var reviewSt = (s.reviewStatus || '').toLowerCase();
      var matches = false;
      if (filter === 'all') {
        matches = true;
      } else if (filter === 'pending') {
        matches =
          st === 'needs_review' ||
          st === 'queued' ||
          st === 'running' ||
          st === 'submitted' ||
          st === 'pending';
      } else if (filter === 'approved') {
        matches =
          st === 'approved' ||
          st === 'graded' ||
          st === 'passed' ||
          reviewSt === 'approved' ||
          reviewSt === 'graded';
      } else if (filter === 'needs_changes') {
        matches =
          st === 'failed' ||
          reviewSt === 'changes_requested' ||
          st === 'needs_changes';
      } else {
        matches = st === filter || reviewSt === filter;
      }
      rows[i].style.display = matches ? '' : 'none';
    }
  }

  /* ── Create / Edit Project ──────────────────────── */

  function openCreateModal() {
    editingProjectId = null;
    document.getElementById('project-modal-title').textContent =
      'Create Project';
    document.getElementById('submit-create-btn').textContent = 'Create Project';
    resetProjectForm();
    document.getElementById('create-project-modal').style.display = 'flex';
    document.getElementById('create-project-error').style.display = 'none';
  }

  async function openEditModal(projectId) {
    var p = findProject(projectId);
    if (!p && S && S.trackingProjectService) {
      try {
        var detail = await S.trackingProjectService.getById(projectId);
        p = detail && (detail.data || detail);
      } catch (_) {
        p = null;
      }
    }
    if (!p) {
      alert('Project not found.');
      return;
    }

    var milestones = p.milestones || [];
    if (!milestones.length && S && S.trackingProjectService) {
      try {
        var msResp = await S.trackingProjectService.getMilestones(projectId);
        milestones = normalizeList(msResp);
      } catch (_) {
        milestones = [];
      }
    }

    editingProjectId = projectId;
    document.getElementById('project-modal-title').textContent = 'Edit Project';
    document.getElementById('submit-create-btn').textContent = 'Update Project';
    document.getElementById('create-project-error').style.display = 'none';

    document.getElementById('edit-project-id').value = projectId;
    document.getElementById('project-title').value = p.title || '';
    document.getElementById('project-description').value = p.description || '';
    document.getElementById('project-start').value = p.startDate
      ? p.startDate.slice(0, 10)
      : '';
    document.getElementById('project-end').value = p.endDate
      ? p.endDate.slice(0, 10)
      : '';
    document.getElementById('project-status').value = mapTrackingStatusToForm(
      p.status,
    );
    var rubricTotal = Array.isArray(p.rubric)
      ? p.rubric.reduce(function (sum, item) {
          return sum + (Number(item.maxScore) || 0);
        }, 0)
      : 0;
    document.getElementById('project-max-score').value =
      rubricTotal || Number(p.gradeWeight) || 100;
    document.getElementById('project-team-size').value = p.teamSize || 0;
    document.getElementById('project-repo-url').value = p.repoUrl || '';

    var milestoneContainer = document.getElementById('milestones-container');
    milestoneContainer.innerHTML = '';
    if (milestones.length) {
      milestones.forEach(function (m) {
        addMilestoneRow({
          title: m.title || m.name,
          description: m.description || '',
          weight: m.weight || 0,
          dueDate: m.dueAt || m.dueDate || null,
          isFinal: m.isFinal || false,
        });
      });
    } else {
      addMilestoneRow();
    }

    var rubricContainer = document.getElementById('rubric-container');
    rubricContainer.innerHTML = '';
    var rubricItems = Array.isArray(p.rubric) ? p.rubric : [];
    if (rubricItems.length) {
      rubricItems.forEach(function (item) {
        addRubricRow(item);
      });
    }

    var resourcesContainer = document.getElementById('resources-container');
    resourcesContainer.innerHTML = '';
    var resourceItems = Array.isArray(p.resources) ? p.resources : [];
    if (resourceItems.length) {
      resourceItems.forEach(function (item) {
        addResourceRow(item);
      });
    }

    document.getElementById('create-project-modal').style.display = 'flex';
  }

  function resetProjectForm() {
    editingProjectId = null;
    document.getElementById('edit-project-id').value = '';
    document.getElementById('create-project-form').reset();
    document.getElementById('project-status').value = 'active';
    document.getElementById('project-max-score').value = 100;
    document.getElementById('project-team-size').value = 0;
    document.getElementById('milestones-container').innerHTML = '';
    document.getElementById('rubric-container').innerHTML = '';
    document.getElementById('resources-container').innerHTML = '';
  }

  function closeCreateModal() {
    document.getElementById('create-project-modal').style.display = 'none';
    resetProjectForm();
  }

  function addMilestoneRow(data) {
    var container = document.getElementById('milestones-container');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'dynamic-row ms-row-full';
    div.innerHTML =
      '<input type="text" class="milestone-title" placeholder="Title" value="' +
      escapeHtml(data?.title || '') +
      '" style="flex:2;min-width:100px;">' +
      '<input type="text" class="milestone-desc" placeholder="Description" value="' +
      escapeHtml(data?.description || '') +
      '" style="flex:2;min-width:100px;">' +
      '<input type="number" class="milestone-weight" placeholder="Wt %" value="' +
      (data?.weight || 0) +
      '" min="0" max="100" style="width:55px;">' +
      '<input type="date" class="milestone-due" value="' +
      (data?.dueDate ? data.dueDate.slice(0, 10) : '') +
      '" style="flex:0 0 130px;">' +
      '<label class="milestone-final-label"><input type="checkbox" class="milestone-final"' +
      (data?.isFinal ? ' checked' : '') +
      '> Final</label>' +
      '<button type="button" class="btn-remove-row" title="Remove milestone">&times;</button>';
    container.appendChild(div);
  }

  function addRubricRow(data) {
    var container = document.getElementById('rubric-container');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML =
      '<input type="text" class="rubric-criterion" placeholder="Criterion" value="' +
      escapeHtml(data?.criterion || '') +
      '" style="flex:2;">' +
      '<input type="number" class="rubric-score" placeholder="Score" value="' +
      (data?.maxScore != null ? data.maxScore : 10) +
      '" min="0" style="flex:0 0 100px;">' +
      '<span class="dynamic-row-unit">pts</span>' +
      '<button type="button" class="btn-remove-row" title="Remove">&times;</button>';
    container.appendChild(div);
  }

  function addResourceRow(data) {
    var container = document.getElementById('resources-container');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML =
      '<input type="text" class="resource-label" placeholder="Label" value="' +
      escapeHtml(data?.label || '') +
      '" style="flex:1;">' +
      '<input type="url" class="resource-url" placeholder="https://..." value="' +
      escapeHtml(data?.url || '') +
      '" style="flex:2;">' +
      '<button type="button" class="btn-remove-row" title="Remove">&times;</button>';
    container.appendChild(div);
  }

  async function handleCreateProject() {
    var title = document.getElementById('project-title').value.trim();
    var description = document
      .getElementById('project-description')
      .value.trim();
    var startDate = document.getElementById('project-start').value;
    var endDate = document.getElementById('project-end').value;
    var status = document.getElementById('project-status').value;
    var maxScore =
      parseInt(document.getElementById('project-max-score').value) || 100;
    var teamSize =
      parseInt(document.getElementById('project-team-size').value) || 0;
    var repoUrl = document.getElementById('project-repo-url').value.trim();
    var errorEl = document.getElementById('create-project-error');

    if (!title) {
      errorEl.textContent = 'Project title is required.';
      errorEl.style.display = '';
      return;
    }
    if (!activeCourseId) {
      errorEl.textContent = 'No course selected.';
      errorEl.style.display = '';
      return;
    }
    if (!S || !S.trackingProjectService) {
      errorEl.textContent = 'Projects service unavailable.';
      errorEl.style.display = '';
      return;
    }

    var milestoneRows = document.querySelectorAll(
      '#milestones-container .dynamic-row',
    );
    var milestones = [];
    milestoneRows.forEach(function (row) {
      var mt = row.querySelector('.milestone-title')?.value?.trim();
      if (mt) {
        milestones.push({
          title: mt,
          description:
            row.querySelector('.milestone-desc')?.value?.trim() || '',
          weight:
            parseFloat(row.querySelector('.milestone-weight')?.value) || 0,
          dueDate: row.querySelector('.milestone-due')?.value || null,
          isFinal: row.querySelector('.milestone-final')?.checked || false,
        });
      }
    });

    var rubricCriteria = document.querySelectorAll('.rubric-criterion');
    var rubricScores = document.querySelectorAll('.rubric-score');
    var rubric = [];
    for (var j = 0; j < rubricCriteria.length; j++) {
      var rc = rubricCriteria[j].value.trim();
      if (rc) {
        rubric.push({
          criterion: rc,
          maxScore: parseInt(rubricScores[j]?.value) || 10,
        });
      }
    }

    var resourceLabels = document.querySelectorAll('.resource-label');
    var resourceUrls = document.querySelectorAll('.resource-url');
    var resources = [];
    for (var k = 0; k < resourceLabels.length; k++) {
      var rl = resourceLabels[k].value.trim();
      var ru = resourceUrls[k]?.value.trim();
      if (rl && ru) resources.push({ label: rl, url: ru });
    }

    var submitBtn = document.getElementById('submit-create-btn');
    submitBtn.disabled = true;
    errorEl.style.display = 'none';

    var isEditing = editingProjectId !== null;
    submitBtn.textContent = isEditing ? 'Updating...' : 'Creating...';

    var courseKey =
      trackingCourseId || (await resolveTrackingCourseId(activeCourseId));
    var mappedStatus = mapFormStatusToTracking(status);
    var deliveryMode = deliveryModeFromTeamSize(teamSize);
    var projectBody = {
      courseId: courseKey,
      slug: slugifyTitle(title),
      title: title,
      description: description,
      status: mappedStatus,
      deliveryMode: deliveryMode,
      teamSize: teamSize > 0 ? teamSize : null,
      rubric: rubric,
      resources: resources,
    };

    try {
      if (isEditing) {
        await S.trackingProjectService.updateProject(editingProjectId, {
          slug: projectBody.slug,
          title: projectBody.title,
          description: projectBody.description,
          status: projectBody.status,
          deliveryMode: projectBody.deliveryMode,
          teamSize: projectBody.teamSize,
          rubric: projectBody.rubric,
          resources: projectBody.resources,
        });
      } else {
        var created = await S.trackingProjectService.createProject(projectBody);
        var projectId = extractId(created);
        if (!projectId) {
          throw new Error('Project was created but no project id was returned.');
        }
        for (var m = 0; m < milestones.length; m++) {
          await S.trackingProjectService.createMilestone(projectId, {
            title: milestones[m].title,
            description: milestones[m].description,
            order: m,
            dueAt: toIsoDateTime(milestones[m].dueDate),
            isFinal: milestones[m].isFinal,
          });
        }
      }

      closeCreateModal();
      await loadProjects(activeCourseId);
      updateStats();
    } catch (err) {
      errorEl.textContent =
        err.message || (isEditing ? 'Failed to update project.' : 'Failed to create project.');
      errorEl.style.display = '';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isEditing ? 'Update Project' : 'Create Project';
    }
  }

  async function handleTeamFormation(projectId) {
    if (!S || !S.trackingProjectService) {
      alert('Projects service unavailable.');
      return;
    }
    if (
      !confirm(
        'Generate team assignments for this project? Existing draft teams may be replaced.',
      )
    ) {
      return;
    }
    try {
      await S.trackingProjectService.generateTeamFormation(projectId, {
        algorithmVersion: 'v1',
      });
      if (
        confirm('Teams generated. Lock assignments so students can see their teams?')
      ) {
        await S.trackingProjectService.lockTeams(projectId, {});
      }
      alert('Team formation complete.');
    } catch (err) {
      alert(err.message || 'Team formation failed.');
    }
  }

  async function handleDeleteProject(projectId) {
    var p = findProject(projectId);
    var status = (p && p.status ? p.status : 'draft').toLowerCase();
    var actionLabel =
      status === 'published'
        ? 'Unpublish this project? Students will no longer see it.'
        : 'Archive this project?';
    if (!confirm(actionLabel)) return;

    if (!S || !S.trackingProjectService) {
      alert('Projects service unavailable.');
      return;
    }

    try {
      if (status === 'published') {
        await S.trackingProjectService.unpublishProject(projectId);
      } else {
        await S.trackingProjectService.updateProject(projectId, {
          status: 'archived',
        });
      }
      await loadProjects(activeCourseId);
      updateStats();
    } catch (err) {
      alert(err.message || 'Failed to remove project.');
    }
  }

  /* ── Review Modal ───────────────────────────────── */

  var activeReviewSubmission = null;

  function findSubmission(id) {
    for (var i = 0; i < submissions.length; i++) {
      if (extractId(submissions[i]) === id) return submissions[i];
    }
    return null;
  }

  async function openReviewModal(submissionId) {
    var s = findSubmission(submissionId);
    if (!s) return;
    activeReviewSubmission = s;

    document.getElementById('review-student-name').textContent =
      getSubmissionStudentName(s);
    document.getElementById('review-project-name').textContent =
      getSubmissionProjectTitle(s);
    document.getElementById('review-submitted-at').textContent = formatDate(
      s.submittedAt || s.createdAt || s.submissionDate,
    );

    var githubLink = s.repoUrl || s.githubLink || s.githubUrl || '';
    var githubEl = document.getElementById('review-github-link');
    if (githubLink) {
      githubEl.href = githubLink;
      githubEl.textContent = githubLink;
      githubEl.style.display = '';
    } else {
      githubEl.textContent = 'Not provided';
      githubEl.href = '#';
    }

    var reviewData = null;
    if (S && S.trackingProjectService) {
      try {
        reviewData = await S.trackingProjectService.getReview(submissionId);
        reviewData = reviewData && (reviewData.data || reviewData);
      } catch (_) {
        reviewData = null;
      }
    }

    var gradeVal = getSubmissionGrade(s);
    if (reviewData && reviewData.score != null) gradeVal = reviewData.score;
    document.getElementById('review-grade').value =
      gradeVal != null ? gradeVal : '';

    var statusRadios = document.querySelectorAll('input[name="review-status"]');
    var currentStatus = mapReviewStatusToForm(
      (reviewData && reviewData.status) || s.reviewStatus || s.status || 'pending',
    );
    for (var i = 0; i < statusRadios.length; i++) {
      statusRadios[i].checked = statusRadios[i].value === currentStatus;
    }

    document.getElementById('review-feedback').value =
      (reviewData && reviewData.feedback) ||
      s.feedback ||
      s.instructorNotes ||
      '';
    document.getElementById('review-error').style.display = 'none';
    document.getElementById('review-modal').style.display = 'flex';
  }

  function closeReviewModal() {
    document.getElementById('review-modal').style.display = 'none';
    activeReviewSubmission = null;
  }

  async function handleReviewSubmit() {
    if (!activeReviewSubmission) return;
    var sid = extractId(activeReviewSubmission);
    var grade = parseInt(document.getElementById('review-grade').value, 10);
    var statusEl = document.querySelector(
      'input[name="review-status"]:checked',
    );
    var status = mapFormReviewStatus(statusEl ? statusEl.value : 'approved');
    var feedback = document.getElementById('review-feedback').value.trim();
    var errorEl = document.getElementById('review-error');

    if (!S || !S.trackingProjectService) {
      errorEl.textContent = 'Projects service unavailable.';
      errorEl.style.display = '';
      return;
    }

    var submitBtn = document.getElementById('submit-review-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    errorEl.style.display = 'none';

    try {
      await S.trackingProjectService.submitReview(sid, {
        status: status,
        score: isNaN(grade) ? null : grade,
        feedback: feedback,
      });
      closeReviewModal();
      await loadSubmissions(activeCourseId);
      updateStats();
    } catch (err) {
      errorEl.textContent = err.message || 'Failed to submit review.';
      errorEl.style.display = '';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
    }
  }

  /* ── Templates ───────────────────────────────────── */

  function closeTemplatesModal() {
    document.getElementById('templates-modal').style.display = 'none';
  }

  function renderTemplatesList(templates) {
    var listEl = document.getElementById('templates-list');
    var emptyEl = document.getElementById('templates-empty');
    if (!templates.length) {
      listEl.innerHTML = '';
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';
    listEl.innerHTML = templates
      .map(function (t) {
        var tid = extractId(t);
        var title = t.title || 'Untitled template';
        var desc = t.description || '';
        var status = (t.status || 'active').toLowerCase();
        var difficulty = t.difficulty || '';
        var teamSize = t.teamSize || 0;
        var deliveryMode = t.deliveryMode || deliveryModeFromTeamSize(teamSize);
        return (
          '<div class="inst-proj-row" data-template-id="' +
          tid +
          '">' +
          '<span class="inst-proj-status-badge ' +
          getStatusClass(status) +
          '">' +
          escapeHtml(status) +
          '</span>' +
          '<div class="inst-proj-info">' +
          '<strong>' +
          escapeHtml(title) +
          '</strong>' +
          '<div class="inst-proj-meta">' +
          (difficulty
            ? '<span><i class="fa-solid fa-signal"></i> ' +
              escapeHtml(difficulty) +
              '</span>'
            : '') +
          '<span><i class="fa-solid fa-user"></i> ' +
          (deliveryMode === 'team' && teamSize > 0
            ? 'Team: ' + teamSize
            : 'Individual') +
          '</span>' +
          (desc
            ? '<span><i class="fa-regular fa-file-lines"></i> ' +
              escapeHtml(desc.slice(0, 80)) +
              (desc.length > 80 ? '…' : '') +
              '</span>'
            : '') +
          '</div></div></div>'
        );
      })
      .join('');
  }

  async function showTemplatesPanel() {
    if (!activeCourseId) {
      alert('Select a course first.');
      return;
    }
    if (!S || !S.trackingProjectService) {
      alert('Projects service unavailable.');
      return;
    }

    var modal = document.getElementById('templates-modal');
    var loadingEl = document.getElementById('templates-loading');
    var errorEl = document.getElementById('templates-error');
    var emptyEl = document.getElementById('templates-empty');
    var listEl = document.getElementById('templates-list');

    modal.style.display = 'flex';
    loadingEl.style.display = '';
    errorEl.style.display = 'none';
    emptyEl.style.display = 'none';
    listEl.innerHTML = '';

    var courseKey =
      trackingCourseId || (await resolveTrackingCourseId(activeCourseId));

    try {
      var resp = await S.trackingProjectService.listCourseTemplates(courseKey);
      var templates = normalizeList(resp);
      loadingEl.style.display = 'none';
      renderTemplatesList(templates);
    } catch (err) {
      loadingEl.style.display = 'none';
      errorEl.textContent = err.message || 'Failed to load templates.';
      errorEl.style.display = '';
    }
  }

  /* ── Events ──────────────────────────────────────── */

  function setupEvents() {
    /* Course selector */
    var courseSelect = document.getElementById('course-select');
    if (courseSelect) {
      courseSelect.addEventListener('change', function () {
        var val = this.value;
        if (val) {
          loadCourseData(val);
        } else {
          activeCourseId = null;
          showEmpty();
        }
      });
    }

    document.addEventListener('click', function (e) {
      /* New project */
      if (e.target.closest('#btn-new-project')) {
        if (!activeCourseId) {
          alert('Select a course first.');
          return;
        }
        openCreateModal();
        return;
      }

      /* Close modals */
      if (
        e.target.closest('#close-create-modal') ||
        e.target.closest('#cancel-create-btn')
      ) {
        closeCreateModal();
        return;
      }
      if (
        e.target.closest('#close-review-modal') ||
        e.target.closest('#cancel-review-btn')
      ) {
        closeReviewModal();
        return;
      }
      if (
        e.target.closest('#close-templates-modal') ||
        e.target.closest('#close-templates-btn')
      ) {
        closeTemplatesModal();
        return;
      }
      if (e.target.classList.contains('modal-overlay')) {
        if (e.target.id === 'create-project-modal') closeCreateModal();
        if (e.target.id === 'review-modal') closeReviewModal();
        if (e.target.id === 'templates-modal') closeTemplatesModal();
        return;
      }

      /* Project actions */
      var actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        var action = actionBtn.getAttribute('data-action');
        var id = actionBtn.getAttribute('data-id');
        if (action === 'edit' && id) {
          if (!activeCourseId) {
            alert('Select a course first.');
            return;
          }
          openEditModal(id);
          return;
        }
        if (action === 'delete' && id) {
          handleDeleteProject(id);
          return;
        }
        if (action === 'review' && id) {
          openReviewModal(id);
          return;
        }
        if (action === 'teams' && id) {
          void handleTeamFormation(id);
          return;
        }
      }

      /* Dynamic rows */
      if (e.target.closest('#add-milestone-row')) {
        e.preventDefault();
        addMilestoneRow();
        return;
      }
      if (e.target.closest('#add-rubric-row')) {
        e.preventDefault();
        addRubricRow();
        return;
      }
      if (e.target.closest('#add-resource-row')) {
        e.preventDefault();
        addResourceRow();
        return;
      }
      if (e.target.closest('.btn-remove-row')) {
        var row = e.target.closest('.dynamic-row');
        if (row) row.remove();
        return;
      }

      /* Submit buttons */
      if (e.target.closest('#submit-create-btn')) {
        handleCreateProject();
        return;
      }
      if (e.target.closest('#submit-review-btn')) {
        handleReviewSubmit();
        return;
      }

      /* View all submissions toggle */
      if (e.target.closest('#btn-view-all-submissions')) {
        var panel = document.getElementById('panel-submissions');
        panel.style.display = panel.style.display === 'none' ? '' : 'none';
        return;
      }

      /* Submission filters */
      var sfilterBtn = e.target.closest('[data-sfilter]');
      if (sfilterBtn) {
        var filter = sfilterBtn.getAttribute('data-sfilter');
        document.querySelectorAll('[data-sfilter]').forEach(function (b) {
          b.classList.remove('inst-filter-active');
        });
        sfilterBtn.classList.add('inst-filter-active');
        filterSubmissionsTable(filter);
        return;
      }

      /* Templates */
      if (e.target.closest('#btn-manage-templates')) {
        showTemplatesPanel();
        return;
      }

      /* Finalize all grades */
      if (e.target.closest('#btn-finalize-all-grades')) {
        finalizeAllGrades();
        return;
      }
    });
  }

  /* ── Tab Switching ──────────────────────────────── */

  function setupTabSwitching() {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = this.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        this.classList.add('active');
        document.querySelectorAll('.tab-panel').forEach(function (p) {
          p.classList.remove('active');
        });
        var panel = document.getElementById('tab-' + tab);
        if (panel) panel.classList.add('active');
        if (tab === 'grading') initGradingTab();
      });
    });
  }

  /* ── Grading Tab ─────────────────────────────────── */

  var gradeProjects = [];
  var gradeSubmissions = [];
  var gradeCurrentSubmission = null;
  var gradeCurrentProject = null;
  var gradeInitialized = false;

  function initGradingTab() {
    if (!gradeInitialized) {
      gradeInitialized = true;
      setupGradeUI();
    }
    void loadGradeProjects();
  }

  function setupGradeUI() {
    document
      .getElementById('grade-project-select')
      .addEventListener('change', function () {
        var val = this.value;
        if (val) loadGradeSubmissions(val);
        else {
          document.getElementById('grade-stats').style.display = 'none';
          document.getElementById('grade-table-wrapper').style.display = 'none';
          document.getElementById('grade-empty-state').style.display = 'block';
        }
      });

    document
      .getElementById('grade-modal-close')
      .addEventListener('click', closeGradeModal);

    document
      .querySelectorAll('#grade-detail-modal .detail-tab')
      .forEach(function (tab) {
        tab.addEventListener('click', function () {
          document
            .querySelectorAll('#grade-detail-modal .detail-tab')
            .forEach(function (t) {
              t.classList.remove('active');
            });
          this.classList.add('active');
          document
            .querySelectorAll('#grade-detail-modal .detail-panel')
            .forEach(function (p) {
              p.classList.remove('active');
            });
          var panel = document.getElementById(
            'grade-panel-' + this.dataset.tab,
          );
          if (panel) panel.classList.add('active');
        });
      });

    document
      .getElementById('grade-btn-submit-grade')
      .addEventListener('click', submitGrade);

    document
      .getElementById('grade-detail-modal')
      .addEventListener('click', function (e) {
        if (e.target === this) closeGradeModal();
      });
  }

  function mapTrackingSubmissionGradeStatus(submission, review) {
    var reviewStatus = (review && review.status) || '';
    if (reviewStatus === 'graded' || reviewStatus === 'approved') return 'graded';
    if (reviewStatus === 'changes_requested') return 'evaluated';
    var subStatus = (submission && submission.status) || '';
    if (subStatus === 'passed') return 'graded';
    if (subStatus === 'failed') return 'evaluated';
    if (subStatus === 'needs_review') return 'pending';
    return 'pending';
  }

  function buildGradeSubmissionsFromTracking(
    project,
    teams,
    queueItems,
    contributions,
  ) {
    var milestones = project.milestones || [];
    var maxScore =
      project.points ||
      project.gradeWeight ||
      (Array.isArray(project.rubric)
        ? project.rubric.reduce(function (sum, item) {
            return sum + (Number(item.maxScore) || 0);
          }, 0)
        : 0) ||
      100;
    var contribMembers = (contributions && contributions.members) || [];
    var weightFallback =
      milestones.length > 0 ? Math.round(100 / milestones.length) : 100;

    var groups = [];
    if (teams.length) {
      groups = teams.map(function (team) {
        var tid = extractId(team);
        return {
          id: tid,
          teamName: team.name || 'Team',
          members: (team.members || []).map(function (member) {
            return member.username || member.roleLabel || member.userId || 'Member';
          }),
          repoUrl: team.repoUrl || '',
        };
      });
    } else {
      var byUser = {};
      queueItems.forEach(function (submission) {
        var uid = submission.userId || submission.submittedByUserId || 'unknown';
        if (!byUser[uid]) {
          byUser[uid] = {
            id: uid,
            teamName: uid,
            members: [uid],
            repoUrl: submission.repoUrl || '',
          };
        }
      });
      groups = Object.keys(byUser).map(function (key) {
        return byUser[key];
      });
    }

    return groups.map(function (group) {
      var teamSubs = queueItems.filter(function (submission) {
        if (teams.length) return submission.teamId === group.id;
        return (
          (submission.userId || submission.submittedByUserId || 'unknown') ===
          group.id
        );
      });

      var msStatuses = milestones.map(function (ms) {
        var mid = ms.id || ms._id;
        var sub = teamSubs.find(function (entry) {
          return entry.milestoneId === mid;
        });
        return {
          name: ms.name || ms.title || 'Milestone',
          weight: ms.weight || weightFallback,
          completed: !!sub,
          score: null,
          maxScore: 100,
          submissionId: sub ? extractId(sub) : null,
          reviewStatus: null,
        };
      });

      var gradedCount = msStatuses.filter(function (ms) {
        return ms.completed;
      }).length;
      var status =
        gradedCount === 0
          ? 'pending'
          : gradedCount === msStatuses.length
            ? 'graded'
            : 'evaluated';

      var contribution = (group.members || []).map(function (name) {
        var match = contribMembers.find(function (member) {
          return (
            member.username === name ||
            member.userId === name ||
            member.name === name
          );
        });
        return {
          name: name,
          commits: match ? match.commitCount || 0 : 0,
          linesAdded: 0,
          linesRemoved: 0,
          percentage: match ? match.sharePercent || 0 : 0,
        };
      });

      var latestSub = teamSubs
        .slice()
        .sort(function (a, b) {
          return (
            new Date(b.submittedAt || b.updatedAt || 0).getTime() -
            new Date(a.submittedAt || a.updatedAt || 0).getTime()
          );
        })[0];

      return {
        id: group.id,
        teamName: group.teamName,
        members: group.members,
        status: status,
        score: null,
        maxScore: maxScore,
        milestoneStatuses: msStatuses,
        contribution: contribution,
        githubRepo: group.repoUrl || (latestSub && latestSub.repoUrl) || '',
        commits: [],
        submittedAt: latestSub
          ? latestSub.submittedAt || latestSub.createdAt
          : null,
        feedbackText: '',
      };
    });
  }

  async function enrichGradeSubmissionReviews(submission) {
    if (!S || !S.trackingProjectService || !submission) return submission;
    var statuses = submission.milestoneStatuses || [];
    await Promise.all(
      statuses.map(async function (ms) {
        if (!ms.submissionId) return;
        try {
          var reviewResp = await S.trackingProjectService.getReview(
            ms.submissionId,
          );
          var review = reviewResp && (reviewResp.data || reviewResp);
          if (review && review.score != null) ms.score = review.score;
          if (review && review.status) ms.reviewStatus = review.status;
          if (review && review.feedback && !submission.feedbackText) {
            submission.feedbackText = review.feedback;
          }
        } catch (_) {}
      }),
    );

    var scored = statuses.filter(function (ms) {
      return ms.score != null;
    });
    if (scored.length) {
      var weighted = statuses.reduce(function (sum, ms) {
        return sum + ((ms.score || 0) * (ms.weight || 0)) / 100;
      }, 0);
      submission.score = Math.round((weighted * submission.maxScore) / 100);
    }

    var allGraded = statuses.every(function (ms) {
      return (
        !ms.submissionId ||
        ms.reviewStatus === 'graded' ||
        ms.reviewStatus === 'approved'
      );
    });
    var anySubmitted = statuses.some(function (ms) {
      return ms.completed;
    });
    submission.status = allGraded && anySubmitted
      ? 'graded'
      : anySubmitted
        ? 'evaluated'
        : 'pending';

    return submission;
  }

  async function loadGradeProjects() {
    var select = document.getElementById('grade-project-select');
    var cid = activeCourseId;
    if (!cid) {
      select.innerHTML =
        '<option value="">Select a course on Projects tab first.</option>';
      return;
    }
    document.getElementById('grade-course-subtitle').textContent =
      'Course loaded';

    if (!S || !S.trackingProjectService) {
      select.innerHTML =
        '<option value="">Projects service unavailable.</option>';
      gradeProjects = [];
      return;
    }

    select.innerHTML = '<option value="">Loading projects…</option>';
    try {
      var courseKey =
        trackingCourseId || (await resolveTrackingCourseId(cid));
      var resp = await S.trackingProjectService.listByCourse(courseKey);
      var items = normalizeList(resp);
      await Promise.all(
        items.map(async function (project) {
          var pid = extractId(project);
          if (!pid) return;
          try {
            var msResp = await S.trackingProjectService.getMilestones(pid);
            var msList = normalizeList(msResp);
            var weightFallback =
              msList.length > 0 ? Math.round(100 / msList.length) : 100;
            project.milestones = msList.map(function (ms) {
              return {
                id: extractId(ms),
                name: ms.title || ms.name || 'Milestone',
                weight: ms.weight || ms.gradeWeight || weightFallback,
                dueDate: ms.dueDate || ms.deadline || null,
              };
            });
          } catch (_) {
            project.milestones = [];
          }
          var rubricTotal = Array.isArray(project.rubric)
            ? project.rubric.reduce(function (sum, item) {
                return sum + (Number(item.maxScore) || 0);
              }, 0)
            : 0;
          project.points = rubricTotal || Number(project.gradeWeight) || 100;
        }),
      );
      gradeProjects = items;
      populateGradeSelect(select, items);
      if (!items.length) {
        document.getElementById('grade-empty-state').innerHTML =
          '<i class="fa-solid fa-diagram-project"></i><p>No projects yet. Create one in the Projects tab first.</p>';
        document.getElementById('grade-empty-state').style.display = 'block';
      }
    } catch (err) {
      gradeProjects = [];
      select.innerHTML =
        '<option value="">Failed to load projects.</option>';
      document.getElementById('grade-empty-state').innerHTML =
        '<i class="fa-solid fa-triangle-exclamation"></i><p>' +
        escapeHtml(err.message || 'Failed to load projects.') +
        '</p>';
      document.getElementById('grade-empty-state').style.display = 'block';
    }
  }

  function populateGradeSelect(select, items) {
    select.innerHTML = '<option value="">— Select a project —</option>';
    items.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p._id || p.id;
      opt.textContent =
        (p.title || 'Untitled') + ' (' + (p.points || '—') + ' pts)';
      select.appendChild(opt);
    });
  }

  async function loadGradeSubmissions(projectId) {
    gradeCurrentProject = gradeProjects.find(function (p) {
      return (p._id || p.id) === projectId;
    });
    var tbody = document.getElementById('grade-submissions-body');
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:32px">Loading submissions...</td></tr>';

    if (!S || !S.trackingProjectService) {
      gradeSubmissions = [];
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;padding:32px">Projects service unavailable.</td></tr>';
      renderFinalGradeSummary();
      return;
    }

    try {
      var queueResp = await S.trackingProjectService.getReviewQueue({
        projectId: projectId,
        limit: 200,
      });
      var teamsResp = await S.trackingProjectService.listTeams(projectId);
      var contribResp = null;
      try {
        contribResp = await S.trackingProjectService.getContributions(
          projectId,
        );
      } catch (_) {}

      var queueItems = normalizeList(queueResp);
      var teams = normalizeList(teamsResp);
      gradeSubmissions = buildGradeSubmissionsFromTracking(
        gradeCurrentProject || { milestones: [], points: 100 },
        teams,
        queueItems,
        contribResp && (contribResp.data || contribResp),
      );

      gradeSubmissions.forEach(function (submission) {
        var total = (submission.contribution || []).reduce(function (sum, c) {
          return sum + c.commits;
        }, 0);
        submission.contribution.forEach(function (c) {
          c.percentage =
            total > 0 ? Math.round((c.commits / total) * 100) : c.percentage;
        });
      });

      if (!gradeSubmissions.length) {
        tbody.innerHTML =
          '<tr><td colspan="6" style="text-align:center;padding:32px">No teams or submissions yet.</td></tr>';
        document.getElementById('grade-stats').style.display = 'none';
        document.getElementById('grade-table-wrapper').style.display = 'none';
        document.getElementById('grade-empty-state').style.display = 'block';
      } else {
        renderGradeSubmissions();
      }
    } catch (err) {
      gradeSubmissions = [];
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;padding:32px">' +
        escapeHtml(err.message || 'Failed to load submissions.') +
        '</td></tr>';
    }
    renderFinalGradeSummary();
  }

  function renderGradeSubmissions() {
    document.getElementById('grade-stats').style.display = 'grid';
    document.getElementById('grade-table-wrapper').style.display = 'block';
    document.getElementById('grade-empty-state').style.display = 'none';

    var tbody = document.getElementById('grade-submissions-body');
    var total = gradeSubmissions.length;
    var graded = gradeSubmissions.filter(function (s) {
      return s.status === 'graded';
    }).length;
    var pending = gradeSubmissions.filter(function (s) {
      return s.status === 'pending';
    }).length;
    var scores = gradeSubmissions
      .filter(function (s) {
        return s.score != null;
      })
      .map(function (s) {
        return s.score;
      });
    var avg = scores.length
      ? Math.round(
          scores.reduce(function (a, b) {
            return a + b;
          }, 0) / scores.length,
        )
      : 0;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-graded').textContent = graded;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-avg').textContent = scores.length
      ? avg + '/' + Math.round(gradeSubmissions[0]?.maxScore || 100)
      : '--';

    tbody.innerHTML = gradeSubmissions
      .map(function (s, idx) {
        var statusLabel = s.status.charAt(0).toUpperCase() + s.status.slice(1);
        var statusClass = 'status-' + s.status;
        var scoreDisplay = s.score != null ? s.score + '/' + s.maxScore : '—';
        var completedMs = (s.milestoneStatuses || []).filter(function (m) {
          return m.completed;
        }).length;
        var totalMs = (s.milestoneStatuses || []).length;
        return (
          '<tr>' +
          '<td class="team-name">' +
          escapeHtml(s.teamName || 'Unknown Team') +
          '</td>' +
          '<td class="members-cell">' +
          (s.members || []).join(', ') +
          '</td>' +
          '<td class="milestone-cell">' +
          completedMs +
          '/' +
          totalMs +
          '</td>' +
          '<td><span class="status-badge ' +
          statusClass +
          '">' +
          statusLabel +
          '</span></td>' +
          '<td class="score-cell">' +
          scoreDisplay +
          '</td>' +
          '<td><button class="grade-action-btn" data-g-idx="' +
          idx +
          '">' +
          (s.status === 'graded' ? 'Review' : 'Grade') +
          '</button></td>' +
          '</tr>'
        );
      })
      .join('');

    tbody.querySelectorAll('.grade-action-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-g-idx'));
        void openGradeSubmission(idx);
      });
    });
  }

  async function openGradeSubmission(idx) {
    gradeCurrentSubmission = gradeSubmissions[idx];
    if (!gradeCurrentSubmission) return;

    await enrichGradeSubmissionReviews(gradeCurrentSubmission);

    document.getElementById('detail-team-name').textContent =
      escapeHtml(gradeCurrentSubmission.teamName || 'Team') + "'s Project";

    renderGradeMilestones(gradeCurrentSubmission.milestoneStatuses || []);
    renderGradeContribution(gradeCurrentSubmission.contribution || []);
    renderGradeTeam(gradeCurrentSubmission);
    renderGradeForm(gradeCurrentSubmission);

    document.getElementById('grade-grade-status').textContent = '';
    document.getElementById('grade-grade-status').className = 'form-status';

    document.getElementById('grade-detail-modal').style.display = 'flex';

    document
      .querySelectorAll('#grade-detail-modal .detail-tab')
      .forEach(function (t) {
        t.classList.remove('active');
      });
    document
      .querySelector('#grade-detail-modal .detail-tab[data-tab="milestones"]')
      .classList.add('active');
    document
      .querySelectorAll('#grade-detail-modal .detail-panel')
      .forEach(function (p) {
        p.classList.remove('active');
      });
    document.getElementById('grade-panel-milestones').classList.add('active');
  }

  function renderGradeMilestones(msStatuses) {
    var completed = msStatuses.filter(function (m) {
      return m.completed;
    }).length;
    document.getElementById('grade-ms-completed').textContent = completed;
    document.getElementById('grade-ms-total').textContent = msStatuses.length;

    var container = document.getElementById('grade-milestone-list');
    container.innerHTML = '';
    if (!msStatuses.length) {
      container.innerHTML = '<p class="empty-hint">No milestones defined.</p>';
      return;
    }
    msStatuses.forEach(function (ms) {
      var cls = ms.completed ? 'ms-complete' : 'ms-pending';
      var icon = ms.completed ? 'fa-circle-check' : 'fa-regular fa-circle';
      var scoreDisplay = ms.score != null ? ms.score + '/' + ms.maxScore : '—';
      container.innerHTML +=
        '<div class="milestone-item ' +
        cls +
        '">' +
        '<span class="ms-icon"><i class="fa-regular ' +
        icon +
        '"></i></span>' +
        '<div class="ms-info"><strong>' +
        escapeHtml(ms.name || 'Milestone') +
        '</strong>' +
        '<span class="ms-weight">Weight: ' +
        (ms.weight || 0) +
        '%</span></div>' +
        '<span class="ms-score">' +
        scoreDisplay +
        '</span>' +
        '</div>';
    });
  }

  function renderGradeContribution(contribution) {
    if (!contribution || !contribution.length) {
      document.getElementById('grade-contribution-chart').innerHTML =
        '<p class="empty-hint">No contribution data available.</p>';
      document.getElementById('grade-contribution-table').innerHTML = '';
      document.getElementById('grade-adjustment-inputs').innerHTML = '';
      return;
    }

    var chartHtml = '<div class="contrib-bars">';
    contribution.forEach(function (c) {
      chartHtml +=
        '<div class="contrib-bar-row">' +
        '<span class="contrib-name">' +
        escapeHtml(c.name) +
        '</span>' +
        '<div class="contrib-bar-track"><div class="contrib-bar-fill" style="width:' +
        c.percentage +
        '%"></div></div>' +
        '<span class="contrib-pct">' +
        c.percentage +
        '%</span>' +
        '</div>';
    });
    chartHtml += '</div>';
    document.getElementById('grade-contribution-chart').innerHTML = chartHtml;

    var tableHtml =
      '<table class="contrib-table"><thead><tr><th>Member</th><th>Commits</th><th>Lines Added</th><th>Lines Removed</th><th>Est. Contribution</th></tr></thead><tbody>';
    contribution.forEach(function (c) {
      tableHtml +=
        '<tr><td>' +
        escapeHtml(c.name) +
        '</td><td>' +
        c.commits +
        '</td><td>' +
        c.linesAdded +
        '</td><td>' +
        c.linesRemoved +
        '</td><td>' +
        c.percentage +
        '%</td></tr>';
    });
    tableHtml += '</tbody></table>';
    document.getElementById('grade-contribution-table').innerHTML = tableHtml;

    var adjustHtml = '';
    contribution.forEach(function (c, idx) {
      adjustHtml +=
        '<div class="adjust-row"><label>' +
        escapeHtml(c.name) +
        '</label>' +
        '<input type="range" class="adjust-slider" data-g-idx="' +
        idx +
        '" min="0" max="100" value="' +
        c.percentage +
        '">' +
        '<input type="number" class="adjust-input" data-g-idx="' +
        idx +
        '" min="0" max="100" value="' +
        c.percentage +
        '" style="width:60px">' +
        '<span class="adjust-pct">%</span></div>';
    });
    document.getElementById('grade-adjustment-inputs').innerHTML = adjustHtml;

    document
      .querySelectorAll('#grade-adjustment-inputs .adjust-slider')
      .forEach(function (slider) {
        slider.addEventListener('input', function () {
          var idx = this.getAttribute('data-g-idx');
          var input = document.querySelector(
            '.adjust-input[data-g-idx="' + idx + '"]',
          );
          if (input) input.value = this.value;
        });
      });
    document
      .querySelectorAll('#grade-adjustment-inputs .adjust-input')
      .forEach(function (input) {
        input.addEventListener('input', function () {
          var idx = this.getAttribute('data-g-idx');
          var slider = document.querySelector(
            '.adjust-slider[data-g-idx="' + idx + '"]',
          );
          if (slider) slider.value = this.value;
        });
      });
  }

  function renderGradeTeam(submission) {
    var container = document.getElementById('grade-team-members');
    container.innerHTML = '';
    if (!submission.members || !submission.members.length) {
      container.innerHTML = '<p class="empty-hint">No team members.</p>';
      return;
    }
    submission.members.forEach(function (member) {
      container.innerHTML +=
        '<div class="team-member-chip"><i class="fa-solid fa-user"></i> ' +
        escapeHtml(member) +
        '</div>';
    });

    document.getElementById('grade-team-github-repo').innerHTML =
      submission.githubRepo
        ? '<a href="' +
          escapeHtml(submission.githubRepo) +
          '" target="_blank"><i class="fa-brands fa-github"></i> ' +
          escapeHtml(submission.githubRepo) +
          '</a>'
        : 'No repo connected';

    var commitContainer = document.getElementById('grade-team-commits');
    var commits = submission.commits || [];
    if (!commits.length) {
      commitContainer.innerHTML = '<p class="empty-hint">No commits yet.</p>';
      return;
    }
    commitContainer.innerHTML = commits
      .map(function (c) {
        return (
          '<div class="commit-item">' +
          '<div class="commit-message"><i class="fa-solid fa-code-commit"></i> ' +
          escapeHtml(c.message) +
          '</div>' +
          '<div class="commit-meta"><span>' +
          escapeHtml(c.author) +
          '</span>' +
          '<span>' +
          (c.date
            ? new Date(c.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : '') +
          '</span></div>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderGradeForm(submission) {
    var container = document.getElementById('grade-weighted-score-breakdown');
    container.innerHTML = '';
    var msStatuses = submission.milestoneStatuses || [];
    if (!msStatuses.length) {
      container.innerHTML =
        '<p class="empty-hint">No milestones defined for this project.</p>';
      return;
    }

    var totalWeighted = 0;
    var maxWeighted = 0;
    msStatuses.forEach(function (ms) {
      var row = document.createElement('div');
      row.className = 'weighted-row';
      var score = ms.score || 0;
      var max = ms.maxScore || 100;
      var weighted = (score * (ms.weight || 0)) / 100;
      var maxWeightedMs = (max * (ms.weight || 0)) / 100;
      totalWeighted += weighted;
      maxWeighted += maxWeightedMs;

      row.innerHTML =
        '<div class="weighted-top">' +
        '<span class="weighted-name">' +
        escapeHtml(ms.name || 'Milestone') +
        '</span>' +
        '<span class="weighted-pct">Weight: ' +
        (ms.weight || 0) +
        '%</span>' +
        '</div>' +
        '<div class="weighted-input-row">' +
        '<label>Score</label>' +
        '<input type="number" class="weighted-score-input ms-score-input" data-weight="' +
        (ms.weight || 0) +
        '" data-max="' +
        max +
        '" value="' +
        score +
        '" min="0" max="' +
        max +
        '" step="1">' +
        '<span class="weighted-max">/ ' +
        max +
        '</span>' +
        '<span class="weighted-contribution">Weighted: <strong>' +
        weighted.toFixed(1) +
        '</strong></span>' +
        '</div>';
      container.appendChild(row);
    });

    updateGradeTotal();
    container.querySelectorAll('.ms-score-input').forEach(function (input) {
      input.addEventListener('input', function () {
        updateMilestoneScore(input);
        updateGradeTotal();
      });
    });

    document.getElementById('grade-feedback-text').value =
      submission.feedbackText || '';
  }

  function updateMilestoneScore(input) {
    var weight = parseFloat(input.getAttribute('data-weight')) || 0;
    var score = parseFloat(input.value) || 0;
    var row = input.closest('.weighted-row');
    if (row) {
      var contrib = row.querySelector('.weighted-contribution strong');
      if (contrib) contrib.textContent = ((score * weight) / 100).toFixed(1);
    }
  }

  function updateGradeTotal() {
    var inputs = document.querySelectorAll(
      '#grade-weighted-score-breakdown .ms-score-input',
    );
    var totalWeighted = 0;
    var maxWeighted = 0;
    inputs.forEach(function (input) {
      var weight = parseFloat(input.getAttribute('data-weight')) || 0;
      var max = parseFloat(input.getAttribute('data-max')) || 100;
      var score = parseFloat(input.value) || 0;
      totalWeighted += (score * weight) / 100;
      maxWeighted += (max * weight) / 100;
    });
    var pct =
      maxWeighted > 0 ? Math.round((totalWeighted / maxWeighted) * 100) : 0;
    document.getElementById('grade-grade-total').textContent =
      'Overall: ' +
      totalWeighted.toFixed(1) +
      ' / ' +
      maxWeighted.toFixed(1) +
      ' (' +
      pct +
      '%)';
  }

  async function submitGrade() {
    var statusEl = document.getElementById('grade-grade-status');
    statusEl.textContent = '';
    statusEl.className = 'form-status';

    if (!gradeCurrentSubmission) return;

    if (!S || !S.trackingProjectService) {
      statusEl.textContent = 'Projects service unavailable.';
      statusEl.className = 'form-status form-status-error';
      return;
    }

    var msInputs = document.querySelectorAll(
      '#grade-weighted-score-breakdown .ms-score-input',
    );
    var milestoneStatuses = gradeCurrentSubmission.milestoneStatuses || [];
    var feedbackText = document
      .getElementById('grade-feedback-text')
      .value.trim();

    statusEl.textContent = 'Saving...';
    statusEl.className = 'form-status form-status-info';

    try {
      await Promise.all(
        Array.from(msInputs).map(function (input, idx) {
          var ms = milestoneStatuses[idx];
          if (!ms || !ms.submissionId) return Promise.resolve();
          var score = parseFloat(input.value);
          return S.trackingProjectService.submitReview(ms.submissionId, {
            status: 'graded',
            score: isNaN(score) ? null : score,
            feedback: feedbackText,
          });
        }),
      );

      var milestoneScores = Array.from(msInputs).map(function (input) {
        return parseFloat(input.value) || 0;
      });
      var totalScore = milestoneScores.reduce(function (a, b) {
        return a + b;
      }, 0);

      gradeCurrentSubmission.status = 'graded';
      gradeCurrentSubmission.score = totalScore;
      gradeCurrentSubmission.feedbackText = feedbackText;
      milestoneStatuses.forEach(function (ms, idx) {
        ms.score = milestoneScores[idx];
        ms.reviewStatus = 'graded';
      });

      statusEl.textContent = 'Grade saved successfully!';
      statusEl.className = 'form-status form-status-success';
      renderGradeSubmissions();
      setTimeout(function () {
        statusEl.textContent = '';
      }, 3000);
    } catch (err) {
      statusEl.textContent = 'Failed to save: ' + (err?.message || 'Error');
      statusEl.className = 'form-status form-status-error';
    }
  }

  function closeGradeModal() {
    document.getElementById('grade-detail-modal').style.display = 'none';
    gradeCurrentSubmission = null;
  }

  /* ── Final Grade Summary ─────────────────────────── */

  function renderFinalGradeSummary() {
    var container = document.getElementById('grade-final-summary');
    if (!gradeSubmissions.length || !gradeCurrentProject) {
      container.style.display = 'none';
      return;
    }

    var total = gradeSubmissions.length;
    var finalized = gradeSubmissions.filter(function (s) {
      return s.status === 'graded';
    }).length;
    var notFinalized = total - finalized;
    var scores = gradeSubmissions
      .filter(function (s) {
        return s.score != null;
      })
      .map(function (s) {
        return s.score;
      });
    var avg = scores.length
      ? Math.round(
          scores.reduce(function (a, b) {
            return a + b;
          }, 0) / scores.length,
        )
      : 0;
    var maxScore = gradeCurrentProject.points || 100;

    document.getElementById('final-stat-teams').textContent = total;
    document.getElementById('final-stat-finalized').textContent = finalized;
    document.getElementById('final-stat-not-finalized').textContent =
      notFinalized;
    document.getElementById('final-stat-avg-grade').textContent =
      avg + '/' + maxScore + ' (' + Math.round((avg / maxScore) * 100) + '%)';

    var allMembers = [];
    gradeSubmissions.forEach(function (s) {
      if (s.contribution && s.contribution.length) {
        s.contribution.forEach(function (c) {
          allMembers.push({
            name: c.name,
            commits: c.commits || 0,
            pct: c.percentage || 0,
          });
        });
      }
    });

    var adjContainer = document.getElementById('final-member-adjustments');
    var adjRows = document.getElementById('final-member-adjust-rows');
    if (allMembers.length > 0) {
      adjContainer.style.display = '';
      var maxCommit =
        Math.max.apply(
          null,
          allMembers.map(function (m) {
            return m.commits;
          }),
        ) || 1;
      adjRows.innerHTML = allMembers
        .map(function (m) {
          var barPct = Math.round((m.commits / maxCommit) * 100);
          return (
            '<div class="final-adjust-row">' +
            '<span class="final-adjust-name">' +
            escapeHtml(m.name) +
            '</span>' +
            '<div class="final-adjust-track"><div class="final-adjust-fill" style="width:' +
            barPct +
            '%;"></div></div>' +
            '<span class="final-adjust-commits">' +
            m.commits +
            ' commits</span>' +
            '<span class="final-adjust-pct">' +
            m.pct +
            '%</span>' +
            '</div>'
          );
        })
        .join('');
    } else {
      adjContainer.style.display = 'none';
    }

    container.style.display = '';
  }

  async function finalizeAllGrades() {
    if (!gradeSubmissions.length) return;
    if (
      !confirm(
        'Finalize all grades? This will mark all pending submissions as graded based on their current milestone scores.',
      )
    )
      return;

    if (!S || !S.trackingProjectService) {
      alert('Projects service unavailable.');
      return;
    }

    var pending = gradeSubmissions.filter(function (s) {
      return s.status !== 'graded';
    });
    if (!pending.length) {
      alert('All submissions are already finalized.');
      return;
    }

    var finalizedCount = 0;
    var errors = 0;

    for (var i = 0; i < pending.length; i += 1) {
      var submission = pending[i];
      await enrichGradeSubmissionReviews(submission);
      var msStatuses = submission.milestoneStatuses || [];
      var totalWeighted = 0;
      var maxWeighted = 0;
      msStatuses.forEach(function (ms) {
        var score = ms.score || 0;
        var max = ms.maxScore || 100;
        totalWeighted += (score * (ms.weight || 0)) / 100;
        maxWeighted += (max * (ms.weight || 0)) / 100;
      });
      var finalScore =
        maxWeighted > 0
          ? Math.round(
              (totalWeighted / maxWeighted) *
                (gradeCurrentProject.points || 100),
            )
          : 0;

      try {
        await Promise.all(
          msStatuses.map(function (ms) {
            if (!ms.submissionId) return Promise.resolve();
            return S.trackingProjectService.submitReview(ms.submissionId, {
              status: 'graded',
              score: ms.score != null ? ms.score : finalScore,
              feedback: 'Finalized automatically',
            });
          }),
        );
        submission.status = 'graded';
        submission.score = finalScore;
        submission.gradedAt = new Date().toISOString();
        finalizedCount += 1;
      } catch (_) {
        errors += 1;
      }
    }

    renderGradeSubmissions();
    renderFinalGradeSummary();
    updateStats();
    alert(
      'Finalized ' +
        finalizedCount +
        ' submission(s)' +
        (errors ? ' (' + errors + ' errors)' : '') +
        '.',
    );
  }

  /* ── Init ────────────────────────────────────────── */

  async function init() {
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
      }
    } catch (_) {}

    setupEvents();
    setupTabSwitching();
    seedDefaultRows();
    await loadCourses();
  }

  function seedDefaultRows() {
    var milestones = document.getElementById('milestones-container');
    if (milestones && !milestones.children.length) {
      addMilestoneRow();
    }
    var rubric = document.getElementById('rubric-container');
    if (rubric && !rubric.children.length) {
      var div2 = document.createElement('div');
      div2.className = 'dynamic-row';
      div2.innerHTML =
        '<input type="text" class="rubric-criterion" placeholder="Criterion description" style="flex:2;">' +
        '<input type="number" class="rubric-score" placeholder="Max score" value="10" min="0" style="flex:0 0 100px;">' +
        '<span class="dynamic-row-unit">pts</span>' +
        '<button type="button" class="btn-remove-row" title="Remove criterion">&times;</button>';
      rubric.appendChild(div2);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
