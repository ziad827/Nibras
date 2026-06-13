var portfolioState = {
  projects: [],
  filteredProjects: [],
  searchTerm: '',
  statusFilter: 'all',
};

function updateSidebarUser() {
  try {
    var u = JSON.parse(localStorage.getItem('user'));
    if (!u || !u.name) return;
    var nameEl = document.querySelector('.user-info h4');
    if (nameEl) nameEl.textContent = u.name;
    var roleEl = document.querySelector('.user-info span');
    if (roleEl) {
      var r = u.role;
      roleEl.textContent =
        typeof r === 'object' && r
          ? r.name || r.title || 'student'
          : r || 'student';
    }
    var avatarEl = document.querySelector('.avatar-circle');
    if (avatarEl) {
      var initials = u.name
        .split(' ')
        .map(function (n) {
          return n.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2);
      avatarEl.textContent = initials || 'U';
    }
    var smallAvatar = document.querySelector('.profile-circle-small');
    if (smallAvatar) smallAvatar.textContent = initials || 'U';
    var largeAvatar = document.getElementById('portfolio-avatar');
    if (largeAvatar) largeAvatar.textContent = initials || 'U';
    var nameHeader = document.getElementById('portfolio-user-name');
    if (nameHeader) nameHeader.textContent = u.name + "'s Portfolio";
    var role = typeof r === 'object' && r ? r.name || r.title : r || '';
    var bioEl = document.getElementById('portfolio-user-bio');
    if (bioEl)
      bioEl.textContent = role
        ? role + ' — Completed projects and contributions'
        : 'Completed projects and contributions';
  } catch (_) {}
}

function setNotice(msg, type) {
  var el = document.getElementById('portfolio-notice');
  if (!el) return;
  el.style.display = msg ? '' : 'none';
  el.textContent = msg || '';
  if (type === 'error') el.style.color = '#ef4444';
  else el.style.color = '';
}

window.NibrasReact.run(function () {
  updateSidebarUser();
  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    var htmlEl = document.documentElement;
    var themeIcon = themeToggle.querySelector('i');
    var saved = localStorage.getItem('theme') || 'light';
    htmlEl.setAttribute('data-theme', saved);
    themeIcon.className = saved === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    themeToggle.addEventListener('click', function () {
      var cur = htmlEl.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      htmlEl.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      themeIcon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      var logo = document.querySelector('.sidebar-logo');
      if (logo)
        logo.src =
          next === 'dark'
            ? '../Assets/images/logo-dark.png'
            : '../Assets/images/logo-light.png';
    });
  }
  loadPortfolio();
  setupPortfolioFilters();
});

function loadPortfolio() {
  var grid = document.getElementById('portfolio-grid');
  grid.innerHTML =
    '<div class="portfolio-loading"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:1.5rem;display:block;margin-bottom:12px;"></i>Loading portfolio...</div>';

  var svc = window.NibrasServices;
  var userId = null;
  try {
    var u = JSON.parse(localStorage.getItem('user') || '{}');
    if (u._id) userId = u._id;
  } catch (_) {}

  // Try backend API first
  var fetchPromise;
  if (svc && svc.projectService && userId) {
    fetchPromise = svc.projectService
      .listByInstructor({ userId: userId, limit: 100 })
      .catch(function () {
        return fetchLocalPortfolio();
      });
  } else {
    fetchPromise = fetchLocalPortfolio();
  }

  fetchPromise
    .then(function (projects) {
      portfolioState.projects = Array.isArray(projects) ? projects : [];
      applyFilters();
    })
    .catch(function () {
      fetchLocalPortfolio().then(function (projects) {
        portfolioState.projects = projects;
        applyFilters();
      });
    });
}

function fetchLocalPortfolio() {
  return new Promise(function (resolve) {
    // Gather projects from localStorage and demo data
    var projects = [];

    // From localStorage saved project progress
    try {
      var saved = localStorage.getItem('portfolioProjects');
      if (saved) {
        var parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) projects = projects.concat(parsed);
      }
    } catch (_) {}

    // Generate demo portfolio projects if empty
    if (!projects.length) {
      projects = generateDemoPortfolio();
    }

    resolve(projects);
  });
}

function generateDemoPortfolio() {
  var now = Date.now();
  return [
    {
      id: 'demo-1',
      title: 'E-Commerce Platform',
      courseName: 'CS301: Web Development',
      description:
        'Built a full-stack e-commerce platform with React, Node.js, and PostgreSQL. Features include user authentication, product catalog, shopping cart, and payment integration with Stripe.',
      status: 'completed',
      grade: '92',
      techStack: ['React', 'Node.js', 'PostgreSQL', 'Stripe', 'Docker'],
      teamSize: 3,
      teamMembers: ['Sarah Johnson', 'Michael Chen'],
      githubUrl: 'https://github.com/nibras/ecommerce-platform',
      liveUrl: 'https://ecommerce-demo.nibras.app',
      startDate: new Date(now - 120 * 86400000).toISOString(),
      completedDate: new Date(now - 10 * 86400000).toISOString(),
    },
    {
      id: 'demo-2',
      title: 'Data Analysis Dashboard',
      courseName: 'CS401: Data Science',
      description:
        'Created an interactive data visualization dashboard using Python, Pandas, and D3.js. Analyzed 100K+ records to uncover trends in educational outcomes.',
      status: 'completed',
      grade: '88',
      techStack: ['Python', 'Pandas', 'D3.js', 'Flask', 'MongoDB'],
      teamSize: 2,
      teamMembers: ['Laila Mostafa'],
      githubUrl: 'https://github.com/nibras/data-dashboard',
      startDate: new Date(now - 90 * 86400000).toISOString(),
      completedDate: new Date(now - 5 * 86400000).toISOString(),
    },
    {
      id: 'demo-3',
      title: 'Mobile Task Manager',
      courseName: 'CS350: Mobile Development',
      description:
        'Developed a cross-platform mobile task management application with real-time sync, push notifications, and team collaboration features.',
      status: 'completed',
      grade: '95',
      techStack: ['React Native', 'Firebase', 'TypeScript'],
      teamSize: 1,
      teamMembers: [],
      githubUrl: 'https://github.com/nibras/task-manager',
      startDate: new Date(now - 60 * 86400000).toISOString(),
      completedDate: new Date(now - 2 * 86400000).toISOString(),
    },
    {
      id: 'demo-4',
      title: 'AI Chatbot Integration',
      courseName: 'CS450: Artificial Intelligence',
      description:
        'Integrated GPT-based chatbot into an existing web application with context-aware responses, sentiment analysis, and learning analytics tracking.',
      status: 'in_progress',
      techStack: ['Python', 'OpenAI API', 'FastAPI', 'React', 'Redis'],
      teamSize: 2,
      teamMembers: ['Omar Abdelrahman'],
      githubUrl: 'https://github.com/nibras/ai-chatbot',
      startDate: new Date(now - 30 * 86400000).toISOString(),
      completedDate: null,
    },
  ];
}

function setupPortfolioFilters() {
  var searchInput = document.getElementById('portfolio-search');
  var statusSelect = document.getElementById('portfolio-filter-status');

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      portfolioState.searchTerm = this.value.toLowerCase();
      applyFilters();
    });
  }
  if (statusSelect) {
    statusSelect.addEventListener('change', function () {
      portfolioState.statusFilter = this.value;
      applyFilters();
    });
  }
}

function applyFilters() {
  var filtered = portfolioState.projects.filter(function (p) {
    var matchesSearch =
      !portfolioState.searchTerm ||
      (p.title && p.title.toLowerCase().includes(portfolioState.searchTerm)) ||
      (p.description &&
        p.description.toLowerCase().includes(portfolioState.searchTerm)) ||
      (p.courseName &&
        p.courseName.toLowerCase().includes(portfolioState.searchTerm)) ||
      (p.techStack &&
        p.techStack.some(function (t) {
          return t.toLowerCase().includes(portfolioState.searchTerm);
        }));
    var matchesStatus =
      portfolioState.statusFilter === 'all' ||
      p.status === portfolioState.statusFilter;
    return matchesSearch && matchesStatus;
  });

  portfolioState.filteredProjects = filtered;
  renderPortfolioGrid(filtered);
}

function renderPortfolioGrid(projects) {
  var grid = document.getElementById('portfolio-grid');
  var empty = document.getElementById('portfolio-empty');

  if (!projects || !projects.length) {
    grid.innerHTML = '';
    empty.style.display = '';
    return;
  }

  empty.style.display = 'none';

  // Update stats
  var total = portfolioState.projects.length;
  var completed = portfolioState.projects.filter(function (p) {
    return p.status === 'completed';
  }).length;
  var grades = portfolioState.projects
    .filter(function (p) {
      return p.grade;
    })
    .map(function (p) {
      return parseFloat(p.grade);
    });
  var avgGrade = grades.length
    ? Math.round(
        grades.reduce(function (a, b) {
          return a + b;
        }, 0) / grades.length,
      )
    : '--';

  document.getElementById('stat-projects').textContent = total;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-grades').textContent =
    avgGrade + (avgGrade !== '--' ? '%' : '');

  grid.innerHTML = projects
    .map(function (p) {
      var techTags = (p.techStack || [])
        .map(function (t) {
          return '<span class="tech-tag">' + escapeHtml(t) + '</span>';
        })
        .join('');
      var statusClass =
        p.status === 'completed' ? 'status-completed' : 'status-in_progress';
      var statusLabel = p.status === 'completed' ? 'Completed' : 'In Progress';
      var gradeDisplay = p.grade
        ? '<span class="portfolio-card-grade">' +
          escapeHtml(p.grade) +
          '%</span>'
        : '';
      var dateDisplay = p.completedDate
        ? formatDate(p.completedDate)
        : p.startDate
          ? 'Started ' + formatDate(p.startDate)
          : '';

      return (
        '<div class="portfolio-card" data-id="' +
        escapeHtml(p.id) +
        '" onclick="openPortfolioDetail(\'' +
        escapeHtml(p.id) +
        '\')">' +
        '<div class="portfolio-card-header">' +
        '<span class="portfolio-card-title">' +
        escapeHtml(p.title) +
        '</span>' +
        '<span class="portfolio-card-status ' +
        statusClass +
        '">' +
        statusLabel +
        '</span>' +
        '</div>' +
        '<div class="portfolio-card-course">' +
        escapeHtml(p.courseName || '') +
        '</div>' +
        '<div class="portfolio-card-desc">' +
        escapeHtml(p.description || '') +
        '</div>' +
        (techTags
          ? '<div class="portfolio-card-tech">' + techTags + '</div>'
          : '') +
        '<div class="portfolio-card-footer">' +
        '<span>' +
        gradeDisplay +
        '</span>' +
        '<span class="portfolio-card-date">' +
        dateDisplay +
        '</span>' +
        '</div></div>'
      );
    })
    .join('');
}

function openPortfolioDetail(projectId) {
  var project = portfolioState.filteredProjects.find(function (p) {
    return p.id === projectId;
  });
  if (!project) return;

  var modal = document.getElementById('portfolioDetailModal');
  if (!modal) return;

  document.getElementById('portfolio-detail-loading').style.display = '';
  document.getElementById('portfolio-detail-content').style.display = 'none';

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  document.getElementById('portfolio-detail-title').textContent =
    project.title || 'Project Details';

  // Description
  document.getElementById('portfolio-detail-description').innerHTML =
    '<h4>Description</h4><p>' +
    escapeHtml(project.description || 'No description available.') +
    '</p>';

  // Meta
  var metaHtml = '<h4>Details</h4>';
  if (project.courseName)
    metaHtml +=
      '<div class="detail-value"><i class="fa-solid fa-book-open"></i> ' +
      escapeHtml(project.courseName) +
      '</div>';
  if (project.grade)
    metaHtml +=
      '<div class="detail-value"><i class="fa-solid fa-star"></i> Grade: ' +
      escapeHtml(project.grade) +
      '%</div>';
  if (project.teamSize)
    metaHtml +=
      '<div class="detail-value"><i class="fa-solid fa-users"></i> Team size: ' +
      project.teamSize +
      '</div>';
  if (project.completedDate)
    metaHtml +=
      '<div class="detail-value"><i class="fa-regular fa-calendar-check"></i> Completed: ' +
      formatDate(project.completedDate) +
      '</div>';
  else if (project.startDate)
    metaHtml +=
      '<div class="detail-value"><i class="fa-regular fa-calendar"></i> Started: ' +
      formatDate(project.startDate) +
      '</div>';
  document.getElementById('portfolio-detail-meta').innerHTML = metaHtml;

  // Tech Stack
  var techs = project.techStack || [];
  document.getElementById('portfolio-detail-techstack').innerHTML = techs.length
    ? '<h4>Tech Stack</h4><div class="detail-tags">' +
      techs
        .map(function (t) {
          return '<span class="detail-tag">' + escapeHtml(t) + '</span>';
        })
        .join('') +
      '</div>'
    : '';

  // Team
  var members = project.teamMembers || [];
  document.getElementById('portfolio-detail-team').innerHTML = members.length
    ? '<h4>Team</h4>' +
      members
        .map(function (m) {
          return (
            '<div class="detail-team-member"><i class="fa-solid fa-user"></i> ' +
            escapeHtml(m) +
            '</div>'
          );
        })
        .join('')
    : '<h4>Team</h4><p class="detail-value">Individual project</p>';

  // Links
  var linksHtml = '';
  if (project.githubUrl)
    linksHtml +=
      '<a href="' +
      escapeHtml(project.githubUrl) +
      '" target="_blank" class="detail-link"><i class="fa-brands fa-github"></i> ' +
      escapeHtml(project.githubUrl) +
      '</a>';
  if (project.liveUrl)
    linksHtml +=
      '<a href="' +
      escapeHtml(project.liveUrl) +
      '" target="_blank" class="detail-link"><i class="fa-solid fa-globe"></i> ' +
      escapeHtml(project.liveUrl) +
      '</a>';
  document.getElementById('portfolio-detail-links').innerHTML = linksHtml
    ? '<h4>Links</h4>' + linksHtml
    : '';

  document.getElementById('portfolio-detail-loading').style.display = 'none';
  document.getElementById('portfolio-detail-content').style.display = '';
}

function closePortfolioDetailModal() {
  var modal = document.getElementById('portfolioDetailModal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

document.addEventListener('click', function (e) {
  var modal = document.getElementById('portfolioDetailModal');
  if (modal && modal.classList.contains('active') && e.target === modal) {
    closePortfolioDetailModal();
  }
});

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (_) {
    return dateStr;
  }
}
