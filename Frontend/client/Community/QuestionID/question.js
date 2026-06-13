window.NibrasReact.run(() => {
  // --- CONFIGURATION ---
  const DEFAULT_LEGACY_COMMUNITY_URL =
    'https://nibras-backend.up.railway.app/api';
  const BACKEND_URL =
    window.NibrasShared?.resolveServiceUrl?.('legacyCommunity') ||
    window.NibrasApi?.resolveServiceUrl?.('legacyCommunity') ||
    window.NibrasApiConfig?.getServiceUrl?.('legacyCommunity') ||
    window.NIBRAS_LEGACY_API_URL ||
    window.NIBRAS_API_URL ||
    window.NIBRAS_BACKEND_URL ||
    DEFAULT_LEGACY_COMMUNITY_URL;
  const sharedAuth = window.NibrasShared?.auth || null;
  const sharedApiFetch = window.NibrasShared?.apiFetch || null;
  const sharedUiStates = window.NibrasShared?.uiStates || null;

  // --- STATE ---
  let currentQuestionData = null;
  let currentQuestionId = null;
  let currentUserId = null;
  let currentUserRole = null;
  const AI_TUTOR_MARKER = '<!--NIBRAS_AI_TUTOR-->';
  const AI_PUBLISHED_QUESTIONS_KEY = 'nibras_ai_published_questions_v1';

  // --- SOCKET.IO SETUP ---
  let socket = null;
  let socketIoPromise = null;
  const voteValueCache = new Map();
  const voteValueInFlight = new Map();

  function normalizeBaseUrl(url) {
    return String(url || '')
      .trim()
      .replace(/\/+$/, '');
  }

  function dedupeList(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function normalizePath(path) {
    if (!path) return '/';
    return String(path).startsWith('/') ? String(path) : `/${String(path)}`;
  }

  function buildCommunityBaseCandidates() {
    const seeds = [
      BACKEND_URL,
      window.NibrasShared?.resolveServiceUrl?.('legacyCommunity'),
      window.NibrasApi?.resolveServiceUrl?.('legacyCommunity'),
      window.NibrasApiConfig?.getServiceUrl?.('legacyCommunity'),
      window.NIBRAS_LEGACY_API_URL,
      DEFAULT_LEGACY_COMMUNITY_URL,
    ];

    const bases = [];
    seeds.forEach((seed) => {
      const normalized = normalizeBaseUrl(seed);
      if (!normalized) return;
      bases.push(normalized);
      if (/\/api$/i.test(normalized)) {
        bases.push(normalized.replace(/\/api$/i, ''));
      } else {
        bases.push(`${normalized}/api`);
      }
    });

    return dedupeList(bases);
  }

  function buildPathCandidates(path) {
    const normalized = normalizePath(path);
    const isAuthPath = /^\/(?:api\/)?auth(?:\/|$)/i.test(normalized);
    const isCommunityPath = /^\/(?:api\/)?community(?:\/|$)/i.test(normalized);

    if (isAuthPath) {
      return dedupeList([
        normalized.startsWith('/api/')
          ? normalized.replace(/^\/api/i, '') || '/'
          : normalized,
        normalized.startsWith('/api/') ? normalized : `/api${normalized}`,
      ]);
    }

    const communityPath = isCommunityPath
      ? normalized.startsWith('/api/')
        ? normalized.replace(/^\/api/i, '')
        : normalized
      : `/community${normalized}`;

    return dedupeList([
      communityPath,
      `/api${communityPath}`,
      normalized.startsWith('/api/')
        ? normalized.replace(/^\/api/i, '') || '/'
        : normalized,
      normalized.startsWith('/api/') ? normalized : `/api${normalized}`,
    ]);
  }

  let activeCommunityBaseUrl =
    normalizeBaseUrl(BACKEND_URL) || DEFAULT_LEGACY_COMMUNITY_URL;

  function toSocketBaseUrl(url) {
    const normalized = normalizeBaseUrl(url);
    if (!normalized) return '';
    return normalized.replace(/\/api(?:\/community)?$/i, '');
  }

  function getSocketBaseUrl() {
    return (
      toSocketBaseUrl(activeCommunityBaseUrl) ||
      toSocketBaseUrl(BACKEND_URL) ||
      'https://nibras-backend.up.railway.app'
    );
  }

  function ensureSocketIoLoaded() {
    if (typeof io !== 'undefined') {
      return Promise.resolve(true);
    }
    if (socketIoPromise) {
      return socketIoPromise;
    }

    const socketScriptUrl = `${getSocketBaseUrl()}/socket.io/socket.io.js`;
    socketIoPromise = new Promise((resolve) => {
      const existingScript = Array.from(document.scripts).find(
        (script) => script.src === socketScriptUrl,
      );
      if (existingScript) {
        if (typeof io !== 'undefined') {
          resolve(true);
          return;
        }
        existingScript.addEventListener(
          'load',
          () => resolve(typeof io !== 'undefined'),
          { once: true },
        );
        existingScript.addEventListener('error', () => resolve(false), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.src = socketScriptUrl;
      script.async = true;
      script.addEventListener(
        'load',
        () => resolve(typeof io !== 'undefined'),
        { once: true },
      );
      script.addEventListener('error', () => resolve(false), { once: true });
      document.head.appendChild(script);
    });

    return socketIoPromise;
  }

  function initSocket(questionId) {
    if (typeof io === 'undefined') {
      console.log(
        '[SOCKET] Socket.io not available — script may have failed to load from:',
        getSocketBaseUrl(),
      );
      return;
    }
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    const baseUrl = getSocketBaseUrl();
    console.log('[SOCKET] Connecting to:', baseUrl);
    socket = io(baseUrl, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      console.log('[SOCKET] Connected:', socket.id);
      socket.emit('question:join', questionId);
      console.log('[SOCKET] Emitted question:join for:', questionId);
    });
    socket.on('connect_error', (err) => {
      console.log('[SOCKET] Connection error:', err.message);
    });
    socket.on('answer:created', (data) => {
      console.log('[SOCKET] New answer received:', data);
      loadQuestion(questionId);
    });
    socket.on('vote:updated', (data) => {
      console.log('[SOCKET] vote:updated received:', data);
      const voteBox = document.querySelector(
        `.q-vote-box[data-type="${data.targetType === 'question' ? 'question' : 'comment'}"][data-id="${data.targetId}"]`,
      );
      if (voteBox) {
        const countSpan = voteBox.querySelector('.vote-count');
        if (countSpan) {
          countSpan.innerText = data.votesCount;
        }
        const targetType =
          data.targetType === 'question' ? 'question' : 'answer';
        voteValueCache.set(
          `${targetType}:${data.targetId}`,
          Number(data.userVoteValue ?? 0),
        );
        saveVoteToStorage(
          targetType,
          data.targetId,
          Number(data.userVoteValue ?? 0),
        );
      }
    });
    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
    });
  }

  function disconnectSocket() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  let answerEditor = null;
  let editEditor = null;

  function renderMarkdown(text) {
    if (!text) return '';
    return DOMPurify.sanitize(marked.parse(text));
  }

  function escapeHtml(value) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(value)));
    return div.innerHTML;
  }

  // --- HELPER FUNCTIONS ---
  function getToken() {
    return (
      sharedAuth?.getToken?.() ||
      window.NibrasApi?.getToken?.() ||
      localStorage.getItem('token') ||
      null
    );
  }

  function buildAuthHeaders(headers = {}, options = {}) {
    if (sharedAuth?.buildAuthHeaders) {
      return sharedAuth.buildAuthHeaders(headers, options);
    }
    if (window.NibrasApi?.buildAuthHeaders) {
      return window.NibrasApi.buildAuthHeaders(headers, options);
    }

    return Object.assign({}, headers);
  }

  function resolveUiStateFromError(error, fallbackMessage) {
    if (sharedUiStates?.fromError) {
      return sharedUiStates.fromError(error, fallbackMessage);
    }
    return {
      state: 'error',
      message: error?.message || fallbackMessage || 'Request failed',
    };
  }

  async function requestLegacyApi(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const authEnabled = options.auth !== false;
    const headers = Object.assign({}, options.headers || {});
    const hasContentType = Object.keys(headers).some(
      (key) => key.toLowerCase() === 'content-type',
    );
    const hasBody =
      Object.prototype.hasOwnProperty.call(options, 'body') &&
      options.body != null;
    const isJsonBody =
      hasBody &&
      typeof options.body === 'object' &&
      !(options.body instanceof FormData);
    const baseCandidates = buildCommunityBaseCandidates();
    const pathCandidates = buildPathCandidates(path);

    if (authEnabled) {
      Object.assign(headers, buildAuthHeaders(headers));
    }
    // Prevent 304 Not Modified responses - force fresh data
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
    if (isJsonBody && !hasContentType) {
      headers['Content-Type'] = 'application/json';
    }

    let lastError = null;
    for (const baseUrl of baseCandidates) {
      for (const candidatePath of pathCandidates) {
        if (typeof sharedApiFetch === 'function') {
          try {
            const data = await sharedApiFetch(
              candidatePath,
              Object.assign({}, options, {
                service: 'legacyCommunity',
                baseUrl,
                headers,
              }),
            );
            activeCommunityBaseUrl =
              normalizeBaseUrl(baseUrl) || activeCommunityBaseUrl;
            return data;
          } catch (error) {
            lastError = error;
            const status = Number(error?.status || 0);
            if (status === 401 || status === 403) throw error;
            if (status !== 404 && status !== 0) throw error;
            continue;
          }
        }

        const response = await fetch(`${baseUrl}${candidatePath}`, {
          method,
          headers,
          body: isJsonBody ? JSON.stringify(options.body) : options.body,
        });

        let payload = null;
        try {
          payload = await response.json();
        } catch (_) {
          payload = null;
        }

        if (!response.ok) {
          const err = new Error(
            payload?.message ||
              payload?.error ||
              `Request failed (${response.status})`,
          );
          err.status = response.status;
          err.code =
            response.status === 401
              ? 'UNAUTHORIZED'
              : response.status === 403
                ? 'FORBIDDEN'
                : 'REQUEST_FAILED';
          err.payload = payload;
          lastError = err;
          if (response.status === 401 || response.status === 403) throw err;
          if (response.status !== 404) throw err;
          continue;
        }

        activeCommunityBaseUrl =
          normalizeBaseUrl(baseUrl) || activeCommunityBaseUrl;
        return payload;
      }
    }

    if (lastError) throw lastError;
    throw new Error('Request failed');
  }

  function getQuestionIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
  }

  function getInitials(name) {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function extractEntityId(entity) {
    if (entity == null) return null;
    if (typeof entity === 'object') {
      return entity._id || entity.id || entity.userId || null;
    }
    return entity;
  }

  function normalizeRole(roleValue) {
    // Handle null/undefined
    if (roleValue == null) return '';

    // If it's an ObjectId (24-char hex string like "69ed60065eb43a53b3ff9ebe"), treat as unknown role
    if (typeof roleValue === 'object' && roleValue._id) {
      // It's likely a populated role object - extract the name
      const nestedRole =
        roleValue.name ||
        roleValue.slug ||
        roleValue.title ||
        roleValue.role ||
        '';
      return String(nestedRole).trim().toLowerCase();
    }

    // Check if it's an ObjectId string (24-character hex)
    const roleStr = String(roleValue);
    if (/^[0-9a-fA-F]{24}$/.test(roleStr)) {
      // This is an ObjectId reference - treat as unknown user role
      return '';
    }

    // Handle object with role info
    if (typeof roleValue === 'object') {
      const nestedRole =
        roleValue.name ||
        roleValue.slug ||
        roleValue.title ||
        roleValue.role ||
        '';
      return String(nestedRole).trim().toLowerCase();
    }

    return roleStr.trim().toLowerCase();
  }

  function formatRoleLabel(roleValue, fallback = 'student') {
    const normalized = normalizeRole(roleValue) || fallback;
    return normalized
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function isAdminRole(roleValue) {
    const role = normalizeRole(roleValue);
    return (
      role === 'admin' ||
      role === 'super admin' ||
      role === 'super_admin' ||
      role === 'super-admin'
    );
  }

  function isOwner(authorId) {
    return Boolean(
      currentUserId && authorId && String(authorId) === String(currentUserId),
    );
  }

  function canEditQuestion(questionData) {
    return isOwner(questionData?.authorId);
  }

  function canDeleteQuestion(questionData) {
    return canEditQuestion(questionData) || isAdminRole(currentUserRole);
  }

  function canEditAnswer(answerData) {
    if (answerData?.isFromAI) return false;
    return isOwner(answerData?.authorId);
  }

  function canDeleteAnswer(answerData) {
    if (answerData?.isFromAI) return false;
    return canEditAnswer(answerData) || isAdminRole(currentUserRole);
  }

  function extractAuthUser(payload) {
    if (payload == null || typeof payload !== 'object') return null;
    const data =
      payload.data && typeof payload.data === 'object' ? payload.data : payload;
    const user = data.user || payload.user || null;
    if (user && typeof user === 'object') return user;
    if (data && typeof data === 'object' && (data._id || data.id)) return data;
    return null;
  }

  function stripAiTutorMarker(text) {
    return String(text || '')
      .replace(/<!--\s*NIBRAS_AI_TUTOR\s*-->/gi, '')
      .trim();
  }

  function hasAiTutorMarker(text) {
    return /<!--\s*NIBRAS_AI_TUTOR\s*-->/i.test(String(text || ''));
  }

  function normalizeAnswerFingerprint(value) {
    return stripAiTutorMarker(value).replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function readAiPublishedQuestionMeta(questionId) {
    if (!questionId) return null;
    try {
      const parsed = JSON.parse(
        localStorage.getItem(AI_PUBLISHED_QUESTIONS_KEY) || '{}',
      );
      return parsed[String(questionId)] || null;
    } catch (_) {
      return null;
    }
  }

  function isBackendMarkedAi(comment) {
    return Boolean(
      comment?.isFromAI ||
      comment?.isFromAi ||
      comment?.aiGenerated ||
      comment?.isAI ||
      comment?.isAi ||
      comment?.metadata?.isFromAI ||
      comment?.meta?.isFromAI ||
      normalizeRole(comment?.source) === 'ai_tutor' ||
      normalizeRole(comment?.origin) === 'ai_tutor',
    );
  }

  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  function setAnswerComposerVisibility(isVisible) {
    const answerHeader = document.getElementById('answers-count-header');
    const answerSection = document.querySelector('.your-answer-section');
    if (answerHeader) {
      answerHeader.style.display = isVisible ? '' : 'none';
    }
    if (answerSection) {
      answerSection.style.display = isVisible ? '' : 'none';
      answerSection.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    }
  }

  function showError(message, state = 'error') {
    const detailMain = document.getElementById('q-main-content');
    if (!detailMain) return;
    if (sharedUiStates?.render) {
      sharedUiStates.render(detailMain, { state, message });
    } else {
      detailMain.innerHTML = `
                <div style="text-align:center; padding:2rem; color:var(--tag-red-text, #dc2626);">
                    <i class="fa-solid fa-circle-exclamation" style="font-size:3rem; margin-bottom:1rem;"></i>
                    <h2>Error</h2>
                    <p>${message}</p>
                </div>
            `;
    }
    const backLink = document.createElement('a');
    backLink.href = '../community.html';
    backLink.className = 'btn-back';
    backLink.style.marginTop = '1rem';
    backLink.style.display = 'inline-block';
    backLink.style.fontWeight = '600';
    backLink.innerHTML =
      '<i class="fa-solid fa-chevron-left"></i> Back to Community';
    detailMain.appendChild(backLink);
    setAnswerComposerVisibility(false);
  }

  function showLoading() {
    const detailMain = document.getElementById('q-main-content');
    if (!detailMain) return;
    if (sharedUiStates?.render) {
      sharedUiStates.render(detailMain, {
        state: 'loading',
        message: 'Loading question...',
      });
    } else {
      detailMain.innerHTML = `
                <div style="text-align:center; padding:2rem;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color:var(--accent-blue);"></i>
                    <p style="margin-top:1rem;">Loading question...</p>
                </div>
            `;
    }
    setAnswerComposerVisibility(true);
  }

  function showToast(message, type = 'success') {
    const existingToast = document.getElementById('community-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'community-toast';
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.right = '20px';
    toast.style.bottom = '20px';
    toast.style.zIndex = '9999';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '600';
    toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.style.color = '#ffffff';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    toast.style.transition = 'opacity 250ms ease, transform 250ms ease';
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      setTimeout(() => toast.remove(), 250);
    }, 2500);
  }

  // --- SIDEBAR LOGIC ---
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      navLinks.forEach((n) => n.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // --- AUTH FETCH ---
  async function loadCurrentUser() {
    const token = getToken();
    if (!token) return;
    try {
      const data = await requestLegacyApi('/auth/me');
      const user = extractAuthUser(data);
      if (user) {
        currentUserId = extractEntityId(user);
        currentUserRole = normalizeRole(user.role);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }

  // --- DATA FETCHING ---
  async function loadQuestion(questionId) {
    currentQuestionId = questionId;

    // Only show loading state if we don't already have the data
    if (!currentQuestionData) showLoading();

    try {
      const data = await requestLegacyApi(`/questions/${questionId}`, {
        auth: false,
      });
      const payload =
        data?.data && typeof data.data === 'object' ? data.data : data;
      const question = payload?.question || data?.question;
      const comments =
        payload?.answers ||
        payload?.comments ||
        data?.answers ||
        data?.comments ||
        [];
      const localAiMeta = readAiPublishedQuestionMeta(questionId);

      if (!question) {
        showError('Question not found.', 'empty');
        return;
      }

      const acceptedAnswerId =
        question.acceptedAnswer?._id || question.acceptedAnswerId || null;

      currentQuestionData = {
        id: question._id,
        title: question.title,
        body: question.body,
        authorId: extractEntityId(question.author),
        author: question.author?.name || 'Unknown',
        authorInitials: getInitials(question.author?.name),
        votes: question.votesCount || 0,
        views: question.views || 0,
        createdAt: question.createdAt,
        time: formatTimeAgo(question.createdAt),
        tags: question.tags || [],
        authorRole: normalizeRole(question.author?.role) || 'student',
        authorRep:
          question.author?.reputation?.total ??
          question.author?.reputation ??
          0,
        acceptedAnswerId,
        replies: comments.map((comment) => {
          const rawBody = String(comment.body || '');
          const normalizedBody = stripAiTutorMarker(rawBody);
          const markedByBackend = isBackendMarkedAi(comment);
          const markedByMarker = hasAiTutorMarker(rawBody);
          const markedByLocalMeta =
            Boolean(localAiMeta?.answerFingerprint) &&
            normalizeAnswerFingerprint(normalizedBody) ===
              String(localAiMeta.answerFingerprint || '');
          const isFromAI = Boolean(
            markedByBackend || markedByMarker || markedByLocalMeta,
          );

          return {
            id: comment._id,
            authorId: isFromAI
              ? '__ai_tutor__'
              : extractEntityId(comment.author),
            votes: comment.votesCount || 0,
            author: isFromAI ? 'AI Tutor' : comment.author?.name || 'Unknown',
            authorRole: isFromAI
              ? 'ai_tutor'
              : normalizeRole(comment.author?.role) || 'student',
            authorRep:
              comment.author?.reputation?.total ??
              comment.author?.reputation ??
              0,
            initials: isFromAI ? 'AI' : getInitials(comment.author?.name),
            time: formatTimeAgo(comment.createdAt),
            createdAt: comment.createdAt,
            text: normalizedBody,
            isPinned: comment.isPinned,
            isFromAI,
          };
        }),
      };

      renderDetailView(currentQuestionData);
      loadRoutingInfo(questionId);
      if (!socket) {
        ensureSocketIoLoaded().then((isSocketReady) => {
          if (isSocketReady && !socket) {
            initSocket(questionId);
          }
        });
      }
    } catch (error) {
      console.error('Error loading question:', error);
      const stateInfo = resolveUiStateFromError(
        error,
        'Failed to load question. Please try again.',
      );
      showError(stateInfo.message, stateInfo.state);
    }
  }

  // --- RENDER FUNCTION ---
  function renderDetailView(q) {
    const isAdmin = isAdminRole(currentUserRole);
    setAnswerComposerVisibility(true);

    // A. Render Tags
    let tagHtml = '';
    q.tags.forEach((t) => {
      let color = 't-default';
      if (['data-structures', 'javascript', 'python', 'java'].includes(t))
        color = 't-red';
      if (['trees', 'arrays', 'strings'].includes(t)) color = 't-purple';
      if (['algorithms', 'sorting', 'searching'].includes(t)) color = 't-blue';
      if (['database', 'sql', 'mongodb'].includes(t)) color = 't-green';
      tagHtml += `<span class="tag ${color}">${t}</span>`;
    });

    // Question Setting Menu
    let actionMenuHtml = '';
    const isQuestionAuthor = canEditQuestion(q);

    if (canDeleteQuestion(q)) {
      actionMenuHtml = `
                <div class="q-settings-dropdown" style="position: relative; display: inline-block;">
                    <button type="button" class="fa-solid fa-ellipsis-vertical action-menu-btn" style="background:none; border:none; cursor: pointer; padding: 4px 10px; font-size: 1.15rem; color: var(--text-secondary);" title="More options" aria-label="Open question actions"></button>
                    
                    <div class="action-menu-content" style="display: none; position: absolute; top: 100%; right: 0; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 0; z-index: 100; box-shadow: 0 4px 15px rgba(0,0,0,0.15); min-width: 150px; margin-top: 5px;">
                        
                        ${
                          isQuestionAuthor
                            ? `
                        <button type="button" class="menu-item edit-q-btn" style="width:100%; text-align:left; background:none; border:none; padding: 10px 16px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; color: var(--text-primary); transition: 0.2s;">
                            <i class="fa-solid fa-pen" style="font-size: 0.85rem;"></i> Edit Question
                        </button>
                        `
                            : ''
                        }

                        <button type="button" class="menu-item delete-q-btn" style="width:100%; text-align:left; background:none; border:none; padding: 10px 16px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; color: #ef4444; transition: 0.2s;">
                            <i class="fa-solid fa-trash" style="font-size: 0.85rem;"></i> Delete
                        </button>

                    </div>
                </div>
            `;
    }

    // B. Render Main Question
    const detailMain = document.getElementById('q-main-content');
    detailMain.innerHTML = `
            <div class="q-vote-box" data-type="question" data-id="${q.id}">
                <button type="button" class="fa-solid fa-chevron-up vote-arrow up" data-type="question" data-id="${q.id}" aria-label="Upvote question" aria-pressed="false"></button>
                <span class="vote-count">${q.votes}</span>
                <button type="button" class="fa-solid fa-chevron-down vote-arrow down" data-type="question" data-id="${q.id}" aria-label="Downvote question" aria-pressed="false"></button>
            </div>
            <div class="detail-content">
                <h1 class="detail-title">${q.title}</h1>
                <div class="detail-body markdown-body">${renderMarkdown(q.body)}</div>
                <div class="detail-tags">${tagHtml}</div>
                <div class="routing-badge" id="routing-badge-${q.id}" style="display: none;"></div>
                <div class="detail-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="detail-actions" style="display: flex; align-items: center; gap: 14px;">
                        <span>Asked ${q.time}</span>
                        <span style="margin: 0 -4px;">•</span>
                        <span>${q.views} views</span>
                        <button type="button" class="fa-solid fa-share-nodes share-q-btn" title="Copy link" aria-label="Copy question link" style="background:none; border:none; cursor: pointer; font-size: 1.15rem; color: var(--accent-blue); transition: 0.2s;"></button>
                        <button type="button" class="fa-regular fa-flag report-btn" data-target-id="${q.id}" data-target-type="question" title="Report this question" aria-label="Report this question" style="background:none; border:none; cursor: pointer; font-size: 1.1rem; color: var(--text-secondary); transition: 0.2s;"></button>
                        ${actionMenuHtml}
                    </div>
                    <div class="detail-author-box">
                        <div class="author-av" style="width:36px; height:36px;">${q.authorInitials}</div>
                        <div class="detail-author-info">
                            <span class="detail-author-name">${q.author}</span>
                            <span class="detail-author-meta">${q.authorRep} rep • ${formatRoleLabel(q.authorRole)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    // C. Render Answers
    document.getElementById('answers-count-header').textContent =
      `${q.replies.length} Answer${q.replies.length !== 1 ? 's' : ''}`;
    const ansContainer = document.getElementById('answers-container');
    let answersHtml = '';

    // Sort: accepted answer first, then by creation date
    const sortedReplies = [...q.replies].sort((a, b) => {
      if (q.acceptedAnswerId && a.id === q.acceptedAnswerId) return -1;
      if (q.acceptedAnswerId && b.id === q.acceptedAnswerId) return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    sortedReplies.forEach((ans) => {
      const isAccepted =
        q.acceptedAnswerId && String(ans.id) === String(q.acceptedAnswerId);
      const isAnon = ans.isAnonymous === true;
      let roleBadge = '';
      let roleColor = 'bg-blue';
      if (isAccepted) {
        roleBadge = `<span class="contrib-badge bg-green"><i class="fa-solid fa-check-circle"></i> Accepted</span>`;
      } else if (isAnon) {
        roleBadge = `<span class="contrib-badge" style="background:#a855f7;color:#fff;">Anonymous</span>`;
      } else if (ans.isFromAI) {
        roleColor = 'bg-purple';
        var confidence = ans.confidence || ans.aiConfidence || '';
        var confidenceBadge = '';
        if (confidence === 'high') {
          confidenceBadge =
            '<span class="ai-confidence-badge conf-high"><i class="fa-solid fa-circle-check"></i> High confidence</span>';
        } else if (confidence === 'medium') {
          confidenceBadge =
            '<span class="ai-confidence-badge conf-medium"><i class="fa-solid fa-circle-exclamation"></i> Medium confidence</span>';
        } else if (confidence === 'low') {
          confidenceBadge =
            '<span class="ai-confidence-badge conf-low"><i class="fa-solid fa-triangle-exclamation"></i> Low confidence</span>';
        }
        var reviewStatus = ans.aiReviewStatus || '';
        var reviewBadge = '';
        if (reviewStatus === 'pending') {
          reviewBadge =
            '<span class="ai-review-badge review-pending">Pending review</span>';
        } else if (reviewStatus === 'approved') {
          reviewBadge =
            '<span class="ai-review-badge review-approved"><i class="fa-solid fa-check-circle"></i> Approved</span>';
        } else if (reviewStatus === 'rejected') {
          reviewBadge =
            '<span class="ai-review-badge review-rejected">Rejected</span>';
        }
        roleBadge = `<span class="contrib-badge ${roleColor}">AI Tutor</span>${confidenceBadge}${reviewBadge}`;
      } else if (ans.authorRole === 'instructor') {
        roleColor = 'bg-blue';
        roleBadge = `<span class="contrib-badge ${roleColor}">Instructor</span>`;
      } else if (ans.authorRole === 'admin') {
        roleColor = 'bg-purple';
        roleBadge = `<span class="contrib-badge ${roleColor}">Admin</span>`;
      }

      const acceptButton =
        isQuestionAuthor && !isAccepted && !ans.isFromAI
          ? `<button type="button" class="accept-answer-btn" data-comment-id="${ans.id}" title="Accept this answer" aria-label="Accept this answer"><i class="fa-regular fa-circle-check"></i> Accept</button>`
          : '';

      var isInstructor = currentUserRole === 'instructor';
      var isAiPending =
        ans.isFromAI &&
        (ans.aiReviewStatus === 'pending' || !ans.aiReviewStatus);
      var aiReviewButtons =
        isInstructor && isAiPending
          ? '<span class="ai-review-actions"><button type="button" class="btn-ai-approve" data-comment-id="' +
            ans.id +
            '" title="Approve AI answer"><i class="fa-solid fa-check"></i></button><button type="button" class="btn-ai-reject" data-comment-id="' +
            ans.id +
            '" title="Reject AI answer"><i class="fa-solid fa-xmark"></i></button></span>'
          : '';

      const pinnedBadge = ans.isPinned
        ? `<span class="contrib-badge bg-green" style="margin-left:8px;"><i class="fa-solid fa-thumbtack"></i> Pinned</span>`
        : '';

      // --- COMMENT ACTION MENU LOGIC ---
      const isCommentAuthor = canEditAnswer(ans);
      const canDeleteComment = canDeleteAnswer(ans);
      let commentActionMenuHtml = '';

      if (canDeleteComment) {
        commentActionMenuHtml = `
                    <div class="q-settings-dropdown" style="position: relative; display: inline-block;">
                        <button type="button" class="fa-solid fa-ellipsis-vertical action-menu-btn" style="background:none; border:none; cursor: pointer; padding: 4px 10px; font-size: 1.15rem; color: var(--text-secondary);" title="More options" aria-label="Open answer actions"></button>
                        
                        <div class="action-menu-content" style="display: none; position: absolute; top: 100%; right: 0; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 0; z-index: 100; box-shadow: 0 4px 15px rgba(0,0,0,0.15); min-width: 150px; margin-top: 5px;">
                            
                            ${
                              isCommentAuthor
                                ? `
                            <button type="button" class="menu-item edit-comment-btn" style="width:100%; text-align:left; background:none; border:none; padding: 10px 16px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; color: var(--text-primary); transition: 0.2s;">
                                <i class="fa-solid fa-pen" style="font-size: 0.85rem;"></i> Edit Answer
                            </button>
                            `
                                : ''
                            }

                            ${
                              canDeleteComment
                                ? `
                            <button type="button" class="menu-item delete-comment-btn" style="width:100%; text-align:left; background:none; border:none; padding: 10px 16px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; color: #ef4444; transition: 0.2s;">
                                <i class="fa-solid fa-trash" style="font-size: 0.85rem;"></i> Delete
                            </button>
                            `
                                : ''
                            }
                        </div>
                    </div>
                `;
      }

      answersHtml += `
                <div class="answer-card" data-comment-id="${escapeHtml(ans.id)}">
                    <div class="q-vote-box" data-type="comment" data-id="${escapeHtml(ans.id)}">
                        <button type="button" class="fa-solid fa-chevron-up vote-arrow up" data-type="comment" data-id="${escapeHtml(ans.id)}" aria-label="Upvote answer" aria-pressed="false"></button>
                        <span class="vote-count">${ans.votes}</span>
                        <button type="button" class="fa-solid fa-chevron-down vote-arrow down" data-type="comment" data-id="${escapeHtml(ans.id)}" aria-label="Downvote answer" aria-pressed="false"></button>
                    </div>
                    <div class="detail-content">
                        <div class="detail-body markdown-body" style="margin-bottom:1.5rem">${renderMarkdown(ans.text)}</div>
                        <div class="detail-footer" style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="detail-actions" style="display:flex; align-items:center; gap:14px;">
                                <span>${escapeHtml(ans.time)}</span>
                                ${acceptButton}
                                ${aiReviewButtons}
                                <button type="button" class="fa-regular fa-flag report-btn" data-target-id="${escapeHtml(ans.id)}" data-target-type="answer" title="Report this answer" aria-label="Report this answer" style="background:none; border:none; cursor: pointer; font-size: 1rem; color: var(--text-secondary); transition: 0.2s;"></button>
                                ${commentActionMenuHtml}
                            </div>
                            <div class="detail-author-box">
                                <div class="author-av" style="width:36px; height:36px;">${escapeHtml(ans.initials)}</div>
                                <div class="detail-author-info">
                                    <div style="display:flex; align-items:center">
                                        <span class="detail-author-name">${escapeHtml(ans.author)}</span>
                                        ${roleBadge}${pinnedBadge}
                                    </div>
                                    <span class="detail-author-meta">${escapeHtml(ans.authorRep)} rep</span>
                                </div>
                            </div>
                        </div>
                        ${ans.isFromAI ? '<div class="ai-feedback" data-answer-id="' + escapeHtml(ans.id) + '"><span class="ai-feedback-label">Was this helpful?</span><button type="button" class="ai-feedback-btn ai-feedback-up" data-answer-id="' + escapeHtml(ans.id) + '" title="Helpful" aria-label="Mark as helpful"><i class="fa-solid fa-thumbs-up"></i></button><button type="button" class="ai-feedback-btn ai-feedback-down" data-answer-id="' + escapeHtml(ans.id) + '" title="Not helpful" aria-label="Mark as not helpful"><i class="fa-solid fa-thumbs-down"></i></button><span class="ai-feedback-thanks" style="display:none;"><i class="fa-solid fa-check-circle"></i> Thanks for your feedback!</span></div>' : ''}
                    </div>
                </div>
            `;
    });
    ansContainer.innerHTML =
      answersHtml ||
      `
            <div style="text-align:center; padding:1.25rem; border:1px dashed var(--border-color); border-radius:8px; color:var(--text-secondary);">
                No answers yet. Be the first to help by posting a clear explanation.
            </div>
        `;

    loadUserVotes();
    restoreFeedbackState();

    setTimeout(() => {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }, 10);
  }

  // --- GLOBAL CLICK LISTENER FOR MENU & ACTIONS ---
  document.body.addEventListener('click', async (e) => {
    // 1. Handle Share Link Click
    const shareButton = e.target.closest('.share-q-btn');
    if (shareButton) {
      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.set('id', currentQuestionId);
      shareUrl.hash = '';
      navigator.clipboard
        .writeText(shareUrl.toString())
        .then(() => showToast('Link copied to clipboard!'))
        .catch(() => showToast('Unable to copy link right now.', 'error'));
      return;
    }

    // 2. Handle 3-Dot Dropdown Toggling
    const menuButton = e.target.closest('.action-menu-btn');
    const menus = document.querySelectorAll('.action-menu-content');

    if (menuButton) {
      const menu = menuButton.nextElementSibling;
      const isCurrentlyVisible = menu.style.display === 'block';
      menus.forEach((m) => (m.style.display = 'none')); // Close others
      if (!isCurrentlyVisible) menu.style.display = 'block';
      return;
    } else {
      // Close dropdowns if clicked outside
      menus.forEach((m) => (m.style.display = 'none'));
    }

    // ------------------------------------
    // EDIT & DELETE: QUESTIONS
    // ------------------------------------
    const editBtn = e.target.closest('.edit-q-btn');
    if (editBtn) {
      if (!canEditQuestion(currentQuestionData)) {
        showToast('You can only edit your own question.', 'error');
        return;
      }
      modalInvoker = editBtn;
      document.querySelector('#editModal h2').innerText = 'Edit Question';
      document.getElementById(
        'edit-question-title',
      ).parentElement.style.display = 'block'; // Show title
      document.getElementById('edit-question-title').value =
        currentQuestionData.title;
      document.getElementById('edit-question-body').value =
        currentQuestionData.body;

      document.getElementById('saveEditBtn').dataset.editType = 'question';
      document.getElementById('editModal').style.display = 'flex';
      document.getElementById('editModal').setAttribute('aria-hidden', 'false');
      initEditEditor(currentQuestionData.body);
      setTimeout(
        () => document.getElementById('edit-question-title')?.focus(),
        30,
      );
      return;
    }

    const deleteBtn = e.target.closest('.delete-q-btn');
    if (deleteBtn) {
      if (!canDeleteQuestion(currentQuestionData)) {
        showToast(
          'You do not have permission to delete this question.',
          'error',
        );
        return;
      }
      if (
        confirm(
          'Are you sure you want to delete this question? This action cannot be undone.',
        )
      ) {
        try {
          await requestLegacyApi(`/questions/${currentQuestionId}`, {
            method: 'DELETE',
          });
          showToast('Question deleted successfully!');
          setTimeout(() => {
            window.location.href = '../community.html';
          }, 1000);
        } catch (error) {
          console.error('Deletion error:', error);
          showToast(
            error.message || 'An error occurred while deleting the question.',
            'error',
          );
        }
      }
      return;
    }

    // ------------------------------------
    // EDIT & DELETE: COMMENTS (ANSWERS)
    // ------------------------------------
    const editCommentBtn = e.target.closest('.edit-comment-btn');
    if (editCommentBtn) {
      modalInvoker = editCommentBtn;
      const commentCard = e.target.closest('.answer-card');
      const commentId = commentCard.dataset.commentId;
      const commentData = currentQuestionData.replies.find(
        (r) => r.id === commentId,
      );
      if (commentData?.isFromAI) {
        showToast('AI Tutor answers are locked and cannot be edited.', 'error');
        return;
      }
      if (!canEditAnswer(commentData)) {
        showToast('You can only edit your own answer.', 'error');
        return;
      }

      document.querySelector('#editModal h2').innerText = 'Edit Answer';
      document.getElementById(
        'edit-question-title',
      ).parentElement.style.display = 'none'; // Hide title input!
      document.getElementById('edit-question-body').value = commentData.text;

      document.getElementById('saveEditBtn').dataset.editType = 'comment';
      document.getElementById('saveEditBtn').dataset.editId = commentId;
      document.getElementById('editModal').style.display = 'flex';
      document.getElementById('editModal').setAttribute('aria-hidden', 'false');
      initEditEditor(commentData.text);
      setTimeout(() => editEditor?.codemirror?.focus?.(), 30);
      return;
    }

    // HELPER TO INIT EDIT EDITOR
    function initEditEditor(initialValue) {
      if (!editEditor) {
        editEditor = new EasyMDE({
          element: document.getElementById('edit-question-body'),
          spellChecker: false,
        });
      }
      editEditor.value(initialValue);
      setTimeout(() => editEditor.codemirror.refresh(), 50);
    }

    const deleteCommentBtn = e.target.closest('.delete-comment-btn');
    if (deleteCommentBtn) {
      const commentCard = e.target.closest('.answer-card');
      const commentId = commentCard?.dataset?.commentId;
      const commentData = currentQuestionData.replies.find(
        (r) => String(r.id) === String(commentId),
      );
      if (commentData?.isFromAI) {
        showToast(
          'AI Tutor answers are locked and cannot be deleted.',
          'error',
        );
        return;
      }
      if (!canDeleteAnswer(commentData)) {
        showToast('You do not have permission to delete this answer.', 'error');
        return;
      }
      if (
        confirm(
          'Are you sure you want to delete this answer? This action cannot be undone.',
        )
      ) {
        try {
          await requestLegacyApi(`/answers/${currentQuestionId}/${commentId}`, {
            method: 'DELETE',
          });
          showToast('Answer deleted successfully!');
          await loadQuestion(currentQuestionId); // Refresh Data
        } catch (error) {
          console.error('Deletion error:', error);
          showToast(
            error.message || 'An error occurred while deleting the answer.',
            'error',
          );
        }
      }
      return;
    }

    // ------------------------------------
    // ACCEPT ANSWER
    // ------------------------------------
    const acceptBtn = e.target.closest('.accept-answer-btn');
    if (acceptBtn) {
      const commentId = acceptBtn.dataset.commentId;
      if (!commentId) return;
      try {
        await requestLegacyApi(
          `/answers/${currentQuestionId}/${commentId}/accept`,
          {
            method: 'POST',
          },
        );
        showToast('Answer accepted!');
        await loadQuestion(currentQuestionId);
      } catch (error) {
        console.error('Accept error:', error);
        showToast(error.message || 'Failed to accept answer.', 'error');
      }
      return;
    }

    // ------------------------------------
    // REPORT / FLAG CONTENT
    // ------------------------------------
    const reportBtn = e.target.closest('.report-btn');
    if (reportBtn) {
      const targetId = reportBtn.dataset.targetId;
      const targetType = reportBtn.dataset.targetType;
      if (!targetId || !targetType) return;

      const reason = prompt(
        'Why are you reporting this? (spam, inappropriate, off-topic, or describe the issue):',
      );
      if (!reason || !reason.trim()) return;

      try {
        const flagService = window.NibrasServices?.flagService;
        if (flagService) {
          await flagService.create({
            targetId,
            targetType,
            reason: reason.trim(),
          });
        } else {
          await requestLegacyApi('/flags', {
            method: 'POST',
            body: { targetId, targetType, reason: reason.trim() },
          });
        }
        showToast('Thank you. Your report has been submitted for review.');
      } catch (error) {
        console.error('Flag error:', error);
        showToast(error.message || 'Failed to submit report.', 'error');
      }
      return;
    }

    // ------------------------------------
    // AI FEEDBACK THUMBS
    // ------------------------------------
    var feedbackBtn = e.target.closest('.ai-feedback-btn');
    if (feedbackBtn) {
      var answerId = feedbackBtn.getAttribute('data-answer-id');
      var helpful = feedbackBtn.classList.contains('ai-feedback-up');
      if (answerId) sendAiFeedback(answerId, helpful, feedbackBtn);
      return;
    }

    // ------------------------------------
    // AI ANSWER: APPROVE
    // ------------------------------------
    var approveBtn = e.target.closest('.btn-ai-approve');
    if (approveBtn) {
      var commentId = approveBtn.getAttribute('data-comment-id');
      if (commentId) approveAiAnswer(commentId);
      return;
    }

    // ------------------------------------
    // AI ANSWER: REJECT
    // ------------------------------------
    var rejectBtn = e.target.closest('.btn-ai-reject');
    if (rejectBtn) {
      var commentId = rejectBtn.getAttribute('data-comment-id');
      if (commentId) rejectAiAnswer(commentId);
      return;
    }

    // ------------------------------------
    // AI ANSWER: SUGGEST (from preview)
    // ------------------------------------
    var approveSuggBtn = e.target.closest('#approveSuggestionBtn');
    if (approveSuggBtn) {
      var preview = document.getElementById('aiSuggestionPreview');
      if (preview) preview.style.display = 'none';
      showToast('AI answer approved and published.', 'success');
      if (currentQuestionId) loadQuestion(currentQuestionId);
      return;
    }

    var rejectSuggBtn = e.target.closest('#rejectSuggestionBtn');
    if (rejectSuggBtn) {
      var preview = document.getElementById('aiSuggestionPreview');
      if (preview) preview.style.display = 'none';
      showToast('AI suggestion dismissed.', 'info');
      return;
    }
  });

  // --- DYNAMIC MODAL SAVE LOGIC ---
  const editModal = document.getElementById('editModal');
  const closeEditModal = document.getElementById('closeEditModal');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const saveEditBtn = document.getElementById('saveEditBtn');
  let modalInvoker = null;

  const closeModalFunc = () => {
    if (editModal) {
      editModal.style.display = 'none';
      editModal.setAttribute('aria-hidden', 'true');
    }
    if (modalInvoker && typeof modalInvoker.focus === 'function') {
      modalInvoker.focus();
    }
  };

  if (closeEditModal) closeEditModal.addEventListener('click', closeModalFunc);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeModalFunc);
  document.addEventListener('click', (event) => {
    if (event.target === editModal) {
      closeModalFunc();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && editModal?.style.display === 'flex') {
      closeModalFunc();
    }
  });

  if (saveEditBtn) {
    saveEditBtn.addEventListener('click', async () => {
      const editType = saveEditBtn.dataset.editType;
      const newBody = editEditor
        ? editEditor.value().trim()
        : document.getElementById('edit-question-body').value.trim();

      saveEditBtn.disabled = true;
      const origText = saveEditBtn.innerHTML;
      saveEditBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

      try {
        let endpointPath, method, payload;

        if (editType === 'question') {
          if (!canEditQuestion(currentQuestionData)) {
            throw new Error('You can only edit your own question.');
          }
          const newTitle = document
            .getElementById('edit-question-title')
            .value.trim();
          if (!newTitle || !newBody)
            throw new Error('Title and details cannot be empty.');

          endpointPath = `/questions/${currentQuestionId}`;
          method = 'PATCH';
          payload = { title: newTitle, body: newBody };
        } else if (editType === 'comment') {
          const commentId = saveEditBtn.dataset.editId;
          const commentData = currentQuestionData.replies.find(
            (r) => String(r.id) === String(commentId),
          );
          if (commentData?.isFromAI) {
            throw new Error(
              'AI Tutor answers are locked and cannot be edited.',
            );
          }
          if (!canEditAnswer(commentData)) {
            throw new Error('You can only edit your own answer.');
          }
          if (!newBody) throw new Error('Answer cannot be empty.');

          endpointPath = `/answers/${currentQuestionId}/${commentId}`;
          method = 'PATCH';
          payload = { body: newBody };
        }

        await requestLegacyApi(endpointPath, {
          method: method,
          body: payload,
        });
        closeModalFunc();
        showToast(
          `${editType === 'question' ? 'Question' : 'Answer'} updated successfully!`,
        );
        await loadQuestion(currentQuestionId); // Refresh Data
      } catch (error) {
        console.error('Update error:', error);
        showToast(error.message || 'An error occurred while saving.', 'error');
      } finally {
        saveEditBtn.disabled = false;
        saveEditBtn.innerHTML = origText;
      }
    });
  }

  // --- VOTING LOGIC ---
  const VOTES_STORAGE_KEY = 'nibras_votes_v2';

  function getVotesFromStorage() {
    try {
      const stored = localStorage.getItem(VOTES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  function saveVoteToStorage(targetType, targetId, voteValue) {
    try {
      const votes = getVotesFromStorage();
      votes[`${targetType}:${targetId}`] = voteValue;
      localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votes));
    } catch {}
  }

  function seedCacheFromStorage(targetType, targetId) {
    const votes = getVotesFromStorage();
    const cacheKey = `${targetType}:${targetId}`;
    if (votes[cacheKey] !== undefined) {
      voteValueCache.set(cacheKey, Number(votes[cacheKey]));
    }
  }

  async function fetchVoteValue(targetType, targetId) {
    const cacheKey = `${targetType}:${targetId}`;
    if (voteValueCache.has(cacheKey)) {
      return voteValueCache.get(cacheKey);
    }
    seedCacheFromStorage(targetType, targetId);
    if (voteValueCache.has(cacheKey)) {
      return voteValueCache.get(cacheKey);
    }
    if (voteValueInFlight.has(cacheKey)) {
      return voteValueInFlight.get(cacheKey);
    }

    const requestPromise = requestLegacyApi(`/votes/${targetType}/${targetId}`)
      .then((data) => {
        const voteValue = Number(data.value ?? 0);
        voteValueCache.set(cacheKey, voteValue);
        saveVoteToStorage(targetType, targetId, voteValue);
        return voteValue;
      })
      .catch(() => null)
      .finally(() => {
        voteValueInFlight.delete(cacheKey);
      });

    voteValueInFlight.set(cacheKey, requestPromise);
    return requestPromise;
  }

  async function loadUserVotes() {
    const token = getToken();
    if (!token || !currentQuestionData) return;

    try {
      const voteTargets = [
        { type: 'question', apiType: 'question', id: currentQuestionData.id },
        ...currentQuestionData.replies.map((reply) => ({
          type: 'comment',
          apiType: 'answer',
          id: reply.id,
        })),
      ];

      const pendingTargets = [];
      voteTargets.forEach((target) => {
        const cacheKey = `${target.apiType}:${target.id}`;
        if (voteValueCache.has(cacheKey)) {
          updateVoteUI(
            target.type,
            target.id,
            Number(voteValueCache.get(cacheKey) ?? 0),
          );
          return;
        }
        pendingTargets.push(target);
      });

      if (pendingTargets.length === 0) return;

      await Promise.all(
        pendingTargets.map(async (target) => {
          const voteValue = await fetchVoteValue(target.apiType, target.id);
          if (voteValue == null) return;
          updateVoteUI(target.type, target.id, voteValue);
        }),
      );
    } catch (error) {
      console.error('Error loading votes:', error);
    }
  }

  function updateVoteUI(type, id, value) {
    const voteBox = document.querySelector(
      `.q-vote-box[data-type="${type}"][data-id="${id}"]`,
    );
    if (!voteBox) return;

    const upBtn = voteBox.querySelector('.up');
    const downBtn = voteBox.querySelector('.down');

    upBtn.classList.remove('active');
    downBtn.classList.remove('active');

    if (value === 1) upBtn.classList.add('active');
    if (value === -1) downBtn.classList.add('active');
    upBtn?.setAttribute('aria-pressed', value === 1 ? 'true' : 'false');
    downBtn?.setAttribute('aria-pressed', value === -1 ? 'true' : 'false');
  }

  const pageVotes = new Map();

  document.body.addEventListener('click', async (e) => {
    if (e.target.classList.contains('vote-arrow')) {
      const btn = e.target;
      const type = btn.dataset.type;
      const targetId = btn.dataset.id;
      const voteBox = btn.closest('.q-vote-box');
      const countSpan = voteBox.querySelector('.vote-count');
      const currentVotes = parseInt(countSpan.innerText);

      const token = getToken();
      if (!token) {
        showToast('Please sign in to vote on this post.', 'error');
        return;
      }

      const upBtn = voteBox.querySelector('.up');
      const downBtn = voteBox.querySelector('.down');
      const wasUpvoted = upBtn.classList.contains('active');
      const wasDownvoted = downBtn.classList.contains('active');
      const currentUserVote = wasUpvoted ? 1 : wasDownvoted ? -1 : 0;

      let voteValue;
      let newActiveState;

      if (btn.classList.contains('up')) {
        if (wasUpvoted) {
          voteValue = 0;
          newActiveState = 0;
        } else {
          voteValue = 1;
          newActiveState = 1;
        }
      } else {
        if (wasDownvoted) {
          voteValue = 0;
          newActiveState = 0;
        } else {
          voteValue = -1;
          newActiveState = -1;
        }
      }

      updateVoteUI(type, targetId, newActiveState);

      let expectedVotes = currentVotes;
      if (currentUserVote === 0 && voteValue !== 0) {
        expectedVotes += voteValue;
      } else if (currentUserVote !== 0 && voteValue === 0) {
        expectedVotes -= currentUserVote;
      } else if (currentUserVote !== voteValue) {
        expectedVotes += voteValue - currentUserVote;
      }
      countSpan.innerText = expectedVotes;

      try {
        const targetType = type === 'question' ? 'question' : 'answer';
        const data = await requestLegacyApi('/votes', {
          method: 'POST',
          body: {
            targetType: targetType,
            targetId: targetId,
            value: voteValue,
          },
        });

        if (data.votesCount !== undefined) {
          countSpan.innerText = data.votesCount;
        }

        pageVotes.set(targetId, { type, value: data.voteValue || voteValue });
        voteValueCache.set(
          `${targetType}:${targetId}`,
          Number(data.voteValue || voteValue),
        );
        saveVoteToStorage(
          targetType,
          targetId,
          Number(data.voteValue || voteValue),
        );
      } catch (error) {
        console.error('Voting error:', error);
        updateVoteUI(type, targetId, currentUserVote);
        countSpan.innerText = currentVotes;
        const targetType = type === 'question' ? 'question' : 'answer';
        voteValueCache.set(`${targetType}:${targetId}`, currentUserVote);
        saveVoteToStorage(targetType, targetId, currentUserVote);
      }
    }
  });

  // --- COMMENT SUBMISSION ---
  async function postComment() {
    const token = getToken();
    if (!token) {
      showToast('Please sign in to post an answer.', 'error');
      return;
    }

    if (!currentQuestionId) {
      showToast('Question ID not found.', 'error');
      return;
    }

    const textarea = document.querySelector('.answer-textarea');
    const body = answerEditor
      ? answerEditor.value().trim()
      : document.querySelector('.answer-textarea').value.trim();

    if (!body) {
      showToast('Please enter your answer before posting.', 'error');
      answerEditor?.codemirror?.focus?.();
      textarea?.focus();
      return;
    }

    const postBtn = document.getElementById('post-answer-btn');
    postBtn.disabled = true;
    postBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Posting...';

    const anonymousCheckbox = document.getElementById('answer-anonymous');
    const isAnonymous = anonymousCheckbox?.checked || false;

    try {
      await requestLegacyApi(`/answers/${currentQuestionId}`, {
        method: 'POST',
        body: { body, isAnonymous },
      });

      if (answerEditor) answerEditor.value('');

      textarea.value = '';
      showToast('Answer posted successfully!');
      await loadQuestion(currentQuestionId);
    } catch (error) {
      console.error('Error posting comment:', error);
      showToast(
        error.message || 'Failed to post answer. Please try again.',
        'error',
      );
    } finally {
      postBtn.disabled = false;
      postBtn.innerText = 'Post Answer';
    }
  }

  document
    .getElementById('post-answer-btn')
    ?.addEventListener('click', postComment);

  // --- THEME TOGGLE ---
  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn?.querySelector('i');
  const appLogo = document.getElementById('app-logo');

  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    if (themeIcon) themeIcon.className = 'fa-regular fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  }

  themeBtn?.addEventListener('click', () => {
    themeBtn.classList.add('rotating');
    setTimeout(() => {
      themeBtn.classList.remove('rotating');
    }, 500);
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    if (current === 'light') {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      if (themeIcon) themeIcon.className = 'fa-regular fa-sun';
      if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
    } else {
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
      if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
    }
  });

  // --- ROUTING INDICATOR ---
  async function loadRoutingInfo(questionId) {
    var badge = document.getElementById('routing-badge-' + questionId);
    if (!badge) return;
    try {
      var aiBaseUrl =
        BACKEND_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '') + '/api/ai';
      var response = await fetch(
        aiBaseUrl +
          '/questions/' +
          encodeURIComponent(String(questionId)) +
          '/routing',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + (getToken() || ''),
          },
        },
      );
      if (!response.ok) throw new Error('API unavailable');
      var data = await response.json();
      var mentorName =
        data?.mentor ||
        data?.name ||
        data?.assignedTo ||
        data?.data?.mentor ||
        '';
      var responseTime =
        data?.responseTime || data?.eta || data?.data?.responseTime || '24h';
      if (mentorName) {
        badge.innerHTML =
          '<i class="fa-solid fa-user-check"></i> Routed to ' +
          escapeHtml(mentorName) +
          ' — responds within ' +
          escapeHtml(responseTime);
        badge.style.display = 'flex';
      }
    } catch (_) {
      /* silently hide */
    }
  }

  // --- AI FEEDBACK ---
  var feedbackGiven = {};

  function restoreFeedbackState() {
    try {
      var saved = JSON.parse(
        localStorage.getItem('nibras_ai_feedback_v1') || '{}',
      );
      feedbackGiven = saved;
      Object.keys(saved).forEach(function (aid) {
        var container = document.querySelector(
          '.ai-feedback[data-answer-id="' + aid + '"]',
        );
        if (!container) return;
        var up = container.querySelector('.ai-feedback-up');
        var down = container.querySelector('.ai-feedback-down');
        var thanks = container.querySelector('.ai-feedback-thanks');
        if (up) up.style.display = 'none';
        if (down) down.style.display = 'none';
        if (thanks) {
          thanks.style.display = 'inline-flex';
          thanks.style.color =
            saved[aid] === true ? 'var(--tag-green-text)' : '#ef4444';
        }
      });
    } catch (_) {}
  }

  async function sendAiFeedback(answerId, helpful, btn) {
    var container = btn.closest('.ai-feedback');
    if (!container) return;
    if (feedbackGiven[answerId] !== undefined) return;

    feedbackGiven[answerId] = helpful;
    try {
      localStorage.setItem(
        'nibras_ai_feedback_v1',
        JSON.stringify(feedbackGiven),
      );
    } catch (_) {}

    var up = container.querySelector('.ai-feedback-up');
    var down = container.querySelector('.ai-feedback-down');
    var thanks = container.querySelector('.ai-feedback-thanks');
    if (up) up.style.display = 'none';
    if (down) down.style.display = 'none';
    if (thanks) {
      thanks.style.display = 'inline-flex';
      thanks.style.color = helpful ? 'var(--tag-green-text)' : '#ef4444';
    }

    try {
      var aiBaseUrl =
        BACKEND_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '') + '/api/ai';
      await fetch(aiBaseUrl + '/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + (getToken() || ''),
        },
        body: JSON.stringify({ answerId: answerId, helpful: helpful }),
      });
    } catch (_) {}
  }

  // Wire up Suggest AI button
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#suggestAiBtn');
    if (btn) {
      e.preventDefault();
      suggestAiAnswer();
    }
  });

  // --- AI ANSWER FUNCTIONS ---
  async function suggestAiAnswer() {
    if (!currentQuestionId) return;
    var preview = document.getElementById('aiSuggestionPreview');
    var loading = document.getElementById('aiSuggestionLoading');
    var content = document.getElementById('aiSuggestionContent');
    var body = document.getElementById('aiSuggestionBody');
    var badge = document.getElementById('aiConfidenceBadge');
    var btn = document.getElementById('suggestAiBtn');
    if (!preview || !loading || !content) return;

    preview.style.display = 'block';
    loading.style.display = 'block';
    content.style.display = 'none';
    if (btn) btn.disabled = true;

    try {
      var aiBaseUrl =
        BACKEND_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '') + '/api/ai';
      var response = await fetch(aiBaseUrl + '/suggest-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + (getToken() || ''),
        },
        body: JSON.stringify({ questionId: currentQuestionId }),
      });
      if (!response.ok) throw new Error('API unavailable');
      var data = await response.json();
      var suggestedAnswer =
        data?.suggestedAnswer ||
        data?.answer ||
        data?.data?.suggestedAnswer ||
        '';
      var confidence = data?.confidence || data?.data?.confidence || 'medium';

      loading.style.display = 'none';
      content.style.display = 'block';

      if (body) body.innerHTML = renderMarkdown(suggestedAnswer);
      if (badge) {
        badge.className = 'ai-confidence-badge conf-' + confidence;
        var label =
          confidence === 'high'
            ? 'High confidence'
            : confidence === 'medium'
              ? 'Medium confidence'
              : 'Low confidence';
        badge.innerHTML =
          (confidence === 'high'
            ? '<i class="fa-solid fa-circle-check"></i> '
            : confidence === 'medium'
              ? '<i class="fa-solid fa-circle-exclamation"></i> '
              : '<i class="fa-solid fa-triangle-exclamation"></i> ') + label;
      }
    } catch (err) {
      loading.style.display = 'none';
      preview.style.display = 'none';
      showToast('AI suggestion unavailable. Please try again later.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function approveAiAnswer(answerId) {
    try {
      var aiBaseUrl =
        BACKEND_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '') + '/api/ai';
      var response = await fetch(
        aiBaseUrl +
          '/answers/' +
          encodeURIComponent(String(answerId)) +
          '/approve',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + (getToken() || ''),
          },
        },
      );
      if (!response.ok) throw new Error('API unavailable');
      showToast('AI answer approved.', 'success');
      if (currentQuestionId) loadQuestion(currentQuestionId);
    } catch (err) {
      showToast('Failed to approve. API may not be ready yet.', 'error');
    }
  }

  async function rejectAiAnswer(answerId) {
    try {
      var aiBaseUrl =
        BACKEND_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '') + '/api/ai';
      var response = await fetch(
        aiBaseUrl +
          '/answers/' +
          encodeURIComponent(String(answerId)) +
          '/reject',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + (getToken() || ''),
          },
          body: JSON.stringify({ reason: '' }),
        },
      );
      if (!response.ok) throw new Error('API unavailable');
      showToast('AI answer rejected.', 'success');
      if (currentQuestionId) loadQuestion(currentQuestionId);
    } catch (err) {
      showToast('Failed to reject. API may not be ready yet.', 'error');
    }
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

  // --- INITIALIZATION ---
  async function initPage() {
    await loadCurrentUser();
    updateSidebarUser();

    const questionId = getQuestionIdFromUrl();
    if (questionId) {
      loadQuestion(questionId);
    } else {
      showError(
        'No question ID provided. Please select a question from the community page.',
        'empty',
      );
    }

    // Show AI suggest section for instructors
    if (currentUserRole === 'instructor') {
      var section = document.getElementById('aiSuggestSection');
      if (section) section.style.display = 'block';
    }

    // INIT ANSWER BOX EDITOR
    answerEditor = new EasyMDE({
      element: document.querySelector('.answer-textarea'),
      spellChecker: false,
      placeholder:
        'Type your answer here... (Markdown, code, and images supported)',
    });
  }

  initPage();
});
