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
    // Return empty string if no token found, don't crash
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
      console.log(
        '[DEBUG] Token for',
        path,
        ':',
        token ? 'Found' : 'NOT FOUND',
      );
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

  const communityAuthService = services.communityAuthService || {
    getMe: () => requestCommunity('/auth/me', { method: 'GET', auth: true }),
  };
  const communityCourseService = services.communityCourseService || {
    list: (filters = {}) =>
      requestCommunity(`/courses${toQueryString(filters)}`, {
        method: 'GET',
        auth: true,
      }),
  };
  const threadService = services.threadService || {
    listByCourse: (courseId, filters = {}) =>
      requestCommunity(
        `/community/threads/course/${courseId}${toQueryString(filters)}`,
        { method: 'GET', auth: true },
      ),
    create: (courseId, data) =>
      requestCommunity(`/community/threads/${courseId}`, {
        method: 'POST',
        auth: true,
        body: data,
      }),
    pin: (threadId) =>
      requestCommunity(`/community/threads/${threadId}/pin`, {
        method: 'PATCH',
        auth: true,
        body: {},
      }),
    unpin: (threadId) =>
      requestCommunity(`/community/threads/${threadId}/unpin`, {
        method: 'PATCH',
        auth: true,
        body: {},
      }),
    close: (threadId) =>
      requestCommunity(`/community/threads/${threadId}/close`, {
        method: 'PATCH',
        auth: true,
        body: {},
      }),
    open: (threadId) =>
      requestCommunity(`/community/threads/${threadId}/open`, {
        method: 'PATCH',
        auth: true,
        body: {},
      }),
    delete: (threadId) =>
      requestCommunity(`/community/threads/${threadId}`, {
        method: 'DELETE',
        auth: true,
      }),
  };
  const communityVoteService = services.communityVoteService || {
    cast: (data) =>
      requestCommunity('/community/votes', {
        method: 'POST',
        auth: true,
        body: data,
      }),
    getMyVote: ({ targetType, targetId }) =>
      requestCommunity(`/community/votes/${targetType}/${targetId}`, {
        method: 'GET',
        auth: true,
      }),
  };

  const elements = {
    selectedCourseLabel: document.getElementById('selected-course-label'),
    courseSelect: document.getElementById('community-course-select'),
    searchInput: document.getElementById('thread-search'),
    statusFilter: document.getElementById('thread-status-filter'),
    openThreadModalButton: document.getElementById('open-thread-modal-btn'),
    notice: document.getElementById('ui-notice'),
    threadsContainer: document.getElementById('threads-container'),
    modal: document.getElementById('thread-modal'),
    closeModalButton: document.getElementById('close-thread-modal-btn'),
    cancelThreadButton: document.getElementById('cancel-thread-btn'),
    createThreadButton: document.getElementById('create-thread-btn'),
    titleInput: document.getElementById('thread-title-input'),
    bodyInput: document.getElementById('thread-body-input'),
    tagsInput: document.getElementById('thread-tags-input'),
    themeButton: document.getElementById('themeBtn'),
    logo: document.getElementById('app-logo'),
  };

  const state = {
    selectedCourse: null,
    availableCourses: [],
    communityCourseId: '',
    user: null,
    threads: [],
    threadVoteById: new Map(),
    filters: {
      search: '',
      status: 'all',
    },
    socket: null,
    refreshTimer: null,
    typingTimer: null,
    typingUsers: {},
  };

  initializeThemeToggle();
  initializeSelectedCourse();
  bindUiEvents();
  bootstrap().catch((error) => {
    console.error('[DISCUSSIONS] initialization failed:', error);
    showErrorNotice(error, 'Failed to initialize course discussions.');
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
      const currentTheme =
        document.documentElement.getAttribute('data-theme') === 'dark'
          ? 'dark'
          : 'light';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('theme', nextTheme);
      if (icon) {
        icon.className =
          nextTheme === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
      }
      if (elements.logo) {
        elements.logo.src =
          nextTheme === 'dark'
            ? '/Assets/images/logo-dark.png'
            : '/Assets/images/logo-light.png';
      }
    });
  }

  function initializeSelectedCourse() {
    const localCourseId = readQueryParam('courseId');
    if (localCourseId && typeof coursesApi.setSelectedCourseId === 'function') {
      coursesApi.setSelectedCourseId(localCourseId);
    }
    state.selectedCourse =
      typeof coursesApi.getSelectedCourse === 'function'
        ? coursesApi.getSelectedCourse()
        : null;

    if (elements.selectedCourseLabel) {
      elements.selectedCourseLabel.textContent = state.selectedCourse
        ? `Selected dashboard course: ${state.selectedCourse.title}`
        : 'No selected dashboard course. Choose a community course below.';
    }
  }

  function bindUiEvents() {
    elements.courseSelect?.addEventListener('change', () => {
      state.communityCourseId = String(elements.courseSelect.value || '');
      persistMappedCommunityCourseId();
      refreshAll({ announce: false, joinSocketRoom: true });
    });

    elements.searchInput?.addEventListener(
      'input',
      debounce(() => {
        state.filters.search = String(elements.searchInput.value || '').trim();
        loadThreads({ announce: false });
      }, 250),
    );

    elements.statusFilter?.addEventListener('change', () => {
      state.filters.status = String(elements.statusFilter.value || 'all');
      loadThreads({ announce: false });
    });

    elements.openThreadModalButton?.addEventListener('click', () => {
      if (!state.user) {
        showNotice(
          'Sign in is required to access course discussions.',
          'unauthorized',
        );
        return;
      }
      if (!state.communityCourseId) {
        showNotice(
          'Pick a community course before creating a thread.',
          'error',
        );
        return;
      }
      elements.modal.hidden = false;
    });

    const closeModal = () => {
      elements.modal.hidden = true;
    };
    elements.closeModalButton?.addEventListener('click', closeModal);
    elements.cancelThreadButton?.addEventListener('click', closeModal);
    elements.modal?.addEventListener('click', (event) => {
      if (event.target === elements.modal) closeModal();
    });

    elements.createThreadButton?.addEventListener('click', () => {
      createThread()
        .then(closeModal)
        .catch((error) => {
          if (error?.status === 403) {
            showNotice(
              "You don't have permission to create threads in this course.",
              'error',
            );
          } else {
            showErrorNotice(error, 'Could not create thread.');
          }
        });
    });

    elements.threadsContainer?.addEventListener('click', (event) => {
      const voteButton = event.target.closest('.vote-btn');
      if (voteButton) {
        event.preventDefault();
        const threadId = voteButton.dataset.threadId;
        const voteValue = Number(voteButton.dataset.voteValue);
        castThreadVote(threadId, voteValue).catch((error) =>
          showErrorNotice(error, 'Vote failed.'),
        );
        return;
      }

      const actionButton = event.target.closest('[data-thread-action]');
      if (!actionButton) return;
      event.preventDefault();

      const threadId = String(actionButton.dataset.threadId || '');
      const action = String(actionButton.dataset.threadAction || '');
      if (!threadId || !action) return;

      handleThreadAction(action, threadId).catch((error) => {
        showErrorNotice(error, 'Thread action failed.');
      });
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
    console.log('[Bootstrap] Starting...');
    try {
      await loadCurrentUser();
      updateSidebarUser();
      if (window.NibrasShared?.session?.updateUserInfoDisplay) {
        window.NibrasShared.session.updateUserInfoDisplay();
      }
      console.log('[Bootstrap] User loaded:', state.user);
      if (!state.user) {
        renderAuthRequiredState();
        return;
      }
      await loadCommunityCourses();
      console.log('[Bootstrap] Courses loaded:', state.availableCourses.length);

      pickInitialCommunityCourse();
      renderCourseSelect();
      updateUI();
      initSocket();
      setupTypingListeners();
      setInterval(updateTypingIndicator, 2000);
      await loadThreads({ announce: true });
      console.log('[Bootstrap] Done');
    } catch (error) {
      console.error('[Bootstrap] Error:', error);
      showNotice('Error loading page: ' + error.message, 'error');
    }
  }

  async function refreshAll(options = {}) {
    await loadCurrentUser();
    updateUI();
    if (!state.user) {
      renderAuthRequiredState();
      return;
    }
    await loadThreads(options);
  }

  async function loadCurrentUser() {
    try {
      console.log('[Auth] Loading user via communityAuthService...');
      const payload = await communityAuthService.getMe();
      console.log('[Auth] Payload:', payload);
      state.user = pickEntity(payload, 'user');
      console.log('[Auth] User set to:', state.user);
      clearNotice();
    } catch (error) {
      console.error('[Auth] Error:', error);
      state.user = null;
      showErrorNotice(
        error,
        'Sign in is required to access course discussions.',
      );
      renderAuthRequiredState();
    }
  }

  async function loadCommunityCourses() {
    try {
      var userLevel = state.user?.selectedLevel || 'Beginner';
      var payload = await communityCourseService.list({ level: userLevel });
      console.log('[Courses] Response:', payload);
      state.availableCourses = pickArray(payload, 'courses');
      console.log('[Courses] Loaded:', state.availableCourses.length);
    } catch (error) {
      console.error('[Courses] Error:', error);
      state.availableCourses = [];
    }
  }

  function pickInitialCommunityCourse() {
    if (!state.availableCourses.length) {
      state.communityCourseId = '';
      return;
    }

    const fromQuery = String(readQueryParam('communityCourseId') || '');
    if (findCourseById(fromQuery)) {
      state.communityCourseId = fromQuery;
      persistMappedCommunityCourseId();
      return;
    }

    const mapped = readMappedCommunityCourseId();
    if (findCourseById(mapped)) {
      state.communityCourseId = mapped;
      return;
    }

    const selectedLocalCourse = state.selectedCourse;
    const identifiers =
      selectedLocalCourse &&
      typeof coursesApi.resolveCourseIdentifiers === 'function'
        ? coursesApi.resolveCourseIdentifiers(selectedLocalCourse.id) || null
        : null;
    const idCandidates = [
      normalizeIdentifier(identifiers?.backendCourseId),
      normalizeIdentifier(identifiers?.adminCourseId),
    ].filter(Boolean);

    for (let i = 0; i < idCandidates.length; i += 1) {
      const exactCourse = findCourseById(idCandidates[i]);
      if (exactCourse) {
        state.communityCourseId = getId(exactCourse);
        persistMappedCommunityCourseId();
        return;
      }
    }

    if (selectedLocalCourse?.title) {
      const normalizedLocalTitle = normalizeTitle(selectedLocalCourse.title);
      const byTitle = state.availableCourses.find(
        (course) => normalizeTitle(course?.title) === normalizedLocalTitle,
      );
      if (byTitle) {
        state.communityCourseId = getId(byTitle);
        persistMappedCommunityCourseId();
        return;
      }
    }

    if (state.availableCourses.length === 1) {
      state.communityCourseId = getId(state.availableCourses[0]);
      persistMappedCommunityCourseId();
    }
  }

  function renderCourseSelect() {
    if (!elements.courseSelect) return;
    elements.courseSelect.innerHTML = '';

    if (!state.availableCourses.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No courses found';
      elements.courseSelect.appendChild(option);
      elements.courseSelect.disabled = true;
      return;
    }

    state.availableCourses.forEach((course) => {
      const option = document.createElement('option');
      option.value = getId(course);
      option.textContent = String(course?.title || 'Untitled Course');
      elements.courseSelect.appendChild(option);
    });
    elements.courseSelect.disabled = false;

    if (state.communityCourseId && findCourseById(state.communityCourseId)) {
      elements.courseSelect.value = state.communityCourseId;
    } else {
      state.communityCourseId = getId(state.availableCourses[0]);
      elements.courseSelect.value = state.communityCourseId;
      persistMappedCommunityCourseId();
    }
  }

  function updateUI() {
    var canUse = Boolean(state.user && state.communityCourseId);
    if (elements.openThreadModalButton)
      elements.openThreadModalButton.disabled = !canUse;
    if (elements.searchInput) elements.searchInput.disabled = !state.user;
    if (elements.statusFilter) elements.statusFilter.disabled = !state.user;
  }

  async function createThread() {
    if (!state.communityCourseId) {
      throw new Error('Select a course first.');
    }
    const title = String(elements.titleInput?.value || '').trim();
    const body = String(elements.bodyInput?.value || '').trim();
    const tagsRaw = String(elements.tagsInput?.value || '').trim();
    const tags = tagsRaw
      ? tagsRaw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    if (!title || !body) {
      throw new Error('Thread title and body are required.');
    }

    await threadService.create(state.communityCourseId, { title, body, tags });
    if (elements.titleInput) elements.titleInput.value = '';
    if (elements.bodyInput) elements.bodyInput.value = '';
    if (elements.tagsInput) elements.tagsInput.value = '';
    showNotice('Thread created successfully.', 'info');
    await loadThreads({ announce: false });
  }

  async function loadThreads(options = {}) {
    if (!state.user) {
      state.threads = [];
      renderAuthRequiredState();
      return;
    }

    if (!state.communityCourseId) {
      state.threads = [];
      renderThreads();
      return;
    }

    const params = {};
    if (state.filters.search) params.search = state.filters.search;
    if (state.filters.status && state.filters.status !== 'all')
      params.status = state.filters.status;

    if (options.announce) {
      showNotice('Loading threads...', 'loading');
    }

    try {
      const payload = await threadService.listByCourse(
        state.communityCourseId,
        params,
      );
      state.threads = pickArray(payload, 'threads');
      await loadThreadVotes();
      renderThreads();
      clearNotice();
      if (options.joinSocketRoom) {
        joinCourseRoom();
      }
    } catch (error) {
      state.threads = [];
      renderThreads();
      if (error?.status === 403) {
        showNotice(
          "You don't have access to view discussions for this course. Make sure you're enrolled.",
          'error',
        );
      } else {
        showErrorNotice(error, 'Could not load discussion threads.');
      }
    }
  }

  function renderAuthRequiredState() {
    if (!elements.threadsContainer) return;
    elements.threadsContainer.innerHTML =
      '<div class="notice">Sign in is required to view course discussions.</div>';
  }

  async function loadThreadVotes() {
    state.threadVoteById.clear();
    if (!state.threads || !state.threads.length) return;
    const voteJobs = state.threads.map(async (thread) => {
      const threadId = getId(thread);
      if (!threadId) return;
      try {
        const vote = await communityVoteService.getMyVote({
          targetType: 'thread',
          targetId: threadId,
        });
        state.threadVoteById.set(threadId, Number(vote?.value || 0));
      } catch (_) {
        state.threadVoteById.set(threadId, 0);
      }
    });
    await Promise.all(voteJobs);
  }

  function renderThreads() {
    if (!elements.threadsContainer) return;
    elements.threadsContainer.innerHTML = '';

    if (!state.threads.length) {
      const empty = document.createElement('div');
      empty.className = 'notice';
      empty.textContent = 'No threads found for this course and filter.';
      elements.threadsContainer.appendChild(empty);
      return;
    }

    state.threads.forEach((thread) => {
      elements.threadsContainer.appendChild(buildThreadCard(thread));
    });
  }

  function buildThreadCard(thread) {
    const card = document.createElement('article');
    card.className = 'thread-card';
    const threadId = getId(thread);
    const courseId = getId(thread?.course);
    const currentVote = Number(state.threadVoteById.get(threadId) || 0);
    const isOwner = isCurrentUser(thread?.author);
    const isAdmin = state.user?.role === 'admin';
    const isInstructor = state.user?.role === 'instructor';
    const canPin = isAdmin || isInstructor;
    const canClose = isOwner || isAdmin || isInstructor;
    const canOpen = isAdmin || isInstructor;
    const canDelete = isOwner || isAdmin || isInstructor;
    const isClosed = String(thread?.status || 'open') === 'closed';
    const detailHref = `./thread.html?threadId=${encodeURIComponent(threadId)}&courseId=${encodeURIComponent(state.selectedCourse?.id || '')}&communityCourseId=${encodeURIComponent(state.communityCourseId || courseId || '')}`;

    const badges = [];
    if (thread?.isPinned)
      badges.push('<span class="badge pinned">Pinned</span>');
    if (isClosed) badges.push('<span class="badge closed">Closed</span>');

    const tags = Array.isArray(thread?.tags)
      ? thread.tags
          .map((tag) => {
            const name =
              typeof tag === 'string' ? tag : String(tag?.name || '');
            return name
              ? `<span class="tag-chip">${escapeHtml(name)}</span>`
              : '';
          })
          .join('')
      : '';

    const actions = [];
    if (canPin) {
      actions.push(
        `<button data-thread-action="${thread?.isPinned ? 'unpin' : 'pin'}" data-thread-id="${threadId}">${thread?.isPinned ? 'Unpin' : 'Pin'}</button>`,
      );
    }
    if (isClosed && canOpen) {
      actions.push(
        `<button data-thread-action="open" data-thread-id="${threadId}">Open</button>`,
      );
    } else if (!isClosed && canClose) {
      actions.push(
        `<button data-thread-action="close" data-thread-id="${threadId}">Close</button>`,
      );
    }
    if (canDelete) {
      actions.push(
        `<button data-thread-action="delete" data-thread-id="${threadId}">Delete</button>`,
      );
    }

    card.innerHTML = `
            <div class="thread-head">
                <a class="thread-title" href="${detailHref}">${escapeHtml(String(thread?.title || 'Untitled thread'))}</a>
                <div>${badges.join(' ')}</div>
            </div>
            <p class="thread-preview">${escapeHtml(String(thread?.body || '')).slice(0, 320)}${String(thread?.body || '').length > 320 ? '...' : ''}</p>
            <div class="thread-tags">${tags}</div>
            <div class="thread-meta">
                <span>By ${escapeHtml(String(thread?.author?.name || 'Unknown'))}</span>
                <span>${formatTimestamp(thread?.createdAt)}</span>
                <span>${Number(thread?.postsCount || 0)} replies</span>
                <span>${String(thread?.status || 'open')}</span>
            </div>
            <div class="thread-foot">
                <div class="vote-box">
                    <button class="vote-btn ${currentVote === 1 ? 'active-up' : ''}" data-thread-id="${threadId}" data-vote-value="1" aria-label="Upvote"><i class="fa-solid fa-chevron-up"></i></button>
                    <strong>${Number(thread?.votesCount || 0)}</strong>
                    <button class="vote-btn ${currentVote === -1 ? 'active-down' : ''}" data-thread-id="${threadId}" data-vote-value="-1" aria-label="Downvote"><i class="fa-solid fa-chevron-down"></i></button>
                </div>
                <div class="thread-actions">${actions.join('')}</div>
            </div>
        `;

    return card;
  }

  async function castThreadVote(threadId, value) {
    if (!threadId) return;
    const result = await communityVoteService.cast({
      targetType: 'thread',
      targetId: threadId,
      value,
    });
    const votesCount = Number(result?.votesCount || 0);
    const voteValue = Number(result?.voteValue || 0);
    state.threadVoteById.set(threadId, voteValue);
    state.threads = state.threads.map((thread) =>
      getId(thread) === threadId
        ? Object.assign({}, thread, { votesCount })
        : thread,
    );
    renderThreads();
  }

  async function handleThreadAction(action, threadId) {
    if (!threadId) return;
    if (action === 'delete') {
      const confirmed = window.confirm(
        'Delete this thread? This action cannot be undone.',
      );
      if (!confirmed) return;
      await threadService.delete(threadId);
      showNotice('Thread deleted.', 'info');
      await loadThreads({ announce: false });
      return;
    }
    if (action === 'pin') await threadService.pin(threadId);
    if (action === 'unpin') await threadService.unpin(threadId);
    if (action === 'close') await threadService.close(threadId);
    if (action === 'open') await threadService.open(threadId);
    await loadThreads({ announce: false });
  }

  function initSocket() {
    if (typeof window.io !== 'function') return;
    const baseUrl = resolveSocketBaseUrl();
    state.socket = window.io(baseUrl, {
      transports: ['websocket', 'polling'],
    });
    state.socket.on('connect', () => {
      joinCourseRoom();
    });
    state.socket.on('thread:created', (payload) => {
      const payloadCourseId = normalizeIdentifier(payload?.course);
      if (
        !state.communityCourseId ||
        payloadCourseId !== normalizeIdentifier(state.communityCourseId)
      )
        return;
      if (state.refreshTimer) {
        clearTimeout(state.refreshTimer);
      }
      state.refreshTimer = setTimeout(() => {
        loadThreads({ announce: false });
      }, 250);
    });
    state.socket.on('typing:update', (payload) => {
      if (!payload || payload.userId === getCurrentUserId()) return;
      var payloadCourse = normalizeIdentifier(payload.courseId);
      if (
        payloadCourse &&
        payloadCourse !== normalizeIdentifier(state.communityCourseId)
      )
        return;
      state.typingUsers[payload.userId] = {
        name: payload.name || 'Someone',
        timestamp: Date.now(),
      };
      updateTypingIndicator();
    });
    window.addEventListener('beforeunload', () => {
      if (state.socket) state.socket.disconnect();
    });
  }

  function getCurrentUserId() {
    return normalizeIdentifier(state.user?._id || state.user?.id || '');
  }

  function setupTypingListeners() {
    if (!elements.titleInput || !elements.bodyInput) return;
    function onInput() {
      if (!state.socket || !state.communityCourseId) return;
      state.socket.emit('typing:start', {
        courseId: state.communityCourseId,
        userId: getCurrentUserId(),
        name: state.user?.name || 'Someone',
      });
      if (state.typingTimer) clearTimeout(state.typingTimer);
      state.typingTimer = setTimeout(stopTyping, 2000);
    }
    elements.titleInput.addEventListener('input', onInput);
    elements.bodyInput.addEventListener('input', onInput);
    elements.titleInput.addEventListener('blur', stopTyping);
    elements.bodyInput.addEventListener('blur', stopTyping);
  }

  function stopTyping() {
    if (state.typingTimer) {
      clearTimeout(state.typingTimer);
      state.typingTimer = null;
    }
    if (state.socket && state.communityCourseId) {
      state.socket.emit('typing:stop', {
        courseId: state.communityCourseId,
        userId: getCurrentUserId(),
      });
    }
  }

  function updateTypingIndicator() {
    var indicator = document.getElementById('typing-indicator');
    if (!indicator) return;
    var now = Date.now();
    var active = [];
    for (var id in state.typingUsers) {
      if (now - state.typingUsers[id].timestamp > 3000) {
        delete state.typingUsers[id];
      } else {
        active.push(state.typingUsers[id].name);
      }
    }
    if (active.length === 0) {
      indicator.style.opacity = '0';
      return;
    }
    var text =
      active.length === 1
        ? active[0] + ' is creating a thread...'
        : 'Multiple people are creating threads...';
    indicator.textContent = text;
    indicator.style.opacity = '1';
    clearTimeout(indicator._hideTimer);
    indicator._hideTimer = setTimeout(function () {
      indicator.style.opacity = '0';
    }, 3000);
  }

  function joinCourseRoom() {
    if (!state.socket || !state.communityCourseId) return;
    state.socket.emit('course:join', state.communityCourseId);
  }

  function readMappedCommunityCourseId() {
    const localId = state.selectedCourse?.id;
    if (!localId) return '';
    const map = readCommunityCourseMap();
    return normalizeIdentifier(map[localId]);
  }

  function persistMappedCommunityCourseId() {
    const localId = state.selectedCourse?.id;
    if (!localId || !state.communityCourseId) return;
    const map = readCommunityCourseMap();
    map[localId] = state.communityCourseId;
    try {
      localStorage.setItem('nibras_community_course_map', JSON.stringify(map));
    } catch (_) {
      // ignore storage errors
    }
  }

  function readCommunityCourseMap() {
    try {
      const raw = localStorage.getItem('nibras_community_course_map');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function findCourseById(courseId) {
    const normalized = normalizeIdentifier(courseId);
    if (!normalized) return null;
    return (
      state.availableCourses.find(
        (course) =>
          normalizeIdentifier(course?._id || course?.id) === normalized,
      ) || null
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

  function toQueryString(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value != null && value !== '') params.append(key, value);
    });
    const query = params.toString();
    return query ? `?${query}` : '';
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

  function normalizeTitle(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function isCurrentUser(author) {
    const userId = normalizeIdentifier(state.user?._id || state.user?.id);
    const authorId = normalizeIdentifier(author?._id || author?.id || author);
    return Boolean(userId && authorId && userId === authorId);
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

  function debounce(fn, waitMs) {
    let timeoutId = null;
    return (...args) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), waitMs);
    };
  }
});
