(function () {
  'use strict';

  var S = window.NibrasServices;
  var allCourses = [];
  var activeCourseId = null;
  var activeCourseData = null;
  var projects = [];
  var submissions = [];
  var demoProjects = [];
  var demoProjectIdCounter = 0;
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

  /* ── API helper ──────────────────────────────────── */

  function apiFetch(path, options) {
    options = options || {};
    var service = options.service || 'admin';
    var method = options.method || 'GET';
    var auth = options.auth !== false;
    var baseUrl =
      window.NibrasApiConfig && window.NibrasApiConfig.getServiceUrl
        ? window.NibrasApiConfig.getServiceUrl(service)
        : window.NIBRAS_API_URL || 'https://nibras-backend.up.railway.app/api';
    baseUrl = String(baseUrl).replace(/\/+$/, '');
    var url = baseUrl + path;
    var headers = { 'Content-Type': 'application/json' };
    if (auth) {
      var token = window.localStorage.getItem('token');
      if (token) headers['Authorization'] = 'Bearer ' + token;
    }
    var fetchOptions = { method: method, headers: headers };
    if (options.body) fetchOptions.body = JSON.stringify(options.body);
    return fetch(url, fetchOptions).then(async function (response) {
      if (!response.ok) {
        var body = null;
        try {
          body = await response.json();
        } catch (_) {}
        var err = new Error(
          (body && (body.message || body.error)) ||
            'Request failed (' + response.status + ')',
        );
        err.status = response.status;
        err.payload = body;
        throw err;
      }
      return response.json();
    });
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
    // Load from backend (existing assignments)
    try {
      var resp = await S.backendCoursesService.getAssignments(courseId);
      var raw = resp && (resp.data || resp);
      projects = Array.isArray(raw)
        ? raw
        : raw && Array.isArray(raw.items)
          ? raw.items
          : [];
    } catch (err) {
      projects = [];
    }
    // Merge with locally-stored Phase 7 demo projects
    var courseDemo = demoProjects.filter(function (p) {
      return p.courseId === courseId;
    });
    if (courseDemo.length) {
      // Prepend demo projects (newest first)
      courseDemo.reverse();
      courseDemo.forEach(function (dp) {
        // Avoid duplicates by id
        var dup = false;
        for (var i = 0; i < projects.length; i++) {
          if ((projects[i]._id || projects[i].id) === (dp._id || dp.id)) {
            dup = true;
            break;
          }
        }
        if (!dup) projects.unshift(dp);
      });
    }
    renderProjects();
  }

  async function loadSubmissions(courseId) {
    var listEl = document.getElementById('review-list');
    try {
      var resp = await S.instructorDashboardService.getRecentSubmissions({
        courseId: courseId,
        limit: 50,
      });
      var raw = resp && (resp.data || resp);
      submissions = Array.isArray(raw)
        ? raw
        : raw && Array.isArray(raw.items)
          ? raw.items
          : [];
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
        var pid = p._id || p.id || '';
        var ptitle = p.title || 'Untitled';
        var pstatus = (p.status || 'draft').toLowerCase();
        var dueDate = p.dueDate
          ? formatDate(p.dueDate)
          : p.endDate
            ? formatDate(p.endDate)
            : 'No due date';
        var maxScore = p.maxScore || p.points || 100;
        var teamSize = p.teamSize || 0;
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
          ptitle +
          '</strong>' +
          '<div class="inst-proj-meta">' +
          '<span><i class="fa-regular fa-calendar"></i> ' +
          dueDate +
          '</span>' +
          '<span><i class="fa-solid fa-star"></i> ' +
          maxScore +
          ' pts</span>' +
          '<span><i class="fa-solid fa-user"></i> ' +
          (teamSize > 0 ? 'Team: ' + teamSize : 'Individual') +
          '</span>' +
          '</div></div>' +
          '<div class="inst-proj-actions">' +
          '<button class="inst-proj-action-btn" data-action="edit" data-id="' +
          pid +
          '" title="Edit"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="inst-proj-action-btn danger" data-action="delete" data-id="' +
          pid +
          '" title="Delete"><i class="fa-solid fa-trash-can"></i></button>' +
          '</div></div>'
        );
      })
      .join('');
  }

  function renderReviewQueue() {
    var listEl = document.getElementById('review-list');
    var pending = submissions.filter(function (s) {
      var st = (s.status || '').toLowerCase();
      return st === 'pending' || st === 'submitted' || st === 'needs_review';
    });

    if (!pending.length) {
      listEl.innerHTML =
        '<div class="inst-proj-review-empty"><i class="fa-regular fa-circle-check"></i><p style="margin-top:0.5rem;">No pending submissions!</p></div>';
      return;
    }

    listEl.innerHTML = pending
      .slice(0, 10)
      .map(function (s) {
        var sid = s._id || s.id || '';
        var sname = s.studentName || s.name || s.student?.name || 'Student';
        var ptitle =
          s.projectTitle || s.assignmentTitle || s.title || 'Project';
        var stime = formatTimeAgo(
          s.submittedAt || s.createdAt || s.submissionDate,
        );
        return (
          '<div class="inst-proj-review-item" data-id="' +
          sid +
          '">' +
          '<div class="review-item-info">' +
          '<strong>' +
          sname +
          '</strong>' +
          '<div class="review-item-meta"><span>' +
          ptitle +
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
        var sid = s._id || s.id || '';
        var sname = s.studentName || s.name || s.student?.name || 'Student';
        var ptitle =
          s.projectTitle || s.assignmentTitle || s.title || 'Project';
        var sstatus = (s.status || 'pending').toLowerCase();
        var grade = s.grade != null ? s.grade + '/100' : '—';
        var stime = formatTimeAgo(
          s.submittedAt || s.createdAt || s.submissionDate,
        );
        var statusClass = getStatusClass(sstatus);
        return (
          '<tr data-id="' +
          sid +
          '">' +
          '<td class="sub-student">' +
          sname +
          '</td>' +
          '<td>' +
          ptitle +
          '</td>' +
          '<td><span class="inst-proj-status-badge ' +
          statusClass +
          '">' +
          sstatus.replace('_', ' ') +
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
      return st === 'pending' || st === 'submitted' || st === 'needs_review';
    }).length;
    var approved = submissions.filter(function (s) {
      var st = (s.status || '').toLowerCase();
      return st === 'approved' || st === 'graded';
    }).length;
    var studentSet = {};
    submissions.forEach(function (s) {
      var uid = s.userId || s.studentId || s.student?._id || s.student?.id;
      if (uid) studentSet[uid] = true;
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
      rows[i].style.display = filter === 'all' || st === filter ? '' : 'none';
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

  function openEditModal(projectId) {
    var p =
      findDemoProject(projectId) ||
      projects.find(function (x) {
        return (x._id || x.id) === projectId;
      });
    if (!p) {
      alert('Project not found.');
      return;
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
    document.getElementById('project-status').value = p.status || 'active';
    document.getElementById('project-max-score').value =
      p.maxScore || p.points || 100;
    document.getElementById('project-team-size').value = p.teamSize || 0;
    document.getElementById('project-repo-url').value = p.repoUrl || '';

    var milestoneContainer = document.getElementById('milestones-container');
    milestoneContainer.innerHTML = '';
    var ms = p.milestones || [];
    if (ms.length) {
      ms.forEach(function (m) {
        addMilestoneRow(m);
      });
    } else {
      addMilestoneRow();
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

  function addRubricRow() {
    var container = document.getElementById('rubric-container');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML =
      '<input type="text" class="rubric-criterion" placeholder="Criterion" style="flex:2;">' +
      '<input type="number" class="rubric-score" placeholder="Score" value="10" min="0" style="flex:0 0 100px;">' +
      '<span class="dynamic-row-unit">pts</span>' +
      '<button type="button" class="btn-remove-row" title="Remove">&times;</button>';
    container.appendChild(div);
  }

  function addResourceRow() {
    var container = document.getElementById('resources-container');
    if (!container) return;
    var div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML =
      '<input type="text" class="resource-label" placeholder="Label" style="flex:1;">' +
      '<input type="url" class="resource-url" placeholder="https://..." style="flex:2;">' +
      '<button type="button" class="btn-remove-row" title="Remove">&times;</button>';
    container.appendChild(div);
  }

  function findDemoProject(id) {
    for (var i = 0; i < demoProjects.length; i++) {
      if ((demoProjects[i]._id || demoProjects[i].id) === id)
        return demoProjects[i];
    }
    return null;
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

    // Store locally as demo Phase 7 data
    var now = new Date().toISOString();
    if (isEditing) {
      var existing = findDemoProject(editingProjectId);
      if (existing) {
        existing.title = title;
        existing.description = description;
        existing.startDate = startDate || null;
        existing.endDate = endDate || null;
        existing.status = status;
        existing.maxScore = maxScore;
        existing.teamSize = teamSize;
        existing.repoUrl = repoUrl || '';
        existing.milestones = milestones;
        existing.updatedAt = now;
      }
    } else {
      var newProject = {
        _id: 'demo-pj-' + ++demoProjectIdCounter,
        id: 'demo-pj-' + demoProjectIdCounter,
        courseId: activeCourseId,
        title: title,
        description: description,
        startDate: startDate || null,
        endDate: endDate || null,
        status: status,
        maxScore: maxScore,
        teamSize: teamSize,
        repoUrl: repoUrl || '',
        milestones: milestones,
        createdBy: getUser()._id || getUser().id || 'unknown',
        createdAt: now,
        updatedAt: now,
      };
      demoProjects.push(newProject);
    }

    submitBtn.textContent = isEditing ? 'Updating...' : 'Creating...';

    // Try existing backend (old /assignments endpoint) for backward compatibility
    try {
      await apiFetch('/assignments', {
        service: 'admin',
        method: 'POST',
        auth: true,
        body: {
          title: title,
          courseId: activeCourseId,
          description: description || undefined,
          dueDate: endDate || undefined,
          maxScore: maxScore,
        },
      });
    } catch (_) {
      // Old backend may not be running — not an error
    }

    closeCreateModal();
    await loadProjects(activeCourseId);
    updateStats();

    submitBtn.disabled = false;
    submitBtn.textContent = isEditing ? 'Update Project' : 'Create Project';
  }

  async function handleDeleteProject(projectId) {
    if (!confirm('Delete this project? This cannot be undone.')) return;

    // Remove from demo data
    var idx = -1;
    for (var i = 0; i < demoProjects.length; i++) {
      if ((demoProjects[i]._id || demoProjects[i].id) === projectId) {
        idx = i;
        break;
      }
    }
    if (idx !== -1) demoProjects.splice(idx, 1);

    // Try existing backend
    try {
      await apiFetch('/assignments/' + encodeURIComponent(projectId), {
        service: 'admin',
        method: 'DELETE',
        auth: true,
      });
    } catch (_) {}

    await loadProjects(activeCourseId);
    updateStats();
  }

  /* ── Review Modal ───────────────────────────────── */

  var activeReviewSubmission = null;

  function findSubmission(id) {
    for (var i = 0; i < submissions.length; i++) {
      if ((submissions[i]._id || submissions[i].id) === id)
        return submissions[i];
    }
    return null;
  }

  function openReviewModal(submissionId) {
    var s = findSubmission(submissionId);
    if (!s) return;
    activeReviewSubmission = s;

    document.getElementById('review-student-name').textContent =
      s.studentName || s.name || s.student?.name || 'Student';
    document.getElementById('review-project-name').textContent =
      s.projectTitle || s.assignmentTitle || s.title || 'Project';
    document.getElementById('review-submitted-at').textContent = formatDate(
      s.submittedAt || s.createdAt || s.submissionDate,
    );

    var githubLink = s.githubLink || s.repoUrl || s.githubUrl || '';
    var githubEl = document.getElementById('review-github-link');
    if (githubLink) {
      githubEl.href = githubLink;
      githubEl.textContent = githubLink;
      githubEl.style.display = '';
    } else {
      githubEl.textContent = 'Not provided';
      githubEl.href = '#';
    }

    document.getElementById('review-grade').value = s.grade || '';
    var statusRadios = document.querySelectorAll('input[name="review-status"]');
    var currentStatus = (s.status || 'pending').toLowerCase();
    for (var i = 0; i < statusRadios.length; i++) {
      if (statusRadios[i].value === currentStatus)
        statusRadios[i].checked = true;
    }

    document.getElementById('review-feedback').value =
      s.feedback || s.instructorNotes || '';
    document.getElementById('review-error').style.display = 'none';
    document.getElementById('review-modal').style.display = 'flex';
  }

  function closeReviewModal() {
    document.getElementById('review-modal').style.display = 'none';
    activeReviewSubmission = null;
  }

  async function handleReviewSubmit() {
    if (!activeReviewSubmission) return;
    var sid = activeReviewSubmission._id || activeReviewSubmission.id;
    var grade = parseInt(document.getElementById('review-grade').value);
    var statusEl = document.querySelector(
      'input[name="review-status"]:checked',
    );
    var status = statusEl ? statusEl.value : 'approved';
    var feedback = document.getElementById('review-feedback').value.trim();
    var errorEl = document.getElementById('review-error');

    var submitBtn = document.getElementById('submit-review-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    errorEl.style.display = 'none';

    try {
      await apiFetch('/submissions/' + encodeURIComponent(sid) + '/status', {
        service: 'admin',
        method: 'PATCH',
        auth: true,
        body: {
          status: status,
          grade: isNaN(grade) ? undefined : grade,
          feedback: feedback || undefined,
        },
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
      if (e.target.classList.contains('modal-overlay')) {
        if (e.target.id === 'create-project-modal') closeCreateModal();
        if (e.target.id === 'review-modal') closeReviewModal();
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
        alert('Templates page coming soon.');
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
    if (gradeInitialized) return;
    gradeInitialized = true;
    loadGradeProjects();
    setupGradeUI();
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

  function loadGradeProjects() {
    var select = document.getElementById('grade-project-select');
    var cid = activeCourseId;
    if (!cid) {
      select.innerHTML =
        '<option value="">Select a course on Projects tab first.</option>';
      return;
    }
    document.getElementById('grade-course-subtitle').textContent =
      'Course loaded';

    if (S && S.projectService) {
      S.projectService
        .listByCourse(cid)
        .then(function (res) {
          var items = res?.data || [];
          if (!Array.isArray(items)) items = [];
          gradeProjects = items;
          populateGradeSelect(select, items);
          if (!items.length) {
            document.getElementById('grade-empty-state').innerHTML =
              '<i class="fa-solid fa-diagram-project"></i><p>No projects yet. Create one in the Projects tab first.</p>';
            document.getElementById('grade-empty-state').style.display =
              'block';
          }
        })
        .catch(function () {
          gradeProjects = generateDemoGradeProjects();
          populateGradeSelect(select, gradeProjects);
        });
    } else {
      gradeProjects = generateDemoGradeProjects();
      populateGradeSelect(select, gradeProjects);
    }
  }

  function generateDemoGradeProjects() {
    return [
      {
        _id: 'demo-p1',
        title: 'Capstone Project',
        points: 200,
        teamSize: 3,
        milestones: [
          {
            name: 'Proposal',
            weight: 10,
            dueDate: new Date(Date.now() - 14 * 86400000).toISOString(),
          },
          {
            name: 'Design Document',
            weight: 20,
            dueDate: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
          {
            name: 'Implementation',
            weight: 40,
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          },
          {
            name: 'Final Report',
            weight: 30,
            dueDate: new Date(Date.now() + 21 * 86400000).toISOString(),
          },
        ],
      },
      {
        _id: 'demo-p2',
        title: 'Data Analysis Project',
        points: 150,
        teamSize: 2,
        milestones: [
          {
            name: 'Data Collection',
            weight: 25,
            dueDate: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
          {
            name: 'Analysis',
            weight: 50,
            dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
          },
          {
            name: 'Presentation',
            weight: 25,
            dueDate: new Date(Date.now() + 28 * 86400000).toISOString(),
          },
        ],
      },
    ];
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

  function loadGradeSubmissions(projectId) {
    gradeCurrentProject = gradeProjects.find(function (p) {
      return (p._id || p.id) === projectId;
    });
    var tbody = document.getElementById('grade-submissions-body');
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:32px">Loading submissions...</td></tr>';

    if (S && S.projectService) {
      S.projectService
        .getSubmissions(projectId)
        .then(function (res) {
          var items = res?.data || [];
          if (!Array.isArray(items)) items = [];
          gradeSubmissions = items;
          if (!gradeSubmissions.length) generateDemoGradeSubmissions(projectId);
          renderGradeSubmissions();
        })
        .catch(function () {
          generateDemoGradeSubmissions(projectId);
          renderGradeSubmissions();
        });
    } else {
      generateDemoGradeSubmissions(projectId);
      renderGradeSubmissions();
    }
    renderFinalGradeSummary();
  }

  function generateDemoGradeSubmissions(projectId) {
    var demoTeams = [
      {
        name: 'Team Alpha',
        members: ['Ahmed Hassan', 'Mariam Khalid', 'Youssef Ibrahim'],
      },
      { name: 'Team Beta', members: ['Laila Mostafa', 'Omar Abdelrahman'] },
      {
        name: 'Team Gamma',
        members: ['Nour El-Din', 'Hana Youssef', 'Karim Samir'],
      },
    ];
    var statuses = ['pending', 'evaluated', 'graded'];
    var p = gradeCurrentProject || { points: 100, milestones: [] };
    var milestones = p.milestones || [];

    gradeSubmissions = demoTeams.map(function (team, idx) {
      var status = statuses[idx % 3];
      var msStatuses = milestones.map(function (ms) {
        var done = status !== 'pending';
        var score = done ? Math.round(Math.random() * 100) : null;
        return {
          name: ms.name,
          weight: ms.weight,
          completed: done,
          score: score,
          maxScore: 100,
        };
      });
      var weightedScore = msStatuses.reduce(function (sum, ms) {
        return sum + ((ms.score || 0) * (ms.weight || 0)) / 100;
      }, 0);

      return {
        teamName: team.name,
        members: team.members,
        status: status,
        score:
          status === 'graded'
            ? Math.round((weightedScore * (p.points || 100)) / 100)
            : status === 'evaluated'
              ? Math.round((weightedScore * (p.points || 100)) / 100)
              : null,
        maxScore: p.points || 100,
        milestoneStatuses: msStatuses,
        contribution: team.members.map(function (m) {
          return {
            name: m,
            commits: Math.floor(Math.random() * 30 + 5),
            linesAdded: Math.floor(Math.random() * 1000 + 100),
            linesRemoved: Math.floor(Math.random() * 500 + 50),
            percentage: 0,
          };
        }),
        githubRepo:
          'https://github.com/nibras/' +
          team.name.toLowerCase().replace(/\s+/g, '-'),
        commits: [
          {
            message: 'Initial project setup',
            author: team.members[0],
            date: new Date(Date.now() - 20 * 86400000).toISOString(),
          },
          {
            message: 'Implement core algorithm',
            author: team.members[1],
            date: new Date(Date.now() - 12 * 86400000).toISOString(),
          },
          {
            message: 'Add unit tests',
            author: team.members[0],
            date: new Date(Date.now() - 8 * 86400000).toISOString(),
          },
          {
            message: 'Fix edge cases in parser',
            author: team.members[2] || team.members[1],
            date: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
          {
            message: 'Update documentation',
            author: team.members[1],
            date: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
        ],
        submittedAt: new Date(
          Date.now() - Math.random() * 10 * 86400000,
        ).toISOString(),
      };
    });

    gradeSubmissions.forEach(function (s) {
      var total = s.contribution.reduce(function (sum, c) {
        return sum + c.commits;
      }, 0);
      s.contribution.forEach(function (c) {
        c.percentage = total > 0 ? Math.round((c.commits / total) * 100) : 0;
      });
    });
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
        openGradeSubmission(idx);
      });
    });
  }

  function openGradeSubmission(idx) {
    gradeCurrentSubmission = gradeSubmissions[idx];
    if (!gradeCurrentSubmission) return;

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

  function submitGrade() {
    var statusEl = document.getElementById('grade-grade-status');
    statusEl.textContent = '';
    statusEl.className = 'form-status';

    if (!gradeCurrentSubmission) return;

    var msInputs = document.querySelectorAll(
      '#grade-weighted-score-breakdown .ms-score-input',
    );
    var milestoneScores = [];
    msInputs.forEach(function (input) {
      milestoneScores.push(parseFloat(input.value) || 0);
    });

    var feedbackText = document
      .getElementById('grade-feedback-text')
      .value.trim();

    var adjustments = {};
    document
      .querySelectorAll('#grade-adjustment-inputs .adjust-input')
      .forEach(function (input) {
        var idx = parseInt(input.getAttribute('data-g-idx'));
        var name =
          gradeCurrentSubmission.contribution &&
          gradeCurrentSubmission.contribution[idx]
            ? gradeCurrentSubmission.contribution[idx].name
            : 'Member ' + idx;
        adjustments[name] = parseFloat(input.value) || 0;
      });

    var totalScore = milestoneScores.reduce(function (a, b) {
      return a + b;
    }, 0);

    statusEl.textContent = 'Saving...';
    statusEl.className = 'form-status form-status-info';

    var submissionId = gradeCurrentSubmission._id || gradeCurrentSubmission.id;
    var promise;

    if (
      S &&
      S.projectService &&
      S.projectService.gradeSubmission &&
      submissionId
    ) {
      promise = S.projectService.gradeSubmission(submissionId, {
        milestoneScores: milestoneScores,
        totalScore: totalScore,
        comment: feedbackText,
        adjustments: adjustments,
      });
    } else {
      promise = new Promise(function (resolve) {
        setTimeout(function () {
          gradeCurrentSubmission.status = 'graded';
          gradeCurrentSubmission.score = totalScore;
          gradeCurrentSubmission.feedbackText = feedbackText;
          resolve({ ok: true });
        }, 500);
      });
    }

    promise
      .then(function () {
        statusEl.textContent = 'Grade saved successfully!';
        statusEl.className = 'form-status form-status-success';
        renderGradeSubmissions();
        setTimeout(function () {
          statusEl.textContent = '';
        }, 3000);
      })
      .catch(function (err) {
        statusEl.textContent = 'Failed to save: ' + (err?.message || 'Error');
        statusEl.className = 'form-status form-status-error';
      });
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

  function finalizeAllGrades() {
    if (!gradeSubmissions.length) return;
    if (
      !confirm(
        'Finalize all grades? This will mark all pending submissions as graded based on their current milestone scores.',
      )
    )
      return;

    var pending = gradeSubmissions.filter(function (s) {
      return s.status !== 'graded';
    });
    if (!pending.length) {
      alert('All submissions are already finalized.');
      return;
    }

    var finalizedCount = 0;
    var errors = 0;
    var total = pending.length;

    pending.forEach(function (s, idx) {
      var msStatuses = s.milestoneStatuses || [];
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

      s.status = 'graded';
      s.score = finalScore;
      s.gradedAt = new Date().toISOString();
      finalizedCount++;

      // Try backend
      var submissionId = s._id || s.id;
      if (
        S &&
        S.projectService &&
        S.projectService.gradeSubmission &&
        submissionId
      ) {
        S.projectService
          .gradeSubmission(submissionId, {
            totalScore: finalScore,
            milestoneScores: msStatuses.map(function (ms) {
              return ms.score || 0;
            }),
            comment: 'Finalized automatically',
          })
          .catch(function () {
            errors++;
          });
      }
    });

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
