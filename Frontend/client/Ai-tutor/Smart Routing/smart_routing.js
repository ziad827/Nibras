window.NibrasReact.run(function () {
  var navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      navLinks.forEach(function (n) {
        n.classList.remove('active');
      });
      link.classList.add('active');
    });
  });

  var container = document.getElementById('routing-list-container');

  var services = window.NibrasServices;

  if (services && services.mentorshipService) {
    services.mentorshipService
      .getSuggestions(10)
      .then(function (res) {
        var data = res && (res.data || res);
        var suggestions = Array.isArray(data)
          ? data
          : Array.isArray(data.suggestions)
            ? data.suggestions
            : [];
        if (suggestions.length === 0) {
          renderStatic();
          return;
        }
        renderSuggestions(suggestions);
      })
      .catch(function () {
        renderStatic();
      });
  } else {
    renderStatic();
  }

  function renderSuggestions(suggestions) {
    container.innerHTML = '';
    suggestions.forEach(function (s) {
      var mentorName = s.mentorName || s.mentor?.name || s.name || 'Mentor';
      var topic = s.topic || s.expertise || s.specialty || 'General';
      var confidence = s.confidence || s.matchConfidence || s.score || '';
      var responseTime = s.responseTime || s.availability || '';
      var question = s.question || s.title || s.description || '';

      container.innerHTML += [
        '<div class="route-card">',
        '<div class="route-header"><h4>' + esc(question) + '</h4></div>',
        '<div class="route-meta">',
        '<span class="route-pill">Routed to: ' + esc(mentorName) + '</span>',
        '<span class="route-tag">' + esc(topic) + '</span>',
        '</div>',
        '<div class="route-stats">',
        confidence
          ? '<span>' + esc(confidence) + '% match confidence</span>'
          : '',
        responseTime ? '<span>' + esc(responseTime) + '</span>' : '',
        '</div>',
        '</div>',
      ].join('');
    });
  }

  function renderStatic() {
    var fallback = [
      {
        question: 'How to optimize this recursive solution?',
        routedTo: 'Dr. Sarah Chen',
        tag: 'Algorithms & Optimization',
        confidence: '94% match confidence',
        responseTime: 'Responded in 12 minutes',
      },
      {
        question: 'Database design for social media app',
        routedTo: 'TA Mike Johnson',
        tag: 'Database Systems',
        confidence: '87% match confidence',
        responseTime: 'Responded in 25 minutes',
      },
      {
        question: 'React component lifecycle confusion',
        routedTo: 'Prof. Alex Kim',
        tag: 'Web Development',
        confidence: '91% match confidence',
        responseTime: 'Responded in 8 minutes',
      },
    ];
    container.innerHTML = '';
    fallback.forEach(function (item) {
      container.innerHTML += [
        '<div class="route-card">',
        '<div class="route-header"><h4>' + esc(item.question) + '</h4></div>',
        '<div class="route-meta">',
        '<span class="route-pill">Routed to: ' + esc(item.routedTo) + '</span>',
        '<span class="route-tag">' + esc(item.tag) + '</span>',
        '</div>',
        '<div class="route-stats">',
        '<span>' + esc(item.confidence) + '</span>',
        '<span>' + esc(item.responseTime) + '</span>',
        '</div>',
        '</div>',
      ].join('');
    });
  }

  function esc(str) {
    if (!str && str !== 0) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  var themeBtn = document.getElementById('themeBtn');
  var themeIcon = themeBtn ? themeBtn.querySelector('i') : null;
  var appLogo = document.getElementById('app-logo');

  var savedTheme = localStorage.getItem('theme');
  if (savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme);

  var currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  if (currentTheme === 'dark') {
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
    if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      themeBtn.classList.remove('rotating');
      void themeBtn.offsetWidth;
      themeBtn.classList.add('rotating');
      setTimeout(function () {
        themeBtn.classList.remove('rotating');
      }, 400);
      var html = document.documentElement;
      var cur = html.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      if (themeIcon)
        themeIcon.className =
          next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      if (appLogo)
        appLogo.src =
          next === 'dark'
            ? '/Assets/images/logo-dark.png'
            : '/Assets/images/logo-light.png';
    });
  }

  var aiTabs = document.querySelectorAll('.ai-tab');
  aiTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      aiTabs.forEach(function (t) {
        t.classList.remove('active');
      });
      tab.classList.add('active');
    });
  });
});
