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
  const uiStates = shared.uiStates;
  const competitionsService = window.NibrasServices?.competitionsService;
  const accountsHelper = window.RankingAccounts || {};
  const token = (() => {
    try {
      if (typeof shared.auth?.getToken === 'function')
        return shared.auth.getToken();
    } catch (_) {}
    return localStorage.getItem('token') || null;
  })();

  const statsContainer = document.getElementById('stats-container');
  const rankContainer = document.getElementById('ranking-list-container');
  const rateContainer = document.getElementById('rating-content-container');
  const leaderboardContainer = document.getElementById('leaderboard-table-container');
  const leaderboardFilter = document.getElementById('leaderboard-platform-filter');

  const PLATFORM_CARDS = [
    { key: 'codeforces', label: 'Codeforces', prefix: 'cf' },
    { key: 'leetcode', label: 'LeetCode', prefix: 'lc' },
    { key: 'atcoder', label: 'AtCoder', prefix: 'ac' },
    { key: 'codechef', label: 'CodeChef', prefix: 'cc' },
  ];

  const state = {
    me: null,
    profile: null,
    progress: null,
    history: null,
    myRanks: [],
    leaderboard: [],
    leaderboardHost: 'all',
    leaderboardPage: 1,
    leaderboardLimit: 25,
  };

  const getProgressTotals = () => {
    const solved = Number(state.progress?.solvedCount ?? 0);
    const total = Number(state.progress?.problemCount ?? 0);
    const percent = Number(
      state.progress?.percent ??
        (total ? Math.round((solved / total) * 100) : 0),
    );
    return { solved, total, percent };
  };

  const verifiedCount = () => {
    if (accountsHelper.verifiedCount) {
      return accountsHelper.verifiedCount(state.profile?.verification);
    }
    const verification = state.profile?.verification || {};
    return Object.values(verification).filter(
      (entry) => String(entry?.status || '').toLowerCase() === 'verified',
    ).length;
  };

  const renderStats = () => {
    if (!statsContainer) return;
    const totals = getProgressTotals();
    const completion = totals.percent;
    const participations = Number(
      state.history?.total ?? state.history?.items?.length ?? 0,
    );
    const stats = [
      {
        label: 'Problems Solved',
        value: String(totals.solved),
        icon: 'fa-solid fa-bullseye',
        color: 'green',
      },
      {
        label: 'Completion',
        value: `${completion}%`,
        icon: 'fa-solid fa-chart-simple',
        color: 'yellow',
      },
      {
        label: 'Participations',
        value: String(participations),
        icon: 'fa-solid fa-users',
        color: 'blue',
      },
      {
        label: 'Verified Accounts',
        value: String(verifiedCount()),
        icon: 'fa-solid fa-shield-halved',
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

  const renderRankings = () => {
    if (!rankContainer) return;

    const rows = accountsHelper.formatMyRankRows
      ? accountsHelper.formatMyRankRows(state.myRanks)
      : [{ label: 'Global rank', value: 'Not ranked yet' }];

    rankContainer.innerHTML = '';
    rows.forEach((item) => {
      rankContainer.innerHTML += `
                <div class="rank-row">
                    <span>${item.label}</span>
                    <span class="rank-value">${item.value}</span>
                </div>
            `;
    });

    updatePlatformCards(
      state.profile?.linkedAccounts || {},
      state.profile?.verification || {},
      state.profile?.ratings || {},
    );
  };

  const updatePlatformCards = (linkedAccounts, verification, ratings) => {
    PLATFORM_CARDS.forEach(({ key, prefix }) => {
      const handle = linkedAccounts[key] || null;
      const status = verification[key]?.status || 'unverified';
      const handleEl = document.getElementById(`${prefix}-handle-display`);
      const statusEl = document.getElementById(`${prefix}-status-display`);
      if (handleEl) {
        const rating = ratings?.[key];
        handleEl.textContent = handle
          ? rating != null
            ? `${handle} (${rating})`
            : handle
          : 'Not linked';
      }
      if (statusEl) statusEl.innerHTML = getStatusBadgeHTML(status);
    });
  };

  const getStatusBadgeHTML = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'verified')
      return '<span class="status-dot status-verified"></span> Verified';
    if (s === 'pending')
      return '<span class="status-dot status-pending"></span> Pending';
    return '<span class="status-dot status-unverified"></span> Unverified';
  };

  const renderProgress = (message = '') => {
    let container =
      rateContainer || document.getElementById('rating-content-container');
    if (!container) return;

    const totals = getProgressTotals();
    const percent = totals.percent;
    const linkedAccounts = state.profile?.linkedAccounts || {};
    const linkedCount = PLATFORM_CARDS.filter(
      (platform) => linkedAccounts[platform.key],
    ).length;

    container.innerHTML = `
            <div class="rating-progress-row">
                <span class="rp-label">Solved / Total Problems</span>
                <span class="rp-val">${totals.solved} / ${totals.total}</span>
            </div>
            <div class="rating-progress-row">
                <span class="rp-sub">Linked Accounts: ${linkedCount}</span>
                <span class="rp-sub">${percent}%</span>
            </div>
            <div class="rating-bar-container">
                <div class="rating-bar-fill" style="width: ${percent}%"></div>
            </div>
            <div class="rating-big-display">
                <div class="rating-number">${percent}%</div>
                <span class="rating-sub">CP Roadmap Progress</span>
                <div class="rating-badge">${linkedCount ? 'Connected' : 'Connect Accounts'}</div>
            </div>
            ${message ? `<p class="section-sub" style="margin-top: 12px;">${message}</p>` : ''}
            <div class="progress-actions">
                <button class="btn-progress" id="btn-link-accounts"><i class="fa-solid fa-link"></i> Link Accounts</button>
                <button class="btn-progress-secondary" id="btn-sync-profile"><i class="fa-solid fa-arrows-rotate"></i> Sync Accounts</button>
            </div>
        `;
  };

  const renderLeaderboard = () => {
    if (!leaderboardContainer) return;
    const rows = Array.isArray(state.leaderboard) ? state.leaderboard : [];
    const myId = state.me?._id || state.me?.id || null;

    if (!rows.length) {
      leaderboardContainer.innerHTML =
        '<p class="section-sub leaderboard-empty">No ranking data yet. Link and verify accounts to appear on the leaderboard.</p>';
      return;
    }

    const body = rows
      .map((entry) => {
        const isMe = myId && entry.userId === myId;
        const delta =
          entry.delta == null
            ? '—'
            : entry.delta > 0
              ? `+${entry.delta}`
              : String(entry.delta);
        return `
          <tr class="${isMe ? 'current-user-row' : ''}">
            <td class="col-rank">${entry.rank ?? '—'}</td>
            <td class="col-user">${entry.username || 'Unknown'}</td>
            <td class="col-rating">${entry.rating ?? '—'}</td>
            <td class="col-delta">${delta}</td>
            <td class="col-contests">${entry.contestsLast30d ?? 0}</td>
          </tr>
        `;
      })
      .join('');

    leaderboardContainer.innerHTML = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th class="col-rank">Rank</th>
            <th class="col-user">User</th>
            <th class="col-rating">Rating</th>
            <th class="col-delta">Δ</th>
            <th class="col-contests">Contests (30d)</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    `;
  };

  const mapAccountsToProfile = (accounts) => {
    if (accountsHelper.mapLinkedAccounts) {
      return accountsHelper.mapLinkedAccounts(accounts);
    }
    const linkedAccounts = {};
    const verification = {};
    (accounts || []).forEach((account) => {
      const platform = String(account.host || account.platform || '').toLowerCase();
      if (!platform) return;
      linkedAccounts[platform] = account.handle || '';
      verification[platform] = {
        status: account.verificationStatus || 'unverified',
      };
    });
    return { linkedAccounts, verification, ratings: {}, verificationProblems: {} };
  };

  const loadRankingData = async () => {
    try {
      const currentUser = await competitionsService.getMe();
      const userId = currentUser?._id || currentUser?.id;
      state.me = currentUser || null;

      if (!userId) {
        renderProgress('Please login to view rankings');
        renderLeaderboard();
        return;
      }

      const host = state.leaderboardHost || 'all';
      const [accounts, progress, history, myRanks, leaderboard] =
        await Promise.all([
          competitionsService.listLinkedAccounts().catch(() => []),
          competitionsService.getProgress().catch(() => ({})),
          competitionsService.listHistory().catch(() => ({ items: [], total: 0 })),
          competitionsService.getMyRanking().catch(() => []),
          competitionsService
            .getRanking({
              host,
              scope: 'global',
              page: state.leaderboardPage,
              limit: state.leaderboardLimit,
            })
            .catch(() => []),
        ]);

      const mapped = mapAccountsToProfile(accounts);
      state.profile = {
        userId,
        linkedAccounts: mapped.linkedAccounts,
        verification: mapped.verification,
        ratings: mapped.ratings,
        verificationProblems: mapped.verificationProblems,
      };
      state.progress = progress || {};
      state.history = history || { items: [], total: 0 };
      state.myRanks = myRanks || [];
      state.leaderboard = leaderboard || [];

      renderStats();
      const statValues = statsContainer?.querySelectorAll('.stat-info h2');
      statValues?.forEach((el, i) => {
        setTimeout(() => animateCounter(el, 700), i * 100);
      });
      renderRankings();
      renderProgress();
      renderLeaderboard();
    } catch (error) {
      renderProgress('Could not load data');
      renderLeaderboard();
    }
  };

  const promptLinkAccounts = async () => {
    const codeforcesHandle =
      window.prompt('Codeforces handle (leave empty to skip):', '') || '';
    const leetcodeUsername =
      window.prompt('LeetCode username (leave empty to skip):', '') || '';
    const payload = {};
    if (codeforcesHandle.trim())
      payload.codeforcesHandle = codeforcesHandle.trim();
    if (leetcodeUsername.trim())
      payload.leetcodeUsername = leetcodeUsername.trim();
    if (!Object.keys(payload).length) {
      renderProgress('No account data provided.');
      return;
    }
    console.log('[linkAccounts] Payload:', payload);
    try {
      console.log('[linkAccounts] Calling service...');
      const result = await competitionsService.linkAccounts(payload);
      console.log('[linkAccounts] Result:', result);
      renderProgress('Accounts linked successfully. Reloading profile...');
      await loadRankingData();
    } catch (error) {
      console.error('[linkAccounts] Error:', error);
      if (
        Number(error?.status || 0) === 401 ||
        Number(error?.status || 0) === 403
      ) {
        renderProgress(
          'Your current session is not authorized for Competitions. Please sign in with a competitions account.',
        );
        return;
      }
      renderProgress(error?.message || 'Failed to link accounts.');
    }
  };

  const triggerSync = async () => {
    try {
      renderProgress('Syncing linked accounts...');
      const accounts = await competitionsService.listLinkedAccounts().catch(() => []);
      const hosts = accounts.map((account) => account.host).filter(Boolean);
      if (!hosts.length) {
        renderProgress('Link an account before syncing.');
        return;
      }
      await Promise.all(
        hosts.map((host) => competitionsService.resyncAccount(host).catch(() => null)),
      );
      renderProgress('Accounts queued for resync. Reloading...');
      await loadRankingData();
    } catch (error) {
      if (
        Number(error?.status || 0) === 401 ||
        Number(error?.status || 0) === 403
      ) {
        renderProgress(
          'Your current session is not authorized for Competitions. Please sign in with a competitions account.',
        );
        return;
      }
      renderProgress(error?.message || 'Failed to sync profile.');
    }
  };

  const startVerification = async (platformArg) => {
    let platform = platformArg;
    if (!platform) {
      platform = (
        window.prompt(
          'Platform to verify (codeforces, leetcode, atcoder, or codechef):',
          'codeforces',
        ) || ''
      )
        .trim()
        .toLowerCase();
    }
    const supported = PLATFORM_CARDS.map((entry) => entry.key);
    if (!supported.includes(platform)) {
      renderProgress(
        `Verification canceled. Platform must be one of: ${supported.join(', ')}.`,
      );
      return null;
    }
    const platformName =
      PLATFORM_CARDS.find((entry) => entry.key === platform)?.label || platform;
    try {
      const result = await competitionsService.startVerification(platform);
      const data = result?.data || {};

      if (data.verified) {
        renderVerificationResult(platform, platformName, data);
        await loadRankingData();
        return data;
      }

      const verificationProblem =
        data.verificationProblem ||
        state.profile?.verificationProblems?.[platform];
      renderVerificationPending(platform, platformName, {
        ...data,
        verificationProblem,
      });
      return data;
    } catch (error) {
      console.error('[Verification] Error:', error);
      if (
        Number(error?.status || 0) === 401 ||
        Number(error?.status || 0) === 403
      ) {
        renderProgress(
          'Your current session is not authorized for Competitions. Please sign in with a competitions account.',
        );
        return null;
      }
      if (error?.code === 'TIMEOUT') {
        renderProgress(
          'Verification request timed out. The backend took too long. Please try again.',
        );
      } else {
        renderProgress(error?.message || 'Failed to start verification.');
      }
      return null;
    }
  };

  const checkVerification = async (platformArg) => {
    let platform = platformArg;
    if (!platform) {
      platform = (
        window.prompt(
          'Platform to check (codeforces, leetcode, atcoder, or codechef):',
          'codeforces',
        ) || ''
      )
        .trim()
        .toLowerCase();
    }
    const supported = PLATFORM_CARDS.map((entry) => entry.key);
    if (!supported.includes(platform)) {
      renderProgress(
        `Check canceled. Platform must be one of: ${supported.join(', ')}.`,
      );
      return;
    }
    const platformName =
      PLATFORM_CARDS.find((entry) => entry.key === platform)?.label || platform;
    try {
      const result = await competitionsService.checkVerification(platform);
      const data = result?.data || {};

      if (data.verified) {
        renderVerificationResult(platform, platformName, data);
        await loadRankingData();
      } else {
        const verificationProblem =
          data.verificationProblem ||
          state.profile?.verificationProblems?.[platform];
        renderVerificationPending(platform, platformName, {
          ...data,
          verificationProblem,
        });
      }
    } catch (error) {
      console.error('[Verification] Check error:', error);
      if (
        Number(error?.status || 0) === 401 ||
        Number(error?.status || 0) === 403
      ) {
        renderProgress(
          'Your current session is not authorized for Competitions. Please sign in with a competitions account.',
        );
        return;
      }
      if (error?.code === 'TIMEOUT') {
        renderProgress('Verification check timed out. Please try again.');
      } else {
        renderProgress(error?.message || 'Failed to check verification.');
      }
    }
  };

  const renderVerificationStarted = (platform, platformName, data) => {
    const container =
      document.getElementById('rating-content-container') || rateContainer;
    if (!container) return;

    const expiresDate = data.expiresAt
      ? new Date(data.expiresAt).toLocaleString()
      : 'N/A';

    container.innerHTML = `
            <div class="verify-panel verify-started">
                <div class="verify-panel-header">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>${platformName} Verification Started</span>
                </div>
                <div class="verify-panel-body">
                    <div class="verify-info-row">
                        <span class="verify-info-label">Your Token:</span>
                        <code class="verify-token">${data.token || 'N/A'}</code>
                    </div>
                    <div class="verify-info-row">
                        <span class="verify-info-label">Expires At:</span>
                        <span class="verify-info-value">${expiresDate}</span>
                    </div>
                    <div class="verify-info-row">
                        <span class="verify-info-label">Instructions:</span>
                        <p class="verify-instruction">${data.instruction || 'Submit code and get a COMPILATION_ERROR verdict between start and expiry time.'}</p>
                    </div>
                    <div class="verify-notice">
                        <i class="fa-solid fa-info-circle"></i>
                        After completing the verification step, click "Check Verification" to verify your account.
                    </div>
                </div>
                <div class="verify-actions">
                    <button class="btn-account btn-verify" data-action="check-verification" data-platform="${platform}"><i class="fa-solid fa-rotate"></i> Check Verification</button>
                    <button class="btn-account btn-check" data-action="restart-verification" data-platform="${platform}"><i class="fa-solid fa-arrow-rotate-right"></i> Start New</button>
                </div>
            </div>
        `;
  };

  const renderVerificationResult = (platform, platformName, data) => {
    const container =
      document.getElementById('rating-content-container') || rateContainer;
    if (!container) return;

    const verifiedDate = data.verifiedAt
      ? new Date(data.verifiedAt).toLocaleString()
      : 'N/A';
    const expiresDate = data.expiresAt
      ? new Date(data.expiresAt).toLocaleString()
      : 'N/A';
    const evidence = data.evidence || {};

    container.innerHTML = `
            <div class="verify-panel verify-success">
                <div class="verify-panel-header">
                    <i class="fa-solid fa-shield-halved"></i>
                    <span>${platformName} Account Verified!</span>
                </div>
                <div class="verify-panel-body">
                    <div class="verify-info-row">
                        <span class="verify-info-label">Verified At:</span>
                        <span class="verify-info-value">${verifiedDate}</span>
                    </div>
                    <div class="verify-info-row">
                        <span class="verify-info-label">Valid Until:</span>
                        <span class="verify-info-value">${expiresDate}</span>
                    </div>
                    ${
                      evidence.submissionId
                        ? `
                    <div class="verify-evidence">
                        <span class="verify-info-label">Verification Evidence:</span>
                        <p><strong>Problem:</strong> <a href="${evidence.problemUrl || '#'}" target="_blank" rel="noopener">${evidence.contestId}${evidence.problemIndex}</a></p>
                        <p><strong>Verdict:</strong> <span class="verify-verdict">${evidence.verdict}</span></p>
                        <p><strong>Rule:</strong> ${evidence.matchedRule}</p>
                    </div>
                    `
                        : ''
                    }
                </div>
                <div class="verify-actions">
                    <button class="btn-account btn-verify" data-action="check-verification" data-platform="${platform}"><i class="fa-solid fa-rotate"></i> Re-check</button>
                    <button class="btn-account btn-check" data-action="restart-verification" data-platform="${platform}"><i class="fa-solid fa-arrow-rotate-right"></i> New Verification</button>
                </div>
            </div>
        `;
  };

  const renderVerificationPending = (platform, platformName, data) => {
    const container =
      document.getElementById('rating-content-container') || rateContainer;
    if (!container) return;

    const problem = data.verificationProblem;
    const problemHtml = problem?.url
      ? `<div class="verify-info-row">
            <span class="verify-info-label">Verification problem:</span>
            <a href="${problem.url}" target="_blank" rel="noopener">${problem.name || problem.url}</a>
         </div>`
      : '';

    container.innerHTML = `
            <div class="verify-panel verify-pending">
                <div class="verify-panel-header">
                    <i class="fa-solid fa-clock"></i>
                    <span>${platformName} Verification Pending</span>
                </div>
                <div class="verify-panel-body">
                    ${problemHtml}
                    <div class="verify-notice">
                        <i class="fa-solid fa-info-circle"></i>
                        Complete verification on the platform, then click "Check Verification".
                    </div>
                </div>
                <div class="verify-actions">
                    <button class="btn-account btn-verify" data-action="check-verification" data-platform="${platform}"><i class="fa-solid fa-rotate"></i> Check Verification</button>
                    <button class="btn-account btn-check" data-action="restart-verification" data-platform="${platform}"><i class="fa-solid fa-arrow-rotate-right"></i> Check Again</button>
                </div>
            </div>
        `;
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

  const handleProgressBtnClick = (target) => {
    if (target.id === 'btn-link-accounts') {
      void promptLinkAccounts();
    } else if (target.id === 'btn-sync-profile') {
      void triggerSync();
    } else {
      const actionBtn = target.closest('[data-action]');
      if (!actionBtn) return;
      const action = actionBtn.dataset.action;
      const platform = actionBtn.dataset.platform;

      if (action === 'verify-account') {
        void startVerification(platform);
      } else if (action === 'check-verification') {
        void checkVerification(platform);
      } else if (action === 'restart-verification') {
        void startVerification(platform);
      }
    }
  };

  rateContainer?.addEventListener('click', (event) => {
    handleProgressBtnClick(event.target);
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const actionBtn = target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;
    const platform = actionBtn.dataset.platform;

    if (action === 'check-verification') {
      void checkVerification(platform);
    } else if (action === 'restart-verification') {
      void startVerification(platform);
    } else if (action === 'verify-account') {
      void startVerification(platform);
    }
  });

  const accountLinkStatus = document.getElementById('account-link-status');

  const linkAccountSimple = async (platform) => {
    const platformMeta = PLATFORM_CARDS.find((entry) => entry.key === platform);
    const platformName = platformMeta?.label || platform;
    const username = prompt(`Enter your ${platformName} username:`);
    if (!username || !username.trim()) {
      if (accountLinkStatus)
        accountLinkStatus.innerHTML =
          '<span class="status-msg-error">Username is required.</span>';
      return;
    }
    try {
      const result = await competitionsService.linkAccount(
        platform,
        username.trim(),
      );
      if (result?.verificationProblem) {
        state.profile = state.profile || {};
        state.profile.verificationProblems =
          state.profile.verificationProblems || {};
        state.profile.verificationProblems[platform] = result.verificationProblem;
      }
      if (accountLinkStatus)
        accountLinkStatus.innerHTML = `<span class="status-msg-success">${platformName} account linked. ${
          result?.verificationProblem?.url
            ? 'Complete verification on the assigned problem.'
            : 'You can verify ownership next.'
        }</span>`;
      await loadRankingData();
    } catch (error) {
      if (accountLinkStatus)
        accountLinkStatus.innerHTML = `<span class="status-msg-error">Failed to link: ${error?.message || 'Unknown error'}</span>`;
    }
  };

  // Account linking in platform cards
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const actionBtn = target.closest('[data-action="link-account"]');
    if (!actionBtn) return;

    const platform = actionBtn.dataset.platform;
    linkAccountSimple(platform);
  });

  leaderboardFilter?.addEventListener('change', () => {
    state.leaderboardHost = leaderboardFilter.value || 'all';
    state.leaderboardPage = 1;
    void loadRankingData();
  });

  renderStats();
  renderRankings();
  renderProgress('Loading data...');
  loadRankingData();
});
