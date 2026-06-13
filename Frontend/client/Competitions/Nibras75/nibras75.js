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
  const safeHtml =
    typeof shared.safeHtml === 'function'
      ? shared.safeHtml
      : (value) => String(value ?? '');
  const token = (() => {
    try {
      if (typeof shared.auth?.getToken === 'function') return shared.auth.getToken();
    } catch (_) {}
    return localStorage.getItem('token') || null;
  })();

  const statsRow = document.getElementById('stats-row');
  const notice = document.getElementById('notice');
  const table = document.getElementById('problems-table');
  const tbody = document.getElementById('problems-tbody');
  const searchInput = document.getElementById('search-input');
  const difficultyFilter = document.getElementById('difficulty-filter');
  const statusFilter = document.getElementById('status-filter');
  const sortFilter = document.getElementById('sort-filter');

  let searchTimer = null;
  let problemItems = [];
  let listMeta = {};
  let statsMeta = {};
  let statusToggleBusy = false;

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

  function renderStats(stats, listMetaArg) {
    if (!statsRow) return;
    const solved = stats?.solvedCount ?? listMetaArg?.solvedCount ?? 0;
    const total =
      stats?.totalCurriculum ?? listMetaArg?.totalCurriculum ?? listMetaArg?.total ?? 0;
    const completed = listMetaArg?.completedInSet ?? solved;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    statsRow.innerHTML = `
      <div class="comp-stat-card"><div class="label">Solved</div><div class="value">${safeHtml(solved)}</div></div>
      <div class="comp-stat-card"><div class="label">Curriculum</div><div class="value">${safeHtml(total)}</div></div>
      <div class="comp-stat-card"><div class="label">Completion</div><div class="value">${safeHtml(pct)}%</div></div>
      <div class="comp-stat-card"><div class="label">LeetCode handle</div><div class="value" style="font-size:1rem;">${safeHtml(stats?.handle || listMetaArg?.handle || '—')}</div></div>
    `;
  }

  function difficultyBadge(value) {
    const level = String(value || '').toLowerCase();
    if (!level) return '—';
    return `<span class="comp-badge ${safeHtml(level)}">${safeHtml(level)}</span>`;
  }

  function getProblemSlug(item) {
    return String(item?.problemId || item?.slug || '').trim();
  }

  function isProblemSolved(item) {
    return Boolean(item?.solved || item?.status === 'solved');
  }

  function getStatusCheckbox(item) {
    const slug = getProblemSlug(item);
    const solved = isProblemSolved(item);
    const disabled = !token || !slug || statusToggleBusy;
    const title = item.title || item.name || 'problem';
    return `<label class="comp-status-cell comp-status-checkbox-label">
      <input
        type="checkbox"
        class="comp-status-checkbox"
        data-problem-slug="${safeHtml(slug)}"
        ${solved ? 'checked' : ''}
        ${disabled ? 'disabled' : ''}
        aria-label="Mark ${safeHtml(title)} as solved"
      />
      <span class="comp-status-label ${solved ? 'solved' : 'unsolved'}">${solved ? 'Solved' : 'Unsolved'}</span>
    </label>`;
  }

  function updateItemSolved(slug, solved) {
    const entry = problemItems.find((item) => getProblemSlug(item) === slug);
    if (entry) entry.solved = solved;
  }

  function renderProblems(items) {
    if (!tbody || !table || !notice) return;
    problemItems = Array.isArray(items) ? items : [];
    if (!problemItems.length) {
      showNotice('No problems match your filters.', 'empty');
      return;
    }
    notice.hidden = true;
    table.hidden = false;
    tbody.innerHTML = problemItems
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
              .map(
                (t) =>
                  `<span class="comp-badge">${safeHtml(typeof t === 'string' ? t : t.name || t)}</span>`,
              )
              .join(' ')
          : '—';
        return `<tr>
          <td><a href="${safeHtml(url)}" target="_blank" rel="noopener noreferrer">${safeHtml(title)}</a></td>
          <td>${difficultyBadge(item.difficulty)}</td>
          <td>${tagHtml}</td>
          <td>${getStatusCheckbox(item)}</td>
        </tr>`;
      })
      .join('');
  }

  function currentFilters() {
    return {
      q: searchInput?.value?.trim() || undefined,
      difficulty: difficultyFilter?.value || undefined,
      solved: statusFilter?.value || undefined,
      sort: sortFilter?.value || 'order',
      page: 1,
      limit: 100,
    };
  }

  async function reloadSilently() {
    if (!competitionsService) return;
    const filters = currentFilters();
    const [listPayload, statsPayload] = await Promise.all([
      competitionsService.listNibras75Problems(filters),
      competitionsService.getNibras75Stats().catch(() => ({})),
    ]);
    listMeta = listPayload || {};
    statsMeta = statsPayload || {};
    renderStats(statsMeta, listMeta);
    renderProblems(listPayload?.items || listPayload?.problems || []);
  }

  async function handleStatusToggle(checkbox) {
    if (!competitionsService || !token || !checkbox?.dataset?.problemSlug) return;
    const slug = checkbox.dataset.problemSlug;
    const nextSolved = checkbox.checked;
    const previousSolved = !nextSolved;

    statusToggleBusy = true;
    updateItemSolved(slug, nextSolved);
    renderProblems(problemItems);

    try {
      await competitionsService.setNibras75ProblemSolved(slug, nextSolved);
      await reloadSilently();
    } catch (error) {
      checkbox.checked = previousSolved;
      updateItemSolved(slug, previousSolved);
      renderProblems(problemItems);
      showNotice(error?.message || 'Could not update problem status.', 'error');
      if (problemItems.length) {
        if (table) table.hidden = false;
        if (notice) notice.hidden = true;
      }
    } finally {
      statusToggleBusy = false;
      renderProblems(problemItems);
    }
  }

  async function loadData() {
    if (!competitionsService) {
      showNotice('Competitions service unavailable.', 'error');
      return;
    }
    showNotice('Loading Nibras 75 problems...', 'loading');
    try {
      const filters = currentFilters();
      const [listPayload, statsPayload] = await Promise.all([
        competitionsService.listNibras75Problems(filters),
        competitionsService.getNibras75Stats().catch(() => ({})),
      ]);
      listMeta = listPayload || {};
      statsMeta = statsPayload || {};
      const items = listPayload?.items || listPayload?.problems || [];
      renderStats(statsMeta, listMeta);
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
    tbody?.addEventListener('change', (event) => {
      const target = event.target;
      if (!target?.classList?.contains('comp-status-checkbox')) return;
      void handleStatusToggle(target);
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
