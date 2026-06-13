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
  const rankContainer = document.getElementById('ranking-list-container');
  const rateContainer = document.getElementById('rating-content-container');

  const state = {
    me: null,
    profile: null,
    progress: null,
    history: null,
  };

  const getProgressTotals = () => {
    const keys = ['beginner', 'newbie', 'intermediate', 'advanced'];
    let solved = 0;
    let total = 0;
    keys.forEach((key) => {
      solved += Number(state.progress?.[key]?.solved || 0);
      total += Number(state.progress?.[key]?.total || 0);
    });
    return { solved, total };
  };

  const verifiedCount = () => {
    const verification = state.profile?.verification || {};
    return Object.values(verification).filter(
      (entry) => String(entry?.status || '').toLowerCase() === 'verified',
    ).length;
  };

  const syncSuccessCount = () => {
    const sync = state.profile?.sync || {};
    return Object.values(sync).filter(
      (entry) => String(entry?.syncStatus || '').toLowerCase() === 'success',
    ).length;
  };

  const renderStats = () => {
    if (!statsContainer) return;
    const totals = getProgressTotals();
    const completion = totals.total
      ? Math.round((totals.solved / totals.total) * 100)
      : 0;
    const participations = Number(state.history?.pagination?.total || 0);
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

    const linkedAccounts = state.profile?.linkedAccounts || {};
    const verification = state.profile?.verification || {};

    const cfHandle = linkedAccounts.codeforces || null;
    const lcUsername = linkedAccounts.leetcode || null;
    const hrHandle = linkedAccounts.hackerrank || null;

    const cfVerify = verification.codeforces?.status || 'unverified';
    const lcVerify = verification.leetcode?.status || 'unverified';
    const hrVerify = verification.hackerrank?.status || 'unverified';

    const rows = [
      { label: 'Codeforces Handle', value: cfHandle || 'Not linked' },
      { label: 'LeetCode Username', value: lcUsername || 'Not linked' },
      { label: 'HackerRank Handle', value: hrHandle || 'Not linked' },
      { label: 'Codeforces Verification', value: cfVerify },
      { label: 'LeetCode Verification', value: lcVerify },
      { label: 'HackerRank Verification', value: hrVerify },
    ];
    rankContainer.innerHTML = '';
    rows.forEach((item) => {
      rankContainer.innerHTML += `
                <div class="rank-row">
                    <span>${item.label}</span>
                    <span class="rank-value">${item.value}</span>
                </div>
            `;
    });

    updatePlatformCards(linkedAccounts, verification);
  };

  const updatePlatformCards = (linkedAccounts, verification) => {
    const cfHandle = linkedAccounts.codeforces || null;
    const lcUsername = linkedAccounts.leetcode || null;
    const hrHandle = linkedAccounts.hackerrank || null;
    const cfVerify = verification.codeforces?.status || 'unverified';
    const lcVerify = verification.leetcode?.status || 'unverified';
    const hrVerify = verification.hackerrank?.status || 'unverified';

    const cfHandleEl = document.getElementById('cf-handle-display');
    const cfStatusEl = document.getElementById('cf-status-display');
    const lcHandleEl = document.getElementById('lc-handle-display');
    const lcStatusEl = document.getElementById('lc-status-display');
    const hrHandleEl = document.getElementById('hr-handle-display');
    const hrStatusEl = document.getElementById('hr-status-display');

    if (cfHandleEl) cfHandleEl.textContent = cfHandle || 'Not linked';
    if (lcHandleEl) lcHandleEl.textContent = lcUsername || 'Not linked';
    if (hrHandleEl) hrHandleEl.textContent = hrHandle || 'Not linked';

    if (cfStatusEl) cfStatusEl.innerHTML = getStatusBadgeHTML(cfVerify);
    if (lcStatusEl) lcStatusEl.innerHTML = getStatusBadgeHTML(lcVerify);
    if (hrStatusEl) hrStatusEl.innerHTML = getStatusBadgeHTML(hrVerify);
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
    const percent = totals.total
      ? Math.round((totals.solved / totals.total) * 100)
      : 0;

    const linkedAccounts = state.profile?.linkedAccounts || {};
    const hasCf = !!linkedAccounts.codeforces;
    const hasLc = !!linkedAccounts.leetcode;
    const hasHr = !!linkedAccounts.hackerrank;
    const linkedCount = [hasCf, hasLc, hasHr].filter(Boolean).length;

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
                <span class="rating-sub">Progress Completion</span>
                <div class="rating-badge">${linkedCount ? 'Connected' : 'Connect Accounts'}</div>
            </div>
            ${message ? `<p class="section-sub" style="margin-top: 12px;">${message}</p>` : ''}
            <div class="progress-actions">
                <button class="btn-progress" id="btn-link-accounts"><i class="fa-solid fa-link"></i> Link Accounts</button>
                <button class="btn-progress-secondary" id="btn-sync-profile"><i class="fa-solid fa-arrows-rotate"></i> Sync Profile</button>
            </div>
        `;
  };

  const loadRankingData = async () => {
    try {
      const currentUser = await competitionsService.getMe();
      const userId = currentUser?._id || currentUser?.id;

      if (!userId) {
        renderProgress('Please login to view rankings');
        return;
      }

      const [profile, progress] = await Promise.all([
        competitionsService.getAggregatedProfile(userId).catch(() => ({})),
        competitionsService.getProgress().catch(() => ({})),
      ]);

      console.log('[loadRankingData] Profile:', profile);
      console.log('[loadRankingData] Progress:', progress);

      state.profile = profile || {};
      state.progress = progress || {};
      renderStats();
      var statValues = statsContainer.querySelectorAll('.stat-info h2');
      statValues.forEach(function (el, i) {
        setTimeout(function () {
          animateCounter(el, 700);
        }, i * 100);
      });
      renderRankings();
    } catch (error) {
      renderProgress('Could not load data');
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
      renderProgress('Syncing profile...');
      const syncResult = await competitionsService.syncProfile({ force: true });
      const syncedCount = syncResult?.problemSync?.totalSynced || 0;
      renderProgress(
        `Profile synced. Updated solved problems: ${syncedCount}. Reloading...`,
      );
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
          'Platform to verify (codeforces or leetcode):',
          'codeforces',
        ) || ''
      )
        .trim()
        .toLowerCase();
    }
    if (platform !== 'codeforces' && platform !== 'leetcode') {
      renderProgress(
        'Verification canceled. Platform must be codeforces or leetcode.',
      );
      return null;
    }
    console.log('[Verification] Starting for platform:', platform);
    try {
      console.log('[Verification] Starting verification for:', platform);
      const result = await competitionsService.startVerification(platform);
      console.log('[Verification] Start result:', result);
      const data = result?.data;
      const platformName =
        platform === 'codeforces' ? 'Codeforces' : 'LeetCode';

      if (data?.token) {
        renderVerificationStarted(platform, platformName, data);
        return data;
      } else if (data?.verified) {
        renderVerificationResult(platform, platformName, data);
        return data;
      } else {
        renderProgress(
          `${platformName} verification started. Check again using the "Check Verification" button.`,
        );
        return data;
      }
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
          'Platform to check (codeforces or leetcode):',
          'codeforces',
        ) || ''
      )
        .trim()
        .toLowerCase();
    }
    if (platform !== 'codeforces' && platform !== 'leetcode') {
      renderProgress(
        'Check canceled. Platform must be codeforces or leetcode.',
      );
      return;
    }
    console.log('[Verification] Checking for platform:', platform);
    try {
      const result = await competitionsService.checkVerification(platform);
      console.log('[Verification] Check result:', result);
      const data = result?.data;
      const platformName =
        platform === 'codeforces' ? 'Codeforces' : 'LeetCode';

      if (data?.verified) {
        renderVerificationResult(platform, platformName, data);
        await loadRankingData();
        renderStats();
        renderRankings();
      } else if (data?.status === 'pending' || data?.token) {
        renderVerificationPending(platform, platformName, data);
      } else if (data?.verified === false) {
        renderProgress(
          `${platformName} verification still pending. Complete the verification step and check again.`,
        );
      } else {
        renderProgress(
          `${platformName} verification not started. Use "Start Verification" first.`,
        );
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

    const expiresDate = data.expiresAt
      ? new Date(data.expiresAt).toLocaleString()
      : 'N/A';

    container.innerHTML = `
            <div class="verify-panel verify-pending">
                <div class="verify-panel-header">
                    <i class="fa-solid fa-clock"></i>
                    <span>${platformName} Verification Pending</span>
                </div>
                <div class="verify-panel-body">
                    ${
                      data.token
                        ? `
                    <div class="verify-info-row">
                        <span class="verify-info-label">Your Token:</span>
                        <code class="verify-token">${data.token}</code>
                    </div>
                    `
                        : ''
                    }
                    <div class="verify-notice">
                        <i class="fa-solid fa-info-circle"></i>
                        Verification still pending. Complete the verification step and check again.
                    </div>
                </div>
                <div class="verify-actions">
                    <button class="btn-account btn-verify" data-action="check-verification" data-platform="${platform}"><i class="fa-solid fa-rotate"></i> Check Verification</button>
                    <button class="btn-account btn-check" data-action="restart-verification" data-platform="${platform}"><i class="fa-solid fa-arrow-rotate-right"></i> Start New</button>
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

  // Account linking in platform cards
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const actionBtn = target.closest('[data-action="link-account"]');
    if (!actionBtn) return;

    const platform = actionBtn.dataset.platform;
    linkAccountSimple(platform);
  });

  renderStats();
  renderRankings();
  renderProgress('Loading data...');
  loadRankingData();

  const accountLinkStatus = document.getElementById('account-link-status');

  const linkAccountSimple = async (platform) => {
    const platformName =
      platform === 'codeforces'
        ? 'Codeforces'
        : platform === 'leetcode'
          ? 'LeetCode'
          : 'HackerRank';
    const username = prompt(`Enter your ${platformName} username:`);
    if (!username || !username.trim()) {
      if (accountLinkStatus)
        accountLinkStatus.innerHTML =
          '<span class="status-msg-error">Username is required.</span>';
      return;
    }
    try {
      if (competitionsService?.linkAccounts) {
        const body =
          platform === 'codeforces'
            ? { codeforcesHandle: username.trim() }
            : platform === 'leetcode'
              ? { leetcodeUsername: username.trim() }
              : { hackerrankHandle: username.trim() };
        console.log(
          '[Link Account] Sending request with body:',
          JSON.stringify(body),
        );
        const result = await competitionsService.linkAccounts(body);
        console.log('[Link Account] Response:', result);
        if (accountLinkStatus)
          accountLinkStatus.innerHTML = `<span class="status-msg-success">${platformName} account linked! Reloading profile...</span>`;
        if (competitionsService?.syncProfile) {
          await competitionsService
            .syncProfile({ force: true })
            .catch(() => {});
        }
        await loadRankingData();
        console.log('[Link Account] Profile after reload:', state.profile);
      } else {
        if (accountLinkStatus)
          accountLinkStatus.innerHTML =
            '<span class="status-msg-error">Link service not available.</span>';
      }
    } catch (error) {
      console.error('[Link Account] Error:', error);
      if (accountLinkStatus)
        accountLinkStatus.innerHTML = `<span class="status-msg-error">Failed to link: ${error?.message || 'Unknown error'}</span>`;
    }
  };
});
