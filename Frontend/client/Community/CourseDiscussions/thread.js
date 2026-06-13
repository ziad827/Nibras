window.NibrasReact.run(() => {
  const shared = window.NibrasShared || {};
  const services = window.NibrasServices || {};
  const coursesApi = window.NibrasCourses || {};

  const uiStates = shared.uiStates || {};
  const renderUiState =
    typeof uiStates.render === 'function' ? uiStates.render : null;
  const clearUiState =
    typeof uiStates.clear === 'function' ? uiStates.clear : null;
  const resolveUiStateFromError =
    typeof uiStates.fromError === 'function' ? uiStates.fromError : null;
  const apiFetch =
    typeof shared.apiFetch === 'function' ? shared.apiFetch : null;
  const ADMIN_FALLBACK_URL = 'https://nibras-backend.up.railway.app/api';
  const LEGACY_FALLBACK_URL = 'https://nibras-backend.up.railway.app/api';
  const COMMUNITY_FALLBACK_URL = 'https://nibras-backend.up.railway.app/api';
  const TRACKING_FALLBACK_URL = 'https://nibras-backend.up.railway.app/api';

  const resolveServiceUrl = (service = 'community') => {
    if (typeof shared.resolveServiceUrl === 'function') {
      return shared.resolveServiceUrl(service);
    }
    if (typeof window.NibrasApi?.resolveServiceUrl === 'function') {
      return window.NibrasApi.resolveServiceUrl(service);
    }
    if (typeof window.NibrasApiConfig?.getServiceUrl === 'function') {
      return window.NibrasApiConfig.getServiceUrl(service);
    }
    if (service === 'legacyCommunity')
      return window.NIBRAS_LEGACY_API_URL || LEGACY_FALLBACK_URL;
    if (service === 'tracking')
      return window.NIBRAS_TRACKING_API_URL || TRACKING_FALLBACK_URL;
    if (service === 'community')
      return window.NIBRAS_COMMUNITY_API_URL || COMMUNITY_FALLBACK_URL;
    return (
      window.NIBRAS_API_URL || window.NIBRAS_BACKEND_URL || ADMIN_FALLBACK_URL
    );
  };

  const normalizeToken = (value) => {
    const token = String(value || '').trim();
    if (!token) return '';
    return token.replace(/^bearer\s+/i, '').trim();
  };

  const getToken = () => {
    const sharedToken =
      shared.auth?.getToken?.() || localStorage.getItem('token');
    if (sharedToken) return normalizeToken(sharedToken);
    const apiToken = window.NibrasApi?.getToken?.();
    if (apiToken) return normalizeToken(apiToken);
    const storageKeys = ['token', 'accessToken', 'authToken', 'jwt'];
    for (let i = 0; i < storageKeys.length; i += 1) {
      try {
        const candidate =
          localStorage.getItem(storageKeys[i]) ||
          sessionStorage.getItem(storageKeys[i]) ||
          '';
        const normalized = normalizeToken(candidate);
        if (normalized) return normalized;
      } catch (_) {
        // ignore storage access errors
      }
    }
    return '';
  };

  const joinUrl = (baseUrl, path) => {
    const normalizedBase = String(baseUrl || '').replace(/\/+$/, '');
    const normalizedPath = String(path || '');
    if (!normalizedPath) return normalizedBase;
    if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
    if (!normalizedBase) return normalizedPath;
    return normalizedPath.startsWith('/')
      ? `${normalizedBase}${normalizedPath}`
      : `${normalizedBase}/${normalizedPath}`;
  };

  const fallbackRequest = async (path, options = {}) => {
    const settings = Object.assign({}, options);
    const service = settings.service || 'community';
    const method = String(settings.method || 'GET').toUpperCase();
    const authEnabled = settings.auth !== false;
    const headers = Object.assign({}, settings.headers || {});
    const hasContentType = Object.keys(headers || {}).some(
      (key) => key.toLowerCase() === 'content-type',
    );

    // Prevent 304 Not Modified responses - force fresh data
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';

    if (
      authEnabled &&
      !Object.keys(headers || {}).some(
        (key) => key.toLowerCase() === 'authorization',
      )
    ) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const requestOptions = { method, headers };
    if (Object.prototype.hasOwnProperty.call(settings, 'body')) {
      if (settings.body instanceof FormData) {
        requestOptions.body = settings.body;
      } else if (settings.body != null) {
        if (!hasContentType) headers['Content-Type'] = 'application/json';
        requestOptions.body =
          typeof settings.body === 'string'
            ? settings.body
            : JSON.stringify(settings.body);
      }
    }

    const response = await fetch(
      joinUrl(resolveServiceUrl(service), path),
      requestOptions,
    );
    const rawText = await response.text();
    let payload = null;
    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch (_) {
      payload = null;
    }

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error?.message ||
        payload?.error ||
        rawText ||
        `Request failed (${response.status})`;
      const error = new Error(String(message || 'Request failed'));
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  };

  const requestCommunity = (path, options = {}) => {
    if (apiFetch)
      return apiFetch(path, Object.assign({ service: 'community' }, options));
    return fallbackRequest(
      path,
      Object.assign({ service: 'community' }, options),
    );
  };

  const resolveSocketBaseUrl = () => {
    const normalized = String(resolveServiceUrl('community') || '').replace(
      /\/+$/,
      '',
    );
    if (!normalized) return normalized;
    return normalized.replace(/\/api(?:\/community)?$/i, '');
  };

  const threadService = services.threadService || {
    getById: (threadId) =>
      requestCommunity(`/v1/community/threads/${threadId}`, {
        method: 'GET',
        auth: true,
      }),
    pin: (threadId) =>
      requestCommunity(`/v1/community/threads/${threadId}/pin`, {
        method: 'PATCH',
        auth: true,
        body: {},
      }),
    unpin: (threadId) =>
      requestCommunity(`/v1/community/threads/${threadId}/unpin`, {
        method: 'PATCH',
        auth: true,
        body: {},
      }),
    close: (threadId) =>
      requestCommunity(`/v1/community/threads/${threadId}/close`, {
        method: 'PATCH',
        auth: true,
        body: {},
      }),
    open: (threadId) =>
      requestCommunity(`/v1/community/threads/${threadId}/open`, {
        method: 'PATCH',
        auth: true,
        body: {},
      }),
    delete: (threadId) =>
      requestCommunity(`/v1/community/threads/${threadId}`, {
        method: 'DELETE',
        auth: true,
      }),
  };
  const postService = services.postService || {
    listByThread: (threadId) =>
      requestCommunity(`/v1/community/posts/thread/${threadId}`, {
        method: 'GET',
        auth: true,
      }),
    create: (threadId, data) =>
      requestCommunity(`/v1/community/posts/${threadId}`, {
        method: 'POST',
        auth: true,
        body: data,
      }),
    pin: (postId) =>
      requestCommunity(`/v1/community/posts/${postId}/pin`, {
        method: 'PATCH',
        auth: true,
        body: {},
      }),
    accept: (postId) =>
      requestCommunity(`/v1/community/posts/${postId}/accept`, {
        method: 'PATCH',
        auth: true,
        body: {},
      }),
    delete: (postId) =>
      requestCommunity(`/v1/community/posts/${postId}`, {
        method: 'DELETE',
        auth: true,
      }),
  };
  const communityVoteService = services.communityVoteService || {
    cast: (data) =>
      requestCommunity('/v1/community/votes', {
        method: 'POST',
        auth: true,
        body: data,
      }),
    getMyVote: ({ targetType, targetId }) =>
      requestCommunity(`/v1/community/votes/${targetType}/${targetId}`, {
        method: 'GET',
        auth: true,
      }),
  };
  const communityAuthService = services.communityAuthService || {
    getMe: () => requestCommunity('/auth/me', { method: 'GET', auth: true }),
  };

  const elements = {
    notice: document.getElementById('ui-notice'),
    threadContainer: document.getElementById('thread-container'),
    postsContainer: document.getElementById('posts-container'),
    composer: document.getElementById('reply-composer'),
    replyInput: document.getElementById('reply-input'),
    postReplyButton: document.getElementById('post-reply-btn'),
    backLink: document.getElementById('back-to-discussions-link'),
    themeButton: document.getElementById('themeBtn'),
    logo: document.getElementById('app-logo'),
  };

  const state = {
    threadId: normalizeIdentifier(readQueryParam('threadId')),
    localCourseId: normalizeIdentifier(readQueryParam('courseId')),
    communityCourseId: normalizeIdentifier(readQueryParam('communityCourseId')),
    selectedCourse: null,
    thread: null,
    posts: [],
    currentUser: null,
    votesByTargetId: new Map(),
    pollTimer: null,
    eventSource: null,
    isPolling: false,
  };

  if (!state.threadId) {
    showNotice('Missing thread ID in URL.', 'error');
    return;
  }
  if (
    state.localCourseId &&
    typeof coursesApi.setSelectedCourseId === 'function'
  ) {
    coursesApi.setSelectedCourseId(state.localCourseId);
  }
  state.selectedCourse =
    typeof coursesApi.getSelectedCourse === 'function'
      ? coursesApi.getSelectedCourse()
      : null;

  initializeThemeToggle();
  bindUiEvents();
  bootstrap().catch((error) => {
    console.error('[THREAD] initialization failed:', error);
    showErrorNotice(error, 'Failed to initialize thread page.');
  });

  function initializeThemeToggle() {
    const theme = document.documentElement.getAttribute('data-theme');
    const icon = elements.themeButton?.querySelector('i');
    if (icon) {
      icon.className =
        theme === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
    }
    if (elements.logo) {
      elements.logo.src =
        theme === 'dark'
          ? '/Assets/images/logo-dark.png'
          : '/Assets/images/logo-light.png';
    }

    elements.themeButton?.addEventListener('click', () => {
      elements.themeButton.classList.add('rotating');
      setTimeout(() => {
        elements.themeButton.classList.remove('rotating');
      }, 500);
      const current =
        document.documentElement.getAttribute('data-theme') === 'dark'
          ? 'dark'
          : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      if (icon)
        icon.className =
          next === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
      if (elements.logo) {
        elements.logo.src =
          next === 'dark'
            ? '/Assets/images/logo-dark.png'
            : '/Assets/images/logo-light.png';
      }
    });
  }

  function bindUiEvents() {
    elements.postReplyButton?.addEventListener('click', () => {
      createReply().catch((error) => {
        showErrorNotice(error, 'Could not post reply.');
      });
    });

    elements.threadContainer?.addEventListener('click', (event) => {
      const voteButton = event.target.closest('.vote-btn');
      if (voteButton) {
        const targetId = normalizeIdentifier(voteButton.dataset.targetId);
        const value = Number(voteButton.dataset.voteValue);
        castVote(targetId, 'thread', value).catch((error) =>
          showErrorNotice(error, 'Vote failed.'),
        );
        return;
      }

      const actionButton = event.target.closest('[data-thread-action]');
      if (!actionButton) return;

      const action = String(actionButton.dataset.threadAction || '');
      handleThreadAction(action).catch((error) =>
        showErrorNotice(error, 'Thread action failed.'),
      );
    });

    elements.postsContainer?.addEventListener('click', (event) => {
      const voteButton = event.target.closest('.vote-btn');
      if (voteButton) {
        const targetId = normalizeIdentifier(voteButton.dataset.targetId);
        const value = Number(voteButton.dataset.voteValue);
        castVote(targetId, 'post', value).catch((error) =>
          showErrorNotice(error, 'Vote failed.'),
        );
        return;
      }

      const actionButton = event.target.closest('[data-post-action]');
      if (!actionButton) return;
      const action = String(actionButton.dataset.postAction || '');
      const postId = normalizeIdentifier(actionButton.dataset.postId);
      if (!action || !postId) return;
      handlePostAction(action, postId).catch((error) =>
        showErrorNotice(error, 'Post action failed.'),
      );
    });
  }

  function updateSidebarUser() {
    try {
      var u = JSON.parse(localStorage.getItem('user'));
      if (!u || !u.name) return;
      document.querySelector('.user-info h4').textContent = u.name;
      document.querySelector('.user-info span').textContent =
        u.role?.name || u.role || 'student';
      var initials = u.name
        .split(' ')
        .map(function (n) {
          return n.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2);
      var avatars = document.querySelectorAll(
        '.avatar-circle, .profile-circle-small',
      );
      avatars.forEach(function (el) {
        el.textContent = initials || 'U';
      });
      var repEl = document.querySelector('.rep-badge');
      if (repEl) repEl.textContent = u.reputation || u.rep || 0;
    } catch (_) {}
  }

  async function bootstrap() {
    await loadCurrentUser();
    updateSidebarUser();
    if (!state.currentUser) return;
    await loadThreadAndPosts();
    configureBackLink();
    startRealtime();
  }

  async function loadCurrentUser() {
    try {
      const payload = await communityAuthService.getMe();
      state.currentUser = pickEntity(payload, 'user');
    } catch (error) {
      state.currentUser = null;
      showErrorNotice(error, 'Sign in is required to access this thread.');
    }
  }

  async function loadThreadAndPosts() {
    showNotice('Loading thread...', 'loading');
    const threadPayload = await threadService.getById(state.threadId);
    state.thread = pickEntity(threadPayload, 'thread');
    if (!state.thread) {
      throw new Error('Thread not found.');
    }

    state.communityCourseId =
      state.communityCourseId ||
      normalizeIdentifier(state.thread?.course?._id || state.thread?.course);
    const postsPayload = await postService.listByThread(state.threadId);
    state.posts = pickArray(postsPayload, 'posts');

    await hydrateVotes();
    renderThread();
    renderPosts();
    clearNotice();
  }

  async function hydrateVotes() {
    state.votesByTargetId.clear();
    const jobs = [];

    jobs.push(
      communityVoteService
        .getMyVote({ targetType: 'thread', targetId: state.threadId })
        .then((payload) => {
          state.votesByTargetId.set(
            state.threadId,
            Number(payload?.value || 0),
          );
        })
        .catch(() => {
          state.votesByTargetId.set(state.threadId, 0);
        }),
    );

    state.posts.forEach((post) => {
      const postId = getId(post);
      jobs.push(
        communityVoteService
          .getMyVote({ targetType: 'post', targetId: postId })
          .then((payload) => {
            state.votesByTargetId.set(postId, Number(payload?.value || 0));
          })
          .catch(() => {
            state.votesByTargetId.set(postId, 0);
          }),
      );
    });

    await Promise.all(jobs);
  }

  function renderThread() {
    if (!elements.threadContainer || !state.thread) return;
    const isAdmin = state.currentUser?.role === 'admin';
    const isInstructor = state.currentUser?.role === 'instructor';
    const isThreadOwner = isCurrentUser(state.thread?.author);
    const canPin = isAdmin || isInstructor;
    const canClose = isThreadOwner || isAdmin || isInstructor;
    const canOpen = isAdmin || isInstructor;
    const canDelete = isThreadOwner || isAdmin || isInstructor;
    const isClosed = String(state.thread?.status || 'open') === 'closed';
    const currentVote = Number(state.votesByTargetId.get(state.threadId) || 0);

    const tags = Array.isArray(state.thread?.tags)
      ? state.thread.tags
          .map((tag) => {
            const label =
              typeof tag === 'string' ? tag : String(tag?.name || '');
            return label
              ? `<span class="tag-chip">${escapeHtml(label)}</span>`
              : '';
          })
          .join('')
      : '';

    const badges = [];
    if (state.thread?.isPinned)
      badges.push('<span class="badge pinned">Pinned</span>');
    if (isClosed) badges.push('<span class="badge closed">Closed</span>');

    const actionButtons = [];
    if (canPin) {
      actionButtons.push(
        `<button data-thread-action="${state.thread?.isPinned ? 'unpin' : 'pin'}">${state.thread?.isPinned ? 'Unpin' : 'Pin'}</button>`,
      );
    }
    if (isClosed && canOpen) {
      actionButtons.push('<button data-thread-action="open">Open</button>');
    } else if (!isClosed && canClose) {
      actionButtons.push('<button data-thread-action="close">Close</button>');
    }
    if (canDelete) {
      actionButtons.push('<button data-thread-action="delete">Delete</button>');
    }

    elements.threadContainer.innerHTML = `
            <h1 class="thread-title">${escapeHtml(String(state.thread?.title || 'Untitled thread'))}</h1>
            <div class="meta-row">
                <span>By ${escapeHtml(String(state.thread?.author?.name || 'Unknown'))}</span>
                <span>${formatTimestamp(state.thread?.createdAt)}</span>
                <span>${Number(state.thread?.postsCount || 0)} replies</span>
                ${badges.join('')}
            </div>
            <p class="thread-body">${escapeHtml(String(state.thread?.body || ''))}</p>
            <div class="tag-row">${tags}</div>
            <div class="thread-actions-row">
                <div class="vote-box">
                    <button class="vote-btn ${currentVote === 1 ? 'active-up' : ''}" data-target-id="${state.threadId}" data-vote-value="1" aria-label="Upvote thread"><i class="fa-solid fa-chevron-up"></i></button>
                    <strong>${Number(state.thread?.votesCount || 0)}</strong>
                    <button class="vote-btn ${currentVote === -1 ? 'active-down' : ''}" data-target-id="${state.threadId}" data-vote-value="-1" aria-label="Downvote thread"><i class="fa-solid fa-chevron-down"></i></button>
                </div>
                <div class="action-buttons">${actionButtons.join('')}</div>
            </div>
        `;

    var replyCountEl = document.getElementById('reply-count');
    if (replyCountEl) {
      replyCountEl.textContent =
        '(' + Number(state.thread?.postsCount || 0) + ')';
    }

    if (elements.replyInput && elements.postReplyButton) {
      elements.replyInput.disabled = isClosed;
      elements.postReplyButton.disabled = isClosed;
      elements.replyInput.placeholder = isClosed
        ? 'This thread is closed. New replies are disabled.'
        : 'Share your answer or insight';
    }
  }

  function renderPosts() {
    if (!elements.postsContainer) return;
    elements.postsContainer.innerHTML = '';

    if (!state.posts.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML =
        '<i class="fa-regular fa-message"></i><p>No replies yet. Be the first to contribute.</p>';
      elements.postsContainer.appendChild(empty);
      return;
    }

    state.posts.forEach((post) => {
      elements.postsContainer.appendChild(buildPostCard(post));
    });
  }

  function buildPostCard(post) {
    const postId = getId(post);
    const vote = Number(state.votesByTargetId.get(postId) || 0);
    const isAdmin = state.currentUser?.role === 'admin';
    const isInstructor = state.currentUser?.role === 'instructor';
    const isThreadOwner = isCurrentUser(state.thread?.author);
    const isPostOwner = isCurrentUser(post?.author);
    const canPin = isAdmin || isInstructor;
    const canAccept = isThreadOwner || isInstructor;
    const canDelete = isPostOwner || isAdmin || isInstructor;

    const authorName = String(post?.author?.name || 'Unknown');
    const authorInitials = getInitials(authorName);
    const isOP =
      Boolean(getId(post?.author)) &&
      getId(post?.author) === getId(state.thread?.author);

    const badges = [];
    if (post?.isPinned) badges.push('<span class="badge pinned">Pinned</span>');
    if (post?.isAccepted)
      badges.push('<span class="badge accepted">Accepted</span>');
    if (isOP) badges.push('<span class="badge op-badge">OP</span>');

    const actionButtons = [];
    if (canPin) {
      actionButtons.push(
        `<button data-post-action="pin" data-post-id="${postId}">Pin</button>`,
      );
    }
    if (canAccept && !post?.isAccepted) {
      actionButtons.push(
        `<button data-post-action="accept" data-post-id="${postId}">Accept</button>`,
      );
    }
    if (canDelete) {
      actionButtons.push(
        `<button data-post-action="delete" data-post-id="${postId}">Delete</button>`,
      );
    }

    const card = document.createElement('article');
    card.className = 'post-card';
    card.innerHTML = `
            <p class="post-body">${escapeHtml(String(post?.body || ''))}</p>
            <div class="post-meta">
                <span class="post-author"><span class="post-avatar">${escapeHtml(authorInitials)}</span> ${escapeHtml(authorName)}</span>
                <span>${formatTimestamp(post?.createdAt)}</span>
                ${badges.join('')}
            </div>
            <div class="post-actions-row">
                <div class="vote-box">
                    <button class="vote-btn ${vote === 1 ? 'active-up' : ''}" data-target-id="${postId}" data-vote-value="1" aria-label="Upvote post"><i class="fa-solid fa-chevron-up"></i></button>
                    <strong>${Number(post?.votesCount || 0)}</strong>
                    <button class="vote-btn ${vote === -1 ? 'active-down' : ''}" data-target-id="${postId}" data-vote-value="-1" aria-label="Downvote post"><i class="fa-solid fa-chevron-down"></i></button>
                </div>
                <div class="action-buttons">${actionButtons.join('')}</div>
            </div>
        `;
    return card;
  }

  function getInitials(name) {
    return (
      String(name || '')
        .split(/\s+/)
        .filter(Boolean)
        .map(function (n) {
          return n.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U'
    );
  }

  async function createReply() {
    const body = String(elements.replyInput?.value || '').trim();
    if (!body) throw new Error('Reply body is required.');
    const payload = await postService.create(state.threadId, { body });
    const createdPost = pickEntity(payload, 'post');
    if (createdPost) {
      state.posts.push(createdPost);
      state.thread = Object.assign({}, state.thread, {
        postsCount: Number(state.thread?.postsCount || 0) + 1,
      });
    } else {
      await reloadPosts();
    }
    if (elements.replyInput) elements.replyInput.value = '';
    await hydrateVotes();
    renderThread();
    renderPosts();
  }

  async function handleThreadAction(action) {
    if (!action) return;
    if (action === 'delete') {
      const confirmed = window.confirm(
        'Delete this thread? This action cannot be undone.',
      );
      if (!confirmed) return;
      await threadService.delete(state.threadId);
      showNotice('Thread deleted. Redirecting...', 'info');
      window.setTimeout(() => {
        window.location.href = elements.backLink?.href || './discussions.html';
      }, 300);
      return;
    }
    if (action === 'pin') await threadService.pin(state.threadId);
    if (action === 'unpin') await threadService.unpin(state.threadId);
    if (action === 'close') await threadService.close(state.threadId);
    if (action === 'open') await threadService.open(state.threadId);
    await loadThreadAndPosts();
  }

  async function handlePostAction(action, postId) {
    if (!postId || !action) return;
    if (action === 'pin') await postService.pin(postId);
    if (action === 'accept') await postService.accept(postId);
    if (action === 'delete') {
      const confirmed = window.confirm('Delete this reply?');
      if (!confirmed) return;
      await postService.delete(postId);
    }
    await loadThreadAndPosts();
  }

  async function castVote(targetId, targetType, value) {
    if (!targetId || !targetType) return;
    const result = await communityVoteService.cast({
      targetType,
      targetId,
      value,
    });
    const votesCount = Number(result?.votesCount || 0);
    const voteValue = Number(result?.voteValue || 0);
    state.votesByTargetId.set(targetId, voteValue);

    if (targetType === 'thread') {
      state.thread = Object.assign({}, state.thread, { votesCount });
      renderThread();
      return;
    }

    state.posts = state.posts.map((post) =>
      getId(post) === targetId ? Object.assign({}, post, { votesCount }) : post,
    );
    renderPosts();
  }

  async function reloadPosts() {
    const postsPayload = await postService.listByThread(state.threadId);
    state.posts = pickArray(postsPayload, 'posts');
  }

  function configureBackLink() {
    if (!elements.backLink) return;
    const fallbackPath = './discussions.html';
    const localCourse = state.localCourseId || state.selectedCourse?.id || '';
    const params = new URLSearchParams();
    if (localCourse) params.set('courseId', localCourse);
    if (state.communityCourseId)
      params.set('communityCourseId', state.communityCourseId);
    elements.backLink.href = params.toString()
      ? `${fallbackPath}?${params.toString()}`
      : fallbackPath;
  }

  function stopRealtime() {
    if (state.pollTimer) {
      window.clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
    if (state.eventSource) {
      state.eventSource.close();
      state.eventSource = null;
    }
  }

  async function refreshThreadData() {
    if (!state.threadId || state.isPolling) return;
    state.isPolling = true;
    try {
      const previousPostCount = state.posts?.length || 0;
      const threadPayload = await threadService.getById(state.threadId);
      state.thread = pickEntity(threadPayload, 'thread') || state.thread;
      await reloadPosts();
      if ((state.posts?.length || 0) !== previousPostCount) {
        await hydrateVotes();
        renderThread();
        renderPosts();
      }
    } catch (_) {
      // ignore transient refresh errors
    } finally {
      state.isPolling = false;
    }
  }

  function startPolling() {
    if (state.pollTimer) {
      window.clearInterval(state.pollTimer);
    }
    state.pollTimer = window.setInterval(() => {
      void refreshThreadData();
    }, 8000);
    window.addEventListener('beforeunload', stopRealtime, { once: true });
  }

  function startRealtime() {
    stopRealtime();
    if (!state.threadId) return;

    const base = resolveServiceUrl('community');
    const streamUrl = joinUrl(
      base,
      `/v1/community/threads/${encodeURIComponent(state.threadId)}/stream`,
    );

    if (typeof EventSource !== 'undefined') {
      try {
        state.eventSource = new EventSource(streamUrl);
        state.eventSource.addEventListener('update', () => {
          void refreshThreadData();
        });
        state.eventSource.addEventListener('connected', () => {});
        state.eventSource.addEventListener('heartbeat', () => {});
        state.eventSource.onerror = () => {
          stopRealtime();
          startPolling();
        };
        window.addEventListener('beforeunload', stopRealtime, { once: true });
        return;
      } catch (_) {
        stopRealtime();
      }
    }
    startPolling();
  }

  function getCurrentUserId() {
    return normalizeIdentifier(
      state.currentUser?._id || state.currentUser?.id || '',
    );
  }

  function showErrorNotice(error, fallbackMessage) {
    const resolved = resolveUiStateFromError
      ? resolveUiStateFromError(error, fallbackMessage)
      : { state: 'error', message: fallbackMessage || 'Request failed.' };
    showNotice(resolved.message, resolved.state);
  }

  function showNotice(message, stateType) {
    if (!elements.notice) return;
    if (renderUiState) {
      renderUiState(elements.notice, {
        state: stateType || 'info',
        mode: 'notice',
        message,
      });
    } else {
      elements.notice.hidden = false;
      elements.notice.textContent = message || '';
    }
  }

  function clearNotice() {
    if (!elements.notice) return;
    if (clearUiState) {
      clearUiState(elements.notice);
    } else {
      elements.notice.hidden = true;
      elements.notice.textContent = '';
    }
  }

  function readQueryParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || '';
  }

  function pickArray(payload, key) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  function pickEntity(payload, key) {
    if (payload && typeof payload === 'object') {
      if (payload[key] && typeof payload[key] === 'object') return payload[key];
      if (payload.data?.[key] && typeof payload.data[key] === 'object')
        return payload.data[key];
      if (payload.data && typeof payload.data === 'object') return payload.data;
    }
    return null;
  }

  function getId(entity) {
    return normalizeIdentifier(entity?._id || entity?.id || entity);
  }

  function normalizeIdentifier(value) {
    return String(value || '').trim();
  }

  function isCurrentUser(author) {
    const currentUserId = normalizeIdentifier(
      state.currentUser?._id || state.currentUser?.id,
    );
    const authorId = normalizeIdentifier(author?._id || author?.id || author);
    return Boolean(currentUserId && authorId && currentUserId === authorId);
  }

  function formatTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return date.toLocaleString();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
});
