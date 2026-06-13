window.NibrasReact.run(() => {
  var isEditMode = false;
  var courseId = null;

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
    var themeBtn = document.getElementById('themeBtn');
    var themeIcon = themeBtn?.querySelector('i');
    var appLogo = document.getElementById('app-logo');

    var currentTheme =
      document.documentElement.getAttribute('data-theme') || 'light';
    if (currentTheme === 'dark') {
      if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
      if (appLogo) appLogo.src = '../../Assets/images/logo-dark.png';
    } else {
      if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
      if (appLogo) appLogo.src = '../../Assets/images/logo-light.png';
    }

    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        themeBtn.style.transform = 'scale(1.2)';
        setTimeout(function () {
          themeBtn.style.transform = 'scale(1)';
        }, 200);
        var html = document.documentElement;
        var current = html.getAttribute('data-theme');
        var newTheme = current === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
          if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
          if (appLogo) appLogo.src = '../../Assets/images/logo-dark.png';
        } else {
          if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
          if (appLogo) appLogo.src = '../../Assets/images/logo-light.png';
        }
      });
    }
  }

  async function apiCall(path, options) {
    options = options || {};
    var fetchFn =
      window.NibrasServices?.apiFetch || window.NibrasShared?.apiFetch;
    if (fetchFn)
      return await fetchFn(path, Object.assign({ service: 'admin' }, options));
    if (window.NibrasShared?.apiFetch)
      return await window.NibrasShared.apiFetch(
        path,
        Object.assign({ service: 'admin' }, options),
      );
    throw new Error('API not available');
  }

  function getSectionRows() {
    var rows = document.querySelectorAll('#sections-container .section-row');
    var sections = [];
    rows.forEach(function (row) {
      var name = row.querySelector('.section-name')?.value?.trim();
      if (!name) return;
      var capacity = row.querySelector('.section-capacity')?.value?.trim();
      var schedule = row.querySelector('.section-schedule')?.value?.trim();
      sections.push({
        name: name,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        schedule: schedule || undefined,
      });
    });
    return sections;
  }

  function addSectionRow(data) {
    data = data || {};
    var container = document.getElementById('sections-container');
    var index = container.querySelectorAll('.section-row').length;

    var div = document.createElement('div');
    div.className = 'section-row';
    div.dataset.index = index;
    div.innerHTML =
      '<div class="form-group">' +
      '<label>Section Name <span class="required">*</span></label>' +
      '<input type="text" class="section-name" placeholder="e.g., Section A" value="' +
      (data.name ? data.name.replace(/"/g, '&quot;') : '') +
      '" required>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Capacity</label>' +
      '<input type="number" class="section-capacity" placeholder="Max students" min="1" value="' +
      (data.capacity || '') +
      '">' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Schedule</label>' +
      '<input type="text" class="section-schedule" placeholder="e.g., Mon/Wed 10:00-11:30" value="' +
      (data.schedule ? data.schedule.replace(/"/g, '&quot;') : '') +
      '">' +
      '</div>' +
      '<button type="button" class="btn-remove-section" title="Remove section"><i class="fa-solid fa-xmark"></i></button>';

    div
      .querySelector('.btn-remove-section')
      .addEventListener('click', function () {
        div.remove();
      });

    container.appendChild(div);
  }

  function collectFormData() {
    return {
      title: document.getElementById('input-title')?.value?.trim(),
      code: document.getElementById('input-code')?.value?.trim(),
      description: document.getElementById('input-description')?.value?.trim(),
      level: document.getElementById('input-level')?.value,
      status: document.getElementById('input-status')?.value,
      instructors: document
        .getElementById('input-instructors')
        ?.value?.split(',')
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean),
      thumbnail:
        document.getElementById('input-thumbnail')?.value?.trim() || undefined,
      sections: getSectionRows(),
    };
  }

  function validateForm(data) {
    var errors = [];
    if (!data.title) errors.push('Course title is required');
    if (!data.code) errors.push('Course code is required');
    if (data.sections.length > 0) {
      data.sections.forEach(function (s, i) {
        if (!s.name) errors.push('Section ' + (i + 1) + ' needs a name');
      });
    }
    return errors;
  }

  function showLoading(message) {
    var overlay = document.getElementById('loading-overlay');
    var text = document.getElementById('loading-text');
    if (text) text.textContent = message || 'Saving...';
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

  function initForm() {
    var params = new URLSearchParams(window.location.search);
    courseId = params.get('id');

    if (courseId) {
      isEditMode = true;
      document.getElementById('form-title').textContent = 'Edit Course';
      document.getElementById('form-subtitle').textContent =
        'Update course details and sections';
      document.getElementById('submit-text').textContent = 'Update Course';
      loadCourseData(courseId);
    } else {
      document.getElementById('submit-text').textContent = 'Create Course';
    }
  }

  async function loadCourseData(id) {
    showLoading('Loading course data...');
    try {
      var res = await apiCall('/admin/courses/' + encodeURIComponent(id));
      var course = res?.data || res || {};

      fillForm(course);
    } catch (error) {
      alert(
        'Failed to load course data: ' + (error.message || 'Unknown error'),
      );
      window.location.href = './courses.html';
    } finally {
      hideLoading();
    }
  }

  function fillForm(course) {
    setField('input-title', course.title || course.name || '');
    setField('input-code', course.code || '');
    setField('input-description', course.description || '');
    setField('input-level', course.level || 'Beginner');
    setField('input-status', course.status || 'draft');

    if (course.instructors) {
      var instructors = Array.isArray(course.instructors)
        ? course.instructors
            .map(function (i) {
              return typeof i === 'string'
                ? i
                : i.email || i.name || i._id || '';
            })
            .join(', ')
        : String(course.instructors);
      setField('input-instructors', instructors);
    }

    setField('input-thumbnail', course.thumbnail || course.thumbnailUrl || '');

    var container = document.getElementById('sections-container');
    container.innerHTML = '';

    var sections = Array.isArray(course.sections) ? course.sections : [];
    if (sections.length > 0) {
      sections.forEach(function (s) {
        addSectionRow({
          name: s.name || '',
          capacity: s.capacity || '',
          schedule: s.schedule || '',
        });
      });
    } else {
      addSectionRow({});
    }

    var firstRemove = container.querySelector('.btn-remove-section');
    if (firstRemove && sections.length <= 1) {
      firstRemove.style.visibility = 'hidden';
    }
  }

  function setField(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value != null ? value : '';
  }

  async function handleSubmit(e) {
    e.preventDefault();

    var data = collectFormData();
    var errors = validateForm(data);

    if (errors.length > 0) {
      alert('Please fix the following errors:\n- ' + errors.join('\n- '));
      return;
    }

    showLoading(isEditMode ? 'Updating course...' : 'Creating course...');

    try {
      var submitBtn = document.getElementById('submit-btn');
      submitBtn.disabled = true;

      var res;
      if (isEditMode) {
        res = await apiCall('/admin/courses/' + encodeURIComponent(courseId), {
          method: 'PATCH',
          body: data,
        });
        redirectWithToast(
          './courses.html',
          'Course updated successfully',
          'success',
        );
      } else {
        res = await apiCall('/admin/courses', {
          method: 'POST',
          body: data,
        });
        redirectWithToast(
          './courses.html',
          'Course created successfully',
          'success',
        );
      }
    } catch (error) {
      hideLoading();
      var submitBtn = document.getElementById('submit-btn');
      submitBtn.disabled = false;
      alert(
        'Failed to ' +
          (isEditMode ? 'update' : 'create') +
          ' course: ' +
          (error.message || 'Unknown error'),
      );
    }
  }

  function initSectionAdder() {
    var container = document.getElementById('sections-container');
    var initialRemove = container.querySelector('.btn-remove-section');
    if (initialRemove) {
      initialRemove.style.visibility = 'hidden';
    }

    document
      .getElementById('add-section-btn')
      .addEventListener('click', function () {
        addSectionRow({});
        var allRows = container.querySelectorAll('.section-row');
        allRows.forEach(function (row) {
          var btn = row.querySelector('.btn-remove-section');
          if (btn) btn.style.visibility = '';
        });
      });

    container.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn-remove-section');
      if (!btn) return;
      var rows = container.querySelectorAll('.section-row');
      if (rows.length <= 1) return;
    });
  }

  updateSidebarUser();
  initTheme();
  initSectionAdder();
  initForm();

  document
    .getElementById('course-form')
    .addEventListener('submit', handleSubmit);
});
