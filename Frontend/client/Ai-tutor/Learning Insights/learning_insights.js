window.NibrasReact.run(() => {
  // --- 1. SIDEBAR LOGIC ---
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      navLinks.forEach((n) => n.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // --- 2. INSIGHTS DATA ---
  const insightsData = {
    stats: [
      { label: 'Total questions', val: '25', sub: 'across all topics' },
      { label: 'Streak', val: '7 days', sub: 'keep it up' },
      { label: 'Topics covered', val: '5', sub: 'out of 24 tracks' },
    ],
    strengths: [
      { label: 'Algorithms', pct: 90, color: '#4ade80', cls: 'pct-green' },
      { label: 'Data Structures', pct: 80, color: '#4ade80', cls: 'pct-green' },
      {
        label: 'Operating Systems',
        pct: 70,
        color: '#4ade80',
        cls: 'pct-green',
      },
      { label: 'Security', pct: 60, color: '#facc15', cls: 'pct-yellow' },
      {
        label: 'Machine Learning',
        pct: 50,
        color: '#facc15',
        cls: 'pct-yellow',
      },
    ],
    weaknesses: [
      { label: 'Networking', pct: 20, color: '#f87171', cls: 'pct-red' },
      { label: 'Databases', pct: 20, color: '#f87171', cls: 'pct-red' },
      {
        label: 'Software Engineering',
        pct: 30,
        color: '#f87171',
        cls: 'pct-red',
      },
      { label: 'Web Development', pct: 30, color: '#f87171', cls: 'pct-red' },
      {
        label: 'Theory of Computation',
        pct: 40,
        color: '#facc15',
        cls: 'pct-yellow',
      },
    ],
    actions: [
      {
        num: 1,
        text: 'Explore foundational concepts in networking to strengthen understanding of system communications.',
      },
      {
        num: 2,
        text: 'Engage with database management topics to enhance data handling skills.',
      },
      {
        num: 3,
        text: 'Practice software engineering principles through project-based learning.',
      },
    ],
    assessment:
      'The student shows strong engagement in algorithms and data structures, indicating a solid foundation in core computer science concepts. However, there are notable gaps in networking and databases that should be addressed to ensure a well-rounded skill set.',
  };

  // --- 3. RENDER UI ---

  // Stats cards
  const statsContainer = document.getElementById('stats-container');
  statsContainer.innerHTML = '';
  insightsData.stats.forEach((stat) => {
    statsContainer.innerHTML += `
            <div class="stat-card">
                <div class="stat-label">${stat.label}</div>
                <div class="stat-val">${stat.val}</div>
                <div class="stat-sub">${stat.sub}</div>
            </div>
        `;
  });

  // Strengths
  const strContainer = document.getElementById('strength-container');
  const strTitle = strContainer.querySelector('.insights-card-title');
  strContainer.innerHTML = '';
  strContainer.appendChild(strTitle);
  insightsData.strengths.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
            <div class="bar-top">
                <span class="bar-name">${item.label}</span>
                <span class="bar-pct ${item.cls}">${item.pct}%</span>
            </div>
            <div class="bar-track">
                <div class="bar-fill" style="width:${item.pct}%;background:${item.color}"></div>
            </div>
        `;
    strContainer.appendChild(row);
  });

  // Weaknesses
  const weakContainer = document.getElementById('weakness-container');
  const weakTitle = weakContainer.querySelector('.insights-card-title');
  weakContainer.innerHTML = '';
  weakContainer.appendChild(weakTitle);
  insightsData.weaknesses.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
            <div class="bar-top">
                <span class="bar-name">${item.label}</span>
                <span class="bar-pct ${item.cls}">${item.pct}%</span>
            </div>
            <div class="bar-track">
                <div class="bar-fill" style="width:${item.pct}%;background:${item.color}"></div>
            </div>
        `;
    weakContainer.appendChild(row);
  });

  // Next actions
  const actionsContainer = document.getElementById('actions-container');
  const actionsTitle = actionsContainer.querySelector('.insights-card-title');
  actionsContainer.innerHTML = '';
  actionsContainer.appendChild(actionsTitle);
  insightsData.actions.forEach((item) => {
    actionsContainer.innerHTML += `
            <div class="action-row">
                <div class="action-num">${item.num}</div>
                <div class="action-text">${item.text}</div>
            </div>
        `;
  });

  // Overall assessment
  const assessContainer = document.getElementById('assessment-container');
  const assessTitle = assessContainer.querySelector('.insights-card-title');
  assessContainer.innerHTML = '';
  assessContainer.appendChild(assessTitle);
  assessContainer.innerHTML += `
        <div class="assessment-text">${insightsData.assessment}</div>
    `;

  // --- 4. THEME TOGGLE & LOGO SWAP ---
  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn ? themeBtn.querySelector('i') : null;
  const appLogo = document.getElementById('app-logo');

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  if (currentTheme === 'dark') {
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
    if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      themeBtn.classList.remove('rotating');
      void themeBtn.offsetWidth;
      themeBtn.classList.add('rotating');
      setTimeout(() => themeBtn.classList.remove('rotating'), 400);
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const newTheme = current === 'light' ? 'dark' : 'light';

      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);

      if (themeIcon) {
        themeIcon.className =
          newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      }
      if (appLogo) {
        appLogo.src =
          newTheme === 'dark'
            ? '/Assets/images/logo-dark.png'
            : '/Assets/images/logo-light.png';
      }
    });
  }

  // --- 5. TAB LOGIC ---
  const aiTabs = document.querySelectorAll('.ai-tab');
  aiTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      aiTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
});
