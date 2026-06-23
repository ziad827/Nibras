window.NibrasReact.run(() => {
  const esc = (str) => {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  };

  const container = document.getElementById('routing-list-container');
  const goalInput = document.getElementById('routing-goal-input');
  const generateBtn = document.getElementById('generate-plan-btn');
  const statusEl = document.getElementById('routing-status');
  const summaryEl = document.getElementById('routing-summary');

  const setStatus = (text, isError) => {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.style.color = isError ? '#ef4444' : 'var(--text-secondary)';
  };

  const renderSteps = (data) => {
    if (!container) return;
    const steps = Array.isArray(data?.steps) ? data.steps : [];
    if (!steps.length) {
      container.innerHTML =
        '<p style="color:var(--text-secondary);">No steps returned. Try a more specific goal.</p>';
      return;
    }
    container.innerHTML = '';
    steps.forEach((step, idx) => {
      const ready = step.ready !== false;
      const mins = step.estimatedMinutes ? `${step.estimatedMinutes} min` : '';
      const topics = Array.isArray(step.topics) ? step.topics : [];
      const course =
        step.matchedCourseTitle || step.catalogCourseId
          ? `<span class="route-tag">${esc(step.matchedCourseTitle || 'Matched course')}</span>`
          : '';
      container.innerHTML += `
        <div class="route-card">
          <div class="route-header">
            <h4><span style="color:var(--accent-blue);margin-right:8px;">${idx + 1}.</span>${esc(step.title || 'Step')}</h4>
          </div>
          <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.5;margin:8px 0;">${esc(step.description || '')}</p>
          <div class="route-meta">
            <span class="route-pill" style="background:${ready ? 'rgba(16,185,129,0.15)' : 'rgba(156,163,175,0.2)'};color:${ready ? '#10b981' : 'var(--text-secondary)'};">
              ${ready ? 'Ready now' : 'Prerequisites needed'}
            </span>
            ${mins ? `<span class="route-tag">${esc(mins)}</span>` : ''}
            ${course}
          </div>
          ${
            topics.length
              ? `<div class="route-stats" style="margin-top:8px;flex-wrap:wrap;gap:6px;">${topics.map((t) => `<span class="route-tag">${esc(t)}</span>`).join('')}</div>`
              : ''
          }
        </div>`;
    });
  };

  const generatePlan = async () => {
    const goal = goalInput?.value?.trim() || '';
    if (!goal) {
      setStatus('Please enter a learning goal.', true);
      return;
    }
    const svc = window.NibrasServices?.chatbotService;
    if (!svc?.getRouting) {
      setStatus('Routing service unavailable.', true);
      return;
    }

    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
    }
    setStatus('Building your study plan...');
    if (summaryEl) summaryEl.style.display = 'none';
    if (container) {
      container.innerHTML =
        '<div class="skeleton-container" aria-hidden="true"><div class="skeleton-row"><div class="skeleton-line skeleton"></div></div></div>';
    }

    try {
      const data = await svc.getRouting(goal);
      if (summaryEl && data?.summary) {
        summaryEl.textContent = data.summary;
        summaryEl.style.display = 'block';
      }
      renderSteps(data);
      setStatus(`Plan ready — ${(data?.steps || []).length} steps.`);
    } catch (err) {
      if (container) {
        container.innerHTML = `<p style="color:#ef4444;">${esc(err?.message || 'Failed to generate plan.')}</p>`;
      }
      setStatus(err?.message || 'Failed to generate plan.', true);
    } finally {
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML =
          '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate plan';
      }
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

  generateBtn?.addEventListener('click', generatePlan);
  goalInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      generatePlan();
    }
  });
});
