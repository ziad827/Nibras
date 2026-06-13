window.NibrasReact.run(() => {
  const selectedCourse = window.NibrasCourses?.getSelectedCourse?.();
  if (!selectedCourse) return;
  const courseId = selectedCourse.id;

  // --- 1. SIDEBAR LOGIC ---
  const sidebarNavLinks = document.querySelectorAll('.nav-link');
  sidebarNavLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      sidebarNavLinks.forEach((n) => n.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // --- 2. THEME TOGGLE ---
  // Ensure theme is set on page load
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn ? themeBtn.querySelector('i') : null;
  const themeText = themeBtn ? themeBtn.querySelector('span') : null;
  const appLogo = document.getElementById('app-logo');

  function updateThemeBtn(theme) {
    if (!themeIcon || !themeText) return;
    if (theme === 'dark') {
      themeIcon.className = 'fa-solid fa-sun';
      themeText.textContent = 'Light Mode';
    } else {
      themeIcon.className = 'fa-solid fa-moon';
      themeText.textContent = 'Dark Mode';
    }
  }

  function updateLogo(theme) {
    if (!appLogo) return;
    appLogo.src =
      theme === 'dark'
        ? '/Assets/images/logo-dark.png'
        : '/Assets/images/logo-light.png';
  }

  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeBtn(currentTheme);
  updateLogo(currentTheme);

  if (themeBtn) {
    themeBtn.classList.remove('rotating');
    void themeBtn.offsetWidth;
    themeBtn.addEventListener('click', () => {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const newTheme = current === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeBtn(newTheme);
      updateLogo(newTheme);
      themeBtn.classList.add('rotating');
      setTimeout(() => {
        themeBtn.classList.remove('rotating');
      }, 500);
    });
  }

  const gradesData = selectedCourse.grades;

  // Update data-nav-link elements
  const navLinks = [
    { key: 'courseContent', path: '../Course Description/courseContent.html' },
    { key: 'videos', path: '../Videos/videos.html' },
    { key: 'assignments', path: '../Assignments/Assignments.html' },

    { key: 'grades', path: './grades.html' },
  ];

  navLinks.forEach(({ key, path }) => {
    const el = document.querySelector(`[data-nav-link="${key}"]`);
    if (el)
      el.setAttribute(
        'href',
        window.NibrasCourses.withCourseId(path, courseId),
      );
  });

  // Also update back button
  const backBtn = document.querySelector('.back-btn');
  if (backBtn)
    backBtn.setAttribute(
      'href',
      window.NibrasCourses.withCourseId('../courses.html', courseId),
    );

  const headerSub = document.querySelector('.header-text p');
  const metaTitle = document.querySelector('.course-meta h4');
  const metaSubtitle = document.querySelector('.course-meta span');
  if (headerSub)
    headerSub.textContent = `${selectedCourse.code}: ${selectedCourse.title} • ${selectedCourse.overview.term}`;
  if (metaTitle)
    metaTitle.textContent = `${selectedCourse.code}: ${selectedCourse.title}`;
  if (metaSubtitle)
    metaSubtitle.textContent = `${selectedCourse.overview.term} • Week ${selectedCourse.overview.currentWeek}`;

  // --- 4. RENDER UI ---
  renderUI(gradesData);

  function renderUI(data) {
    // A. Stats Overview
    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = '';
    data.stats.forEach((stat) => {
      const isPrimary = stat.type === 'primary' ? 'primary-blue' : '';
      const textColor =
        stat.color === 'red'
          ? 'style="color: #ef4444;"'
          : stat.color === 'green'
            ? 'style="color: #10b981;"'
            : '';
      const extraHtml = stat.extra
        ? `<span class="grade-f">${stat.extra}</span>`
        : '';

      statsContainer.innerHTML += `
                <div class="stat-box ${isPrimary}">
                    <div class="stat-label"><i class="${stat.icon}"></i> ${stat.label}</div>
                    <div class="stat-value" ${textColor}>${stat.value} ${extraHtml}</div>
                    <div class="stat-sub">${stat.sub}</div>
                </div>
            `;
    });

    // B. Grade Breakdown
    const bdContainer = document.getElementById('breakdown-container');
    bdContainer.innerHTML = '';
    data.breakdown.forEach((item) => {
      bdContainer.innerHTML += `
                <div class="bd-item">
                    <div class="bd-header">
                        <div>
                            <div class="bd-title">${item.category}</div>
                            <div class="bd-sub">${item.score} points • ${item.weight}</div>
                        </div>
                        <div style="text-align:right;">
                            <div class="bd-percent">${item.percent}</div>
                            <div class="bd-sub">${item.change}</div>
                        </div>
                    </div>
                    <div class="bd-bar-track">
                        <div class="bd-bar-fill" style="width: ${parseFloat(item.percent)}%; background-color: ${item.color};"></div>
                    </div>
                </div>
            `;
    });

    // C. All Grades List
    const gradesContainer = document.getElementById('grades-list-container');
    gradesContainer.innerHTML = '';
    data.grades.forEach((grade) => {
      let scoreHtml = '';
      let statusHtml = '';
      let viewHtml = '';

      if (grade.status === 'Pending') {
        scoreHtml = `<div class="g-points" style="font-size: 0.9rem; color: var(--text-secondary);"><i class="fa-regular fa-clock"></i> Pending</div>`;
      } else {
        scoreHtml = `
                    <span class="g-points">${grade.score}</span>
                    <span class="g-pct" style="color: ${parseFloat(grade.percent) < 60 ? 'var(--grade-f)' : 'var(--grade-a)'};">${grade.percent}</span>
                `;

        let badgeClass = 'g-status';
        if (grade.status === 'Late Submission') badgeClass += ' status-late';

        statusHtml = `<span class="${badgeClass}">${grade.status === 'Late Submission' ? 'Late Submission' : 'Graded'}</span>`;
        viewHtml = `<a class="view-link">View Details</a>`;
      }

      gradesContainer.innerHTML += `
                <div class="grade-row">
                    <div class="g-info">
                        <h4>${grade.title}</h4>
                        <span class="g-meta">${grade.type} • ${grade.date}</span>
                        <div style="margin-top:0.5rem;">${statusHtml}</div>
                    </div>
                    <div class="g-score">
                        ${scoreHtml}
                        ${viewHtml}
                    </div>
                </div>
            `;
    });

    // D. Scale
    const scaleContainer = document.getElementById('scale-container');
    scaleContainer.innerHTML = '';
    data.scale.forEach((s) => {
      // Map color code to CSS variable manually for simplicity
      let bgVar = `var(--scale-${s.color}-bg)`;
      let textVar = `var(--scale-${s.color}-text)`;

      scaleContainer.innerHTML += `
                <div class="scale-row">
                    <div class="scale-badge" style="background-color: ${bgVar}; color: ${textVar};">${s.grade}</div>
                    <span>${s.range}</span>
                </div>
            `;
    });

    // E. Weights
    const wContainer = document.getElementById('weights-container');
    wContainer.innerHTML = '';
    data.weights.forEach((w) => {
      wContainer.innerHTML += `
                <div class="info-row">
                    <span>${w.cat}</span>
                    <span>${w.pct}</span>
                </div>
            `;
    });
  }
});
