(window.NibrasReact && typeof window.NibrasReact.run === 'function'
  ? window.NibrasReact.run.bind(window.NibrasReact)
  : (initializer) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializer, {
          once: true,
        });
      } else {
        initializer();
      }
    })(() => {
  const shared = window.NibrasShared || {};
  shared.session?.updateUserInfoDisplay?.();
  const competitionsService = window.NibrasServices?.competitionsService;
  const token = (() => {
    try {
      if (typeof shared.auth?.getToken === 'function')
        return shared.auth.getToken();
    } catch (_) {}
    return localStorage.getItem('token') || null;
  })();

  const tbody = document.getElementById('practice-tbody');
  const titleEl = document.getElementById('practice-title');
  const statsLine = document.getElementById('stats-line');
  const pagination = document.getElementById('pagination');
  const contentWrapper = document.querySelector('.content-wrapper');
  const feedbackNotice = document.createElement('div');
  feedbackNotice.hidden = true;
  feedbackNotice.style.marginBottom = '14px';
  if (contentWrapper) {
    contentWrapper.insertBefore(
      feedbackNotice,
      contentWrapper.querySelector('.practice-toolbar') || null,
    );
  }

  let allProblems = [];
  let selectedPlatform = 'all';
  let solvedFilter = 'all';
  let searchTerm = '';
  let tagsFilter = '';
  let minRating = '';
  let maxRating = '';
  let currentPage = 1;
  let pageSize = 50;
  let totalItems = 0;
  let totalPages = 1;
  let solvedOverall = 0;
  let upstreamWarning = '';
  let statusToggleBusy = false;

  const normalizeProblem = (problem) => {
    const tags = Array.isArray(problem?.tags) ? problem.tags : [];
    return {
      id: problem?._id || problem?.id || '',
      title: problem?.title || 'Untitled Problem',
      tags,
      rating: problem?.rating != null ? Number(problem.rating) : null,
      status: problem?.isSolved ? 'solved' : 'unsolved',
      url: problem?.url || '',
      platform: (problem?.platform || '').toLowerCase(),
    };
  };

  const platformFilterLabel = (platform) => {
    if (!platform || platform === 'all') return '';
    return platform.toUpperCase();
  };

  const showFeedback = (message) => {
    if (!message) {
      feedbackNotice.hidden = true;
      feedbackNotice.textContent = '';
      return;
    }
    feedbackNotice.hidden = false;
    feedbackNotice.textContent = message;
    feedbackNotice.style.color = 'var(--text-secondary)';
    feedbackNotice.style.fontSize = '0.9rem';
  };

  const getStatusCheckbox = (problem) => {
    const checked = problem.status === 'solved';
    const disabled = !token || !problem.id || statusToggleBusy;
    const safeId = shared.safeHtml(problem.id);
    const safeTitle = shared.safeHtml(problem.title);
    return `<label class="status-cell status-checkbox-label">
      <input
        type="checkbox"
        class="status-checkbox"
        data-problem-id="${safeId}"
        ${checked ? 'checked' : ''}
        ${disabled ? 'disabled' : ''}
        aria-label="Mark ${safeTitle} as solved"
      />
      <span class="status-label ${checked ? 'status-solved' : 'status-unsolved'}">${checked ? 'Solved' : 'Unsolved'}</span>
    </label>`;
  };

  const updateProblemStatus = (problemId, solved) => {
    const entry = allProblems.find((problem) => problem.id === problemId);
    if (!entry) return;
    entry.status = solved ? 'solved' : 'unsolved';
    solvedOverall = allProblems.filter((problem) => problem.status === 'solved').length;
  };

  const handleStatusToggle = async (checkbox) => {
    if (!competitionsService || !token || !checkbox?.dataset?.problemId) return;
    const problemId = checkbox.dataset.problemId;
    const nextSolved = checkbox.checked;
    const previousSolved = !nextSolved;

    statusToggleBusy = true;
    updateProblemStatus(problemId, nextSolved);
    renderTable();

    try {
      await competitionsService.setProblemSolved(problemId, nextSolved);
      showFeedback('');
    } catch (error) {
      checkbox.checked = previousSolved;
      updateProblemStatus(problemId, previousSolved);
      renderTable();
      showFeedback(error?.message || 'Could not update problem status.');
    } finally {
      statusToggleBusy = false;
      renderTable();
    }
  };

  const getProblemIdFromUrl = (url) => {
    if (!url) return '';
    const m = url.match(/problemset\/problem\/(\d+)\/([A-Z]\d*)/i);
    if (m) return `${m[1]}${m[2]}`;
    return '';
  };

  const clearPracticeTable = () => {
    if (tbody) tbody.innerHTML = '';
    if (pagination) pagination.innerHTML = '';
  };

  const renderTable = () => {
    if (!tbody) return;

    if (!allProblems.length) {
      let msg;
      if (!token) {
        msg = 'Sign in to view practice problems.';
      } else {
        const label = platformFilterLabel(selectedPlatform);
        msg = label
          ? `No ${label} problems match your filters.`
          : 'No problems match your filters.';
      }
      tbody.innerHTML = `<tr><td colspan="4" style="padding:2rem;text-align:center;color:var(--text-secondary);font-size:0.9rem;">${shared.safeHtml(msg)}</td></tr>`;
    } else {
      tbody.innerHTML = allProblems
        .map((p) => {
          const safeTitle = shared.safeHtml(p.title);
          const safeUrl = shared.safeHtml(p.url || '#');
          const safeRating =
            p.rating != null ? shared.safeHtml(String(p.rating)) : '—';
          const tagHtml = p.tags.length
            ? `<div class="tag-list">${p.tags.map((t) => `<span class="tag-chip">${shared.safeHtml(t)}</span>`).join('')}</div>`
            : '<span style="color:var(--text-tertiary);font-size:0.75rem;">—</span>';
          return `<tr>
                    <td><div><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="problem-link">${safeTitle}</a></div></td>
                    <td><span class="problem-rating">${safeRating}</span></td>
                    <td>${tagHtml}</td>
                    <td>${getStatusCheckbox(p)}</td>
                </tr>`;
        })
        .join('');
    }

    if (statsLine) {
      statsLine.textContent = `${totalItems} matching · ${solvedOverall} solved on this page`;
    }
  };

  const renderPagination = () => {
    if (!pagination) return;
    if (currentPage > totalPages) currentPage = totalPages;
    pagination.innerHTML = `
            <button class="pagination-btn" id="prev-page" ${currentPage <= 1 ? 'disabled' : ''}>Previous</button>
            <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
            <button class="pagination-btn" id="next-page" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
        `;
    document.getElementById('prev-page')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        void loadPracticeData();
      }
    });
    document.getElementById('next-page')?.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        void loadPracticeData();
      }
    });
  };

  const refreshView = () => {
    renderTable();
    renderPagination();
  };

  const updateTitle = () => {
    if (!titleEl) return;
    const names = {
      all: 'Practice',
      codeforces: 'Codeforces Practice',
      leetcode: 'LeetCode Practice',
      atcoder: 'AtCoder Practice',
    };
    titleEl.textContent = names[selectedPlatform] || 'Practice';
  };

  const setPlatform = (platform) => {
    selectedPlatform = platform;
    currentPage = 1;
    document.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.platform === platform);
    });
    updateTitle();
    void loadPracticeData();
  };

  const setSolvedFilter = (filter) => {
    solvedFilter = filter;
    currentPage = 1;
    document.querySelectorAll('.solve-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.solved === filter);
    });
    void loadPracticeData();
  };

  const loadPracticeData = async () => {
    if (!competitionsService) {
      clearPracticeTable();
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding:2rem;text-align:center;color:var(--text-secondary);">Competitions service is unavailable.</td></tr>`;
      }
      return;
    }

    if (!token) {
      clearPracticeTable();
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding:2rem;text-align:center;color:var(--text-secondary);">Sign in to view practice problems.</td></tr>`;
      }
      if (statsLine) statsLine.textContent = '0 matching · 0 solved on this page';
      return;
    }

    clearPracticeTable();
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4" style="padding:2rem;text-align:center;color:var(--text-secondary);">Loading problems...</td></tr>`;
    }

    try {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        tags: tagsFilter || undefined,
        minRating: minRating || undefined,
        maxRating: maxRating || undefined,
      };
      if (selectedPlatform !== 'all') params.platform = selectedPlatform;
      if (solvedFilter !== 'all') params.solved = solvedFilter;

      const response = await competitionsService.listProblems(params);
      const rawProblems = Array.isArray(response?.problems)
        ? response.problems
        : [];
      allProblems = rawProblems.map(normalizeProblem);
      totalItems = Number(response?.total ?? allProblems.length);
      totalPages = Math.max(1, Number(response?.pages ?? 1));
      solvedOverall =
        response?.solvedCount != null
          ? Number(response.solvedCount)
          : allProblems.filter((p) => p.status === 'solved').length;
      upstreamWarning = response?.warning || '';
      showFeedback(upstreamWarning);
      refreshView();
    } catch (error) {
      const msg = error?.message || 'Could not load practice data.';
      showFeedback('');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding:2rem;text-align:center;color:var(--text-secondary);">${shared.safeHtml(msg)}</td></tr>`;
      }
    }
  };

  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.forEach((entry) => entry.classList.remove('active'));
      link.classList.add('active');
    });
  });

  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn?.querySelector('i');
  const appLogo = document.getElementById('app-logo');
  const applyThemeAssets = () => {
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark';
    if (themeIcon)
      themeIcon.className = isDark ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
    if (appLogo)
      appLogo.src = isDark
        ? '/Assets/images/logo-dark.png'
        : '/Assets/images/logo-light.png';
  };
  applyThemeAssets();
  themeBtn?.classList.remove('rotating');
  if (themeBtn) void themeBtn.offsetWidth;
  themeBtn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (_) {}
    applyThemeAssets();
    themeBtn.classList.add('rotating');
    setTimeout(() => {
      themeBtn.classList.remove('rotating');
    }, 500);
  });

  const mainTabs = document.querySelectorAll('.tab-btn');
  mainTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      mainTabs.forEach((entry) => entry.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => setPlatform(chip.dataset.platform));
  });

  document.querySelectorAll('.solve-chip').forEach((chip) => {
    chip.addEventListener('click', () => setSolvedFilter(chip.dataset.solved));
  });

  document.getElementById('filter-search')?.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    currentPage = 1;
    void loadPracticeData();
  });

  document.getElementById('filter-tags')?.addEventListener('input', (e) => {
    tagsFilter = e.target.value;
    currentPage = 1;
    void loadPracticeData();
  });

  document
    .getElementById('filter-min-rating')
    ?.addEventListener('input', (e) => {
      minRating = e.target.value;
      currentPage = 1;
      void loadPracticeData();
    });

  document
    .getElementById('filter-max-rating')
    ?.addEventListener('input', (e) => {
      maxRating = e.target.value;
      currentPage = 1;
      void loadPracticeData();
    });

  tbody?.addEventListener('change', (event) => {
    const target = event.target;
    if (!target?.classList?.contains('status-checkbox')) return;
    void handleStatusToggle(target);
  });

  if (statsLine) statsLine.textContent = '0 matching · 0 solved on this page';
  updateTitle();
  void loadPracticeData();
});
