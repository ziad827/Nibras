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
  const table = document.getElementById('problems-table');
  const tbody = document.getElementById('problems-tbody');
  const searchInput = document.getElementById('search-input');
  const difficultyFilter = document.getElementById('difficulty-filter');
  const statusFilter = document.getElementById('status-filter');
  const sortFilter = document.getElementById('sort-filter');

  let searchTimer = null;

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
    if (table) table.hidden = true;
  }

  function renderStats(stats, listMeta) {
    if (!statsRow) return;
    const solved = stats?.solvedCount ?? listMeta?.solvedCount ?? 0;
    const total = stats?.totalCurriculum ?? listMeta?.totalCurriculum ?? listMeta?.total ?? 0;
    const completed = listMeta?.completedInSet ?? solved;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    statsRow.innerHTML = `
      <div class="comp-stat-card"><div class="label">Solved</div><div class="value">${safeHtml(solved)}</div></div>
      <div class="comp-stat-card"><div class="label">Curriculum</div><div class="value">${safeHtml(total)}</div></div>
      <div class="comp-stat-card"><div class="label">Completion</div><div class="value">${safeHtml(pct)}%</div></div>
      <div class="comp-stat-card"><div class="label">LeetCode handle</div><div class="value" style="font-size:1rem;">${safeHtml(stats?.handle || listMeta?.handle || '—')}</div></div>
    `;
  }

  function difficultyBadge(value) {
    const level = String(value || '').toLowerCase();
    if (!level) return '—';
    return `<span class="comp-badge ${safeHtml(level)}">${safeHtml(level)}</span>`;
  }

  function renderProblems(items) {
    if (!tbody || !table || !notice) return;
    const rows = Array.isArray(items) ? items : [];
    if (!rows.length) {
      showNotice('No problems match your filters.', 'empty');
      return;
    }
    notice.hidden = true;
    table.hidden = false;
    tbody.innerHTML = rows
      .map((item) => {
        const title = item.title || item.name || 'Untitled';
        const url = item.url || item.problemUrl || '#';
        const tags = Array.isArray(item.tags)
          ? item.tags
          : Array.isArray(item.topicTags)
            ? item.topicTags
            : [];
        const tagHtml = tags.length
          ? tags
              .slice(0, 4)
              .map((t) => `<span class="comp-badge">${safeHtml(typeof t === 'string' ? t : t.name || t)}</span>`)
              .join(' ')
          : '—';
        const solved = item.solved || item.status === 'solved';
        const statusHtml = solved
          ? '<span class="comp-badge solved">Solved</span>'
          : '<span style="color:var(--text-tertiary);">Unsolved</span>';
        return `<tr>
          <td><a href="${safeHtml(url)}" target="_blank" rel="noopener noreferrer">${safeHtml(title)}</a></td>
          <td>${difficultyBadge(item.difficulty)}</td>
          <td>${tagHtml}</td>
          <td>${statusHtml}</td>
        </tr>`;
      })
      .join('');
  }

  async function loadData() {
    if (!competitionsService) {
      showNotice('Competitions service unavailable.', 'error');
      return;
    }
    showNotice('Loading Nibras 75 problems...', 'loading');
    const filters = {
      q: searchInput?.value?.trim() || undefined,
      difficulty: difficultyFilter?.value || undefined,
      status: statusFilter?.value || undefined,
      sort: sortFilter?.value || 'order',
      page: 1,
      limit: 100,
    };
    try {
      const [listPayload, statsPayload] = await Promise.all([
        competitionsService.listNibras75Problems(filters),
        competitionsService.getNibras75Stats().catch(() => ({})),
      ]);
      const items = listPayload?.items || listPayload?.problems || [];
      renderStats(statsPayload, listPayload);
      renderProblems(items);
    } catch (error) {
      console.error('[Nibras75] load failed:', error);
      showNotice(error?.message || 'Failed to load Nibras 75 problems.', 'error');
    }
  }

  function bindFilters() {
    const reload = () => void loadData();
    difficultyFilter?.addEventListener('change', reload);
    statusFilter?.addEventListener('change', reload);
    sortFilter?.addEventListener('change', reload);
    searchInput?.addEventListener('input', () => {
      if (searchTimer) window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(reload, 350);
    });
    document.getElementById('themeBtn')?.addEventListener('click', () => {
      const root = document.documentElement;
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  bindFilters();
  void loadData();
});
