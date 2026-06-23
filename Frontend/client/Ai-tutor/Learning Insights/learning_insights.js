window.NibrasReact.run(() => {
  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const statsContainer = document.getElementById('stats-container');
  const strContainer = document.getElementById('strength-container');
  const weakContainer = document.getElementById('weakness-container');
  const actionsContainer = document.getElementById('actions-container');
  const assessContainer = document.getElementById('assessment-container');

  const pctClass = (pct) => {
    if (pct >= 70) return { cls: 'pct-green', color: '#4ade80' };
    if (pct >= 40) return { cls: 'pct-yellow', color: '#facc15' };
    return { cls: 'pct-red', color: '#f87171' };
  };

  const tagToPct = (count, maxCount) => {
    if (!maxCount) return 0;
    return Math.round((count / maxCount) * 100);
  };

  const renderBarRows = (container, titleText, items) => {
    if (!container) return;
    const title = container.querySelector('.insights-card-title');
    container.innerHTML = '';
    if (title) container.appendChild(title);
    if (!items.length) {
      container.innerHTML += `<p style="color:var(--text-secondary);font-size:0.9rem;padding:8px 0;">No data yet.</p>`;
      return;
    }
    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML = `
        <div class="bar-top">
          <span class="bar-name">${escapeHtml(item.label)}</span>
          <span class="bar-pct ${item.cls}">${item.pct}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${item.pct}%;background:${item.color}"></div>
        </div>`;
      container.appendChild(row);
    });
  };

  const renderInsights = (payload) => {
    const metrics = payload?.hardMetrics || {};
    const summary = payload?.aiSummary || {};
    const topTags = Array.isArray(metrics.topTags) ? metrics.topTags : [];
    const maxCount = topTags.reduce((m, t) => Math.max(m, t.count || 0), 0);

    if (statsContainer) {
      const total = Number(metrics.totalQuestions) || 0;
      const streak = Number(metrics.streakDays) || 0;
      const topics = topTags.length;
      statsContainer.innerHTML = '';
      [
        { label: 'Total questions', val: String(total), sub: 'across all topics' },
        { label: 'Streak', val: `${streak} days`, sub: streak > 0 ? 'keep it up' : 'ask to start' },
        { label: 'Topics covered', val: String(topics), sub: 'from tutor tags' },
      ].forEach((stat) => {
        statsContainer.innerHTML += `
          <div class="stat-card">
            <div class="stat-label">${escapeHtml(stat.label)}</div>
            <div class="stat-val">${escapeHtml(stat.val)}</div>
            <div class="stat-sub">${escapeHtml(stat.sub)}</div>
          </div>`;
      });
    }

    const strengthLabels = Array.isArray(summary.strengths)
      ? summary.strengths
      : topTags.slice(0, 5).map((t) => t.tag);
    const weaknessLabels = Array.isArray(summary.weaknesses) ? summary.weaknesses : [];

    const strengths = strengthLabels.map((label, i) => {
      const tag = topTags.find((t) => t.tag === label);
      const count = tag?.count || topTags[i]?.count || 1;
      const pct = tagToPct(count, maxCount) || 80 - i * 10;
      const style = pctClass(pct);
      return { label, pct, ...style };
    });

    const weaknesses = weaknessLabels.map((label, i) => {
      const pct = Math.max(15, 45 - i * 8);
      const style = pctClass(pct);
      return { label, pct, ...style };
    });

    renderBarRows(strContainer, 'Strengths', strengths);
    renderBarRows(weakContainer, 'Weaknesses — gaps', weaknesses);

    if (actionsContainer) {
      const actionsTitle = actionsContainer.querySelector('.insights-card-title');
      actionsContainer.innerHTML = '';
      if (actionsTitle) actionsContainer.appendChild(actionsTitle);
      const actions = Array.isArray(summary.nextActions) ? summary.nextActions : [];
      if (!actions.length) {
        actionsContainer.innerHTML +=
          '<p style="color:var(--text-secondary);font-size:0.9rem;">Ask the AI Tutor to build your learning profile.</p>';
      } else {
        actions.forEach((text, idx) => {
          actionsContainer.innerHTML += `
            <div class="action-row">
              <div class="action-num">${idx + 1}</div>
              <div class="action-text">${escapeHtml(text)}</div>
            </div>`;
        });
      }
    }

    if (assessContainer) {
      const assessTitle = assessContainer.querySelector('.insights-card-title');
      assessContainer.innerHTML = '';
      if (assessTitle) assessContainer.appendChild(assessTitle);
      assessContainer.innerHTML += `
        <div class="assessment-text">${escapeHtml(
          summary.overallAssessment ||
            'Not enough data yet. Keep asking questions in the AI Tutor!',
        )}</div>`;
    }
  };

  const renderError = (message) => {
    if (statsContainer) {
      statsContainer.innerHTML = `<p style="color:#ef4444;padding:12px;">${escapeHtml(message)}</p>`;
    }
  };

  const loadInsights = async () => {
    const svc = window.NibrasServices?.chatbotService;
    if (!svc?.getInsights) {
      renderError('Insights service unavailable.');
      return;
    }
    try {
      const payload = await svc.getInsights();
      renderInsights(payload);
    } catch (err) {
      renderError(err?.message || 'Failed to load insights.');
    }
  };

  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.nav-link').forEach((n) => n.classList.remove('active'));
      link.classList.add('active');
    });
  });

  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn?.querySelector('i');
  const appLogo = document.getElementById('app-logo');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  if (currentTheme === 'dark') {
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
    if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  }
  themeBtn?.addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    if (themeIcon) {
      themeIcon.className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
    if (appLogo) {
      appLogo.src =
        next === 'dark'
          ? '/Assets/images/logo-dark.png'
          : '/Assets/images/logo-light.png';
    }
  });

  document.querySelectorAll('.ai-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ai-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  loadInsights();
});
