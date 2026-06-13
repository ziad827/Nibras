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
  const competitionsService = window.NibrasServices?.competitionsService;
  const safeHtml =
    typeof shared.safeHtml === 'function'
      ? shared.safeHtml
      : (value) => String(value ?? '');

  const statsRow = document.getElementById('stats-row');
  const notice = document.getElementById('notice');
  const content = document.getElementById('daily-content');

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

  function renderStats(payload) {
    if (!statsRow) return;
    const streak = payload?.streak ?? payload?.currentStreak ?? 0;
    const longest = payload?.longestStreak ?? streak;
    const solvedToday = payload?.solvedToday ?? payload?.status === 'solved';
    statsRow.innerHTML = `
      <div class="comp-stat-card"><div class="label">Current streak</div><div class="value">${safeHtml(streak)}</div></div>
      <div class="comp-stat-card"><div class="label">Longest streak</div><div class="value">${safeHtml(longest)}</div></div>
      <div class="comp-stat-card"><div class="label">Today</div><div class="value">${solvedToday ? 'Solved' : 'Pending'}</div></div>
    `;
  }

  function renderProblem(payload) {
    if (!content || !notice) return;
    const problem = payload?.problem || payload?.assignment?.problem || payload;
    const title = problem?.title || problem?.name || 'Daily problem';
    const url = problem?.url || problem?.problemUrl || '#';
    const platform = problem?.platform || problem?.sourcePlatform || 'leetcode';
    const difficulty = problem?.difficulty || '—';
    const status = payload?.status || (payload?.solved ? 'solved' : 'pending');
    const solved = status === 'solved' || payload?.solved === true;

    notice.hidden = true;
    content.hidden = false;
    content.innerHTML = `
      <h2>${safeHtml(title)}</h2>
      <p style="color:var(--text-secondary);margin:0;">
        Platform: ${safeHtml(platform)} · Difficulty: ${safeHtml(String(difficulty))}
      </p>
      <p style="margin-top:0.75rem;">
        <a href="${safeHtml(url)}" target="_blank" rel="noopener noreferrer">Open problem on platform</a>
      </p>
      <div class="daily-actions">
        <button class="btn-primary" id="verify-btn" type="button" ${solved ? 'disabled' : ''}>Verify on platform</button>
        <button class="btn-secondary" id="solve-btn" type="button" ${solved ? 'disabled' : ''}>Mark solved</button>
        <button class="btn-secondary" id="refresh-btn" type="button">Refresh</button>
      </div>
      <p id="action-message" style="margin-top:1rem;color:var(--text-secondary);font-size:0.9rem;"></p>
    `;

    document.getElementById('verify-btn')?.addEventListener('click', () => void runAction('verify'));
    document.getElementById('solve-btn')?.addEventListener('click', () => void runAction('solve'));
    document.getElementById('refresh-btn')?.addEventListener('click', () => void loadData());
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
        messageEl.textContent =
          result?.message ||
          (kind === 'verify' ? 'Verification complete.' : 'Marked as solved.');
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
      if (!payload || (!payload.problem && !payload.assignment && !payload.title)) {
        showNotice('No daily problem assigned for today.', 'empty');
        renderStats(payload || {});
        return;
      }
      renderStats(payload);
      renderProblem(payload);
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
