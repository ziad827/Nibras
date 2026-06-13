window.NibrasReact.run(function () {
  var teamService = window.NibrasServices?.teamService;
  var competitionsService = window.NibrasServices?.competitionsService;
  var shared = window.NibrasShared || {};

  var token = (function () {
    try {
      if (typeof shared.auth?.getToken === 'function')
        return shared.auth.getToken();
    } catch (_) {}
    return localStorage.getItem('token') || null;
  })();
  var authEnabled = Boolean(token);
  var currentUserId = null;
  var myTeams = [];
  var discoveredTeams = [];
  var pendingInvitations = [];

  var els = {
    myTeamsGrid: document.getElementById('my-teams-grid'),
    myTeamsEmpty: document.getElementById('my-teams-empty'),
    discoverGrid: document.getElementById('discover-grid'),
    discoverEmpty: document.getElementById('discover-empty'),
    invitationsGrid: document.getElementById('invitations-grid'),
    invitationsEmpty: document.getElementById('invitations-empty'),
    myTeamCount: document.getElementById('my-team-count'),
    openTeamCount: document.getElementById('open-team-count'),
    pendingInviteCount: document.getElementById('pending-invite-count'),
    inviteBadge: document.getElementById('inviteBadge'),
    createTeamBtn: document.getElementById('createTeamBtn'),
    createTeamModal: document.getElementById('createTeamModal'),
    createTeamClose: document.getElementById('createTeamClose'),
    createTeamCancel: document.getElementById('createTeamCancel'),
    createTeamForm: document.getElementById('createTeamForm'),
    teamContest: document.getElementById('teamContest'),
    teamDetailModal: document.getElementById('teamDetailModal'),
    teamDetailClose: document.getElementById('teamDetailClose'),
    teamDetailTitle: document.getElementById('teamDetailTitle'),
    teamDetailDescription: document.getElementById('teamDetailDescription'),
    teamDetailMembers: document.getElementById('teamDetailMembers'),
    teamDetailContest: document.getElementById('teamDetailContest'),
    teamDetailStatus: document.getElementById('teamDetailStatus'),
    teamDetailMembersList: document.getElementById('teamDetailMembersList'),
    teamDetailActions: document.getElementById('teamDetailActions'),
    teamSearchInput: document.getElementById('teamSearchInput'),
  };

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }

  function esc(str) {
    if (!str && str !== 0) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function getQueryParam(name) {
    var match = new RegExp('[?&]' + name + '=([^&]*)').exec(
      window.location.search,
    );
    return match ? decodeURIComponent(match[1]) : null;
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

  function showFeedback(message, tone) {
    var notice =
      document.getElementById('feedback-notice') ||
      (function () {
        var n = document.createElement('div');
        n.id = 'feedback-notice';
        n.style.cssText =
          'margin-bottom:14px;padding:10px 14px;border-radius:6px;display:none;font-size:0.9rem;';
        var wrapper = document.querySelector('.content-wrapper');
        if (wrapper) wrapper.insertBefore(n, wrapper.children[2] || null);
        return n;
      })();
    if (!message) {
      notice.style.display = 'none';
      return;
    }
    notice.style.display = 'block';
    if (tone === 'error') {
      notice.style.background = 'rgba(220,38,38,0.1)';
      notice.style.color = '#dc2626';
      notice.style.border = '1px solid rgba(220,38,38,0.2)';
    } else if (tone === 'success') {
      notice.style.background = 'rgba(16,185,129,0.1)';
      notice.style.color = '#10b981';
      notice.style.border = '1px solid rgba(16,185,129,0.2)';
    } else {
      notice.style.background = 'rgba(37,99,235,0.1)';
      notice.style.color = 'var(--accent-blue)';
      notice.style.border = '1px solid rgba(37,99,235,0.2)';
    }
    notice.textContent = message;
    setTimeout(function () {
      notice.style.display = 'none';
    }, 5000);
  }

  function isAuthError(error) {
    return (
      Number(error?.status || 0) === 401 || Number(error?.status || 0) === 403
    );
  }

  function renderTeamCard(team, showActions) {
    var memberCount = Array.isArray(team.members)
      ? team.members.length
      : team.memberCount || 0;
    var maxMembers = team.maxMembers || 4;
    var isOpen = team.openJoin !== false;
    var contestName =
      team.contestName ||
      (team.contestId && typeof team.contestId === 'object'
        ? team.contestId.title
        : null) ||
      '';

    return (
      '<div class="team-card" data-id="' +
      esc(team._id || team.id) +
      '">' +
      '<div class="team-card-header">' +
      '<div class="team-card-avatar">' +
      getInitials(team.name) +
      '</div>' +
      '<div class="team-card-title">' +
      '<h4>' +
      esc(team.name || 'Unnamed Team') +
      '</h4>' +
      '<span class="team-card-meta">' +
      '<i class="fa-solid fa-user"></i> ' +
      memberCount +
      '/' +
      maxMembers +
      (contestName
        ? ' &middot; <i class="fa-solid fa-trophy"></i> ' + esc(contestName)
        : '') +
      '</span>' +
      '</div>' +
      '</div>' +
      (team.description
        ? '<p class="team-card-desc">' + esc(team.description) + '</p>'
        : '') +
      '<div class="team-card-footer">' +
      '<span class="team-status ' +
      (isOpen ? 'team-status-open' : 'team-status-closed') +
      '">' +
      (isOpen
        ? '<i class="fa-solid fa-unlock"></i> Open'
        : '<i class="fa-solid fa-lock"></i> Approval') +
      '</span>' +
      (showActions ? renderTeamActions(team) : '') +
      '</div>' +
      '</div>'
    );
  }

  function renderTeamActions(team) {
    var teamId = team._id || team.id;
    var isMember = team.isMember || false;
    var isOwner = team.isOwner || false;
    var buttons = '';

    if (isOwner) {
      buttons +=
        '<button class="team-action-btn team-action-manage" data-action="manage" data-id="' +
        esc(teamId) +
        '"><i class="fa-solid fa-gear"></i> Manage</button>';
    } else if (isMember) {
      buttons +=
        '<button class="team-action-btn team-action-leave" data-action="leave" data-id="' +
        esc(teamId) +
        '"><i class="fa-solid fa-sign-out-alt"></i> Leave</button>';
    } else {
      if (team.openJoin !== false) {
        buttons +=
          '<button class="team-action-btn team-action-join" data-action="join" data-id="' +
          esc(teamId) +
          '"><i class="fa-solid fa-user-plus"></i> Join</button>';
      } else {
        buttons +=
          '<button class="team-action-btn team-action-request" data-action="request" data-id="' +
          esc(teamId) +
          '"><i class="fa-solid fa-paper-plane"></i> Request</button>';
      }
    }
    buttons +=
      '<button class="team-action-btn team-action-view" data-action="view" data-id="' +
      esc(teamId) +
      '"><i class="fa-solid fa-eye"></i> View</button>';
    return buttons;
  }

  function renderInvitationCard(invitation) {
    var team = invitation.team || invitation.teamId || {};
    var teamId =
      team._id ||
      team.id ||
      invitation.teamId?._id ||
      invitation.teamId?.id ||
      invitation._id;
    var teamName = team.name || invitation.teamName || 'Unknown Team';
    var fromUser = invitation.fromUser || invitation.invitedBy || {};
    var fromName =
      fromUser.name || fromUser.username || fromUser.email || 'Someone';
    var status = invitation.status || 'pending';

    return (
      '<div class="team-card invitation-card" data-id="' +
      esc(teamId) +
      '" data-invite-id="' +
      esc(invitation._id || invitation.id) +
      '">' +
      '<div class="team-card-header">' +
      '<div class="team-card-avatar invite-avatar">' +
      getInitials(teamName) +
      '</div>' +
      '<div class="team-card-title">' +
      '<h4>' +
      esc(teamName) +
      '</h4>' +
      '<span class="team-card-meta"><i class="fa-solid fa-user"></i> Invited by ' +
      esc(fromName) +
      '</span>' +
      '</div>' +
      '</div>' +
      '<div class="invitation-actions">' +
      '<button class="invite-btn invite-accept" data-action="accept-invite" data-team-id="' +
      esc(teamId) +
      '" data-invite-id="' +
      esc(invitation._id || invitation.id) +
      '"><i class="fa-solid fa-check"></i> Accept</button>' +
      '<button class="invite-btn invite-decline" data-action="decline-invite" data-team-id="' +
      esc(teamId) +
      '" data-invite-id="' +
      esc(invitation._id || invitation.id) +
      '"><i class="fa-solid fa-times"></i> Decline</button>' +
      '</div>' +
      '</div>'
    );
  }

  function renderMyTeams() {
    if (!els.myTeamsGrid || !els.myTeamsEmpty) return;
    if (!myTeams.length) {
      els.myTeamsGrid.style.display = 'none';
      els.myTeamsEmpty.style.display = 'block';
      return;
    }
    els.myTeamsEmpty.style.display = 'none';
    els.myTeamsGrid.style.display = 'grid';
    els.myTeamsGrid.innerHTML = myTeams
      .map(function (t) {
        return renderTeamCard(t, true);
      })
      .join('');
  }

  function renderDiscover() {
    if (!els.discoverGrid || !els.discoverEmpty) return;
    if (!discoveredTeams.length) {
      els.discoverGrid.style.display = 'none';
      els.discoverEmpty.style.display = 'block';
      return;
    }
    els.discoverEmpty.style.display = 'none';
    els.discoverGrid.style.display = 'grid';
    els.discoverGrid.innerHTML = discoveredTeams
      .map(function (t) {
        return renderTeamCard(t, true);
      })
      .join('');
  }

  function renderInvitations() {
    if (!els.invitationsGrid || !els.invitationsEmpty) return;
    if (!pendingInvitations.length) {
      els.invitationsGrid.style.display = 'none';
      els.invitationsEmpty.style.display = 'block';
      return;
    }
    els.invitationsEmpty.style.display = 'none';
    els.invitationsGrid.style.display = 'grid';
    els.invitationsGrid.innerHTML = pendingInvitations
      .map(renderInvitationCard)
      .join('');
  }

  function refreshStats() {
    var myTeamVal = myTeams.length;
    var openTeamVal = discoveredTeams.filter(function (t) {
      return t.openJoin !== false;
    }).length;
    var inviteVal = pendingInvitations.length;

    if (els.myTeamCount) els.myTeamCount.textContent = String(myTeamVal);
    if (els.openTeamCount) els.openTeamCount.textContent = String(openTeamVal);
    if (els.pendingInviteCount)
      els.pendingInviteCount.textContent = String(inviteVal);

    if (els.inviteBadge) {
      if (inviteVal > 0) {
        els.inviteBadge.style.display = 'inline-block';
        els.inviteBadge.textContent = String(inviteVal);
      } else {
        els.inviteBadge.style.display = 'none';
      }
    }
  }

  function refreshAll() {
    renderMyTeams();
    renderDiscover();
    renderInvitations();
    refreshStats();
  }

  function loadMyTeams() {
    if (!teamService) return;
    teamService
      .listMyTeams({ limit: 50 })
      .then(function (result) {
        myTeams = Array.isArray(result.teams) ? result.teams : [];
        refreshAll();
      })
      .catch(function (err) {
        if (isAuthError(err)) {
          authEnabled = false;
          showFeedback('Sign in to view your teams.', 'info');
        }
      });
  }

  function loadDiscover() {
    if (!teamService) return;
    teamService
      .listTeams({ limit: 50 })
      .then(function (result) {
        discoveredTeams = Array.isArray(result.teams) ? result.teams : [];
        refreshAll();
      })
      .catch(function () {
        discoveredTeams = [];
        refreshAll();
      });
  }

  function loadInvitations() {
    if (!teamService || !authEnabled) {
      if (els.inviteBadge) els.inviteBadge.style.display = 'none';
      return;
    }
    teamService
      .listMyInvitations({ limit: 50 })
      .then(function (result) {
        pendingInvitations = Array.isArray(result.invitations)
          ? result.invitations
          : [];
        refreshAll();
      })
      .catch(function () {
        pendingInvitations = [];
        refreshAll();
      });
  }

  function loadContestsForSelect() {
    if (!competitionsService || !els.teamContest) return;
    competitionsService
      .listContests({ limit: 100 })
      .then(function (result) {
        var contests = Array.isArray(result.contests) ? result.contests : [];
        contests.forEach(function (c) {
          var opt = document.createElement('option');
          opt.value = c._id || c.id || '';
          opt.textContent =
            (c.title || 'Untitled Contest') +
            ' (' +
            (c.platform || 'N/A') +
            ')';
          els.teamContest.appendChild(opt);
        });
      })
      .catch(function () {});
  }

  function openCreateModal() {
    if (!els.createTeamModal) return;
    if (!authEnabled) {
      showFeedback('Please sign in to create a team.', 'error');
      return;
    }
    els.createTeamModal.style.display = 'flex';
  }

  function closeCreateModal() {
    if (!els.createTeamModal) return;
    els.createTeamModal.style.display = 'none';
    els.createTeamForm.reset();
    document.getElementById('createTeamSpinner').style.display = 'none';
    document.getElementById('createTeamSubmit').disabled = false;
  }

  function handleCreateTeamSubmit(e) {
    e.preventDefault();
    if (!teamService || !authEnabled) {
      showFeedback('Please sign in to create a team.', 'error');
      return;
    }
    var name = document.getElementById('teamName').value.trim();
    if (!name) {
      showFeedback('Team name is required.', 'error');
      return;
    }
    var data = {
      name: name,
      description: document.getElementById('teamDescription').value.trim(),
      maxMembers: Number(document.getElementById('teamMaxMembers').value) || 4,
      openJoin: document.getElementById('teamOpenJoin').checked,
    };
    var contestId = els.teamContest ? els.teamContest.value : '';
    if (contestId) data.contestId = contestId;

    document.getElementById('createTeamSpinner').style.display = 'inline-block';
    document.getElementById('createTeamSubmit').disabled = true;

    teamService
      .createTeam(data)
      .then(function () {
        showFeedback('Team created successfully!', 'success');
        closeCreateModal();
        loadMyTeams();
        loadDiscover();
      })
      .catch(function (err) {
        document.getElementById('createTeamSpinner').style.display = 'none';
        document.getElementById('createTeamSubmit').disabled = false;
        showFeedback(err?.message || 'Failed to create team.', 'error');
      });
  }

  function openTeamDetail(teamId) {
    if (!teamService || !els.teamDetailModal) return;
    els.teamDetailModal.style.display = 'flex';
    els.teamDetailTitle.textContent = 'Loading...';
    els.teamDetailDescription.textContent = '';
    els.teamDetailMembersList.innerHTML =
      '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Loading members...</div>';
    els.teamDetailActions.innerHTML = '';

    teamService
      .getTeamById(teamId)
      .then(function (team) {
        if (!team) {
          els.teamDetailTitle.textContent = 'Team not found';
          return;
        }

        els.teamDetailTitle.textContent = esc(team.name || 'Team');
        els.teamDetailDescription.textContent =
          team.description || 'No description.';
        els.teamDetailDescription.style.display = team.description
          ? 'block'
          : 'none';

        var memberList = Array.isArray(team.members) ? team.members : [];
        var memberCount = memberList.length;
        var maxMembers = team.maxMembers || 4;
        els.teamDetailMembers.innerHTML =
          '<i class="fa-solid fa-user"></i> Members: <strong>' +
          memberCount +
          '/' +
          maxMembers +
          '</strong>';
        els.teamDetailContest.innerHTML =
          '<i class="fa-solid fa-trophy"></i> Contest: <strong>' +
          esc(
            team.contestName ||
              (team.contestId && typeof team.contestId === 'object'
                ? team.contestId.title
                : null) ||
              'None',
          ) +
          '</strong>';
        els.teamDetailStatus.innerHTML =
          '<i class="fa-solid fa-toggle-on"></i> Status: <strong>' +
          (team.openJoin !== false ? 'Open' : 'Approval Required') +
          '</strong>';

        els.teamDetailMembersList.innerHTML = memberList
          .map(function (m) {
            var user = m.userId || m;
            var userName =
              user.name || user.username || user.email || 'Unknown';
            var role =
              m.role ||
              (team.createdBy &&
              (team.createdBy._id === (user._id || user.id) ||
                team.createdBy === (user._id || user.id))
                ? 'Owner'
                : 'Member');
            return (
              '<div class="team-member-row">' +
              '<div class="member-avatar">' +
              getInitials(userName) +
              '</div>' +
              '<div class="member-info">' +
              '<span class="member-name">' +
              esc(userName) +
              '</span>' +
              '<span class="member-role">' +
              esc(role) +
              '</span>' +
              '</div>' +
              '</div>'
            );
          })
          .join('');

        var actionsHtml = '';
        var teamIdVal = team._id || team.id;
        var isMember = (team.members || []).some(function (m) {
          var uid =
            (m.userId && (m.userId._id || m.userId.id)) || m._id || m.id;
          return uid === currentUserId;
        });
        var isOwner =
          team.createdBy &&
          (team.createdBy._id || team.createdBy.id || team.createdBy) ===
            currentUserId;

        actionsHtml +=
          '<button class="btn-primary team-detail-btn" data-action="close-detail" style="margin-right:8px;"><i class="fa-solid fa-chevron-left"></i> Back</button>';

        if (isOwner) {
          actionsHtml +=
            '<button class="btn-danger team-detail-btn" data-action="delete" data-id="' +
            esc(teamIdVal) +
            '"><i class="fa-solid fa-trash"></i> Disband Team</button>';
        } else if (isMember) {
          actionsHtml +=
            '<button class="btn-secondary team-detail-btn" data-action="leave" data-id="' +
            esc(teamIdVal) +
            '"><i class="fa-solid fa-sign-out-alt"></i> Leave Team</button>';
        } else if (team.openJoin !== false) {
          actionsHtml +=
            '<button class="btn-primary team-detail-btn" data-action="join" data-id="' +
            esc(teamIdVal) +
            '"><i class="fa-solid fa-user-plus"></i> Join Team</button>';
        } else {
          actionsHtml +=
            '<button class="btn-primary team-detail-btn" data-action="request" data-id="' +
            esc(teamIdVal) +
            '" disabled>Join requested</button>';
        }

        els.teamDetailActions.innerHTML = actionsHtml;
      })
      .catch(function () {
        els.teamDetailTitle.textContent = 'Failed to load team details.';
      });
  }

  function closeTeamDetail() {
    if (els.teamDetailModal) els.teamDetailModal.style.display = 'none';
  }

  function handleTeamAction(action, teamId) {
    if (!teamService) return;
    if (action === 'view') {
      openTeamDetail(teamId);
      return;
    }
    if (!authEnabled) {
      showFeedback('Please sign in to perform this action.', 'error');
      return;
    }

    if (action === 'join') {
      teamService
        .joinTeam(teamId)
        .then(function () {
          showFeedback('Joined team!', 'success');
          loadMyTeams();
          loadDiscover();
          closeTeamDetail();
        })
        .catch(function (err) {
          showFeedback(err?.message || 'Failed to join team.', 'error');
        });
    } else if (action === 'leave') {
      if (!confirm('Are you sure you want to leave this team?')) return;
      teamService
        .leaveTeam(teamId)
        .then(function () {
          showFeedback('Left team.', 'info');
          loadMyTeams();
          loadDiscover();
          closeTeamDetail();
        })
        .catch(function (err) {
          showFeedback(err?.message || 'Failed to leave team.', 'error');
        });
    } else if (action === 'delete') {
      if (
        !confirm(
          'Are you sure you want to disband this team? This cannot be undone.',
        )
      )
        return;
      teamService
        .deleteTeam(teamId)
        .then(function () {
          showFeedback('Team disbanded.', 'info');
          loadMyTeams();
          loadDiscover();
          closeTeamDetail();
        })
        .catch(function (err) {
          showFeedback(err?.message || 'Failed to delete team.', 'error');
        });
    } else if (action === 'manage') {
      openTeamDetail(teamId);
    } else if (action === 'request') {
      teamService
        .joinTeam(teamId)
        .then(function () {
          showFeedback('Request sent!', 'success');
        })
        .catch(function (err) {
          showFeedback(err?.message || 'Failed to send request.', 'error');
        });
    }
  }

  function handleInviteAction(action, teamId, inviteId) {
    if (!teamService || !authEnabled) return;
    var accept = action === 'accept-invite';

    teamService
      .respondToInvite(teamId, accept)
      .then(function () {
        showFeedback(
          accept ? 'Invitation accepted!' : 'Invitation declined.',
          'success',
        );
        loadInvitations();
        loadMyTeams();
      })
      .catch(function (err) {
        showFeedback(
          err?.message || 'Failed to respond to invitation.',
          'error',
        );
      });
  }

  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(function (content) {
      content.classList.toggle('active', content.id === 'tab-' + tabId);
    });
  }

  function getRoleLabel(role) {
    if (!role) return 'Student';
    if (typeof role === 'object') return role.name || 'Student';
    if (typeof role === 'string')
      return role.charAt(0).toUpperCase() + role.slice(1);
    return 'Student';
  }

  function populateSidebarUser() {
    try {
      var u = JSON.parse(localStorage.getItem('user') || '{}');
      if (!u.name) return;
      var initials = getInitials(u.name);
      var q = function (s) {
        return document.querySelector('.sidebar ' + s);
      };
      var avatarEl = q('.avatar-circle');
      var nameEl = q('.user-info h4');
      var roleEl = q('.user-info span');
      if (avatarEl) avatarEl.textContent = initials;
      if (nameEl) nameEl.textContent = u.name;
      if (roleEl) roleEl.textContent = getRoleLabel(u.role);
      var headerAvatars = document.querySelectorAll(
        '.header-actions .avatar-circle',
      );
      if (headerAvatars.length)
        headerAvatars[headerAvatars.length - 1].textContent = initials;
    } catch (_) {}
  }

  function getCurrentUserInfo() {
    if (!authEnabled) return;
    var user = shared.auth?.getUser?.() || null;
    if (user) {
      currentUserId = user._id || user.id || user.userId || null;
      return;
    }
    var stored;
    try {
      stored = JSON.parse(localStorage.getItem('user') || 'null');
    } catch (_) {
      stored = null;
    }
    if (stored) {
      currentUserId = stored._id || stored.id || stored.userId || null;
    }
  }

  function handleSearch() {
    var query = els.teamSearchInput
      ? els.teamSearchInput.value.trim().toLowerCase()
      : '';
    if (!query) {
      renderDiscover();
      return;
    }
    var filtered = discoveredTeams.filter(function (t) {
      return (
        (t.name || '').toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query)
      );
    });
    if (!els.discoverGrid) return;
    if (!filtered.length) {
      els.discoverGrid.style.display = 'none';
      if (els.discoverEmpty) {
        els.discoverEmpty.style.display = 'block';
        els.discoverEmpty.innerHTML =
          '<i class="fa-solid fa-compass"></i><p>No teams match "' +
          esc(query) +
          '".</p>';
      }
      return;
    }
    els.discoverEmpty.style.display = 'none';
    els.discoverGrid.style.display = 'grid';
    els.discoverGrid.innerHTML = filtered
      .map(function (t) {
        return renderTeamCard(t, true);
      })
      .join('');
  }

  // Init
  getCurrentUserInfo();
  populateSidebarUser();

  // Fetch fresh user data from backend + reputation
  if (authEnabled) {
    var S = window.NibrasServices;
    if (S && S.authService && typeof S.authService.getMe === 'function') {
      S.authService
        .getMe()
        .then(function (meData) {
          var freshUser =
            meData &&
            (meData.user ||
              (meData.data && meData.data.user) ||
              meData.data ||
              meData);
          if (freshUser && freshUser.name) {
            localStorage.setItem('user', JSON.stringify(freshUser));
            populateSidebarUser();
          }
        })
        .catch(function () {});
    }
    if (
      S &&
      S.reputationService &&
      typeof S.reputationService.getMyReputation === 'function'
    ) {
      S.reputationService
        .getMyReputation()
        .then(function (repRes) {
          var repTotal = 0;
          if (repRes && repRes.data) repTotal = repRes.data.total || 0;
          else if (repRes && repRes.total) repTotal = repRes.total;
          var badge = document.querySelector('.sidebar .rep-badge');
          if (badge) badge.textContent = repTotal;
        })
        .catch(function () {});
    }
  }

  loadMyTeams();
  loadDiscover();
  loadInvitations();
  loadContestsForSelect();

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTab(btn.dataset.tab);
    });
  });

  // Create team modal
  els.createTeamBtn?.addEventListener('click', openCreateModal);
  els.createTeamClose?.addEventListener('click', closeCreateModal);
  els.createTeamCancel?.addEventListener('click', closeCreateModal);
  els.createTeamModal?.addEventListener('click', function (e) {
    if (e.target === els.createTeamModal) closeCreateModal();
  });
  els.createTeamForm?.addEventListener('submit', handleCreateTeamSubmit);

  // Team detail modal
  els.teamDetailClose?.addEventListener('click', closeTeamDetail);
  els.teamDetailModal?.addEventListener('click', function (e) {
    if (e.target === els.teamDetailModal) closeTeamDetail();
  });

  // Delegated clicks for team cards
  document.addEventListener('click', function (e) {
    var actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    var action = actionBtn.dataset.action;
    var teamId = actionBtn.dataset.id || actionBtn.dataset.teamId;
    var inviteId = actionBtn.dataset.inviteId;

    if (action === 'close-detail') {
      closeTeamDetail();
      return;
    }

    if (action === 'accept-invite' || action === 'decline-invite') {
      handleInviteAction(action, teamId, inviteId);
      return;
    }

    handleTeamAction(action, teamId);
  });

  // Search
  els.teamSearchInput?.addEventListener('input', handleSearch);

  // Theme toggle
  var themeBtn = document.getElementById('themeBtn');
  var themeIcon = themeBtn ? themeBtn.querySelector('i') : null;
  var appLogo = document.getElementById('app-logo');

  if (themeBtn) {
    themeBtn.classList.remove('rotating');
    void themeBtn.offsetWidth;
  }

  var currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  if (currentTheme === 'dark') {
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
    if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      themeBtn.classList.add('rotating');
      setTimeout(function () {
        themeBtn.classList.remove('rotating');
      }, 500);

      var html = document.documentElement;
      var current = html.getAttribute('data-theme');
      var newTheme = current === 'light' ? 'dark' : 'light';

      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);

      if (newTheme === 'dark') {
        if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
        if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
      } else {
        if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
        if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
      }
    });
  }
});
