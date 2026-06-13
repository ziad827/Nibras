window.NibrasReact.run(function () {
  var suggestionsContainer = document.getElementById('mentor-suggestions');
  var requestsContainer = document.getElementById('my-requests-container');
  var requestsSection = document.getElementById('my-requests-section');
  var requestModal = document.getElementById('request-modal');
  var requestMessage = document.getElementById('request-message');
  var submitBtn = document.getElementById('submit-request-btn');
  var cancelBtn = document.getElementById('cancel-request-btn');
  var mentorNameDisplay = document.getElementById('request-modal-mentor-name');
  var toastEl = document.getElementById('toast');

  var currentMentorId = null;
  var requestedIds = [];

  var services = window.NibrasServices;

  function esc(str) {
    if (!str && str !== 0) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function showToast(message, type) {
    toastEl.textContent = message;
    toastEl.className = 'toast ' + type + ' show';
    setTimeout(function () {
      toastEl.classList.remove('show');
    }, 4000);
  }

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      var d = new Date(dateStr);
      var now = new Date();
      var diff = now - d;
      var mins = Math.floor(diff / 60000);
      var hours = Math.floor(diff / 3600000);
      var days = Math.floor(diff / 86400000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return mins + 'm ago';
      if (hours < 24) return hours + 'h ago';
      if (days < 7) return days + 'd ago';
      return d.toLocaleDateString();
    } catch (_) {
      return String(dateStr || '');
    }
  }

  function loadSuggestions() {
    if (!services || !services.mentorshipService) {
      suggestionsContainer.innerHTML =
        '<div class="empty-state"><i class="fa-solid fa-user-group"></i><p>Mentorship service not available.</p></div>';
      return;
    }

    suggestionsContainer.innerHTML =
      '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;margin-bottom:1rem;display:block;"></i><p>Finding mentors for you...</p></div>';

    services.mentorshipService
      .getSuggestions(20)
      .then(function (res) {
        var data = res && (res.data || res);
        var suggestions = Array.isArray(data)
          ? data
          : Array.isArray(data.suggestions)
            ? data.suggestions
            : [];
        if (suggestions.length === 0) {
          suggestionsContainer.innerHTML =
            '<div class="empty-state"><i class="fa-solid fa-user-group"></i><p>No mentor suggestions available right now. Check back later!</p></div>';
          return;
        }
        renderSuggestions(suggestions);
      })
      .catch(function (err) {
        console.error('Failed to load mentor suggestions:', err);
        suggestionsContainer.innerHTML =
          '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Could not load mentor suggestions. Try again later.</p></div>';
      });
  }

  function renderSuggestions(suggestions) {
    var html = '<div class="mentor-grid">';
    suggestions.forEach(function (s) {
      var mentorId = s._id || s.id || s.userId || s.mentorId || '';
      var name =
        s.mentorName || s.name || s.fullName || s.mentor?.name || 'Mentor';
      var role = s.role || s.mentorRole || s.mentor?.role || 'Mentor';
      var bio = s.bio || s.description || s.mentor?.bio || '';
      var topics = s.expertise || s.topics || s.specialties || s.skills || [];
      if (typeof topics === 'string')
        topics = topics.split(',').map(function (t) {
          return t.trim();
        });
      if (!Array.isArray(topics)) topics = [];
      var confidence = s.confidence || s.matchConfidence || s.score || '';
      var responseTime = s.responseTime || s.availability || '';
      var isRequested = requestedIds.indexOf(mentorId) !== -1;

      html +=
        '<div class="mentor-card" data-mentor-id="' + esc(mentorId) + '">';
      html += '<div class="mentor-avatar">' + esc(getInitials(name)) + '</div>';
      html += '<div class="mentor-name">' + esc(name) + '</div>';
      if (role) html += '<div class="mentor-role">' + esc(role) + '</div>';
      if (bio)
        html +=
          '<p style="font-size:0.88rem;color:var(--text-secondary);margin:0 0 0.75rem;">' +
          esc(bio.length > 120 ? bio.substring(0, 120) + '...' : bio) +
          '</p>';
      if (topics.length > 0) {
        html += '<div class="mentor-tags">';
        topics.forEach(function (t) {
          html +=
            '<span class="mentor-tag">' +
            esc(typeof t === 'string' ? t : t.name || t) +
            '</span>';
        });
        html += '</div>';
      }
      html += '<div class="mentor-stats">';
      if (confidence)
        html +=
          '<span><i class="fa-solid fa-chart-line"></i> ' +
          esc(confidence) +
          (typeof confidence === 'number' || /^\d+$/.test(confidence)
            ? '% match'
            : '') +
          '</span>';
      if (responseTime)
        html +=
          '<span><i class="fa-regular fa-clock"></i> ' +
          esc(responseTime) +
          '</span>';
      html += '</div>';
      html += '<div class="mentor-actions">';
      html +=
        '<button class="btn-request' +
        (isRequested ? ' requested' : '') +
        '" data-mentor-id="' +
        esc(mentorId) +
        '" data-mentor-name="' +
        esc(name) +
        '"' +
        (isRequested ? ' disabled' : '') +
        '>' +
        (isRequested
          ? '<i class="fa-regular fa-circle-check"></i> Requested'
          : '<i class="fa-solid fa-user-plus"></i> Request Mentor') +
        '</button>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    suggestionsContainer.innerHTML = html;
  }

  function loadMyRequests() {
    if (!services || !services.mentorshipService) {
      requestsSection.style.display = 'none';
      return;
    }

    var user;
    try {
      user = JSON.parse(localStorage.getItem('user') || '{}');
    } catch (_) {
      user = {};
    }
    var userId = user._id || user.id || user.userId;

    var hasRequests = false;
    var items = [];
    try {
      var cached = JSON.parse(
        localStorage.getItem('mentorship_requests') || '[]',
      );
      if (Array.isArray(cached)) items = cached;
    } catch (_) {
      items = [];
    }

    if (items.length === 0) {
      requestsSection.style.display = 'none';
      return;
    }

    hasRequests = true;
    requestsSection.style.display = 'block';

    var html = '';
    items.forEach(function (req) {
      var mentorName = req.mentorName || req.mentor?.name || 'Mentor';
      var status = req.status || 'pending';
      var createdAt = req.createdAt || req.created || '';
      var message = req.message || '';
      html += '<div class="request-item">';
      html += '<div class="request-info">';
      html += '<strong>' + esc(mentorName) + '</strong>';
      if (message)
        html +=
          '<span>' +
          esc(
            message.length > 80 ? message.substring(0, 80) + '...' : message,
          ) +
          '</span>';
      html += '</div>';
      html += '<div style="display:flex;align-items:center;gap:12px;">';
      if (createdAt)
        html +=
          '<span style="font-size:0.8rem;color:var(--text-secondary);">' +
          formatDate(createdAt) +
          '</span>';
      html +=
        '<span class="status-badge ' +
        esc(status) +
        '">' +
        esc(status.charAt(0).toUpperCase() + status.slice(1)) +
        '</span>';
      html += '</div>';
      html += '</div>';
    });
    requestsContainer.innerHTML = html;
  }

  suggestionsContainer.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn-request');
    if (!btn || btn.disabled) return;

    var mentorId = btn.dataset.mentorId;
    var mentorName = btn.dataset.mentorName;
    if (!mentorId) return;

    currentMentorId = mentorId;
    mentorNameDisplay.textContent = 'Send a message to ' + mentorName;
    requestMessage.value = '';
    submitBtn.disabled = true;
    requestModal.classList.add('active');

    setTimeout(function () {
      requestMessage.focus();
    }, 100);
  });

  requestMessage.addEventListener('input', function () {
    submitBtn.disabled = requestMessage.value.trim().length === 0;
  });

  cancelBtn.addEventListener('click', function () {
    requestModal.classList.remove('active');
    currentMentorId = null;
  });

  requestModal.addEventListener('click', function (e) {
    if (e.target === requestModal) {
      requestModal.classList.remove('active');
      currentMentorId = null;
    }
  });

  submitBtn.addEventListener('click', function () {
    if (!currentMentorId) return;

    var message = requestMessage.value.trim();
    if (!message) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    services.mentorshipService
      .requestMentor(currentMentorId, message)
      .then(function () {
        showToast('Mentor request sent successfully!', 'success');
        requestModal.classList.remove('active');

        if (requestedIds.indexOf(currentMentorId) === -1) {
          requestedIds.push(currentMentorId);
        }

        var btn = suggestionsContainer.querySelector(
          '.btn-request[data-mentor-id="' + esc(currentMentorId) + '"]',
        );
        if (btn) {
          btn.disabled = true;
          btn.classList.add('requested');
          btn.innerHTML =
            '<i class="fa-regular fa-circle-check"></i> Requested';
        }

        try {
          var existing = JSON.parse(
            localStorage.getItem('mentorship_requests') || '[]',
          );
          existing.unshift({
            mentorId: currentMentorId,
            mentorName: mentorNameDisplay.textContent.replace(
              'Send a message to ',
              '',
            ),
            status: 'pending',
            message: message,
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem('mentorship_requests', JSON.stringify(existing));
        } catch (_) {}

        loadMyRequests();
        currentMentorId = null;
        submitBtn.textContent = 'Send Request';
      })
      .catch(function (err) {
        console.error('Request mentor error:', err);
        showToast(err.message || 'Failed to send request. Try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Request';
      });
  });

  var themeBtn = document.getElementById('themeBtn');
  var themeIcon = themeBtn ? themeBtn.querySelector('i') : null;
  var appLogo = document.getElementById('app-logo');

  var savedTheme = localStorage.getItem('theme');
  if (savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme);
  var currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  if (currentTheme === 'dark') {
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
    if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  }

  if (themeBtn) {
    themeBtn.classList.remove('rotating');
    void themeBtn.offsetWidth;
    themeBtn.addEventListener('click', function () {
      themeBtn.classList.add('rotating');
      setTimeout(function () {
        themeBtn.classList.remove('rotating');
      }, 500);
      var html = document.documentElement;
      var cur = html.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      if (themeIcon)
        themeIcon.className =
          next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      if (appLogo)
        appLogo.src =
          next === 'dark'
            ? '/Assets/images/logo-dark.png'
            : '/Assets/images/logo-light.png';
    });
  }

  try {
    var user = JSON.parse(localStorage.getItem('user') || '{}');
    var initials = user.name
      ? getInitials(user.name)
      : user.email
        ? user.email[0].toUpperCase()
        : '?';
    document
      .querySelectorAll('.avatar-circle, .profile-circle-small')
      .forEach(function (el) {
        el.textContent = initials;
      });
    var nameEl = document.querySelector('.user-info h4');
    if (nameEl) nameEl.textContent = user.name || 'User';
    var roleEl = document.querySelector('.user-info span');
    if (roleEl) roleEl.textContent = user.role?.name || user.role || 'student';
    var repEl = document.querySelector('.rep-badge');
    if (repEl) repEl.textContent = user.reputation || user.rep || 0;
  } catch (_) {}

  try {
    var cached = JSON.parse(
      localStorage.getItem('mentorship_requests') || '[]',
    );
    if (Array.isArray(cached)) {
      cached.forEach(function (req) {
        if (req.mentorId && requestedIds.indexOf(req.mentorId) === -1) {
          requestedIds.push(req.mentorId);
        }
      });
    }
  } catch (_) {}

  loadSuggestions();
  loadMyRequests();
});
