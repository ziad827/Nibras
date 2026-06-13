window.NibrasReact.run(() => {
  // --- THEME TOGGLE LOGIC ---
  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn.querySelector('i');

  // Initial Check
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    themeIcon.className = 'fa-solid fa-sun';
  } else {
    themeIcon.className = 'fa-solid fa-moon';
  }

  themeBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');

    if (current === 'light') {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      themeIcon.className = 'fa-solid fa-sun';
    } else {
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      themeIcon.className = 'fa-solid fa-moon';
    }
  });
});
