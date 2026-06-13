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
  const uiStates = shared.uiStates;
  const competitionsService = window.NibrasServices?.competitionsService;
  const token = (() => {
    try {
      if (typeof shared.auth?.getToken === 'function')
        return shared.auth.getToken();
    } catch (_) {}
    return localStorage.getItem('token') || null;
  })();

  const statsContainer = document.getElementById('stats-container');
  const historyContainer = document.getElementById('history-list-container');

  const state = {
    items: [],
    pagination: null,
    currentPage: 1,
    limit: 20,
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (_) {
      return String(dateStr || '');
    }
  };

  function animateCounter(el, duration) {
    if (!el) return;
    var text = el.textContent.trim();
    var num = Number(text);
    if (isNaN(num) || text.indexOf('/') !== -1 || text.indexOf('days') !== -1)
      return;
    if (num === 0) return;

    var isInt = Number.isInteger(num);
    var startTime = performance.now();

    function update(now) {
      var elapsed = now - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = num * eased;

      el.textContent = isInt
        ? Math.round(current).toString()
        : current.toFixed(1);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = text;
      }
    }

    el.textContent = isInt ? '0' : '0.0';
    requestAnimationFrame(update);
  }

  const renderDelta = (delta) => {
    if (delta === null || delta === undefined || delta === '')
      return '<span class="delta-none">—</span>';
    const num = Number(delta);
    if (Number.isNaN(num)) return '<span class="delta-none">—</span>';
    if (num > 0)
      return (
        '<span class="delta-positive"><i class="fa-solid fa-caret-up"></i> +' +
        num +
        '</span>'
      );
    if (num < 0)
      return (
        '<span class="delta-negative"><i class="fa-solid fa-caret-down"></i> ' +
        num +
        '</span>'
      );
    return '<span class="delta-zero">0</span>';
  };

  const renderStats = () => {
    if (!statsContainer) return;
    const total = Number(state.pagination?.total || state.items.length || 0);
    const codeforcesCount = state.items.filter(
      (item) => String(item.platform || '').toLowerCase() === 'codeforces',
    ).length;
    const leetcodeCount = state.items.filter(
      (item) => String(item.platform || '').toLowerCase() === 'leetcode',
    ).length;
    const bestRank = state.items.reduce((best, item) => {
      const rank = Number(item.rank);
      return !Number.isNaN(rank) && rank > 0 && (best === null || rank < best)
        ? rank
        : best;
    }, null);
    const stats = [
      {
        label: 'Total Participations',
        value: String(total),
        icon: 'fa-solid fa-users',
        color: 'blue',
      },
      {
        label: 'Codeforces',
        value: String(codeforcesCount),
        icon: 'fa-solid fa-code',
        color: 'green',
      },
      {
        label: 'LeetCode',
        value: String(leetcodeCount),
        icon: 'fa-solid fa-laptop-code',
        color: 'yellow',
      },
      {
        label: 'Best Rank',
        value: bestRank ? '#' + bestRank : '—',
        icon: 'fa-solid fa-trophy',
        color: 'purple',
      },
    ];

    statsContainer.innerHTML = '';
    stats.forEach((stat) => {
      let bgVar;
      let textVar;
      if (stat.color === 'yellow') {
        bgVar = 'var(--stat-yellow-bg)';
        textVar = 'var(--stat-yellow-text)';
      }
      if (stat.color === 'green') {
        bgVar = 'var(--stat-green-bg)';
        textVar = 'var(--stat-green-text)';
      }
      if (stat.color === 'blue') {
        bgVar = 'var(--stat-blue-bg)';
        textVar = 'var(--stat-blue-text)';
      }
      if (stat.color === 'purple') {
        bgVar = 'var(--stat-purple-bg)';
        textVar = 'var(--stat-purple-text)';
      }
      statsContainer.innerHTML += `
                <div class="stat-card" data-color="${stat.color}">
                    <div class="stat-info">
                        <span>${stat.label}</span>
                        <h2>${stat.value}</h2>
                    </div>
                    <div class="stat-icon" style="background-color: ${bgVar}; color: ${textVar}">
                        <i class="${stat.icon}"></i>
                    </div>
                </div>
            `;
    });
  };

  const renderHistory = () => {
    if (!historyContainer) return;
    if (!state.items.length) {
      if (uiStates?.render) {
        uiStates.render(historyContainer, {
          state: 'empty',
          message: 'No contest history yet.',
        });
      } else {
        historyContainer.innerHTML = '<p>No contest history yet.</p>';
      }
      return;
    }

    historyContainer.innerHTML = '';
    state.items.forEach((item) => {
      const platform = String(item.platform || '').toLowerCase();
      const name = item.contestName || item.title || 'Contest';
      const contestId = item.contestId || 'N/A';
      const rank = !Number.isNaN(Number(item.rank)) ? Number(item.rank) : null;
      const solved = !Number.isNaN(Number(item.solved))
        ? Number(item.solved)
        : !Number.isNaN(Number(item.problemsSolved))
          ? Number(item.problemsSolved)
          : null;
      const totalProblems = !Number.isNaN(Number(item.totalProblems))
        ? Number(item.totalProblems)
        : null;
      const rating = !Number.isNaN(Number(item.rating))
        ? Number(item.rating)
        : null;
      const delta =
        item.delta !== null &&
        item.delta !== undefined &&
        !Number.isNaN(Number(item.delta))
          ? Number(item.delta)
          : null;
      const date = formatDate(item.startTime || item.date || item.createdAt);
      const platformLabel = platform || 'unknown';
      const isCodeforces = platform === 'codeforces';
      const platformIcon = isCodeforces ? 'fa-code' : 'fa-laptop-code';

      historyContainer.innerHTML += `
                <div class="history-card">
                    <div class="hc-header">
                        <div class="hc-title">
                            <h4>${name}</h4>
                            <div class="hc-subtitle">
                                <span class="hc-platform"><i class="fa-solid ${platformIcon}"></i> ${platformLabel}</span>
                                ${date ? '<span class="hc-date"><i class="fa-regular fa-calendar"></i> ' + date + '</span>' : ''}
                                <span class="hc-id">ID: ${contestId}</span>
                            </div>
                        </div>
                        <div class="hc-rank">
                            ${rank ? '<div class="rank-value"><i class="fa-solid fa-trophy"></i> #' + rank + '</div>' : ''}
                            ${rating !== null ? '<div class="rating-value"><i class="fa-solid fa-chart-line"></i> ' + rating + '</div>' : ''}
                            ${delta !== null ? '<div class="delta-value">' + renderDelta(delta) + '</div>' : ''}
                        </div>
                    </div>
                    <div class="hc-body">
                        <div class="prob-grid">
                            ${solved !== null ? '<div class="prob-box success"><div class="box-header"><i class="fa-regular fa-circle-check"></i> Solved</div><div class="box-meta"><span>' + solved + (totalProblems ? ' / ' + totalProblems : '') + ' problems</span></div></div>' : ''}
                            ${rating !== null ? '<div class="prob-box info"><div class="box-header"><i class="fa-solid fa-chart-simple"></i> Rating</div><div class="box-meta"><span>' + rating + '</span></div></div>' : ''}
                            <div class="prob-box neutral"><div class="box-header"><i class="fa-regular fa-clock"></i> Contest ID</div><div class="box-meta"><span>' + contestId + '</span></div></div>
                        </div>
                    </div>
                </div>
            `;
    });

    renderPagination();
  };

  const renderPagination = () => {
    const pagination = state.pagination;
    const total = Number(pagination?.total || 0);
    const totalPages = Math.ceil(total / state.limit) || 1;
    const currentPage = state.currentPage;

    if (totalPages <= 1) return;

    const paginationEl = document.createElement('div');
    paginationEl.className = 'pagination-controls';

    const prevDisabled = currentPage <= 1 ? 'disabled' : '';
    const nextDisabled = currentPage >= totalPages ? 'disabled' : '';

    paginationEl.innerHTML = `
            <button class="pagination-btn" data-page="prev" ${prevDisabled}>
                <i class="fa-solid fa-chevron-left"></i> Prev
            </button>
            <div class="pagination-pages">
                ${renderPageNumbers(currentPage, totalPages)}
            </div>
            <button class="pagination-btn" data-page="next" ${nextDisabled}>
                Next <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;

    const existingPagination = document.querySelector('.pagination-controls');
    if (existingPagination) existingPagination.remove();
    historyContainer.appendChild(paginationEl);

    paginationEl.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page === 'prev' && currentPage > 1) goToPage(currentPage - 1);
        else if (page === 'next' && currentPage < totalPages)
          goToPage(currentPage + 1);
        else if (page !== 'prev' && page !== 'next') goToPage(Number(page));
      });
    });
  };

  const renderPageNumbers = (current, total) => {
    const pages = [];
    const range = 2;
    const start = Math.max(1, current - range);
    const end = Math.min(total, current + range);

    if (start > 1) {
      pages.push(
        '<button class="pagination-btn pagination-page" data-page="1">1</button>',
      );
      if (start > 2) pages.push('<span class="pagination-ellipsis">...</span>');
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        '<button class="pagination-btn pagination-page' +
          (i === current ? ' active' : '') +
          '" data-page="' +
          i +
          '">' +
          i +
          '</button>',
      );
    }

    if (end < total) {
      if (end < total - 1)
        pages.push('<span class="pagination-ellipsis">...</span>');
      pages.push(
        '<button class="pagination-btn pagination-page" data-page="' +
          total +
          '">' +
          total +
          '</button>',
      );
    }

    return pages.join('');
  };

  const goToPage = async (page) => {
    if (page < 1) return;
    state.currentPage = page;
    await loadHistory();
    historyContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const loadHistory = async () => {
    if (!competitionsService) {
      if (uiStates?.render)
        uiStates.render(historyContainer, {
          state: 'error',
          message: 'Competitions service is unavailable.',
        });
      return;
    }
    if (!token) {
      if (uiStates?.render)
        uiStates.render(historyContainer, {
          state: 'unauthorized',
          message: 'Sign in to view your contest history.',
        });
      return;
    }

    if (uiStates?.render)
      uiStates.render(historyContainer, {
        state: 'loading',
        message: 'Loading history...',
      });
    try {
      const response = await competitionsService.listHistory({
        page: state.currentPage,
        limit: state.limit,
      });
      state.items = Array.isArray(response?.items) ? response.items : [];
      state.pagination = response?.pagination || null;
      renderStats();
      var statValues = statsContainer.querySelectorAll('.stat-info h2');
      statValues.forEach(function (el, i) {
        setTimeout(function () {
          animateCounter(el, 700);
        }, i * 100);
      });
      renderHistory();
    } catch (error) {
      const stateInfo = uiStates?.fromError
        ? uiStates.fromError(error, 'Could not load contest history.')
        : {
            state: 'error',
            message: error?.message || 'Could not load contest history.',
          };
      if (
        Number(error?.status || 0) === 401 ||
        Number(error?.status || 0) === 403
      ) {
        stateInfo.state = 'unauthorized';
        stateInfo.message =
          'Your current session is not authorized for Competitions. Please sign in with a competitions account.';
      }
      if (uiStates?.render)
        uiStates.render(historyContainer, {
          state: stateInfo.state,
          message: stateInfo.message,
        });
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
  if (themeBtn) {
    themeBtn.classList.remove('rotating');
    void themeBtn.offsetWidth;
  }
  themeBtn?.addEventListener('click', () => {
    themeBtn.classList.add('rotating');
    setTimeout(() => {
      themeBtn.classList.remove('rotating');
    }, 500);
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (_) {
      // ignore storage write errors
    }
    applyThemeAssets();
  });

  const contentTabs = document.querySelectorAll('.tab-btn');
  contentTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      contentTabs.forEach((entry) => entry.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  renderStats();
  void loadHistory();
});
