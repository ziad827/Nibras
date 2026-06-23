window.NibrasReact.run(() => {
  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn?.querySelector('i');
  const statusEl = document.getElementById('pending-status');

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

  async function pollStatus() {
    const svc = window.NibrasServices?.instructorApplicationService;
    if (!svc) return;

    try {
      const res = await svc.getMine();
      const data = res?.data || res;
      const status = data?.status;
      if (statusEl && status) {
        statusEl.textContent = 'Status: ' + status;
      }
      if (status === 'approved') {
        window.location.href = '../../../../Dashboard/instructor-dashboard.html';
      }
      if (status === 'rejected' && statusEl) {
        statusEl.textContent =
          'Your application was not approved. Contact an administrator.';
      }
    } catch (_) {}
  }

  pollStatus();
  setInterval(pollStatus, 15000);
});
