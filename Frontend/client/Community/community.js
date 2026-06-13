window.NibrasReact.run(() => {
  // Initialize user session display (avatar, name, role)
  if (window.NibrasShared?.session?.updateUserInfoDisplay) {
    window.NibrasShared.session.updateUserInfoDisplay();
  }

  // ==========================================
  // ⚙️ CONFIGURATION
  // ==========================================
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
  let askEditor = null;

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

  function renderFeedState(state, message) {
    if (!feedContainer) return;
    if (paginationContainer) {
      paginationContainer.innerHTML = '';
      paginationContainer.hidden = true;
    }
    if (sharedUiStates?.render) {
      sharedUiStates.render(feedContainer, { state, message });
      return;
    }
    feedContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-secondary);">${message || ''}</div>`;
  }

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
            return await sharedApiFetch(
              candidatePath,
              Object.assign({}, options, {
                service: 'legacyCommunity',
                baseUrl,
                headers,
              }),
            );
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

        return payload;
      }
    }

    if (lastError) throw lastError;
    throw new Error('Request failed');
  }

  // --- 1. SIDEBAR LOGIC ---
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      navLinks.forEach((n) => n.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // --- 2. DATA STATE ---
  const communityData = {
    questions: [],
    popularTags: [],
  };

  const feedContainer = document.getElementById('questions-container');
  const paginationContainer = document.getElementById('questions-pagination');
  const feedTabs = document.querySelectorAll('.feed-tab');
  const searchInput = document.getElementById('question-search');
  let currentFilter = 'Recent';
  let currentPage = 1;
  const QUESTIONS_PER_PAGE = 10;
  let currentUserId = null;
  let renderedQuestionIds = [];
  let searchDebounceTimer = null;

  // Sidebar Tags State
  let currentSelectedTag = null;
  let isTagsExpanded = false;

  // --- MODAL TAGS STATE ---
  let availableModalTags = [];
  let selectedModalTags = [];
  const previewCache = new Map();
  const questionVoteFetchCache = new Map();
  const questionVoteInFlight = new Map();
  let communitySocket = null;
  let communitySocketIoPromise = null;
  const joinedQuestionRooms = new Set();

  function getUserIdFromStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      return stored?._id || stored?.id || null;
    } catch {
      return null;
    }
  }

  async function loadCurrentUser() {
    const token = getToken();
    if (!token) return;

    try {
      const res = await requestLegacyApi('/auth/me');
      const user = res?.user || res?.data || null;
      if (user) {
        currentUserId = user._id || user.id;
        localStorage.setItem('userId', currentUserId);
        localStorage.setItem('user', JSON.stringify(user));
        await loadVotesForRenderedQuestions();
      }
    } catch (error) {
      console.error('Error loading current user:', error);
      if (!currentUserId) {
        currentUserId = getUserIdFromStorage();
      }
    }
  }

  function getPlainTextPreview(markdown) {
    if (!markdown) return '';
    if (previewCache.has(markdown)) {
      return previewCache.get(markdown);
    }
    const html = DOMPurify.sanitize(marked.parse(markdown));
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    let text = tempDiv.textContent || tempDiv.innerText || '';
    const preview = text.substring(0, 180) + (text.length > 180 ? '...' : '');
    previewCache.set(markdown, preview);
    if (previewCache.size > 600) {
      const firstKey = previewCache.keys().next().value;
      previewCache.delete(firstKey);
    }
    return preview;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '600';
    toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
    toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
    toast.style.color = '#ffffff';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 180);
    }, 1800);
  }

  async function loadTags() {
    try {
      const [allData, popData] = await Promise.all([
        requestLegacyApi('/tags', { auth: false }),
        requestLegacyApi('/tags/popular?limit=1000', { auth: false }),
      ]);
      console.log('[DEBUG] Tags response:', allData);
      console.log('[DEBUG] Popular tags response:', popData);

      const allTags = allData?.data?.tags || allData?.tags || [];
      availableModalTags = allTags.map((t) => t.name).sort();

      const popTags = popData?.data?.tags || popData?.tags || [];

      communityData.popularTags = popTags.map((t) => ({
        name: t.name,
        count: t.usageCount || 0,
        color: getVibrantColorClass(t.name),
      }));

      renderWidgets();
      renderModalTags();
    } catch (error) {
      console.error('Failed to load tags from backend:', error);
      const tagsContainerEl = document.getElementById('tags-container');
      if (tagsContainerEl) {
        const uiState = resolveUiStateFromError(
          error,
          'Unable to load community tags right now.',
        );
        if (sharedUiStates?.render) {
          sharedUiStates.render(tagsContainerEl, {
            state: uiState.state,
            message: uiState.message,
            compact: true,
          });
        } else {
          tagsContainerEl.innerHTML = `<div style="text-align:center; padding:1rem; color:var(--text-secondary);">${uiState.message}</div>`;
        }
      }
    }
  }

  async function loadRecommendations() {
    var widget = document.getElementById('recommendations-widget');
    var container = document.getElementById('recommendations-container');
    if (!container || !widget) return;

    widget.style.display = 'block';
    container.innerHTML =
      '<div class="rec-skeleton"><div class="rec-skel-line"></div><div class="rec-skel-line"></div><div class="rec-skel-line rec-skel-short"></div></div>';

    try {
      var aiBaseUrl =
        BACKEND_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '') + '/api/ai';
      var response = await fetch(aiBaseUrl + '/recommendations', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + (getToken() || ''),
        },
      });
      if (!response.ok) throw new Error('API unavailable');
      var data = await response.json();
      var items = data?.recommendations || data?.items || data?.data || [];
      if (!Array.isArray(items) || items.length === 0) {
        container.innerHTML =
          '<div class="rec-empty">No recommendations yet — ask more questions to get personalized suggestions.</div>';
        return;
      }
      container.innerHTML = '';
      items.slice(0, 5).forEach(function (rec) {
        var type = rec.type || 'resource';
        var icon =
          type === 'practice'
            ? 'fa-solid fa-pen'
            : type === 'course'
              ? 'fa-solid fa-book-open'
              : 'fa-solid fa-link';
        var typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
        var link = rec.url || rec.link || '#';
        var item = document.createElement('a');
        item.className = 'rec-item';
        item.href = link;
        item.target = '_blank';
        item.innerHTML =
          '<div class="rec-item-icon"><i class="' +
          icon +
          '"></i></div><div class="rec-item-text"><div class="rec-item-title">' +
          escapeHtml(rec.title || 'Recommendation') +
          '</div><div class="rec-item-desc">' +
          escapeHtml(rec.description || rec.summary || '') +
          '</div></span><span class="rec-type-badge rec-type-' +
          type +
          '">' +
          typeLabel +
          '</span>';
        container.appendChild(item);
      });
    } catch (_) {
      widget.style.display = 'none';
      container.innerHTML = '';
    }
  }

  async function loadQuestions(
    page = 1,
    filterType = 'Recent',
    searchQuery = '',
    tag = '',
  ) {
    const params = new URLSearchParams();

    const needsClientPagination =
      filterType === 'Unanswered' ||
      filterType === 'My Questions' ||
      filterType === 'Popular' ||
      !!searchQuery ||
      !!tag;

    if (needsClientPagination) {
      params.set('limit', '100');
      params.set('page', '1');
    } else {
      params.set('page', String(page));
      params.set('limit', String(QUESTIONS_PER_PAGE));
    }

    if (filterType === 'Popular') {
      params.set('sort', '-votes');
    } else if (filterType === 'Unanswered') {
      params.set('unanswered', 'true');
    } else if (filterType === 'My Questions') {
      const userId =
        currentUserId ||
        localStorage.getItem('userId') ||
        getUserIdFromStorage();
      if (userId) params.set('author', userId);
    }

    if (searchQuery) params.set('search', searchQuery);
    if (tag) params.set('tag', tag);

    const data = await requestLegacyApi(`/questions?${params.toString()}`, {
      auth: false,
    });

    let questions =
      data?.data?.questions ||
      data?.questions ||
      (Array.isArray(data?.data) ? data.data : []);
    const serverPagination = data?.data?.pagination || data?.pagination || {};

    if (filterType === 'Popular') {
      questions.sort((a, b) => {
        const votesA = a.votesCount ?? a.votes ?? 0;
        const votesB = b.votesCount ?? b.votes ?? 0;
        return votesB - votesA;
      });
    }

    if (filterType === 'Unanswered') {
      questions = questions.filter((q) => {
        const count =
          q.answersCount ??
          q.commentsCount ??
          (Array.isArray(q.answers)
            ? q.answers.length
            : Number(q.answers) || 0);
        return count === 0;
      });
    }

    if (filterType === 'My Questions') {
      const userId =
        currentUserId ||
        localStorage.getItem('userId') ||
        getUserIdFromStorage();
      if (userId) {
        questions = questions.filter((q) => {
          const authorId = q.author?._id || q.author?.id || q.author;
          return authorId && String(authorId) === String(userId);
        });
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      questions = questions.filter((qs) => {
        const titleMatch = qs.title?.toLowerCase().includes(q);
        const bodyMatch = qs.body?.toLowerCase().includes(q);
        const tagsMatch = qs.tags?.some((t) => t.toLowerCase().includes(q));
        const authorMatch =
          qs.author?.name?.toLowerCase().includes(q) ||
          (typeof qs.author === 'string' &&
            qs.author.toLowerCase().includes(q));
        return titleMatch || bodyMatch || tagsMatch || authorMatch;
      });
    }

    if (tag) {
      questions = questions.filter((q) => {
        if (!q.tags || !Array.isArray(q.tags)) return false;
        return q.tags.some((t) => t.toLowerCase() === tag.toLowerCase());
      });
    }

    const totalFiltered = needsClientPagination
      ? questions.length
      : serverPagination.total || questions.length;
    const totalPages = needsClientPagination
      ? Math.max(1, Math.ceil(totalFiltered / QUESTIONS_PER_PAGE))
      : serverPagination.totalPages ||
        Math.max(1, Math.ceil(totalFiltered / QUESTIONS_PER_PAGE));
    const validPage = Math.min(page, totalPages);
    const paginatedQuestions = needsClientPagination
      ? questions.slice(
          (validPage - 1) * QUESTIONS_PER_PAGE,
          (validPage - 1) * QUESTIONS_PER_PAGE + QUESTIONS_PER_PAGE,
        )
      : questions;

    communityData.questions = paginatedQuestions;
    communityData.pagination = {
      total: totalFiltered,
      totalPages,
      page: validPage,
      limit: QUESTIONS_PER_PAGE,
    };
  }

  // --- 3. RENDER FEED LOGIC ---
  feedTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      feedTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      feedTabs.forEach((t) =>
        t.setAttribute(
          'aria-pressed',
          t.classList.contains('active') ? 'true' : 'false',
        ),
      );
      filterAndRender(tab.textContent.trim(), { resetPage: true });
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (searchDebounceTimer) {
        window.clearTimeout(searchDebounceTimer);
      }
      searchDebounceTimer = window.setTimeout(() => {
        filterAndRender(undefined, { resetPage: true });
      }, 120);
    });
  }

  const tagsContainer = document.getElementById('tags-container');
  if (tagsContainer) {
    tagsContainer.addEventListener('click', (e) => {
      const toggleRow = e.target.closest('.toggle-more-tags');
      if (toggleRow) {
        isTagsExpanded = !isTagsExpanded;
        renderWidgets();
        return;
      }

      const tagRow = e.target.closest('.clickable-tag');
      const clearRow = e.target.closest('.clear-tag-filter');

      if (clearRow) {
        currentSelectedTag = null;
      } else if (tagRow) {
        const clickedTag = tagRow.getAttribute('data-tag');
        currentSelectedTag =
          currentSelectedTag === clickedTag ? null : clickedTag;
      }

      if (clearRow || tagRow) {
        renderWidgets();
        filterAndRender(undefined, { resetPage: true });
      }
    });

    tagsContainer.addEventListener('keydown', (e) => {
      if (
        !e.target.closest(
          '.toggle-more-tags, .clickable-tag, .clear-tag-filter',
        )
      )
        return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.target.click();
    });
  }

  if (paginationContainer) {
    paginationContainer.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-page]');
      if (!button) return;
      const targetPage = Number(button.dataset.page);
      if (
        !Number.isInteger(targetPage) ||
        targetPage < 1 ||
        targetPage === currentPage
      )
        return;
      currentPage = targetPage;
      filterAndRender(undefined, { resetPage: false });
      feedContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function getCommunitySocketBaseUrl() {
    const url = BACKEND_URL || DEFAULT_LEGACY_COMMUNITY_URL;
    const normalized = String(url).replace(/\/api(?:\/community)?$/i, '');
    return normalized || 'https://nibras-backend.up.railway.app';
  }

  function ensureCommunitySocketLoaded() {
    if (typeof io !== 'undefined') return Promise.resolve(true);
    if (communitySocketIoPromise) return communitySocketIoPromise;

    const socketScriptUrl = `${getCommunitySocketBaseUrl()}/socket.io/socket.io.js`;
    communitySocketIoPromise = new Promise((resolve) => {
      const existing = Array.from(document.scripts).find(
        (s) => s.src === socketScriptUrl,
      );
      if (existing) {
        if (typeof io !== 'undefined') {
          resolve(true);
          return;
        }
        existing.addEventListener(
          'load',
          () => resolve(typeof io !== 'undefined'),
          { once: true },
        );
        existing.addEventListener('error', () => resolve(false), {
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
    return communitySocketIoPromise;
  }

  function initCommunitySocket() {
    if (typeof io === 'undefined') {
      console.log('[SOCKET] Socket.io not available for community feed');
      return;
    }
    if (communitySocket) {
      communitySocket.disconnect();
      communitySocket = null;
    }
    const baseUrl = getCommunitySocketBaseUrl();
    console.log('[SOCKET] Community feed connecting to:', baseUrl);
    communitySocket = io(baseUrl, { transports: ['websocket', 'polling'] });

    communitySocket.on('connect', () => {
      console.log('[SOCKET] Community feed connected:', communitySocket.id);
      joinRenderedQuestionRooms();
    });

    communitySocket.on('connect_error', (err) => {
      console.log('[SOCKET] Community feed connection error:', err.message);
    });

    communitySocket.on('vote:updated', (data) => {
      console.log('[SOCKET] Community feed vote:updated received:', data);
      const targetId = String(data.targetId || '');
      if (!targetId) return;

      const upBtn = feedContainer?.querySelector(
        `.upvote-btn[data-id="${targetId}"]`,
      );
      if (!upBtn) return;
      const voteBox = upBtn.closest('.q-vote-box');
      if (!voteBox) return;
      const countSpan = voteBox.querySelector('.vote-count');
      if (countSpan) {
        countSpan.innerText = data.votesCount;
        countSpan.classList.remove('changed');
        void countSpan.offsetWidth;
        countSpan.classList.add('changed');
      }
    });

    communitySocket.on('disconnect', (reason) => {
      console.log('[SOCKET] Community feed disconnected:', reason);
    });
  }

  function joinRenderedQuestionRooms() {
    if (!communitySocket || !communitySocket.connected) return;
    const ids = renderedQuestionIds || [];
    ids.forEach((id) => {
      const room = `question:${id}`;
      if (!joinedQuestionRooms.has(room)) {
        communitySocket.emit('question:join', id);
        joinedQuestionRooms.add(room);
        console.log('[SOCKET] Joined room:', room);
      }
    });
  }

  async function filterAndRender(filterType, options = {}) {
    const shouldResetPage = options.resetPage !== false;
    currentFilter = filterType || currentFilter;

    if (shouldResetPage) {
      currentPage = 1;
    }

    const searchQuery = searchInput?.value?.trim() || '';
    const tag = currentSelectedTag || '';

    try {
      if (feedContainer) {
        renderFeedState('loading', 'Loading questions...');
      }

      await loadQuestions(currentPage, currentFilter, searchQuery, tag);

      const pagination = communityData.pagination || {};
      const totalItems =
        pagination.total || communityData.questions.length || 0;

      renderQuestions(communityData.questions);
      renderPagination({
        totalItems,
        totalPages:
          pagination.totalPages ||
          Math.max(1, Math.ceil(totalItems / QUESTIONS_PER_PAGE)),
        currentPage,
      });
      if (!communitySocket) {
        ensureCommunitySocketLoaded().then((ok) => {
          if (ok && !communitySocket) {
            initCommunitySocket();
          }
        });
      } else {
        joinRenderedQuestionRooms();
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      if (feedContainer) {
        const uiState = resolveUiStateFromError(
          error,
          'Unable to load questions right now. Please try again.',
        );
        renderFeedState(uiState.state, uiState.message);
      }
    }
  }

  function getVibrantColorClass(tagName) {
    const colors = [
      't-purple',
      't-blue',
      't-red',
      't-green',
      't-orange',
      't-pink',
      't-teal',
      't-yellow',
    ];
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  function getPaginationItems(totalPages, page) {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) {
      items.push('start-ellipsis');
    }
    for (let p = start; p <= end; p += 1) {
      items.push(p);
    }
    if (end < totalPages - 1) {
      items.push('end-ellipsis');
    }
    items.push(totalPages);
    return items;
  }

  function renderPagination({ totalItems, totalPages, currentPage: page }) {
    if (!paginationContainer) return;
    if (!totalItems || totalPages <= 1) {
      paginationContainer.innerHTML = '';
      paginationContainer.hidden = true;
      return;
    }

    const pageItems = getPaginationItems(totalPages, page);
    const startItem = (page - 1) * QUESTIONS_PER_PAGE + 1;
    const endItem = Math.min(page * QUESTIONS_PER_PAGE, totalItems);

    const pagesHtml = pageItems
      .map((item) => {
        if (typeof item !== 'number') {
          return '<span class="pagination-ellipsis" aria-hidden="true">...</span>';
        }
        const activeClass = item === page ? ' active' : '';
        const pressed = item === page ? 'true' : 'false';
        return `<button type="button" class="pagination-btn${activeClass}" data-page="${item}" aria-label="Go to page ${item}" aria-pressed="${pressed}">${item}</button>`;
      })
      .join('');

    paginationContainer.innerHTML = `
            <span class="pagination-info">Showing ${startItem}-${endItem} of ${totalItems} questions</span>
            <div class="pagination-actions">
                <button type="button" class="pagination-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Go to previous page">Prev</button>
                ${pagesHtml}
                <button type="button" class="pagination-btn" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} aria-label="Go to next page">Next</button>
            </div>
        `;
    paginationContainer.hidden = false;
  }

  function renderQuestions(data) {
    if (!feedContainer) return;
    renderedQuestionIds = [];

    if (data.length === 0) {
      const emptyMsg = currentSelectedTag
        ? `No questions found with the tag "${currentSelectedTag}".`
        : 'No questions found.';
      renderFeedState('empty', emptyMsg);
      return;
    }

    let questionsHtml = '';
    data.forEach((q) => {
      let tagHtml = '';
      if (q.tags && Array.isArray(q.tags)) {
        q.tags.forEach((t) => {
          let color = getVibrantColorClass(t.toLowerCase());
          tagHtml += `<span class="tag ${escapeHtml(color)}">${escapeHtml(t)}</span>`;
        });
      }

      const qId = q._id || q.id;
      if (qId) renderedQuestionIds.push(String(qId));
      const isAnonymous = q.isAnonymous === true;
      const authorName = isAnonymous
        ? 'Anonymous'
        : q.author?.name || q.author || 'Anonymous';
      const authorInitials = isAnonymous
        ? 'AN'
        : authorName.substring(0, 2).toUpperCase();
      const anonymousBadge = isAnonymous
        ? ' <span class="anonymous-badge"><i class="fa-solid fa-user-secret"></i> Anonymous</span>'
        : '';
      const answersCount =
        q.answersCount ??
        q.commentsCount ??
        (Array.isArray(q.answers) ? q.answers.length : Number(q.answers) || 0);
      const questionVotes = q.votesCount ?? q.votes ?? 0;
      const safeTitle = escapeHtml(q.title || 'Untitled question');
      const safeAuthor = escapeHtml(authorName);
      const safeCourse = escapeHtml(q.course || 'General');
      const safeDate = escapeHtml(
        q.time || new Date(q.createdAt).toLocaleDateString() || 'Recently',
      );

      questionsHtml += `
                <article class="question-card" data-id="${qId}">
                    <div class="q-vote-box">
                        <button type="button" class="fa-solid fa-caret-up vote-arrow upvote-btn" data-id="${qId}" aria-label="Upvote question: ${safeTitle}" aria-pressed="false"></button>
                        <span class="vote-count">${questionVotes}</span>
                        <button type="button" class="fa-solid fa-caret-down vote-arrow downvote-btn" data-id="${qId}" aria-label="Downvote question: ${safeTitle}" aria-pressed="false"></button>
                    </div>
                    <div class="q-content">
                        <div class="q-header">
                            <a href="../Community/QuestionID/question.html?id=${qId}" class="q-title" data-id="${qId}">${safeTitle}</a>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <i class="fa-regular fa-circle-check" style="color:var(--accent-blue)"></i>
                                <span class="q-course-badge">${safeCourse}</span>
                            </div>
                        </div>
                        
                        <p class="q-preview">${getPlainTextPreview(q.body)}</p>
                        
                        <div class="q-tags">${tagHtml}</div>                        
                        <div class="q-meta">
                            <div class="author-av">${authorInitials}</div>
                            <span>${safeAuthor}${anonymousBadge}</span>
                            <span>•</span>
                            <span>${answersCount} answers</span>
                            <span>•</span>
                            <span>${q.views || 0} views</span>
                            <span style="margin-left:auto">
                                <button type="button" class="fa-regular fa-flag report-list-btn" data-target-id="${qId}" data-target-type="question" title="Report this question" aria-label="Report this question" style="background:none; border:none; cursor: pointer; font-size: 0.85rem; color: var(--text-secondary); opacity: 0.5; transition: 0.2s; margin-right: 8px;"></button>
                                ${safeDate}
                            </span>
                        </div>
                    </div>
                </article>
            `;
    });
    feedContainer.innerHTML = questionsHtml;

    loadVotesForRenderedQuestions();
  }
  const userVotes = new Map();

  function updateQuestionVoteUI(questionId, value) {
    const upBtn = feedContainer?.querySelector(
      `.upvote-btn[data-id="${questionId}"]`,
    );
    const downBtn = feedContainer?.querySelector(
      `.downvote-btn[data-id="${questionId}"]`,
    );
    if (!upBtn || !downBtn) return;

    upBtn.classList.toggle('active-up', value === 1);
    downBtn.classList.toggle('active-down', value === -1);
    upBtn.setAttribute('aria-pressed', value === 1 ? 'true' : 'false');
    downBtn.setAttribute('aria-pressed', value === -1 ? 'true' : 'false');
  }

  const VOTES_STORAGE_KEY = 'nibras_votes_v2';
  function getVotesFromStorage() {
    try {
      const stored = localStorage.getItem(VOTES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }
  function saveVoteToStorage(questionId, voteValue) {
    try {
      const votes = getVotesFromStorage();
      votes[`question:${questionId}`] = voteValue;
      localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votes));
    } catch {}
  }
  function seedVotesFromStorage(questionId) {
    const votes = getVotesFromStorage();
    const cached = votes[`question:${questionId}`];
    if (cached !== undefined) {
      questionVoteFetchCache.set(questionId, Number(cached));
      userVotes.set(questionId, Number(cached));
    }
  }
  async function fetchQuestionVoteValue(questionId) {
    if (!questionId || questionId === 'undefined') return null;
    if (questionVoteFetchCache.has(questionId)) {
      return questionVoteFetchCache.get(questionId);
    }
    seedVotesFromStorage(questionId);
    if (questionVoteFetchCache.has(questionId)) {
      return questionVoteFetchCache.get(questionId);
    }
    if (questionVoteInFlight.has(questionId)) {
      return questionVoteInFlight.get(questionId);
    }

    const requestPromise = requestLegacyApi(`/votes/question/${questionId}`)
      .then((data) => {
        const value = Number(data.value ?? 0);
        questionVoteFetchCache.set(questionId, value);
        saveVoteToStorage(questionId, value);
        return value;
      })
      .catch(() => null)
      .finally(() => {
        questionVoteInFlight.delete(questionId);
      });

    questionVoteInFlight.set(questionId, requestPromise);
    return requestPromise;
  }

  async function loadVotesForRenderedQuestions() {
    const token = getToken();
    if (!token || renderedQuestionIds.length === 0) return;

    try {
      const uniqueQuestionIds = Array.from(
        new Set(
          renderedQuestionIds.filter(
            (questionId) => questionId && questionId !== 'undefined',
          ),
        ),
      );
      if (uniqueQuestionIds.length === 0) return;

      const pendingIds = [];
      uniqueQuestionIds.forEach((questionId) => {
        seedVotesFromStorage(questionId);
        if (questionVoteFetchCache.has(questionId)) {
          const value = Number(questionVoteFetchCache.get(questionId) ?? 0);
          userVotes.set(questionId, value);
          updateQuestionVoteUI(questionId, value);
          return;
        }
        pendingIds.push(questionId);
      });

      if (pendingIds.length === 0) return;

      await Promise.all(
        pendingIds.map(async (questionId) => {
          const value = await fetchQuestionVoteValue(questionId);
          if (value == null) return;
          userVotes.set(questionId, value);
          updateQuestionVoteUI(questionId, value);
        }),
      );
    } catch (error) {
      console.error('Error loading community votes:', error);
    }
  }

  if (feedContainer) {
    feedContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('upvote-btn')) {
        handleVote(e.target, 'up');
      } else if (e.target.classList.contains('downvote-btn')) {
        handleVote(e.target, 'down');
      } else if (e.target.classList.contains('report-list-btn')) {
        const targetId = e.target.dataset.targetId;
        const targetType = e.target.dataset.targetType;
        if (!targetId) return;
        const reason = prompt(
          'Why are you reporting this? (spam, inappropriate, off-topic, or describe the issue):',
        );
        if (!reason || !reason.trim()) return;
        (async () => {
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
        })();
      }
    });
  }

  async function handleVote(btn, type) {
    const token = getToken();
    if (!token) {
      showToast('Please sign in to vote on questions.', 'error');
      return;
    }

    const voteBox = btn.closest('.q-vote-box');
    const countSpan = voteBox.querySelector('.vote-count');
    const questionId = btn.getAttribute('data-id');
    const upBtn = voteBox.querySelector('.upvote-btn');
    const downBtn = voteBox.querySelector('.downvote-btn');

    const currentVotes = Number(countSpan.innerText) || 0;
    const currentUserVote = userVotes.get(questionId) || 0;

    let voteValue;
    let payloadValue;
    let newActiveState = { up: false, down: false };
    let countDelta = 0;

    if (type === 'up') {
      if (currentUserVote === 1) {
        voteValue = 0;
        payloadValue = 1;
        countDelta = -1;
      } else {
        voteValue = 1;
        payloadValue = 1;
        newActiveState.up = true;
        countDelta = currentUserVote === -1 ? 2 : 1;
      }
    } else {
      if (currentUserVote === -1) {
        voteValue = 0;
        payloadValue = -1;
        countDelta = 1;
      } else {
        voteValue = -1;
        payloadValue = -1;
        newActiveState.down = true;
        countDelta = currentUserVote === 1 ? -2 : -1;
      }
    }

    upBtn.classList.toggle('active-up', newActiveState.up);
    downBtn.classList.toggle('active-down', newActiveState.down);

    countSpan.innerText = currentVotes + countDelta;
    userVotes.set(questionId, voteValue);

    countSpan.classList.remove('changed');
    void countSpan.offsetWidth;
    countSpan.classList.add('changed');

    try {
      const data = await requestLegacyApi('/votes', {
        method: 'POST',
        body: {
          targetType: 'question',
          targetId: questionId,
          value: payloadValue,
        },
      });

      if (data.votesCount !== undefined) {
        countSpan.innerText = data.votesCount;
      }
      const confirmedVoteValue = Number(data.voteValue ?? voteValue);
      userVotes.set(questionId, confirmedVoteValue);
      questionVoteFetchCache.set(questionId, confirmedVoteValue);
      saveVoteToStorage(questionId, confirmedVoteValue);
    } catch (error) {
      console.error('Voting error:', error);
      upBtn.classList.toggle('active-up', currentUserVote === 1);
      downBtn.classList.toggle('active-down', currentUserVote === -1);
      countSpan.innerText = currentVotes;
      userVotes.set(questionId, currentUserVote);
      questionVoteFetchCache.set(questionId, currentUserVote);
      saveVoteToStorage(questionId, currentUserVote);
      showToast('Failed to register vote. Please try again.', 'error');
    }
  }

  function renderWidgets() {
    const tagsContainer = document.getElementById('tags-container');
    if (tagsContainer) {
      let tagsHtml = '';

      if (currentSelectedTag) {
        tagsHtml += `
                    <div class="tag-row clear-tag-filter" role="button" tabindex="0" style="cursor: pointer; color: var(--accent-blue); margin-bottom: 12px; font-size: 0.9rem; font-weight: 600;">
                        <i class="fa-solid fa-xmark" style="margin-right: 5px;"></i> Clear filter: ${currentSelectedTag}
                    </div>
                `;
      }

      const tagsToDisplay = isTagsExpanded
        ? communityData.popularTags
        : communityData.popularTags.slice(0, 5);

      tagsToDisplay.forEach((t) => {
        const isSelected = currentSelectedTag === t.name;
        const activeStyle = isSelected
          ? 'background-color: var(--tag-bg); border-radius: 6px; padding: 4px; box-shadow: 0 0 0 1px var(--accent-blue);'
          : 'padding: 4px;';

        tagsHtml += `
                    <div class="tag-row clickable-tag" role="button" tabindex="0" aria-pressed="${isSelected ? 'true' : 'false'}" data-tag="${escapeHtml(t.name)}" style="cursor: pointer; transition: all 0.2s; ${activeStyle}">
                        <span class="tag ${escapeHtml(t.color)}">${escapeHtml(t.name)}</span>
                        <span class="tag-count">${t.count}</span>
                    </div>
                `;
      });

      if (communityData.popularTags.length > 5) {
        tagsHtml += `
                    <div class="toggle-more-tags" role="button" tabindex="0" aria-expanded="${isTagsExpanded ? 'true' : 'false'}" style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--border-color, rgba(156, 163, 175, 0.2)); cursor: pointer; color: var(--accent-blue); font-size: 0.85rem; font-weight: 600; transition: color 0.2s;">
                        ${isTagsExpanded ? 'Show less tags <i class="fa-solid fa-chevron-up" style="margin-left: 4px;"></i>' : 'Show more tags <i class="fa-solid fa-chevron-down" style="margin-left: 4px;"></i>'}
                    </div>
                `;
      }
      tagsContainer.innerHTML = tagsHtml;
    }
  }

  function renderModalTags(searchTerm = '') {
    const container = document.getElementById('modal-tags-container');
    const indicator = document.getElementById('tag-count-indicator');
    if (!container) return;

    if (indicator) {
      indicator.textContent = `${selectedModalTags.length}/5 selected`;
      indicator.style.color =
        selectedModalTags.length >= 5 ? '#ef4444' : 'var(--text-secondary)';
    }

    container.innerHTML = '';
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark';

    const lowerSearch = searchTerm.toLowerCase();
    let filteredTags = availableModalTags
      .filter((tag) => tag.toLowerCase().includes(lowerSearch))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(lowerSearch);
        const bStarts = b.toLowerCase().startsWith(lowerSearch);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });

    const matchedUnselected = filteredTags.filter(
      (t) => !selectedModalTags.includes(t),
    );
    const tagsToRender = [...selectedModalTags, ...matchedUnselected];

    if (tagsToRender.length === 0) {
      container.innerHTML = `<span style="color: var(--text-secondary); font-size: 0.9rem; padding: 10px 0; width: 100%; text-align: center;">No tags match "${escapeHtml(searchTerm)}". Try a different keyword.</span>`;
      return;
    }

    let tagHtml = '';
    tagsToRender.forEach((tag) => {
      const isSelected = selectedModalTags.includes(tag);
      const isMaxReached = selectedModalTags.length >= 5;

      const bg = isSelected
        ? 'var(--accent-blue, #2563eb)'
        : isDark
          ? '#374151'
          : 'var(--tag-bg, #f3f4f6)';
      const color = isSelected
        ? '#ffffff'
        : isDark
          ? '#f3f4f6'
          : 'var(--text-primary, #333)';
      const cursor = !isSelected && isMaxReached ? 'not-allowed' : 'pointer';
      const opacity = !isSelected && isMaxReached ? '0.4' : '1';
      const border = isSelected
        ? '1px solid transparent'
        : isDark
          ? '1px solid #4b5563'
          : '1px solid #e5e7eb';
      const shadow = isSelected
        ? 'box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);'
        : '';

      tagHtml += `
                <div class="modal-tag-pill" role="button" tabindex="0" aria-pressed="${isSelected ? 'true' : 'false'}" data-tag="${escapeHtml(tag)}" 
                     style="background: ${bg}; color: ${color}; cursor: ${cursor}; opacity: ${opacity}; border: ${border}; ${shadow}
                            padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 500; 
                            transition: all 0.2s ease; user-select: none; display: flex; align-items: center; gap: 6px;">
                    ${escapeHtml(tag)} 
                    ${isSelected ? '<i class="fa-solid fa-xmark" style="font-size:0.75rem; opacity: 0.8;"></i>' : ''}
                </div>
            `;
    });
    container.innerHTML = tagHtml;
  }

  const modalTagsContainer = document.getElementById('modal-tags-container');
  const tagWarning = document.getElementById('tag-limit-warning');
  const tagSearchInput = document.getElementById('modal-tag-search');

  if (modalTagsContainer) {
    modalTagsContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.modal-tag-pill');
      if (!pill) return;

      const tag = pill.getAttribute('data-tag');

      if (selectedModalTags.includes(tag)) {
        selectedModalTags = selectedModalTags.filter((t) => t !== tag);
        if (tagWarning) tagWarning.style.display = 'none';
      } else {
        if (selectedModalTags.length >= 5) {
          if (tagWarning) {
            tagWarning.style.display = 'block';
            tagWarning.style.transform = 'scale(1.05)';
            setTimeout(() => (tagWarning.style.transform = 'scale(1)'), 200);
          }
          return;
        }
        selectedModalTags.push(tag);
      }
      renderModalTags(tagSearchInput ? tagSearchInput.value : '');
    });
    modalTagsContainer.addEventListener('keydown', (e) => {
      const pill = e.target.closest('.modal-tag-pill');
      if (!pill) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      pill.click();
    });
  }

  if (tagSearchInput) {
    tagSearchInput.addEventListener('input', (e) => {
      renderModalTags(e.target.value);
    });
  }

  // --- 6. QUESTION SUBMISSION ---
  async function submitQuestion() {
    const token = getToken();
    if (!token) {
      showToast('Please sign in to post a question.', 'error');
      return;
    }

    const titleInput = document.getElementById('question-title');
    const courseInput = document.getElementById('question-course');
    const bodyInput = document.getElementById('question-body');

    const body = askEditor
      ? askEditor.value().trim()
      : bodyInput?.value?.trim();
    const title = titleInput?.value?.trim();
    const course = courseInput?.value;

    if (!title) {
      showToast('Please add a question title before posting.', 'error');
      titleInput?.focus();
      return;
    }
    if (!body) {
      showToast('Please add question details before posting.', 'error');
      askEditor?.codemirror?.focus?.();
      bodyInput?.focus();
      return;
    }

    const tags = [...selectedModalTags];

    const anonymousCheckbox = document.getElementById('question-anonymous');
    const isAnonymous = anonymousCheckbox?.checked || false;

    const payload = { title, body, isAnonymous };
    if (tags.length > 0) payload.tags = tags;

    const postBtn = document.getElementById('postQuestionBtn');
    const originalText = postBtn?.innerText;
    if (postBtn) {
      postBtn.disabled = true;
      postBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Posting...';
    }

    try {
      await requestLegacyApi('/questions', {
        method: 'POST',
        body: payload,
      });

      const modal = document.getElementById('askModal');
      if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
      }

      if (titleInput) titleInput.value = '';
      if (askEditor) askEditor.value('');
      if (bodyInput) bodyInput.value = '';
      if (courseInput) courseInput.value = '';
      if (tagSearchInput) tagSearchInput.value = '';

      selectedModalTags = [];
      renderModalTags();
      if (tagWarning) tagWarning.style.display = 'none';

      await filterAndRender('Recent', { resetPage: true });
      showToast('Question posted successfully');
    } catch (error) {
      console.error('Error posting question:', error);
      showToast(
        error.message || 'Failed to post question. Please try again.',
        'error',
      );
    } finally {
      if (postBtn) {
        postBtn.disabled = false;
        postBtn.innerText = originalText;
      }
    }
  }

  // --- 7. MODAL & THEME LOGIC ---
  const modal = document.getElementById('askModal');
  const openBtn = document.getElementById('openAskModalBtn');
  const closeBtn = document.getElementById('closeAskModal');
  const cancelBtn = document.getElementById('cancelAskBtn');
  const postQuestionBtn = document.getElementById('postQuestionBtn');
  let lastFocusedElement = null;

  // --- DUPLICATE DETECTION ---
  let duplicateCheckTimeout = null;
  const DUPLICATE_DEBOUNCE_MS = 800;

  async function checkDuplicates(title) {
    if (!title || title.length < 5) {
      hideDuplicateBanner();
      return;
    }
    showDuplicateBannerLoading();
    try {
      var aiBaseUrl =
        BACKEND_URL.replace(/\/api\/?$/i, '').replace(/\/+$/, '') + '/api/ai';
      var response = await fetch(aiBaseUrl + '/check-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + (getToken() || ''),
        },
        body: JSON.stringify({ title: title }),
      });
      if (!response.ok) throw new Error('API not available');
      var data = await response.json();
      var duplicates = data?.duplicates || data?.similar || data?.data || [];
      if (Array.isArray(duplicates) && duplicates.length > 0) {
        showDuplicateBanner(duplicates);
      } else {
        hideDuplicateBanner();
      }
    } catch (_) {
      hideDuplicateBanner();
    }
  }

  function showDuplicateBannerLoading() {
    var banner = document.getElementById('duplicate-banner');
    var msg = banner?.querySelector('.duplicate-msg');
    if (!banner) return;
    banner.className = 'duplicate-banner loading';
    if (msg) msg.textContent = 'Checking for similar questions...';
    banner.style.display = 'block';
  }

  function showDuplicateBanner(duplicates) {
    var banner = document.getElementById('duplicate-banner');
    var msg = banner?.querySelector('.duplicate-msg');
    var list = document.getElementById('duplicate-list');
    if (!banner || !list) return;
    banner.className = 'duplicate-banner has-results';
    if (msg)
      msg.textContent =
        duplicates.length +
        ' similar question' +
        (duplicates.length > 1 ? 's' : '') +
        ' found — your question may already have an answer';
    list.innerHTML = '';
    duplicates.forEach(function (d) {
      var item = document.createElement('a');
      item.className = 'duplicate-item';
      item.href =
        '../Community/QuestionID/question.html?id=' +
        encodeURIComponent(d._id || d.id);
      item.target = '_blank';
      item.innerHTML =
        '<span class="duplicate-item-title">' +
        escapeHtml(d.title) +
        '</span>' +
        '<span class="duplicate-score">' +
        Math.round((d.score || d.relevance || 0) * 100) +
        '% match</span>';
      list.appendChild(item);
    });
    banner.style.display = 'block';
  }

  function hideDuplicateBanner() {
    var banner = document.getElementById('duplicate-banner');
    if (banner) banner.style.display = 'none';
  }

  // Wire up duplicate detection on title input
  (function () {
    var titleInput = document.getElementById('question-title');
    if (titleInput) {
      titleInput.addEventListener('input', function () {
        clearTimeout(duplicateCheckTimeout);
        var title = this.value.trim();
        if (title.length < 5) {
          hideDuplicateBanner();
          return;
        }
        duplicateCheckTimeout = setTimeout(function () {
          checkDuplicates(title);
        }, DUPLICATE_DEBOUNCE_MS);
      });
    }
  })();

  const resetModalAndClose = () => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    selectedModalTags = [];
    if (tagSearchInput) tagSearchInput.value = '';
    if (tagWarning) tagWarning.style.display = 'none';
    renderModalTags();
    hideDuplicateBanner();
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  };

  if (openBtn)
    openBtn.addEventListener('click', () => {
      lastFocusedElement = document.activeElement;
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      renderModalTags();
      if (!askEditor) {
        askEditor = new EasyMDE({
          element: document.getElementById('question-body'),
          spellChecker: false,
          placeholder: 'Use Markdown to format your code, links, and images...',
        });
      }
      setTimeout(() => askEditor.codemirror.refresh(), 50);
      setTimeout(() => document.getElementById('question-title')?.focus(), 60);
    });

  if (closeBtn) closeBtn.addEventListener('click', resetModalAndClose);
  if (cancelBtn) cancelBtn.addEventListener('click', resetModalAndClose);
  if (postQuestionBtn)
    postQuestionBtn.addEventListener('click', submitQuestion);

  window.addEventListener('click', (e) => {
    if (e.target === modal) resetModalAndClose();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.style.display === 'flex') {
      resetModalAndClose();
    }
  });

  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn ? themeBtn.querySelector('i') : null;
  const appLogo = document.getElementById('app-logo');

  if (themeBtn) {
    themeBtn.classList.remove('rotating');
    void themeBtn.offsetWidth;
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      if (themeIcon) themeIcon.className = 'fa-regular fa-sun';
      if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
    } else {
      if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
    }

    themeBtn.addEventListener('click', () => {
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
      renderModalTags(tagSearchInput ? tagSearchInput.value : '');
    });
  }

  // 🚀 Initialization
  async function initPage() {
    await loadCurrentUser();
    await loadTags();
    await filterAndRender('Recent', { resetPage: true });
    renderWidgets();
    loadRecommendations();
  }
  initPage();
});
