window.NibrasReact.run(() => {
  var courseId = null;
  var sectionId = null;
  var sectionData = null;
  var removeTargetId = null;

  var batchStudents = [];

  function getInitials(name) {
    if (!name) return 'S';
    return (
      name
        .split(' ')
        .map(function (s) {
          return s.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'S'
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

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(message, type) {
    var container = document.getElementById('toast-container');
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'success');
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add('show');
    });
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 3500);
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

  function formatDate(d) {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString();
    } catch (_) {
      return '—';
    }
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

  function getUrlParams() {
    var p = new URLSearchParams(window.location.search);
    courseId = p.get('courseId');
    sectionId = p.get('sectionId');
  }

  async function loadSectionData() {
    var headerContainer = document.getElementById('section-header-container');
    var infoContainer = document.getElementById('info-grid-container');
    var studentsContainer = document.getElementById('students-container');

    if (!courseId || !sectionId) {
      headerContainer.innerHTML =
        '<div class="error-state" style="text-align:center;padding:2rem;"><i class="fa-solid fa-triangle-exclamation"></i><p>Missing course or section ID in URL.</p><a href="../Courses/courses.html" class="btn-primary" style="display:inline-flex;margin-top:0.5rem;">Back to Courses</a></div>';
      infoContainer.innerHTML = '';
      studentsContainer.innerHTML = '';
      return;
    }

    try {
      var res = await apiCall('/admin/courses/' + encodeURIComponent(courseId));
      var course = res?.data || res || {};
      var sections = Array.isArray(course.sections) ? course.sections : [];
      sectionData = sections.find(function (s) {
        return (s._id || s.id) === sectionId;
      });

      if (!sectionData) {
        headerContainer.innerHTML =
          '<div class="error-state" style="text-align:center;padding:2rem;"><i class="fa-solid fa-triangle-exclamation"></i><p>Section not found.</p><a href="../Courses/courses.html" class="btn-primary" style="display:inline-flex;margin-top:0.5rem;">Back to Courses</a></div>';
        infoContainer.innerHTML = '';
        studentsContainer.innerHTML = '';
        return;
      }

      renderHeader(course, sectionData);
      renderInfo(course, sectionData);
      renderStudents(sectionData);
    } catch (error) {
      headerContainer.innerHTML =
        '<div class="error-state" style="text-align:center;padding:2rem;"><i class="fa-solid fa-circle-exclamation" style="color:#ef4444;"></i><p>Failed to load section: ' +
        escapeHtml(error.message || 'Unknown error') +
        '</p><a href="../Courses/courses.html" class="btn-primary" style="display:inline-flex;margin-top:0.5rem;">Back to Courses</a></div>';
      infoContainer.innerHTML = '';
      studentsContainer.innerHTML = '';
    }
  }

  function renderHeader(course, section) {
    var students = Array.isArray(section.students) ? section.students : [];
    var capacity = section.capacity || '∞';
    var container = document.getElementById('section-header-container');
    container.innerHTML =
      '<div class="section-header">' +
      '<div>' +
      '<h1>' +
      escapeHtml(section.name || 'Unnamed Section') +
      '</h1>' +
      '<span class="enrollment-badge">' +
      students.length +
      ' / ' +
      capacity +
      ' enrolled</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;">' +
      '<a href="../Courses/course-form.html?id=' +
      encodeURIComponent(courseId || '') +
      '" class="btn-outline"><i class="fa-solid fa-pen"></i> Edit Course</a>' +
      '</div>' +
      '</div>';
  }

  function renderInfo(course, section) {
    var container = document.getElementById('info-grid-container');
    container.innerHTML =
      '<div class="info-grid">' +
      '<div class="info-item"><label>Course</label><span>' +
      escapeHtml(course.title || course.name || '—') +
      '</span></div>' +
      '<div class="info-item"><label>Section Name</label><span>' +
      escapeHtml(section.name || '—') +
      '</span></div>' +
      '<div class="info-item"><label>Schedule</label><span>' +
      escapeHtml(section.schedule || 'Not set') +
      '</span></div>' +
      '<div class="info-item"><label>Capacity</label><span>' +
      (section.capacity || 'Unlimited') +
      '</span></div>' +
      '</div>';
  }

  function renderStudents(section) {
    var container = document.getElementById('students-container');
    var students = Array.isArray(section.students) ? section.students : [];

    if (students.length === 0) {
      container.innerHTML =
        '<div class="empty-state" style="text-align:center;padding:2rem;color:var(--text-secondary);">' +
        '<i class="fa-solid fa-user-graduate" style="font-size:2rem;display:block;margin-bottom:0.75rem;opacity:0.4;"></i>' +
        '<p style="margin:0 0 0.75rem;">No students enrolled in this section</p>' +
        '<button class="btn-primary" id="batch-enroll-empty-btn" style="display:inline-flex;"><i class="fa-solid fa-user-plus"></i> Batch Enroll</button>' +
        '</div>';
      var emptyBtn = document.getElementById('batch-enroll-empty-btn');
      if (emptyBtn)
        emptyBtn.addEventListener('click', function () {
          openBatchModal();
        });
      return;
    }

    var html =
      '<table class="student-table"><thead><tr><th>#</th><th>Student</th><th>Email</th><th>Enrolled</th><th>Actions</th></tr></thead><tbody>';
    students.forEach(function (s, i) {
      var sid = s._id || s.id || s.userId || '';
      var name = s.name || s.displayName || s.username || 'Unknown';
      var email = s.email || '—';
      var enrolled = formatDate(s.enrolledAt || s.createdAt);
      var initials = getInitials(name);
      html +=
        '<tr>' +
        '<td>' +
        (i + 1) +
        '</td>' +
        '<td><div class="student-name-cell"><span class="student-avatar-sm">' +
        initials +
        '</span>' +
        escapeHtml(name) +
        '</div></td>' +
        '<td style="color:var(--text-secondary);font-size:0.82rem;">' +
        escapeHtml(email) +
        '</td>' +
        '<td style="font-size:0.82rem;color:var(--text-secondary);">' +
        enrolled +
        '</td>' +
        '<td><button class="btn-remove-student" data-id="' +
        encodeURIComponent(sid) +
        '" data-name="' +
        escapeHtml(name) +
        '"><i class="fa-solid fa-user-minus"></i> Remove</button></td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll('.btn-remove-student').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removeTargetId = decodeURIComponent(btn.dataset.id);
        document.getElementById('remove-student-name').textContent =
          'Remove "' +
          btn.dataset.name +
          '" from this section? This action can be undone by enrolling them again.';
        document.getElementById('remove-modal').classList.add('active');
      });
    });
  }

  function initRemoveModal() {
    var modal = document.getElementById('remove-modal');
    document
      .getElementById('remove-cancel')
      .addEventListener('click', function () {
        modal.classList.remove('active');
        removeTargetId = null;
      });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        removeTargetId = null;
      }
    });
    document
      .getElementById('remove-confirm')
      .addEventListener('click', async function () {
        if (!removeTargetId || !sectionId) return;
        var btn = document.getElementById('remove-confirm');
        btn.disabled = true;
        btn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Removing...';
        try {
          await apiCall(
            '/admin/sections/' +
              encodeURIComponent(sectionId) +
              '/students/' +
              encodeURIComponent(removeTargetId),
            { method: 'DELETE' },
          );
          showToast('Student removed from section', 'success');
          modal.classList.remove('active');
          removeTargetId = null;
          loadSectionData();
        } catch (error) {
          showToast(
            'Failed to remove: ' + (error.message || 'Unknown error'),
            'error',
          );
        } finally {
          btn.disabled = false;
          btn.innerHTML =
            '<i class="fa-solid fa-user-minus"></i> Remove Student';
        }
      });
  }

  function initBatchModal() {
    var modal = document.getElementById('batch-modal');
    var manualTab = document.getElementById('tab-manual');
    var csvTab = document.getElementById('tab-csv');

    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(function (c) {
          c.classList.remove('active');
        });
        btn.classList.add('active');
        var tab = document.getElementById('tab-' + btn.dataset.tab);
        if (tab) tab.classList.add('active');
        document.getElementById('preview-section').style.display = 'none';
        batchStudents = [];
        document.getElementById('batch-confirm-btn').disabled = true;
      });
    });

    document
      .getElementById('batch-cancel')
      .addEventListener('click', function () {
        modal.classList.remove('active');
        batchStudents = [];
        document.getElementById('preview-section').style.display = 'none';
        document.getElementById('batch-confirm-btn').disabled = true;
      });

    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.classList.remove('active');
        batchStudents = [];
        document.getElementById('preview-section').style.display = 'none';
        document.getElementById('batch-confirm-btn').disabled = true;
      }
    });

    document
      .getElementById('batch-preview-btn')
      .addEventListener('click', function () {
        var activeTab = document.querySelector('.tab-btn.active');
        if (!activeTab) return;
        var tab = activeTab.dataset.tab;
        var students = [];

        if (tab === 'manual') {
          var text = document.getElementById('batch-textarea').value.trim();
          if (!text) {
            alert('Please enter student emails or IDs.');
            return;
          }
          students = text
            .split('\n')
            .map(function (s) {
              return s.trim();
            })
            .filter(Boolean);
          students = [...new Set(students)];
        } else if (tab === 'csv') {
          var fileInput = document.getElementById('csv-file-input');
          if (!fileInput.files || !fileInput.files[0]) {
            alert('Please upload a CSV file.');
            return;
          }
          alert(
            'CSV parsing is done on the backend. Please use the manual entry tab to enter student IDs.',
          );
          return;
        }

        if (students.length === 0) {
          alert('No valid student identifiers found.');
          return;
        }
        batchStudents = students;
        showPreview(students);
      });

    document
      .getElementById('batch-confirm-btn')
      .addEventListener('click', async function () {
        if (batchStudents.length === 0) return;
        var btn = this;
        btn.disabled = true;
        btn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Enrolling...';

        try {
          await apiCall(
            '/admin/sections/' + encodeURIComponent(sectionId) + '/enroll',
            {
              method: 'POST',
              body: { students: batchStudents },
            },
          );
          showToast(
            batchStudents.length +
              ' student' +
              (batchStudents.length !== 1 ? 's' : '') +
              ' enrolled successfully',
            'success',
          );
          modal.classList.remove('active');
          batchStudents = [];
          document.getElementById('preview-section').style.display = 'none';
          loadSectionData();
        } catch (error) {
          showToast(
            'Failed to enroll: ' + (error.message || 'Unknown error'),
            'error',
          );
        } finally {
          btn.disabled = false;
          btn.innerHTML =
            '<i class="fa-solid fa-user-plus"></i> Enroll Students';
        }
      });

    document
      .getElementById('batch-enroll-btn')
      .addEventListener('click', function () {
        openBatchModal();
      });

    var csvUpload = document.getElementById('csv-upload-area');
    var csvInput = document.getElementById('csv-file-input');
    csvUpload.addEventListener('click', function () {
      csvInput.click();
    });
    csvInput.addEventListener('change', function () {
      if (csvInput.files && csvInput.files[0]) {
        csvUpload.querySelector('p').textContent =
          'File selected: ' + csvInput.files[0].name;
      }
    });
  }

  function openBatchModal() {
    document.getElementById('batch-modal').classList.add('active');
  }

  function showPreview(students) {
    var section = document.getElementById('preview-section');
    section.style.display = 'block';
    document.getElementById('preview-count').textContent = students.length;
    var list = document.getElementById('preview-list');
    list.innerHTML = '';
    var display = students.slice(0, 20);
    display.forEach(function (s) {
      var tag = document.createElement('span');
      tag.className = 'preview-tag';
      tag.textContent = s;
      list.appendChild(tag);
    });
    if (students.length > 20) {
      var more = document.createElement('span');
      more.className = 'preview-tag';
      more.style.background = 'var(--accent-blue)';
      more.style.color = '#fff';
      more.textContent = '+' + (students.length - 20) + ' more';
      list.appendChild(more);
    }
    document.getElementById('batch-confirm-btn').disabled = false;
  }

  function init() {
    getUrlParams();
    updateSidebarUser();
    initTheme();
    initRemoveModal();
    initBatchModal();
    loadSectionData();
  }

  init();
});
