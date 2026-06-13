(window.NibrasReact && typeof window.NibrasReact.run === 'function'
  ? window.NibrasReact.run.bind(window.NibrasReact)
  : (initializer) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializer, { once: true });
      } else {
        initializer();
      }
    })(() => {
  const shared = window.NibrasShared || {};
  shared.session?.updateUserInfoDisplay?.();
  const competitionsService = window.NibrasServices?.competitionsService;
  const ui = window.DailyProblemUi || {};
  const safeHtml =
    typeof shared.safeHtml === 'function'
      ? shared.safeHtml
      : (value) => String(value ?? '');

  const statsRow = document.getElementById('stats-row');
  const notice = document.getElementById('notice');
  const content = document.getElementById('daily-content');

  function normalizePayload(payload) {
    if (ui.normalizeDailyTodayPayload) {
      return ui.normalizeDailyTodayPayload(payload);
    }
    return {
      paused: Boolean(payload?.paused),
      pausedUntil: payload?.pausedUntil || null,
      assignment: payload?.assignment || null,
      currentStreak: Number(payload?.streak?.current ?? 0),
      longestStreak: Number(payload?.streak?.longest ?? 0),
      totalCompleted: Number(payload?.streak?.totalCompleted ?? 0),
      freezesLeft: Number(payload?.streak?.freezesLeft ?? 0),
      solvedToday: Boolean(payload?.assignment?.solved),
      skippedToday: Boolean(payload?.assignment?.skipped),
      problem: payload?.assignment?.problem || payload?.problem || null,
      source: payload?.assignment?.source || null,
    };
  }

  function showNotice(message, type) {
    if (!notice) return;
    notice.hidden = false;
    notice.className =
      type === 'error'
        ? 'comp-error'
        : type === 'loading'
          ? 'comp-loading'
          : 'comp-empty';
    notice.textContent = message;
    if (content) content.hidden = true;
  }

  function renderStats(normalized) {
    if (!statsRow) return;
    statsRow.innerHTML = `
      <div class="comp-stat-card"><div class="label">Current streak</div><div class="value">${safeHtml(normalized.currentStreak)}</div></div>
      <div class="comp-stat-card"><div class="label">Longest streak</div><div class="value">${safeHtml(normalized.longestStreak)}</div></div>
      <div class="comp-stat-card"><div class="label">Today</div><div class="value">${normalized.solvedToday ? 'Solved' : normalized.skippedToday ? 'Skipped' : 'Pending'}</div></div>
      <div class="comp-stat-card"><div class="label">Completed</div><div class="value">${safeHtml(normalized.totalCompleted)}</div></div>
    `;
  }

  function renderProblem(normalized) {
    if (!content || !notice) return;
    const problem = normalized.problem || {};
    const title = problem.title || problem.name || 'Daily problem';
    const url = problem.url || problem.problemUrl || '#';
    const platform = problem.platform || problem.sourcePlatform || 'leetcode';
    const difficulty = ui.difficultyLabel
      ? ui.difficultyLabel(problem.difficulty)
      : String(problem.difficulty ?? '—');
    const tags = Array.isArray(problem.tags) ? problem.tags : [];
    const tagHtml = tags.length
      ? `<div style="margin-top:0.5rem;display:flex;flex-wrap:wrap;gap:0.35rem;">${tags
          .slice(0, 6)
          .map((tag) => `<span class="comp-badge">${safeHtml(tag)}</span>`)
          .join('')}</div>`
      : '';
    const solved = normalized.solvedToday;
    const skipped = normalized.skippedToday;
    const disabled = solved || skipped;
    const canVerify = ui.canVerifyOnPlatform
      ? ui.canVerifyOnPlatform(platform)
      : platform === 'codeforces' || platform === 'leetcode';

    notice.hidden = true;
    content.hidden = false;
    content.innerHTML = `
      <h2>${safeHtml(title)}</h2>
      <p style="color:var(--text-secondary);margin:0;">
        Platform: ${safeHtml(platform)} · Difficulty: ${safeHtml(difficulty)}${normalized.source ? ` · Source: ${safeHtml(normalized.source)}` : ''}
      </p>
      ${tagHtml}
      <p style="margin-top:0.75rem;">
        <a href="${safeHtml(url)}" target="_blank" rel="noopener noreferrer">Open problem on platform</a>
      </p>
      <div class="daily-actions">
        ${canVerify ? `<button class="btn-primary" id="verify-btn" type="button" ${disabled ? 'disabled' : ''}>Verify on platform</button>` : ''}
        <button class="btn-secondary" id="solve-btn" type="button" ${disabled ? 'disabled' : ''}>Mark solved</button>
        <button class="btn-secondary" id="refresh-btn" type="button">Refresh</button>
      </div>
      <p id="action-message" style="margin-top:1rem;color:var(--text-secondary);font-size:0.9rem;"></p>
    `;

    document.getElementById('verify-btn')?.addEventListener('click', () => void runAction('verify'));
    document.getElementById('solve-btn')?.addEventListener('click', () => void runAction('solve'));
    document.getElementById('refresh-btn')?.addEventListener('click', () => void loadData());
  }

  function formatActionMessage(result, kind) {
    const base =
      result?.message ||
      result?.error ||
      (kind === 'verify'
        ? result?.verified
          ? 'Verification complete.'
          : 'Verification finished.'
        : result?.success
          ? 'Marked as solved.'
          : 'Action complete.');
    const rewards = ui.formatActionRewards
      ? ui.formatActionRewards(result)
      : '';
    return rewards ? `${base} ${rewards}` : base;
  }

  async function runAction(kind) {
    if (!competitionsService) return;
    const messageEl = document.getElementById('action-message');
    try {
      const result =
        kind === 'verify'
          ? await competitionsService.verifyDailyProblem()
          : await competitionsService.solveDailyProblem();
      if (messageEl) {
        messageEl.textContent = formatActionMessage(result, kind);
      }
      await loadData();
    } catch (error) {
      if (messageEl) {
        messageEl.textContent = error?.message || 'Action failed.';
      }
    }
  }

  async function loadData() {
    if (!competitionsService) {
      showNotice('Competitions service unavailable.', 'error');
      return;
    }
    showNotice("Loading today's problem...", 'loading');
    try {
      const payload = await competitionsService.getDailyProblemToday();
      const normalized = normalizePayload(payload || {});
      renderStats(normalized);

      if (
        normalized.paused ||
        normalized.skippedToday ||
        !normalized.assignment ||
        !normalized.problem
      ) {
        const message = ui.emptyStateMessage
          ? ui.emptyStateMessage(normalized)
          : 'No daily problem assigned for today.';
        showNotice(message, 'empty');
        return;
      }

      renderProblem(normalized);
    } catch (error) {
      console.error('[Daily Problem] load failed:', error);
      showNotice(error?.message || 'Failed to load daily problem.', 'error');
    }
  }

  document.getElementById('themeBtn')?.addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  void loadData();
});
