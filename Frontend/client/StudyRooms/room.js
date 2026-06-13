window.NibrasReact.run(function () {
  var roomId = null;
  var socket = null;
  var localStream = null;
  var screenStream = null;
  var isScreenSharing = false;
  var isMicEnabled = true;
  var isCamEnabled = true;
  var isRecording = false;
  var mediaRecorder = null;
  var recordedChunks = [];
  var recordingStartTime = null;
  var recordingTimerInterval = null;

  var peers = {};
  var participants = {};
  var localUserId = null;
  var localUserDisplay = null;

  var user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch (_) {}

  var userId = user._id || user.id || 'anon-' + Date.now();
  var userName = user.name || user.username || 'You';
  var userInitials = userName
    .split(' ')
    .map(function (n) {
      return n[0];
    })
    .join('')
    .substring(0, 2)
    .toUpperCase();

  localUserId = userId;
  localUserDisplay = { id: userId, name: userName, initials: userInitials };

  var apiFetch = window.NibrasShared?.apiFetch;
  var resolveServiceUrl =
    window.NibrasApiConfig?.getServiceUrl?.bind(window.NibrasApiConfig) ||
    window.NibrasShared?.resolveServiceUrl ||
    function () {
      return null;
    };

  var adminApiBase = String(
    resolveServiceUrl('admin') || 'https://nibras-backend.up.railway.app/api',
  ).replace(/\/+$/, '');
  var trackingApiBase = String(
    resolveServiceUrl('tracking') ||
      'https://nibras-backend.up.railway.app/api',
  ).replace(/\/+$/, '');

  var serviceCandidates = ['tracking', 'admin'];

  function buildServiceCandidates() {
    var unique = [];
    serviceCandidates.forEach(function (service) {
      var base = service === 'tracking' ? trackingApiBase : adminApiBase;
      if (!base) return;
      var dup = unique.some(function (e) {
        return e.base === base;
      });
      if (!dup) unique.push({ service: service, base: base });
    });
    return unique;
  }

  async function apiRequestWithFallback(path, options) {
    if (!apiFetch) throw new Error('API fetch unavailable');
    var candidates = buildServiceCandidates();
    for (var i = 0; i < candidates.length; i++) {
      try {
        return await apiFetch(
          path,
          Object.assign({}, options, { service: candidates[i].service }),
        );
      } catch (err) {
        if (i === candidates.length - 1) throw err;
        var status = Number(err?.status || 0);
        if (status !== 404 && status !== 405 && status !== 501) throw err;
      }
    }
  }

  function getSocketBaseUrl() {
    var base = (
      adminApiBase ||
      trackingApiBase ||
      'https://nibras-backend.up.railway.app/api'
    )
      .replace(/\/api\/?$/, '')
      .replace(/\/+$/, '');
    return base;
  }

  function getRoomIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  // ============================================================
  // Socket.io Setup
  // ============================================================
  function initSocket() {
    roomId = getRoomIdFromUrl();
    if (!roomId) {
      document.getElementById('loading-video').innerHTML =
        '<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-circle-exclamation"></i></div><h3>No room ID specified</h3><p><a href="./rooms.html" style="color:var(--accent-blue);">Go back to rooms</a></p></div>';
      return;
    }

    var baseUrl = getSocketBaseUrl();
    var script = document.createElement('script');
    script.src = baseUrl + '/socket.io/socket.io.js';
    script.onload = function () {
      if (typeof io === 'undefined') {
        setTimeout(arguments.callee, 500);
        return;
      }
      socket = io(baseUrl, { transports: ['websocket', 'polling'] });

      socket.on('connect', function () {
        socket.emit('studyroom:join', {
          roomId: roomId,
          userId: userId,
          name: userName,
        });
      });

      socket.on('studyroom:users', function (data) {
        var users = Array.isArray(data) ? data : data?.users || [];
        users.forEach(function (u) {
          if (u.id !== userId) {
            participants[u.id] = u;
          }
        });
        updateParticipantsUI();
        users.forEach(function (u) {
          if (u.id !== userId && !peers[u.id]) {
            createPeerConnection(u.id, true);
          }
        });
      });

      socket.on('signal:offer', function (data) {
        if (data.from === userId) return;
        if (!peers[data.from]) {
          createPeerConnection(data.from, false);
        }
        var pc = peers[data.from]?.pc;
        if (pc) {
          pc.setRemoteDescription(new RTCSessionDescription(data.offer))
            .then(function () {
              return pc.createAnswer();
            })
            .then(function (answer) {
              return pc.setLocalDescription(answer);
            })
            .then(function () {
              socket.emit('signal:answer', {
                to: data.from,
                answer: pc.localDescription,
                roomId: roomId,
              });
            })
            .catch(function (err) {
              console.error('[room] Answer error:', err);
            });
        }
      });

      socket.on('signal:answer', function (data) {
        if (data.from === userId) return;
        var pc = peers[data.from]?.pc;
        if (pc && pc.signalingState !== 'stable') {
          pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(
            function (err) {
              console.error('[room] Set remote answer error:', err);
            },
          );
        }
      });

      socket.on('signal:ice-candidate', function (data) {
        if (data.from === userId) return;
        var pc = peers[data.from]?.pc;
        if (pc && data.candidate) {
          pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(
            function (err) {
              console.error('[room] Add ICE candidate error:', err);
            },
          );
        }
      });

      socket.on('studyroom:user-joined', function (data) {
        if (data.userId === userId) return;
        var u = { id: data.userId, name: data.name || 'User' };
        participants[u.id] = u;
        updateParticipantsUI();
        if (!peers[u.id]) {
          createPeerConnection(u.id, true);
        }
      });

      socket.on('studyroom:user-left', function (data) {
        if (data.userId === userId) return;
        delete participants[data.userId];
        closePeerConnection(data.userId);
        updateParticipantsUI();
      });

      socket.on('studyroom:info', function (data) {
        var nameEl = document.getElementById('room-name-display');
        var metaEl = document.getElementById('room-meta-display');
        if (nameEl && data.name) nameEl.textContent = data.name;
        if (metaEl) {
          var parts = [];
          if (data.participantCount !== undefined)
            parts.push(
              data.participantCount +
                ' participant' +
                (data.participantCount !== 1 ? 's' : ''),
            );
          if (data.description) parts.push(data.description);
          metaEl.textContent = parts.join(' · ');
        }
      });

      socket.on('disconnect', function () {
        for (var id in peers) closePeerConnection(id);
      });
    };
    document.head.appendChild(script);
  }

  // ============================================================
  // WebRTC Peer Connections
  // ============================================================
  var rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  function createPeerConnection(peerId, initiator) {
    if (peers[peerId]) return;

    var pc = new RTCPeerConnection(rtcConfig);
    var peerData = { pc: pc, stream: new MediaStream() };

    pc.onicecandidate = function (event) {
      if (event.candidate && socket) {
        socket.emit('signal:ice-candidate', {
          to: peerId,
          candidate: event.candidate,
          roomId: roomId,
        });
      }
    };

    pc.ontrack = function (event) {
      if (event.streams && event.streams[0]) {
        var remoteStream = event.streams[0];
        peerData.stream = remoteStream;
        addVideoContainer(
          peerId,
          remoteStream,
          participants[peerId]?.name || 'Peer',
        );
      }
    };

    pc.oniceconnectionstatechange = function () {
      if (
        pc.iceConnectionState === 'disconnected' ||
        pc.iceConnectionState === 'failed'
      ) {
        closePeerConnection(peerId);
      }
    };

    if (localStream) {
      localStream.getTracks().forEach(function (track) {
        pc.addTrack(track, localStream);
      });
    }

    peers[peerId] = peerData;

    if (initiator) {
      pc.createOffer()
        .then(function (offer) {
          return pc.setLocalDescription(offer);
        })
        .then(function () {
          if (socket) {
            socket.emit('signal:offer', {
              to: peerId,
              offer: pc.localDescription,
              roomId: roomId,
            });
          }
        })
        .catch(function (err) {
          console.error('[room] Offer error:', err);
        });
    }

    return peerData;
  }

  function closePeerConnection(peerId) {
    var peer = peers[peerId];
    if (peer) {
      if (peer.pc) {
        peer.pc.close();
      }
      delete peers[peerId];
    }
    removeVideoContainer(peerId);
  }

  // ============================================================
  // Local Media
  // ============================================================
  async function startLocalMedia() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      addLocalVideoContainer(localStream);
      document.getElementById('loading-video')?.remove();

      for (var id in peers) {
        var peer = peers[id];
        if (peer && peer.pc) {
          localStream.getTracks().forEach(function (track) {
            peer.pc.addTrack(track, localStream);
          });
        }
      }
    } catch (err) {
      document.getElementById('loading-video').innerHTML =
        '<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-circle-exclamation"></i></div><h3>Could not access camera/microphone</h3><p>' +
        (err.message || 'Please check permissions') +
        '</p></div>';
    }
  }

  // ============================================================
  // Video Grid UI
  // ============================================================
  function addVideoContainer(id, stream, displayName) {
    var grid = document.getElementById('video-grid');
    if (!grid) return;
    var existing = document.getElementById('video-' + id);
    if (existing) return;

    var container = document.createElement('div');
    container.className = 'video-container animate-in';
    container.id = 'video-' + id;

    var name = displayName || 'Peer';
    var initials = name
      .split(' ')
      .map(function (n) {
        return n[0];
      })
      .join('')
      .substring(0, 2)
      .toUpperCase();

    container.innerHTML = [
      '<div class="video-placeholder" id="placeholder-' + id + '">',
      '<div class="avatar-large">' + escapeHtml(initials) + '</div>',
      '<div class="name">' + escapeHtml(name) + '</div>',
      '</div>',
      '<video id="video-el-' +
        id +
        '" autoplay playsinline style="display:none;"></video>',
      '<div class="video-overlay">',
      '<span class="video-overlay-name">' + escapeHtml(name) + '</span>',
      '<span class="video-overlay-icons"><i class="fa-solid fa-volume-high" id="audio-indicator-' +
        id +
        '"></i></span>',
      '</div>',
    ].join('');

    grid.appendChild(container);

    var videoEl = container.querySelector('video');
    if (videoEl && stream) {
      videoEl.srcObject = stream;
      videoEl.style.display = '';
      videoEl.play().catch(function () {});
      container.querySelector('.video-placeholder')?.remove();
    }
  }

  function removeVideoContainer(id) {
    var el = document.getElementById('video-' + id);
    if (el) {
      var video = el.querySelector('video');
      if (video) {
        video.pause();
        video.srcObject = null;
      }
      el.remove();
    }
  }

  function addLocalVideoContainer(stream) {
    var grid = document.getElementById('video-grid');
    if (!grid) return;
    var existing = document.getElementById('video-local');
    if (existing) return;

    var container = document.createElement('div');
    container.className = 'video-container local animate-in';
    container.id = 'video-local';

    container.innerHTML = [
      '<div class="video-placeholder" id="placeholder-local">',
      '<div class="avatar-large">' + escapeHtml(userInitials) + '</div>',
      '<div class="name">You</div>',
      '</div>',
      '<video id="video-el-local" autoplay playsinline muted style="display:none;"></video>',
      '<div class="video-overlay">',
      '<span class="video-overlay-name">You</span>',
      '<span class="video-overlay-icons"><i class="fa-solid fa-microphone" id="mic-indicator-local"></i></span>',
      '</div>',
    ].join('');

    // Insert local video first
    if (grid.firstChild) {
      grid.insertBefore(container, grid.firstChild);
    } else {
      grid.appendChild(container);
    }

    var videoEl = container.querySelector('video');
    if (videoEl && stream) {
      videoEl.srcObject = stream;
      videoEl.style.display = '';
      videoEl.play().catch(function () {});
      container.querySelector('.video-placeholder')?.remove();
    }
  }

  function updateLocalMicIcon(enabled) {
    var micIcon = document.getElementById('mic-indicator-local');
    if (micIcon) {
      micIcon.className = enabled
        ? 'fa-solid fa-microphone'
        : 'fa-solid fa-microphone-slash';
    }
  }

  function updateLocalCamDisplay(enabled) {
    var videoEl = document.getElementById('video-el-local');
    var placeholder = document.getElementById('placeholder-local');
    if (videoEl) videoEl.style.display = enabled ? '' : 'none';
    if (placeholder) placeholder.style.display = enabled ? 'none' : 'flex';
  }

  // ============================================================
  // Participant List UI
  // ============================================================
  participants[localUserId] = {
    id: localUserId,
    name: userName + ' (you)',
    isYou: true,
  };

  function updateParticipantsUI() {
    var list = document.getElementById('participants-list');
    var countEl = document.getElementById('participant-count');
    if (!list) return;

    var allParticipants = {};
    allParticipants[localUserId] = participants[localUserId] || {
      id: localUserId,
      name: userName + ' (you)',
      isYou: true,
    };
    for (var id in participants) {
      if (id !== localUserId) {
        allParticipants[id] = participants[id];
      }
    }

    var count = Object.keys(allParticipants).length;
    if (countEl) countEl.textContent = count;

    list.innerHTML = '';
    var pIdx = 0;
    for (var pid in allParticipants) {
      var p = allParticipants[pid];
      var isOnline = pid === localUserId || peers[pid] !== undefined;
      var item = document.createElement('div');
      var stg = Math.min(pIdx + 1, 8);
      item.className = 'participant-item animate-in animate-stagger-' + stg;
      pIdx++;
      item.innerHTML = [
        '<span class="dot ' + (isOnline ? 'online' : 'muted') + '"></span>',
        '<span class="name">' + escapeHtml(p.name || 'User') + '</span>',
        p.isYou
          ? '<span class="status-icon" style="font-size:0.7rem;color:var(--text-tertiary);">(you)</span>'
          : '',
      ].join('');
      list.appendChild(item);
    }
  }

  // ============================================================
  // Controls
  // ============================================================
  function toggleMic() {
    if (!localStream) return;
    isMicEnabled = !isMicEnabled;
    localStream.getAudioTracks().forEach(function (track) {
      track.enabled = isMicEnabled;
    });
    var btn = document.getElementById('btn-mic');
    if (btn) {
      btn.className = 'btn ' + (isMicEnabled ? 'btn-active' : 'btn-danger-bg');
      btn.innerHTML = isMicEnabled
        ? '<i class="fa-solid fa-microphone"></i>'
        : '<i class="fa-solid fa-microphone-slash"></i>';
      btn.title = isMicEnabled ? 'Mute Microphone' : 'Unmute Microphone';
    }
    updateLocalMicIcon(isMicEnabled);
  }

  function toggleCam() {
    if (!localStream) return;
    isCamEnabled = !isCamEnabled;
    localStream.getVideoTracks().forEach(function (track) {
      track.enabled = isCamEnabled;
    });
    var btn = document.getElementById('btn-camera');
    if (btn) {
      btn.className = 'btn ' + (isCamEnabled ? 'btn-active' : 'btn-danger-bg');
      btn.innerHTML = isCamEnabled
        ? '<i class="fa-solid fa-video"></i>'
        : '<i class="fa-solid fa-video-slash"></i>';
      btn.title = isCamEnabled ? 'Turn Off Camera' : 'Turn On Camera';
    }
    updateLocalCamDisplay(isCamEnabled);
  }

  async function toggleScreenShare() {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStream.getVideoTracks()[0].onended = function () {
        stopScreenShare();
      };

      var screenTrack = screenStream.getVideoTracks()[0];
      for (var id in peers) {
        var peer = peers[id];
        if (peer && peer.pc) {
          var sender = peer.pc.getSenders().find(function (s) {
            return s.track && s.track.kind === 'video';
          });
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }
      }

      if (localStream) {
        var localVideoTrack = localStream.getVideoTracks()[0];
        if (localVideoTrack) {
          localStream.removeTrack(localVideoTrack);
          localVideoTrack.stop();
        }
        localStream.addTrack(screenTrack);
      }

      isScreenSharing = true;
      var btn = document.getElementById('btn-screen-share');
      if (btn) {
        btn.className = 'btn btn-danger-bg';
        btn.innerHTML = '<i class="fa-solid fa-stop"></i>';
        btn.title = 'Stop Sharing';
      }
    } catch (err) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        console.error('[room] Screen share error:', err);
      }
    }
  }

  function stopScreenShare() {
    if (!isScreenSharing) return;
    if (screenStream) {
      screenStream.getTracks().forEach(function (t) {
        t.stop();
      });
      screenStream = null;
    }
    isScreenSharing = false;

    startLocalCameraTrack();
    var btn = document.getElementById('btn-screen-share');
    if (btn) {
      btn.className = 'btn btn-inactive';
      btn.innerHTML = '<i class="fa-solid fa-desktop"></i>';
      btn.title = 'Share Screen';
    }
  }

  async function startLocalCameraTrack() {
    try {
      var newStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      var newVideoTrack = newStream.getVideoTracks()[0];

      if (localStream) {
        var oldTrack = localStream.getVideoTracks()[0];
        if (oldTrack) {
          localStream.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStream.addTrack(newVideoTrack);

        for (var id in peers) {
          var peer = peers[id];
          if (peer && peer.pc) {
            var sender = peer.pc.getSenders().find(function (s) {
              return s.track && s.track.kind === 'video';
            });
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            }
          }
        }
      }

      var videoEl = document.getElementById('video-el-local');
      if (videoEl && videoEl.srcObject !== localStream) {
        videoEl.srcObject = localStream;
      }
    } catch (err) {
      console.error('[room] Restart camera error:', err);
    }
  }

  // ============================================================
  // Recording
  // ============================================================
  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function startRecording() {
    if (!localStream) return;
    recordedChunks = [];
    try {
      mediaRecorder = new MediaRecorder(localStream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });
      mediaRecorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };
      mediaRecorder.onstop = function () {
        uploadRecording();
      };
      mediaRecorder.start(1000);
      isRecording = true;
      recordingStartTime = Date.now();

      var btn = document.getElementById('btn-record');
      if (btn) {
        btn.className = 'btn recording';
        btn.innerHTML = '<i class="fa-solid fa-stop"></i>';
        btn.title = 'Stop Recording';
      }
      document.getElementById('recording-timer').style.display = '';

      recordingTimerInterval = setInterval(updateRecordingTimer, 500);
    } catch (err) {
      console.error('[room] Start recording error:', err);
      alert('Recording is not supported in this browser.');
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    isRecording = false;
    if (recordingTimerInterval) {
      clearInterval(recordingTimerInterval);
      recordingTimerInterval = null;
    }

    var btn = document.getElementById('btn-record');
    if (btn) {
      btn.className = 'btn btn-inactive';
      btn.innerHTML = '<i class="fa-solid fa-circle"></i>';
      btn.title = 'Record';
    }
    document.getElementById('recording-timer').style.display = 'none';
    document.getElementById('recording-time').textContent = '00:00';
  }

  function updateRecordingTimer() {
    var el = document.getElementById('recording-time');
    if (!el || !recordingStartTime) return;
    var elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    var mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    var secs = String(elapsed % 60).padStart(2, '0');
    el.textContent = mins + ':' + secs;
  }

  function uploadRecording() {
    if (recordedChunks.length === 0) return;
    var blob = new Blob(recordedChunks, { type: 'video/webm' });
    var formData = new FormData();
    formData.append('recording', blob, 'recording-' + Date.now() + '.webm');

    var uploadUrl =
      (adminApiBase || trackingApiBase || '').replace(/\/api\/?$/, '') +
      '/api/rooms/' +
      encodeURIComponent(roomId) +
      '/recordings';

    fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + (localStorage.getItem('token') || ''),
      },
      body: formData,
    })
      .then(function (res) {
        if (res.ok) {
          console.log('[room] Recording uploaded');
        }
      })
      .catch(function (err) {
        console.error('[room] Recording upload failed:', err);
      });

    recordedChunks = [];
  }

  // ============================================================
  // Leave Room
  // ============================================================
  function leaveRoom() {
    if (isRecording) stopRecording();
    if (isScreenSharing) stopScreenShare();

    if (socket) {
      socket.emit('studyroom:leave', { roomId: roomId, userId: userId });
      socket.disconnect();
    }

    for (var id in peers) {
      closePeerConnection(id);
    }

    if (localStream) {
      localStream.getTracks().forEach(function (t) {
        t.stop();
      });
      localStream = null;
    }

    window.location.href = './rooms.html';
  }

  // ============================================================
  // Init
  // ============================================================
  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Wire controls
  document.getElementById('btn-mic')?.addEventListener('click', toggleMic);
  document.getElementById('btn-camera')?.addEventListener('click', toggleCam);
  document
    .getElementById('btn-screen-share')
    ?.addEventListener('click', toggleScreenShare);
  document
    .getElementById('btn-record')
    ?.addEventListener('click', toggleRecording);
  document.getElementById('btn-leave')?.addEventListener('click', function () {
    if (confirm('Leave this study room?')) leaveRoom();
  });

  window.addEventListener('beforeunload', function () {
    if (socket) {
      socket.emit('studyroom:leave', { roomId: roomId, userId: userId });
    }
  });

  // Start
  initSocket();
  setTimeout(startLocalMedia, 500);
});
