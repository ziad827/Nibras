window.NibrasReact.run(() => {
  var appLogo = document.getElementById('app-logo');
  if (appLogo) {
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') appLogo.src = '/Assets/images/logo-dark.png';
  }

  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.forEach((n) => n.classList.remove('active'));
      link.classList.add('active');
    });
  });

  const apiFetch = window.NibrasShared?.apiFetch;
  const resolveServiceUrl =
    window.NibrasApiConfig?.getServiceUrl?.bind(window.NibrasApiConfig) ||
    window.NibrasShared?.resolveServiceUrl ||
    (() => null);

  const adminApiBase = String(
    resolveServiceUrl('admin') || 'https://nibras-backend.up.railway.app/api',
  ).replace(/\/+$/, '');
  const trackingApiBase = String(
    resolveServiceUrl('tracking') ||
      'https://nibras-backend.up.railway.app/api',
  ).replace(/\/+$/, '');

  function getBaseForService(service) {
    if (service === 'tracking') return trackingApiBase;
    return adminApiBase;
  }

  function isCompatibilityStatus(status) {
    return status === 404 || status === 405 || status === 501;
  }

  var serviceCandidates = ['tracking', 'admin'];

  function buildServiceCandidates() {
    const unique = [];
    serviceCandidates.forEach((service) => {
      const base = getBaseForService(service);
      if (!base) return;
      const duplicate = unique.some((entry) => entry.base === base);
      if (!duplicate) unique.push({ service, base });
    });
    return unique;
  }

  async function apiRequestWithFallback(
    path,
    options = {},
    fallbackStatuses = [404, 405, 501],
  ) {
    if (!apiFetch) throw new Error('API fetch utility is unavailable.');
    let lastError = null;
    const candidates = buildServiceCandidates();
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      try {
        return await apiFetch(
          path,
          Object.assign({}, options, { service: candidate.service }),
        );
      } catch (error) {
        const status = Number(error?.status || 0);
        const isLast = i === candidates.length - 1;
        const shouldFallback = fallbackStatuses.includes(status);
        lastError = error;
        if (!shouldFallback || isLast) throw error;
      }
    }
    throw lastError || new Error('No compatible endpoint for ' + path);
  }

  function getUserDisplay() {
    try {
      var u = JSON.parse(localStorage.getItem('user') || '{}');
      return {
        id: u._id || u.id || '',
        name: u.name || u.username || 'User',
        initials: (u.name || u.username || 'User')
          .split(' ')
          .map(function (n) {
            return n[0];
          })
          .join('')
          .substring(0, 2)
          .toUpperCase(),
        role: u.role?.name || u.role || 'student',
      };
    } catch (_) {
      return { id: '', name: 'User', initials: 'US', role: 'student' };
    }
  }

  // ============================================================
  // Room Listing
  // ============================================================
  var rooms = [];

  function renderRooms() {
    var grid = document.getElementById('room-grid');
    var countEl = document.getElementById('room-count');
    if (!grid) return;

    if (!rooms || rooms.length === 0) {
      grid.innerHTML =
        '<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-video"></i></div><h3>No study rooms yet</h3><p>Create a room to start studying with others in real-time</p></div>';
      if (countEl) countEl.textContent = '';
      return;
    }

    if (countEl)
      countEl.textContent =
        rooms.length + ' room' + (rooms.length !== 1 ? 's' : '');

    grid.innerHTML = '';
    rooms.forEach(function (room, idx) {
      var isLive = room.status === 'live' || room.status === 'active';
      var participantCount = Array.isArray(room.participants)
        ? room.participants.length
        : room.participantCount || 0;
      var shortDesc = (room.description || '').substring(0, 120);

      var card = document.createElement('div');
      var stagger = Math.min(idx + 1, 8);
      card.className = 'room-card animate-in animate-stagger-' + stagger;

      card.innerHTML = [
        '<div class="room-card-header">',
        '<span class="room-card-name">' +
          escapeHtml(room.name || 'Untitled') +
          '</span>',
        '<span class="room-status-badge ' +
          (isLive ? 'live' : 'ended') +
          '">' +
          (isLive ? '<i class="fa-solid fa-circle"></i> Live' : 'Ended') +
          '</span>',
        '</div>',
        '<div class="room-card-desc">' +
          (shortDesc ? escapeHtml(shortDesc) : 'No description') +
          '</div>',
        '<div class="room-card-footer">',
        '<div class="participant-avatars">',
        renderParticipantAvatars(room.participants, participantCount),
        '<span class="participant-count-text">' +
          participantCount +
          ' ' +
          (participantCount === 1 ? 'participant' : 'participants') +
          '</span>',
        '</div>',
        '<button class="btn btn-primary btn-sm join-room-btn" data-room-id="' +
          encodeURIComponent(room._id || room.id) +
          '" ' +
          (isLive ? '' : 'disabled') +
          '>' +
          (isLive
            ? '<i class="fa-solid fa-video"></i> Join'
            : '<i class="fa-solid fa-lock"></i> Ended') +
          '</button>',
        '</div>',
      ].join('');

      grid.appendChild(card);
    });

    document.querySelectorAll('.join-room-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var roomId = this.getAttribute('data-room-id');
        if (roomId) {
          window.location.href = './room.html?id=' + encodeURIComponent(roomId);
        }
      });
    });
  }

  function renderParticipantAvatars(participants, count) {
    var html = '';
    if (Array.isArray(participants) && participants.length > 0) {
      var maxShow = Math.min(participants.length, 4);
      for (var i = 0; i < maxShow; i++) {
        var p = participants[i];
        var initials = '?';
        if (p.name) {
          initials = p.name
            .split(' ')
            .map(function (n) {
              return n[0];
            })
            .join('')
            .substring(0, 2)
            .toUpperCase();
        } else if (p.username) {
          initials = p.username.substring(0, 2).toUpperCase();
        }
        html +=
          '<span class="participant-avatar" title="' +
          escapeHtml(p.name || p.username || 'User') +
          '">' +
          escapeHtml(initials) +
          '</span>';
      }
      if (participants.length > 4) {
        html +=
          '<span class="participant-avatar" style="background-color:var(--text-tertiary);">+' +
          (participants.length - 4) +
          '</span>';
      }
    } else if (count > 0) {
      html += '<span class="participant-avatar">' + count + '</span>';
    }
    return html;
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function loadRooms() {
    try {
      var data = await apiRequestWithFallback('/api/rooms', {
        method: 'GET',
        auth: true,
      });
      rooms = Array.isArray(data) ? data : data?.rooms || data?.data || [];
    } catch (err) {
      rooms = [];
    }
    renderRooms();
  }

  // ============================================================
  // Create Room
  // ============================================================
  document
    .getElementById('btn-create-room')
    ?.addEventListener('click', async function () {
      var btn = this;
      var name = document.getElementById('room-name')?.value?.trim();
      var description = document.getElementById('room-desc')?.value?.trim();
      var passcode = document.getElementById('room-passcode')?.value?.trim();
      var errorEl = document.getElementById('create-room-error');

      if (!name) {
        if (errorEl) {
          errorEl.textContent = 'Please enter a room name.';
          errorEl.style.display = 'block';
        }
        return;
      }
      if (errorEl) errorEl.style.display = 'none';

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';

      try {
        var body = { name: name };
        if (description) body.description = description;
        if (passcode) body.passcode = passcode;

        var result = await apiRequestWithFallback('/api/rooms', {
          method: 'POST',
          auth: true,
          body: body,
        });
        var roomId =
          result?._id || result?.id || result?.room?._id || result?.room?.id;
        if (roomId) {
          window.location.href = './room.html?id=' + encodeURIComponent(roomId);
        } else {
          loadRooms();
        }
      } catch (err) {
        if (errorEl) {
          errorEl.textContent =
            'Failed to create room: ' + (err.message || 'Unknown error');
          errorEl.style.display = 'block';
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> Create Room';
      }
    });

  // Allow Enter key to submit
  document
    .getElementById('room-name')
    ?.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')
        document.getElementById('btn-create-room')?.click();
    });

  // ============================================================
  // Socket.io for real-time room updates
  // ============================================================
  var socket = null;

  function initSocket() {
    var baseUrl = (
      adminApiBase ||
      trackingApiBase ||
      'https://nibras-backend.up.railway.app/api'
    )
      .replace(/\/api\/?$/, '')
      .replace(/\/+$/, '');
    var script = document.createElement('script');
    script.src = baseUrl + '/socket.io/socket.io.js';
    script.onload = function () {
      if (typeof io === 'undefined') return;
      socket = io(baseUrl, { transports: ['websocket', 'polling'] });
      socket.on('connect', function () {
        socket.emit('studyrooms:list');
      });
      socket.on('studyrooms:updated', function (data) {
        var updatedRooms = Array.isArray(data) ? data : data?.rooms || [];
        if (updatedRooms.length > 0) {
          rooms = updatedRooms;
          renderRooms();
        } else {
          loadRooms();
        }
      });
    };
    document.head.appendChild(script);
  }

  // ============================================================
  // Init
  // ============================================================
  loadRooms();
  initSocket();
});
