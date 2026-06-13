window.NibrasReact.run(() => {
  const tableContainer = document.getElementById('table-container');
  const pagination = document.getElementById('pagination');
  const paginationInfo = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const levelFilter = document.getElementById('levelFilter');
  const archiveModal = document.getElementById('archive-modal');
  const archiveCancel = document.getElementById('archive-cancel');
  const archiveConfirm = document.getElementById('archive-confirm');
  const archiveCourseName = document.getElementById('archive-course-name');
  const toastContainer = document.getElementById('toast-container');

  let currentPage = 1;
  let totalPages = 1;
  let totalCourses = 0;
  let archiveTargetId = null;
  let searchTimeout = null;

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
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const name = user.name || user.login || 'Admin';
      const role = String(user.role?.name || user.role || 'admin');
      const initials = getInitials(name);

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

  function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'success');
    toast.textContent = message;
    toastContainer.appendChild(toast);
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

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

  function getFilters() {
    var params = { page: currentPage, limit: 20 };
    var search = searchInput ? searchInput.value.trim() : '';
    if (search) params.search = search;
    var status = statusFilter ? statusFilter.value : '';
    if (status) params.status = status;
    var level = levelFilter ? levelFilter.value : '';
    if (level) params.level = level;
    return params;
  }

  function buildQueryString(params) {
    var parts = [];
    Object.keys(params).forEach(function (k) {
      if (params[k] != null && params[k] !== '') {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
      }
    });
    return parts.length ? '?' + parts.join('&') : '';
  }

  async function loadCourses() {
    tableContainer.innerHTML =
      '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading courses...</p></div>';
    pagination.style.display = 'none';

    try {
      var params = getFilters();
      var qs = buildQueryString(params);
      var res = await apiCall('/admin/courses' + qs);
      var data = res?.data || res || {};
      var courses = Array.isArray(data)
        ? data
        : Array.isArray(data?.courses)
          ? data.courses
          : [];
      var meta = data?.pagination || data?.meta || {};

      totalPages =
        meta?.totalPages ||
        meta?.pages ||
        Math.ceil((meta?.total || courses.length) / (params.limit || 20)) ||
        1;
      totalCourses = meta?.total || meta?.totalCount || courses.length;

      renderTable(courses);

      if (totalPages > 1) {
        pagination.style.display = 'flex';
        paginationInfo.textContent =
          'Page ' +
          currentPage +
          ' of ' +
          totalPages +
          ' (' +
          totalCourses +
          ' courses)';
      } else if (totalCourses > 20) {
        pagination.style.display = 'flex';
        paginationInfo.textContent = totalCourses + ' courses';
      } else if (totalCourses > 0) {
        paginationInfo.textContent =
          totalCourses + ' course' + (totalCourses !== 1 ? 's' : '');
      }

      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= totalPages;
    } catch (error) {
      tableContainer.innerHTML =
        '<div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load courses: ' +
        escapeHtml(error.message || 'Unknown error') +
        '</p><button class="btn-primary" onclick="location.reload()" style="margin-top:1rem;"><i class="fa-solid fa-rotate"></i> Retry</button></div>';
    }
  }

  function renderTable(courses) {
    if (courses.length === 0) {
      var search = searchInput ? searchInput.value.trim() : '';
      if (
        search ||
        (statusFilter && statusFilter.value) ||
        (levelFilter && levelFilter.value)
      ) {
        tableContainer.innerHTML =
          "<div class=\"empty-state\"><i class=\"fa-solid fa-search\"></i><p>No courses match your filters</p><button class=\"btn-primary\" onclick=\"document.getElementById('searchInput').value='';document.getElementById('statusFilter').value='';document.getElementById('levelFilter').value='';location.reload()\" style=\"margin-top:0.5rem;\">Clear Filters</button></div>";
      } else {
        tableContainer.innerHTML =
          '<div class="empty-state"><i class="fa-solid fa-book-open"></i><p>No courses yet</p><a href="./course-form.html" class="btn-primary" style="display:inline-flex;margin-top:0.5rem;"><i class="fa-solid fa-plus"></i> Create your first course</a></div>';
      }
      return;
    }

    var html =
      '<table class="data-table"><thead><tr><th>Title</th><th>Code</th><th>Level</th><th>Sections</th><th>Students</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>';

    courses.forEach(function (c) {
      var id = c._id || c.id || '';
      var title = c.title || c.name || 'Untitled';
      var code = c.code || '—';
      var level = c.level || '—';
      var sections = Array.isArray(c.sections)
        ? c.sections.length
        : c.sectionsCount || c.sectionCount || 0;
      var students =
        c.enrolledCount || c.studentCount || c.enrollmentCount || 0;
      var status = (c.status || 'draft').toLowerCase();
      var statusClass =
        status === 'active'
          ? 'active'
          : status === 'draft'
            ? 'draft'
            : 'archived';
      var created = c.createdAt
        ? new Date(c.createdAt).toLocaleDateString()
        : '—';

      html +=
        '<tr>' +
        '<td><a href="./course-form.html?id=' +
        encodeURIComponent(id) +
        '" class="course-title">' +
        escapeHtml(title) +
        '</a></td>' +
        '<td style="font-family:monospace;font-size:0.82rem;">' +
        escapeHtml(code) +
        '</td>' +
        '<td>' +
        escapeHtml(level) +
        '</td>' +
        '<td>' +
        sections +
        '</td>' +
        '<td>' +
        students +
        '</td>' +
        '<td><span class="status-badge ' +
        statusClass +
        '">' +
        escapeHtml(status) +
        '</span></td>' +
        '<td style="font-size:0.8rem;color:var(--text-secondary);">' +
        created +
        '</td>' +
        '<td><div class="action-btns">' +
        '<a href="./course-form.html?id=' +
        encodeURIComponent(id) +
        '" class="action-btn" title="Edit"><i class="fa-solid fa-pen"></i></a>' +
        (status !== 'archived'
          ? '<button class="action-btn danger" data-id="' +
            encodeURIComponent(id) +
            '" data-title="' +
            escapeHtml(title) +
            '" title="Archive"><i class="fa-solid fa-archive"></i></button>'
          : '') +
        '</div></td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    tableContainer.innerHTML = html;

    tableContainer
      .querySelectorAll('.action-btn.danger')
      .forEach(function (btn) {
        btn.addEventListener('click', function () {
          archiveTargetId = decodeURIComponent(btn.dataset.id);
          var title = btn.dataset.title || 'this course';
          archiveCourseName.textContent =
            'Are you sure you want to archive "' +
            title +
            '"? It will be soft-deleted and hidden from students. This action can be reversed by changing the status back to active.';
          archiveModal.classList.add('active');
        });
      });
  }

  function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadCourses();
  }

  function initSearch() {
    if (!searchInput) return;
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        currentPage = 1;
        loadCourses();
      }, 300);
    });

    if (statusFilter) {
      statusFilter.addEventListener('change', function () {
        currentPage = 1;
        loadCourses();
      });
    }
    if (levelFilter) {
      levelFilter.addEventListener('change', function () {
        currentPage = 1;
        loadCourses();
      });
    }
  }

  function initPagination() {
    prevBtn.addEventListener('click', function () {
      goToPage(currentPage - 1);
    });
    nextBtn.addEventListener('click', function () {
      goToPage(currentPage + 1);
    });
  }

  function initArchiveModal() {
    archiveCancel.addEventListener('click', function () {
      archiveModal.classList.remove('active');
      archiveTargetId = null;
    });

    archiveModal.addEventListener('click', function (e) {
      if (e.target === archiveModal) {
        archiveModal.classList.remove('active');
        archiveTargetId = null;
      }
    });

    archiveConfirm.addEventListener('click', async function () {
      if (!archiveTargetId) return;
      archiveConfirm.disabled = true;
      archiveConfirm.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Archiving...';

      try {
        await apiCall('/admin/courses/' + encodeURIComponent(archiveTargetId), {
          method: 'DELETE',
        });
        showToast('Course archived successfully', 'success');
        archiveModal.classList.remove('active');
        archiveTargetId = null;
        loadCourses();
      } catch (error) {
        showToast(
          'Failed to archive: ' + (error.message || 'Unknown error'),
          'error',
        );
      } finally {
        archiveConfirm.disabled = false;
        archiveConfirm.innerHTML =
          '<i class="fa-solid fa-archive"></i> Archive Course';
      }
    });
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

  function checkToastMessage() {
    try {
      var msg = localStorage.getItem('adminToast');
      if (msg) {
        localStorage.removeItem('adminToast');
        var parsed = JSON.parse(msg);
        showToast(parsed.message, parsed.type || 'success');
      }
    } catch (_) {}
  }

  updateSidebarUser();
  initTheme();
  checkToastMessage();
  initSearch();
  initPagination();
  initArchiveModal();
  loadCourses();
});
