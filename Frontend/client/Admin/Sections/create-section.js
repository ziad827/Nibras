window.NibrasReact.run(() => {
  var preselectedCourseId = null;

  function getInitials(name) {
    if (!name) return 'A';
    return (
      name
        .split(' ')
        .map(function (s) {
          return s.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'A'
    );
  }

  function updateSidebarUser() {
    try {
      var user = JSON.parse(localStorage.getItem('user') || '{}');
      var name = user.name || user.login || 'Admin';
      var role = String(user.role?.name || user.role || 'admin');
      var initials = getInitials(name);
      [
        'sidebar-name',
        'sidebar-role',
        'sidebar-avatar',
        'header-avatar',
      ].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (id === 'sidebar-name') el.textContent = name;
        else if (id === 'sidebar-role') el.textContent = role;
        else el.textContent = initials;
      });
    } catch (_) {}
  }

  function initTheme() {
    var btn = document.getElementById('themeBtn');
    var icon = btn?.querySelector('i');
    var logo = document.getElementById('app-logo');
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    if (cur === 'dark') {
      if (icon) icon.className = 'fa-solid fa-sun';
      if (logo) logo.src = '../../Assets/images/logo-dark.png';
    } else {
      if (icon) icon.className = 'fa-regular fa-moon';
      if (logo) logo.src = '../../Assets/images/logo-light.png';
    }
    if (btn) {
      btn.addEventListener('click', function () {
        btn.style.transform = 'scale(1.2)';
        setTimeout(function () {
          btn.style.transform = 'scale(1)';
        }, 200);
        var h = document.documentElement;
        var c = h.getAttribute('data-theme');
        var n = c === 'light' ? 'dark' : 'light';
        h.setAttribute('data-theme', n);
        localStorage.setItem('theme', n);
        if (n === 'dark') {
          if (icon) icon.className = 'fa-solid fa-sun';
          if (logo) logo.src = '../../Assets/images/logo-dark.png';
        } else {
          if (icon) icon.className = 'fa-regular fa-moon';
          if (logo) logo.src = '../../Assets/images/logo-light.png';
        }
      });
    }
  }

  async function apiCall(path, options) {
    options = options || {};
    var fn = window.NibrasServices?.apiFetch || window.NibrasShared?.apiFetch;
    if (fn) return await fn(path, Object.assign({ service: 'admin' }, options));
    if (window.NibrasShared?.apiFetch)
      return await window.NibrasShared.apiFetch(
        path,
        Object.assign({ service: 'admin' }, options),
      );
    throw new Error('API not available');
  }

  function showLoading(message) {
    var overlay = document.getElementById('loading-overlay');
    var text = document.getElementById('loading-text');
    if (text) text.textContent = message || 'Creating section...';
    if (overlay) overlay.classList.add('active');
  }

  function hideLoading() {
    var overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function redirectWithToast(url, message, type) {
    try {
      localStorage.setItem(
        'adminToast',
        JSON.stringify({ message: message, type: type || 'success' }),
      );
    } catch (_) {}
    window.location.href = url;
  }

  async function loadCourses() {
    var select = document.getElementById('input-course');
    try {
      var res = await apiCall('/admin/courses?limit=200');
      var data = res?.data || res || {};
      var courses = Array.isArray(data)
        ? data
        : Array.isArray(data?.courses)
          ? data.courses
          : [];

      select.innerHTML = '<option value="">Select a course...</option>';
      courses.forEach(function (c) {
        var id = c._id || c.id || '';
        var option = document.createElement('option');
        option.value = id;
        option.textContent =
          (c.code ? c.code + ' - ' : '') + (c.title || c.name || 'Untitled');
        if (preselectedCourseId && id === preselectedCourseId) {
          option.selected = true;
        }
        select.appendChild(option);
      });

      if (courses.length === 0) {
        select.innerHTML = '<option value="">No courses available</option>';
      }
    } catch (error) {
      select.innerHTML = '<option value="">Failed to load courses</option>';
    }
  }

  function init() {
    var params = new URLSearchParams(window.location.search);
    preselectedCourseId = params.get('courseId');

    updateSidebarUser();
    initTheme();
    loadCourses();

    document
      .getElementById('create-section-form')
      .addEventListener('submit', async function (e) {
        e.preventDefault();

        var courseId = document.getElementById('input-course').value;
        var name = document.getElementById('input-name').value.trim();
        var capacity = document.getElementById('input-capacity').value.trim();
        var schedule = document.getElementById('input-schedule').value.trim();

        if (!courseId) {
          alert('Please select a course.');
          return;
        }
        if (!name) {
          alert('Section name is required.');
          return;
        }

        var body = { name: name };
        if (capacity) body.capacity = parseInt(capacity, 10);
        if (schedule) body.schedule = schedule;

        showLoading('Creating section...');
        var submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;

        try {
          var res = await apiCall(
            '/admin/courses/' + encodeURIComponent(courseId) + '/sections',
            {
              method: 'POST',
              body: body,
            },
          );
          var result = res?.data || res || {};
          var newSectionId = result._id || result.id || result.sectionId || '';
          redirectWithToast(
            '../Sections/section-detail.html?courseId=' +
              encodeURIComponent(courseId) +
              '&sectionId=' +
              encodeURIComponent(newSectionId),
            'Section created successfully',
            'success',
          );
        } catch (error) {
          hideLoading();
          submitBtn.disabled = false;
          alert(
            'Failed to create section: ' + (error.message || 'Unknown error'),
          );
        }
      });
  }

  init();
});
