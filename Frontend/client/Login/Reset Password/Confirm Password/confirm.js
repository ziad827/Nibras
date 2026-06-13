window.NibrasReact.run(() => {
  // --- SHOW USER EMAIL ---
  const userEmailEl = document.getElementById('userEmail');
  const savedEmail = localStorage.getItem('resetEmail');
  if (userEmailEl && savedEmail) {
    userEmailEl.textContent = savedEmail;
  }

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
    themeBtn.classList.add('rotating');
    setTimeout(() => themeBtn.classList.remove('rotating'), 400);
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

  // --- NEW PASSWORD FORM ---
  const newPasswordForm = document.getElementById('newPasswordForm');
  if (newPasswordForm) {
    newPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otpInput =
        document.getElementById('otp') ||
        document.querySelector('input[name="otp"]');
      const newPassInput = document.getElementById('newPass');
      const confPassInput = document.getElementById('confPass');

      const otp = otpInput?.value?.trim();
      const newPass = newPassInput?.value;
      const confPass = confPassInput?.value;

      if (!otp || otp.length !== 6) {
        alert('Please enter the 6-digit OTP sent to your email.');
        return;
      }
      if (!newPass || newPass.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
      }
      if (newPass !== confPass) {
        alert('Passwords do not match.');
        return;
      }

      const resetBtn = newPasswordForm.querySelector('button[type="submit"]');
      const originalText = resetBtn?.textContent || 'Reset';

      if (resetBtn) {
        resetBtn.textContent = 'Resetting...';
        resetBtn.style.opacity = '0.7';
        resetBtn.disabled = true;
      }

      const resetEmail = localStorage.getItem('resetEmail');
      if (!resetEmail) {
        alert('Session expired. Please start over.');
        window.location.href = '../Email/email.html';
        return;
      }

      try {
        const authService = window.NibrasServices?.authService;
        if (!authService) {
          alert('Auth service not available. Please try again later.');
          if (resetBtn) {
            resetBtn.textContent = originalText;
            resetBtn.style.opacity = '';
            resetBtn.disabled = false;
          }
          return;
        }
        await authService.resetPassword({
          email: resetEmail,
          otp,
          newPassword: newPass,
        });

        localStorage.removeItem('resetEmail');
        window.location.href = '../Message/message.html';
      } catch (error) {
        console.error('[RESET PASSWORD ERROR]', error);
        alert('Network error. Please try again.');
        if (resetBtn) {
          resetBtn.textContent = originalText;
          resetBtn.style.opacity = '';
          resetBtn.disabled = false;
        }
      }
    });
  }
});
