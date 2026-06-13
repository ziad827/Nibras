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
  const root = document.getElementById('roadmap-root');
  const searchInput = document.getElementById('search-input');

  let roadmapData = null;

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
    if (root) root.hidden = true;
  }

  function renderStats(data) {
    if (!statsRow) return;
    const solved = data?.solvedCount ?? 0;
    const total = data?.problemCount ?? 0;
    const topics = data?.topicCount ?? 0;
    const pct = data?.percent ?? (total > 0 ? Math.round((solved / total) * 100) : 0);
    statsRow.innerHTML = `
      <div class="comp-stat-card"><div class="label">Topics</div><div class="value">${safeHtml(topics)}</div></div>
      <div class="comp-stat-card"><div class="label">Problems solved</div><div class="value">${safeHtml(solved)} / ${safeHtml(total)}</div></div>
      <div class="comp-stat-card"><div class="label">Overall progress</div><div class="value">${safeHtml(pct)}%</div></div>
    `;
  }

  function topicMatchesSearch(topic, query) {
    if (!query) return true;
    const haystack = `${topic.title || ''} ${topic.topicId || ''}`.toLowerCase();
    return haystack.includes(query);
  }

  function renderRoadmap(data, query) {
    if (!root || !notice) return;
    const categories = Array.isArray(data?.categories) ? data.categories : [];
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const html = categories
      .map((category) => {
        const subCategories = Array.isArray(category.subCategories)
          ? category.subCategories
          : [];
        const topicsHtml = subCategories
          .map((sub) => {
            const topics = (sub.topics || []).filter((topic) =>
              topicMatchesSearch(topic, normalizedQuery),
            );
            if (!topics.length) return '';
            const topicRows = topics
              .map((topic) => {
                const pct = topic.percent ?? 0;
                return `<div class="roadmap-topic">
                  <div>
                    <strong>${safeHtml(topic.title || topic.topicId)}</strong>
                    <div class="roadmap-progress"><span style="width:${safeHtml(Math.min(100, pct))}%"></span></div>
                  </div>
                  <div>${safeHtml(topic.solvedCount || 0)} / ${safeHtml(topic.totalCount || 0)}</div>
                </div>`;
              })
              .join('');
            return `<div style="margin-bottom:0.75rem;">
              <div style="font-weight:600;margin-bottom:0.35rem;">${safeHtml(sub.title || sub.subCategoryId)}</div>
              ${topicRows}
            </div>`;
          })
          .join('');
        if (!topicsHtml) return '';
        const catPct = category.percent ?? 0;
        return `<section class="roadmap-category">
          <div class="roadmap-category-header">
            <div>
              <strong>${safeHtml(category.title || category.categoryId)}</strong>
              <div class="roadmap-progress" style="margin-top:0.35rem;max-width:220px;"><span style="width:${safeHtml(Math.min(100, catPct))}%"></span></div>
            </div>
            <span>${safeHtml(category.solvedCount || 0)} / ${safeHtml(category.totalCount || 0)}</span>
          </div>
          <div class="roadmap-category-body">${topicsHtml}</div>
        </section>`;
      })
      .filter(Boolean)
      .join('');

    if (!html) {
      showNotice('No roadmap topics match your search.', 'empty');
      return;
    }
    notice.hidden = true;
    root.hidden = false;
    root.innerHTML = html;
  }

  async function loadData() {
    if (!competitionsService) {
      showNotice('Competitions service unavailable.', 'error');
      return;
    }
    showNotice('Loading CP roadmap...', 'loading');
    try {
      const [roadmap, progress] = await Promise.all([
        competitionsService.getRoadmap(),
        competitionsService.getProgress().catch(() => ({})),
      ]);
      roadmapData = Object.assign({}, roadmap, progress);
      renderStats(roadmapData);
      renderRoadmap(roadmapData, searchInput?.value || '');
    } catch (error) {
      console.error('[CP Roadmap] load failed:', error);
      showNotice(error?.message || 'Failed to load CP roadmap.', 'error');
    }
  }

  searchInput?.addEventListener('input', () => {
    if (roadmapData) renderRoadmap(roadmapData, searchInput.value || '');
  });

  document.getElementById('themeBtn')?.addEventListener('click', () => {
    const rootEl = document.documentElement;
    const next = rootEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    rootEl.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  void loadData();
});
