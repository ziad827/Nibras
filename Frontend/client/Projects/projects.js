var projectsPage = {
  courseId: '',
  activeCourse: null,
  activeProgress: null,
  webhookSocket: null,
  webhookEvents: [],
  maxWebhookEvents: 50,
};
function getSocketBaseUrl() {
  var base = window.NIBRAS_BACKEND_URL || window.location.origin;
  return base.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

function updateSidebarUser() {
  try {
    var u = JSON.parse(localStorage.getItem('user'));
    if (!u || !u.name) return;
    var nameEl = document.querySelector('.user-info h4');
    if (nameEl) nameEl.textContent = u.name;
    var roleEl = document.querySelector('.user-info span');
    if (roleEl) {
      var r = u.role;
      roleEl.textContent =
        typeof r === 'object' && r
          ? r.name || r.title || 'student'
          : r || 'student';
    }
    var avatarEl = document.querySelector('.avatar-circle');
    if (avatarEl) {
      var initials = u.name
        .split(' ')
        .map(function (n) {
          return n.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2);
      avatarEl.textContent = initials || 'U';
    }
    var smallAvatar = document.querySelector('.profile-circle-small');
    if (smallAvatar) smallAvatar.textContent = initials || 'U';
  } catch (_) {}
}

window.NibrasReact.run(function () {
  updateSidebarUser();
  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    var htmlEl = document.documentElement;
    var themeIcon = themeToggle.querySelector('i');
    var saved = localStorage.getItem('theme') || 'light';
    htmlEl.setAttribute('data-theme', saved);
    updateUI(themeIcon, saved);
    themeToggle.classList.remove('rotating');
    void themeToggle.offsetWidth;
    themeToggle.addEventListener('click', function () {
      var cur = htmlEl.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      htmlEl.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateUI(themeIcon, next);
      themeToggle.classList.add('rotating');
      setTimeout(function () {
        themeToggle.classList.remove('rotating');
      }, 500);
    });
  }
  function updateUI(el, theme) {
    if (!el) return;
    el.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    var logo = document.querySelector('.sidebar-logo');
    if (logo)
      logo.src =
        theme === 'dark'
          ? '../Assets/images/logo-dark.png'
          : '../Assets/images/logo-light.png';
  }

  var sel = document.getElementById('course-select');
  if (sel)
    sel.addEventListener('change', function () {
      if (this.value) loadCourse(this.value);
      else showEmpty();
    });

  loadDropdown();
});

function setMsg(msg, type) {
  var el = document.getElementById('projects-api-notice');
  if (!el) return;
  el.style.display = msg ? '' : 'none';
  el.textContent = msg || '';
  if (type === 'error') el.style.color = '#ef4444';
  else if (type === 'loading') el.style.color = '';
  else el.style.color = '';
}

function showEmpty() {
  document.getElementById('projects-hero').style.display = 'none';
  document.getElementById('progress-container').style.display = 'none';
  document.getElementById('project-grid').style.display = 'none';
  document.getElementById('projects-empty').style.display = '';
}

function showContent() {
  document.getElementById('projects-empty').style.display = 'none';
  document.getElementById('projects-hero').style.display = '';
  document.getElementById('progress-container').style.display = '';
  document.getElementById('project-grid').style.display = '';
}

function loadDropdown() {
  var sel = document.getElementById('course-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">Loading courses...</option>';
  var urlId = new URLSearchParams(window.location.search).get('courseId') || '';

  if (!window.NibrasServices?.coursesService) {
    sel.innerHTML = '<option value="">Service unavailable</option>';
    return;
  }
  window.NibrasServices.coursesService
    .list({ page: 1, limit: 100 })
    .then(function (res) {
      var items = res?.data?.items || res?.data || [];
      var courses = Array.isArray(items)
        ? items
        : Array.isArray(res?.data)
          ? res.data
          : [];
      if (!courses.length) {
        sel.innerHTML = '<option value="">No courses</option>';
        return;
      }
      sel.innerHTML = '<option value="">Select a course...</option>';
      var matched = false;
      courses.forEach(function (c) {
        var id = c._id || c.id || '';
        var name = c.title || c.courseCode || id;
        var selected = id === urlId ? 'selected' : '';
        if (selected) matched = true;
        sel.innerHTML +=
          '<option value="' +
          esc(id) +
          '" ' +
          selected +
          '>' +
          esc(name) +
          '</option>';
      });
      document.getElementById('available-count').textContent =
        courses.length + ' available';
      var target =
        urlId || (courses.length === 1 ? courses[0]._id || courses[0].id : '');
      if (target) {
        sel.value = target;
        loadCourse(target);
      } else showEmpty();
    })
    .catch(function () {
      sel.innerHTML = '<option value="">Failed to load</option>';
      showEmpty();
    });
}

function loadCourse(courseId) {
  if (!courseId) {
    showEmpty();
    return;
  }
  projectsPage.courseId = courseId;
  showContent();
  setMsg('Loading course...', 'loading');

  var svc = window.NibrasServices;
  if (!svc || !svc.coursesService) {
    setMsg('Service unavailable', 'error');
    return;
  }

  var userId = null;
  try {
    var u = JSON.parse(localStorage.getItem('user') || '{}');
    if (u._id) userId = u._id;
  } catch (_) {}

  Promise.all([
    svc.coursesService.getById(courseId).catch(function () {
      return null;
    }),
    svc.coursesService.getProgress(courseId).catch(function () {
      return null;
    }),
    userId
      ? svc.backendAnalyticsService
          .getStudentPerformance(userId)
          .catch(function () {
            return null;
          })
      : Promise.resolve(null),
  ]).then(function (results) {
    var courseRes = results[0];
    var progRes = results[1];
    var perfRes = results[2];
    setMsg('');

    if (!courseRes) {
      setMsg('Course not found', 'error');
      showEmpty();
      return;
    }

    var course = courseRes.data || courseRes;
    var progress = (progRes && (progRes.data || progRes)) || {};
    var performance = (perfRes && (perfRes.data || perfRes)) || {};

    projectsPage.activeCourse = course;
    projectsPage.activeProgress = progress;

    renderPage(course, progress, performance);
  });
}

function renderPage(course, progress, performance) {
  var title = course.title || 'Course';
  var code = course.courseCode || '';
  var desc = course.description || '';
  var level = course.level || '';
  var category = course.category || '';
  var sections = course.sections || [];
  var instructorName = course.instructorName || '';

  var items = progress.items || [];
  var completedSections = progress.completedSections || [];
  var pct = progress.percentage || 0;
  var status = progress.status || 'not_started';

  var completedCount = Array.isArray(completedSections)
    ? completedSections.length
    : 0;
  var totalSections = sections.length || items.length || 0;
  if (!totalSections) totalSections = course.assignmentsCount || 0;

  var courseGrade = '';
  var gradeSummary = performance.coursesGradeSummary || [];
  if (gradeSummary.length) {
    var match = gradeSummary.find(function (g) {
      var gid = g.courseId || '';
      return gid === course._id || gid === course.id || g.title === title;
    });
    if (match)
      courseGrade = match.weightedGrade
        ? match.weightedGrade + '%'
        : match.percentage
          ? match.percentage + '%'
          : '';
  }

  // Hero
  document.getElementById('hero-course-code').textContent =
    (code ? code + ' · ' : '') +
    (level || '') +
    (level && instructorName ? ' · ' : '') +
    (instructorName || '');
  document.getElementById('hero-title').textContent = title;
  document.getElementById('hero-subtitle').textContent =
    category || 'Track your course progress and milestones.';

  // Stats
  document.getElementById('stat-sections').textContent = totalSections;
  document.getElementById('stat-completed').textContent = completedCount;
  document.getElementById('stat-complete').textContent = pct + '%';

  // Progress bar
  document.getElementById('progress-title').textContent =
    (code ? code + ' — ' : '') + title;
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-level').textContent =
    level || category || 'Active';
  document.getElementById('progress-status').textContent = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, function (l) {
      return l.toUpperCase();
    });

  // Progress card
  document.getElementById('progress-pct-large').textContent = pct + '%';
  document.getElementById('legend-approved').textContent = completedCount;
  document.getElementById('legend-review').textContent = 0;
  document.getElementById('legend-open').textContent =
    totalSections - completedCount;

  document.getElementById('stat-approved-val').textContent =
    completedCount + ' / ' + totalSections;
  document.getElementById('stat-review-val').textContent = '0';
  document.getElementById('stat-open-val').textContent =
    totalSections - completedCount;

  // Milestones
  document.getElementById('milestone-count').textContent =
    completedCount + ' / ' + totalSections + ' complete';
  var milestoneList = document.getElementById('milestone-list');
  milestoneList.innerHTML = '';

  if (sections.length === 0 && items.length === 0) {
    milestoneList.innerHTML =
      '<div class="milestone-item"><div class="milestone-left"><div class="milestone-circle"><i class="far fa-circle"></i></div><div><h4>No sections yet</h4><p>Course content coming soon.</p></div></div></div>';
  } else {
    var itemMap = {};
    if (items.length)
      items.forEach(function (it) {
        if (it.sectionId) itemMap[it.sectionId] = it;
      });

    (sections.length ? sections : items).forEach(function (sec) {
      var secId = sec._id || sec.sectionId || '';
      var secTitle = sec.title || 'Section';
      var state = 'available';
      if (secId && itemMap[secId]) state = itemMap[secId].state || 'available';
      var isDone = state === 'completed';
      var icon = isDone
        ? 'fa-regular fa-circle-check'
        : state === 'available'
          ? 'far fa-circle'
          : 'fa-solid fa-lock';
      var iconColor = isDone
        ? 'color:#22c55e;'
        : state === 'locked'
          ? 'color:#94a3b8;'
          : '';
      var label =
        state.charAt(0).toUpperCase() + state.slice(1).replace(/_/g, ' ');

      milestoneList.innerHTML += [
        '<div class="milestone-item" data-section-id="' +
          esc(secId) +
          '" data-section-title="' +
          esc(secTitle) +
          '">',
        '<div class="milestone-left">',
        '<div class="milestone-circle" style="' +
          iconColor +
          '"><i class="' +
          icon +
          '"></i></div>',
        '<div>',
        '<h4>' +
          esc(secTitle) +
          ' <span class="status-open">' +
          label +
          '</span></h4>',
        '<p>' + (sec.description ? esc(sec.description) : '') + '</p>',
        '</div>',
        '</div>',
        '<i class="fas fa-chevron-right arrow"></i>',
        '</div>',
      ].join('');
    });

    milestoneList.querySelectorAll('.milestone-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var existing = this.querySelector('.milestone-submit-area');
        if (existing) {
          existing.remove();
          return;
        }
        var title = this.getAttribute('data-section-title') || 'Section';
        var btn = document.createElement('div');
        btn.className = 'milestone-submit-area';
        btn.innerHTML =
          '<button class="btn-submit-gradient" style="padding:0.6rem 1.2rem;font-size:0.85rem;width:auto;display:inline-flex;align-items:center;gap:0.5rem;" onclick="event.stopPropagation();openMilestoneSubmit(\'' +
          esc(this.getAttribute('data-section-id')) +
          "','" +
          esc(title) +
          '\')"><i class="fas fa-upload"></i> Submit ' +
          esc(title) +
          '</button>';
        this.appendChild(btn);
      });
    });
  }

  // Intro card
  document.getElementById('project-desc').textContent =
    desc || 'No description available.';
  var badge = document.getElementById('project-badge');
  if (badge) badge.textContent = level ? level.toUpperCase() : 'ACTIVE';

  var metaWeight = document.getElementById('meta-weight');
  var metaType = document.getElementById('meta-type');
  if (metaWeight) metaWeight.textContent = courseGrade || 'Graded';
  if (metaType) metaType.textContent = category || 'Course';

  document.getElementById('standing-label').textContent = level || 'Year 1';
  var hint = document.getElementById('standing-hint');
  if (hint) hint.textContent = 'Complete all sections to advance.';
  document.getElementById('final-desc').textContent =
    'Submit your work for ' + esc(title) + '.';

  document.getElementById('stat-time').textContent = status.replace(/_/g, ' ');
}

function esc(str) {
  if (!str && str !== 0) return '';
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

function openMilestoneSubmit(sectionId, sectionTitle) {
  var modal = document.getElementById('submissionModal');
  if (!modal) return;
  var titleEl = modal.querySelector('.modal-header h2');
  if (titleEl) titleEl.textContent = 'Submit: ' + (sectionTitle || 'Milestone');
  var milestoneInput = document.getElementById('milestone-id-input');
  if (!milestoneInput) {
    milestoneInput = document.createElement('input');
    milestoneInput.type = 'hidden';
    milestoneInput.id = 'milestone-id-input';
    milestoneInput.name = 'milestone_id';
    document
      .getElementById('milestone-form-content')
      .appendChild(milestoneInput);
  }
  milestoneInput.value = sectionId || 'final';
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('finalSubmitForm').onsubmit = handleSubmit;
  document.getElementById('submission-status-message').textContent = '';
  document.getElementById('milestone-form-content').style.display = '';
  document.getElementById('submit-final-btn').style.display = '';
}

function openSubmissionModal() {
  var modal = document.getElementById('submissionModal');
  if (!modal) return;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('finalSubmitForm').onsubmit = handleSubmit;
  document.getElementById('submission-status-message').textContent = '';
  document.getElementById('milestone-form-content').style.display = '';
  document.getElementById('submit-final-btn').style.display = '';
}

function closeSubmissionModal() {
  var modal = document.getElementById('submissionModal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.getElementById('submission-status-message').textContent = '';
}

async function handleSubmit(event) {
  event.preventDefault();
  var fd = new FormData(document.getElementById('finalSubmitForm'));
  var repoUrl = fd.get('resource_link') || '';
  if (!repoUrl.trim()) {
    alert('Please enter a submission URL.');
    return;
  }

  var submitBtn = document.getElementById('submit-final-btn');
  var msg = document.getElementById('submission-status-message');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  msg.textContent = '';

  try {
    var svc = window.NibrasServices;
    if (svc && svc.coursesService) {
      await svc.coursesService.createSubmission({
        courseId: projectsPage.courseId,
        assignmentId: 'final',
        githubLink: repoUrl,
      });
      msg.textContent = 'Submitted successfully!';
      msg.style.color = '#22c55e';
      document.getElementById('milestone-form-content').style.display = 'none';
      document.getElementById('btn-close-pulse').style.display = '';
    } else {
      msg.textContent = 'Submission service unavailable.';
      msg.style.color = '#ef4444';
    }
  } catch (err) {
    msg.textContent = 'Error: ' + (err.message || 'Submission failed');
    msg.style.color = '#ef4444';
  }
  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit Project';
}

document.addEventListener('click', function (event) {
  var modal = document.getElementById('submissionModal');
  if (modal && modal.classList.contains('active') && event.target === modal)
    closeSubmissionModal();
});

// ============================================================
// Webhook Activity Feed (Socket.io)
// ============================================================
function initWebhookSocket() {
  if (projectsPage.webhookSocket && projectsPage.webhookSocket.connected)
    return;
  var baseUrl = getSocketBaseUrl();
  if (typeof io === 'undefined' || !baseUrl) return;
  projectsPage.webhookSocket = io(baseUrl, {
    transports: ['websocket', 'polling'],
  });
  projectsPage.webhookSocket.on('connect', function () {
    if (projectsPage.courseId) {
      projectsPage.webhookSocket.emit('project:join', {
        courseId: projectsPage.courseId,
      });
    }
  });
  projectsPage.webhookSocket.on('project:commit', function (payload) {
    addWebhookEvent({ type: 'commit', payload: payload });
  });
  projectsPage.webhookSocket.on('project:pr', function (payload) {
    addWebhookEvent({ type: 'pr', payload: payload });
  });
  projectsPage.webhookSocket.on('reconnect', function () {
    if (projectsPage.courseId) {
      projectsPage.webhookSocket.emit('project:join', {
        courseId: projectsPage.courseId,
      });
    }
  });
}

function joinProjectRoom(courseId) {
  projectsPage.courseId = courseId;
  if (projectsPage.webhookSocket && projectsPage.webhookSocket.connected) {
    projectsPage.webhookSocket.emit('project:join', { courseId: courseId });
  }
  fetchRecentWebhookEvents(courseId);
}

function addWebhookEvent(event) {
  event.timestamp = event.timestamp || Date.now();
  event.id =
    event.id ||
    'wh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  projectsPage.webhookEvents.unshift(event);
  if (projectsPage.webhookEvents.length > projectsPage.maxWebhookEvents) {
    projectsPage.webhookEvents.length = projectsPage.maxWebhookEvents;
  }
  renderWebhookFeed();
  updateWebhookBadge(true);
}

function renderWebhookFeed() {
  var feed = document.getElementById('webhook-feed');
  if (!feed) return;
  if (!projectsPage.webhookEvents.length) {
    feed.innerHTML =
      '<div class="empty-state"><i class="fa-solid fa-code-branch"></i><p>Waiting for webhook events...</p><p class="empty-state-sub">Connect GitHub or GitLab in Integrations to see commit and PR activity here in real time.</p></div>';
    return;
  }
  var html = '<div class="webhook-list">';
  projectsPage.webhookEvents.forEach(function (ev) {
    var p = ev.payload || {};
    var isCommit = ev.type === 'commit';
    var icon = isCommit
      ? '<i class="fa-solid fa-code-commit"></i>'
      : '<i class="fa-solid fa-code-pull-request"></i>';
    var title = isCommit ? p.message || 'Commit' : p.title || 'Pull Request';
    var repo = p.repository || p.repo || '';
    var author = p.author || p.pusher || p.sender || '';
    var branch =
      p.branch || p.ref ? (p.ref || '').replace('refs/heads/', '') : '';
    var time = '';
    if (p.timestamp || ev.timestamp) {
      var diff = Date.now() - new Date(p.timestamp || ev.timestamp).getTime();
      var mins = Math.floor(diff / 60000);
      if (mins < 1) time = 'just now';
      else if (mins < 60) time = mins + 'm ago';
      else if (mins < 1440) time = Math.floor(mins / 60) + 'h ago';
      else time = Math.floor(mins / 1440) + 'd ago';
    }
    var url = p.url || p.html_url || '';
    var authorName = '';
    if (typeof author === 'object')
      authorName = author.name || author.login || '';
    else authorName = String(author);
    var branchStr = branch
      ? '<span class="wh-branch"><i class="fa-solid fa-code-branch"></i> ' +
        esc(branch) +
        '</span>'
      : '';
    var repoStr = repo
      ? '<span class="wh-repo">' +
        esc(
          typeof repo === 'object' ? repo.name || repo.full_name || '' : repo,
        ) +
        '</span>'
      : '';
    var shaStr =
      isCommit && p.sha
        ? '<span class="wh-sha">' + esc(p.sha.slice(0, 7)) + '</span>'
        : '';
    html +=
      '<div class="webhook-item wh-' +
      ev.type +
      '" data-id="' +
      esc(ev.id) +
      '">';
    html += '<div class="wh-icon">' + icon + '</div>';
    html += '<div class="wh-body">';
    html += '<div class="wh-title">' + esc(title) + '</div>';
    html += '<div class="wh-meta">' + repoStr + branchStr + shaStr + '</div>';
    if (authorName)
      html +=
        '<div class="wh-author"><i class="fa-solid fa-user"></i> ' +
        esc(authorName) +
        '</div>';
    html += '</div>';
    html += '<div class="wh-time">' + time + '</div>';
    if (url)
      html +=
        '<a href="' +
        esc(url) +
        '" target="_blank" class="wh-link" title="Open"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>';
    html += '</div>';
  });
  html += '</div>';
  feed.innerHTML = html;
}

function updateWebhookBadge(hasActivity) {
  var badge = document.getElementById('webhook-badge');
  if (!badge) return;
  if (hasActivity) {
    badge.innerHTML =
      '<i class="fa-solid fa-circle" style="color:#22c55e"></i> Live';
    badge.style.background = 'rgba(34,197,94,0.15)';
    badge.style.color = '#22c55e';
  } else {
    badge.innerHTML = '<i class="fa-solid fa-circle"></i> Connected';
    badge.style.background = '';
    badge.style.color = '';
  }
}

function fetchRecentWebhookEvents(courseId) {
  var baseUrl = window.NIBRAS_BACKEND_URL || '';
  if (!baseUrl) return;
  fetch(
    baseUrl + '/webhooks/activity?courseId=' + encodeURIComponent(courseId),
    {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + (localStorage.getItem('token') || ''),
      },
    },
  )
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      var items = Array.isArray(data) ? data : data?.events || data?.data || [];
      if (!items.length) return;
      items.forEach(function (ev) {
        addWebhookEvent({
          type: ev.type || 'commit',
          payload: ev.payload || ev,
          timestamp: ev.timestamp || ev.createdAt || Date.now(),
          id: ev._id || ev.id,
        });
      });
      updateWebhookBadge(true);
    })
    .catch(function () {});
}

// Patch loadCourse to join project room
var _origLoadCourse = loadCourse;
loadCourse = function (courseId) {
  if (!courseId) {
    showEmpty();
    return;
  }
  joinProjectRoom(courseId);
  _origLoadCourse(courseId);
};

window.NibrasReact.run(function () {
  if (typeof io !== 'undefined') initWebhookSocket();
});
