window.NibrasReact.run(() => {
  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn?.querySelector('i');

  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
  } else if (themeIcon) {
    themeIcon.className = 'fa-solid fa-moon';
  }

  themeBtn?.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    if (current === 'light') {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    } else {
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    }
  });

  const deptLabels = {
    cs: 'Computer Science',
    is: 'Information Systems',
    it: 'Information Technology',
    se: 'Software Engineering',
    ai: 'Artificial Intelligence',
  };

  const form = document.getElementById('signupForm');
  const select = document.getElementById('departmentSelect');
  const notice = document.getElementById('departmentNotice');
  const submitBtn = document.getElementById('departmentSubmitBtn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = select?.value || '';
    const department = deptLabels[value] || value;
    if (!department) {
      if (notice) notice.textContent = 'Please choose a department.';
      return;
    }

    const svc = window.NibrasServices?.instructorApplicationService;
    if (!svc) {
      if (notice) notice.textContent = 'Application service unavailable.';
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    try {
      await svc.submit(department);
      window.location.href = '../Pending%20Instructor/pending.html';
    } catch (err) {
      if (notice) {
        notice.textContent = err?.message || 'Could not submit application.';
      }
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});
