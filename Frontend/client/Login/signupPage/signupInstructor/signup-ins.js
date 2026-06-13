window.NibrasReact.run(() => {
  // --- 1. THEME TOGGLE LOGIC ---
  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn.querySelector('i');

  // Check local storage or default
  const currentTheme = document.documentElement.getAttribute('data-theme');

  // Set initial icon
  if (currentTheme === 'dark') {
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

  // --- 2. PASSWORD VISIBILITY ---
  window.togglePass = function (inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  };
});
