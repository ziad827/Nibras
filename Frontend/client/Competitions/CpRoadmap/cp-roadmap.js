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
  const root = document.getElementById('roadmap-root');
  const topicDetail = document.getElementById('topic-detail');
  const searchInput = document.getElementById('search-input');
  const progressFilter = document.getElementById('progress-filter');

  let roadmapData = null;
  let selectedTopicId = null;
  let activeTopicDetail = null;
  let statusToggleBusy = false;
  let openCategories = new Set();

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
    const handles = [
      data?.codeforcesHandle ? `CF: ${data.codeforcesHandle}` : null,
      data?.leetcodeHandle ? `LC: ${data.leetcodeHandle}` : null,
      data?.atcoderHandle ? `AC: ${data.atcoderHandle}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    statsRow.innerHTML = `
      <div class="comp-stat-card"><div class="label">Topics</div><div class="value">${safeHtml(topics)}</div></div>
      <div class="comp-stat-card"><div class="label">Problems solved</div><div class="value">${safeHtml(solved)} / ${safeHtml(total)}</div></div>
      <div class="comp-stat-card"><div class="label">Overall progress</div><div class="value">${safeHtml(pct)}%</div></div>
      <div class="comp-stat-card"><div class="label">Linked handles</div><div class="value" style="font-size:0.95rem;">${safeHtml(handles || '—')}</div></div>
    `;
  }

  function mergeRoadmapData(roadmap, progress) {
    const tree = Array.isArray(roadmap?.categories) ? roadmap.categories : [];
    return {
      ...(roadmap || {}),
      categories: tree,
      solvedCount: progress?.solvedCount ?? roadmap?.solvedCount ?? 0,
      problemCount: progress?.problemCount ?? roadmap?.problemCount ?? 0,
      topicCount: progress?.topicCount ?? roadmap?.topicCount ?? 0,
      percent: progress?.percent ?? roadmap?.percent ?? 0,
      codeforcesHandle:
        progress?.codeforcesHandle ?? roadmap?.codeforcesHandle ?? null,
      leetcodeHandle:
        progress?.leetcodeHandle ?? roadmap?.leetcodeHandle ?? null,
      atcoderHandle: progress?.atcoderHandle ?? roadmap?.atcoderHandle ?? null,
    };
  }

  function topicMatchesSearch(topic, query) {
    if (!query) return true;
    const haystack = `${topic.title || ''} ${topic.topicId || ''}`.toLowerCase();
    return haystack.includes(query);
  }

  function topicMatchesProgress(topic, filter) {
    if (!filter || filter === 'all') return true;
    if (filter === 'complete') return Boolean(topic.complete);
    return !topic.complete;
  }

  function topicStatusClass(topic) {
    if (topic.complete) return 'complete';
    if ((topic.solvedCount || 0) > 0) return 'partial';
    return '';
  }

  function topicStatusIcon(topic) {
    if (topic.complete) return '<i class="fa-solid fa-check"></i>';
    if ((topic.solvedCount || 0) > 0) return '<i class="fa-solid fa-circle-half-stroke"></i>';
    if ((topic.totalCount || 0) === 0) return '<i class="fa-solid fa-book"></i>';
    return '<i class="fa-regular fa-circle"></i>';
  }

  function renderProgressBar(percent, maxWidth) {
    const width = Math.min(100, Math.max(0, Number(percent) || 0));
    const style = maxWidth ? `max-width:${safeHtml(maxWidth)};` : '';
    return `<div class="roadmap-progress" style="${style}"><span style="width:${safeHtml(width)}%"></span></div>`;
  }

  function renderTopicItem(topic) {
    const topicId = topic.topicId || '';
    const isActive = selectedTopicId === topicId;
    const countLabel =
      (topic.totalCount || 0) > 0
        ? `${topic.solvedCount || 0}/${topic.totalCount}`
        : 'Study';
    const phase =
      topic.phase != null ? `<span class="cp-topic-chip">Phase ${safeHtml(topic.phase)}</span>` : '';
    const difficulty =
      topic.difficulty != null
        ? `<span class="cp-topic-chip">Lv ${safeHtml(topic.difficulty)}</span>`
        : '';
    return `<button type="button" class="cp-topic-item${isActive ? ' is-active' : ''}" data-topic-id="${safeHtml(topicId)}">
      <span class="cp-topic-status ${topicStatusClass(topic)}">${topicStatusIcon(topic)}</span>
      <span class="cp-topic-main">
        <span class="cp-topic-title">${safeHtml(topic.title || topicId)}</span>
        <span class="cp-topic-meta">${phase}${difficulty}</span>
      </span>
      <span class="cp-topic-count">${safeHtml(countLabel)}</span>
    </button>`;
  }

  function renderRoadmap(data, query) {
    if (!root || !notice) return;
    const categories = Array.isArray(data?.categories) ? data.categories : [];
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const progressValue = progressFilter?.value || 'all';

    if (!openCategories.size && categories[0]?.categoryId) {
      openCategories.add(categories[0].categoryId);
    }

    const html = categories
      .map((category) => {
        const categoryId = category.categoryId || '';
        const subCategories = Array.isArray(category.subCategories)
          ? category.subCategories
          : [];
        const subHtml = subCategories
          .map((sub) => {
            const topics = (sub.topics || []).filter(
              (topic) =>
                topicMatchesSearch(topic, normalizedQuery) &&
                topicMatchesProgress(topic, progressValue),
            );
            if (!topics.length) return '';
            if (normalizedQuery) openCategories.add(categoryId);
            return `<div class="cp-subcategory">
              <h4 class="cp-subcategory-title">${safeHtml(sub.title || sub.subCategoryId)}</h4>
              ${sub.description ? `<p class="cp-subcategory-desc">${safeHtml(sub.description)}</p>` : ''}
              <div class="cp-topic-list">${topics.map(renderTopicItem).join('')}</div>
            </div>`;
          })
          .join('');
        if (!subHtml) return '';
        const isOpen = openCategories.has(categoryId);
        const catPct = category.percent ?? 0;
        return `<section class="cp-category${isOpen ? ' is-open' : ''}" data-category-id="${safeHtml(categoryId)}">
          <button type="button" class="cp-category-header" aria-expanded="${isOpen ? 'true' : 'false'}">
            <span class="cp-category-chevron"><i class="fa-solid fa-chevron-right"></i></span>
            <div class="cp-category-info">
              <h3>${safeHtml(category.title || categoryId)}</h3>
              ${category.description ? `<p class="cp-category-desc">${safeHtml(category.description)}</p>` : ''}
              ${renderProgressBar(catPct, '220px')}
            </div>
            <div class="cp-category-meta">${safeHtml(category.solvedCount || 0)} / ${safeHtml(category.totalCount || 0)} · ${safeHtml(catPct)}%</div>
          </button>
          <div class="cp-category-body">${subHtml}</div>
        </section>`;
      })
      .filter(Boolean)
      .join('');

    if (!html) {
      const message = normalizedQuery || progressValue !== 'all'
        ? 'No roadmap topics match your filters.'
        : 'No roadmap topics are available yet.';
      showNotice(message, 'empty');
      return;
    }

    notice.hidden = true;
    root.hidden = false;
    root.innerHTML = html;
  }

  function renderTopicDetail(topic) {
    if (!topicDetail) return;
    if (!topic) {
      topicDetail.hidden = true;
      topicDetail.innerHTML = '';
      activeTopicDetail = null;
      return;
    }

    activeTopicDetail = topic;
    const resources = Array.isArray(topic.resources) ? topic.resources : [];
    const problems = Array.isArray(topic.problems) ? topic.problems : [];
    const resourceHtml = resources.length
      ? `<div class="cp-detail-section">
          <h3>Resources</h3>
          <div class="cp-resource-list">
            ${resources
              .map(
                (resource) =>
                  `<a class="cp-resource-link" href="${safeHtml(resource.resource_url || '#')}" target="_blank" rel="noopener noreferrer">${safeHtml(resource.resource_title || 'Resource')}</a>`,
              )
              .join('')}
          </div>
        </div>`
      : '';
    const problemRows = problems.length
      ? problems
          .map((problem) => {
            const solved = Boolean(problem.solved);
            const disabled = !token || !problem.problemId || statusToggleBusy;
            return `<tr>
              <td>
                <label class="comp-status-cell comp-status-checkbox-label">
                  <input type="checkbox" class="comp-status-checkbox cp-problem-checkbox" data-problem-id="${safeHtml(problem.problemId)}" ${solved ? 'checked' : ''} ${disabled ? 'disabled' : ''} />
                </label>
              </td>
              <td><a class="cp-problem-link" href="${safeHtml(problem.url || '#')}" target="_blank" rel="noopener noreferrer">${safeHtml(problem.title || problem.problemId)}</a></td>
              <td><span class="cp-platform-badge">${safeHtml(problem.sourcePlatform || '—')}</span></td>
              <td>${problem.difficulty != null ? safeHtml(problem.difficulty) : '—'}</td>
            </tr>`;
          })
          .join('')
      : `<tr><td colspan="4" style="color:var(--text-secondary);">No practice problems for this topic yet.</td></tr>`;

    topicDetail.hidden = false;
    topicDetail.innerHTML = `
      <div class="cp-topic-detail-header">
        <div>
          <h2>${safeHtml(topic.title || topic.topicId)}</h2>
          <p>${safeHtml(topic.solvedCount || 0)} / ${safeHtml(topic.totalCount || 0)} solved · ${safeHtml(topic.percent || 0)}% complete</p>
          ${topic.prerequisites ? `<p>Prerequisites: ${safeHtml(topic.prerequisites)}</p>` : ''}
        </div>
        <div class="cp-topic-detail-actions">
          <button type="button" class="cp-btn-ghost" id="close-topic-detail">Back to roadmap</button>
        </div>
      </div>
      <div class="cp-topic-detail-body">
        ${resourceHtml}
        <div class="cp-detail-section">
          <h3>Practice problems</h3>
          <table class="cp-problems-table">
            <thead>
              <tr>
                <th>Done</th>
                <th>Problem</th>
                <th>Platform</th>
                <th>Difficulty</th>
              </tr>
            </thead>
            <tbody>${problemRows}</tbody>
          </table>
        </div>
      </div>
    `;

    topicDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function openTopic(topicId) {
    if (!competitionsService || !topicId) return;
    selectedTopicId = topicId;
    renderRoadmap(roadmapData, searchInput?.value || '');
    if (topicDetail) {
      topicDetail.hidden = false;
      topicDetail.innerHTML = '<div class="comp-loading" style="padding:1.5rem;">Loading topic...</div>';
    }
    try {
      const topic = await competitionsService.getCpRoadmapTopic(topicId);
      renderTopicDetail(topic);
    } catch (error) {
      selectedTopicId = null;
      renderRoadmap(roadmapData, searchInput?.value || '');
      if (topicDetail) {
        topicDetail.hidden = false;
        topicDetail.innerHTML = `
          <div class="cp-topic-detail-body">
            <div class="comp-error">${safeHtml(error?.message || 'Failed to load topic details.')}</div>
            <button type="button" class="cp-btn-ghost" id="close-topic-detail" style="margin-top:0.75rem;">Back to roadmap</button>
          </div>`;
      }
    }
  }

  function closeTopicDetail() {
    selectedTopicId = null;
    renderTopicDetail(null);
    renderRoadmap(roadmapData, searchInput?.value || '');
  }

  async function handleProblemToggle(checkbox) {
    if (!competitionsService || !token || !checkbox?.dataset?.problemId) return;
    const problemId = checkbox.dataset.problemId;
    const nextSolved = checkbox.checked;
    const previousSolved = !nextSolved;

    statusToggleBusy = true;
    if (activeTopicDetail?.problems) {
      const entry = activeTopicDetail.problems.find((p) => p.problemId === problemId);
      if (entry) entry.solved = nextSolved;
      renderTopicDetail(activeTopicDetail);
    }

    try {
      await competitionsService.setCpRoadmapProblemSolved(problemId, nextSolved);
      const [roadmap, progress] = await Promise.all([
        competitionsService.getRoadmap(),
        competitionsService.getProgress().catch(() => ({})),
      ]);
      roadmapData = mergeRoadmapData(roadmap, progress);
      renderStats(roadmapData);
      renderRoadmap(roadmapData, searchInput?.value || '');
      if (selectedTopicId) {
        const topic = await competitionsService.getCpRoadmapTopic(selectedTopicId);
        renderTopicDetail(topic);
      }
    } catch (error) {
      checkbox.checked = previousSolved;
      if (activeTopicDetail?.problems) {
        const entry = activeTopicDetail.problems.find((p) => p.problemId === problemId);
        if (entry) entry.solved = previousSolved;
        renderTopicDetail(activeTopicDetail);
      }
      showNotice(error?.message || 'Could not update problem status.', 'error');
      if (roadmapData) {
        notice.hidden = true;
        if (root) root.hidden = false;
      }
    } finally {
      statusToggleBusy = false;
      if (activeTopicDetail) renderTopicDetail(activeTopicDetail);
    }
  }

  async function loadData() {
    if (!competitionsService) {
      showNotice('Competitions service unavailable.', 'error');
      return;
    }
    showNotice('Loading CP roadmap...', 'loading');
    closeTopicDetail();
    try {
      const [roadmap, progress] = await Promise.all([
        competitionsService.getRoadmap(),
        competitionsService.getProgress().catch(() => ({})),
      ]);
      roadmapData = mergeRoadmapData(roadmap, progress);
      renderStats(roadmapData);
      renderRoadmap(roadmapData, searchInput?.value || '');
    } catch (error) {
      console.error('[CP Roadmap] load failed:', error);
      showNotice(error?.message || 'Failed to load CP roadmap.', 'error');
    }
  }

  root?.addEventListener('click', (event) => {
    const categoryHeader = event.target.closest('.cp-category-header');
    if (categoryHeader) {
      const section = categoryHeader.closest('.cp-category');
      const categoryId = section?.dataset?.categoryId;
      if (!categoryId) return;
      if (openCategories.has(categoryId)) openCategories.delete(categoryId);
      else openCategories.add(categoryId);
      renderRoadmap(roadmapData, searchInput?.value || '');
      return;
    }

    const topicButton = event.target.closest('.cp-topic-item');
    if (topicButton?.dataset?.topicId) {
      void openTopic(topicButton.dataset.topicId);
    }
  });

  topicDetail?.addEventListener('click', (event) => {
    if (event.target.closest('#close-topic-detail')) {
      closeTopicDetail();
    }
  });

  topicDetail?.addEventListener('change', (event) => {
    const target = event.target;
    if (!target?.classList?.contains('cp-problem-checkbox')) return;
    void handleProblemToggle(target);
  });

  searchInput?.addEventListener('input', () => {
    if (roadmapData) renderRoadmap(roadmapData, searchInput.value || '');
  });

  progressFilter?.addEventListener('change', () => {
    if (roadmapData) renderRoadmap(roadmapData, searchInput?.value || '');
  });

  document.getElementById('themeBtn')?.addEventListener('click', () => {
    const rootEl = document.documentElement;
    const next = rootEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    rootEl.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  void loadData();
});
