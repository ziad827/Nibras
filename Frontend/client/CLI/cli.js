function updateSidebarUser() {
  try {
    var u = JSON.parse(localStorage.getItem('user'));
    if (!u || !u.name) return;
    var nameEl = document.querySelector('.user-info h4');
    if (nameEl) nameEl.textContent = u.name;
    var roleEl = document.querySelector('.user-info span');
    if (roleEl) {
      var r = u.role;
      roleEl.textContent =
        typeof r === 'object' && r
          ? r.name || r.title || 'student'
          : r || 'student';
    }
    var avatarEl = document.querySelector('.avatar-circle');
    if (avatarEl) {
      var initials = u.name
        .split(' ')
        .map(function (n) {
          return n.charAt(0);
        })
        .join('')
        .toUpperCase()
        .slice(0, 2);
      avatarEl.textContent = initials || 'U';
    }
    var smallAvatar = document.querySelector('.profile-circle-small');
    if (smallAvatar) smallAvatar.textContent = initials || 'U';
  } catch (_) {}
}

window.NibrasReact.run(function () {
  updateSidebarUser();
  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    var htmlEl = document.documentElement;
    var themeIcon = themeToggle.querySelector('i');
    var saved = localStorage.getItem('theme') || 'light';
    htmlEl.setAttribute('data-theme', saved);
    updateUI(themeIcon, saved);
    themeToggle.classList.remove('rotating');
    void themeToggle.offsetWidth;
    themeToggle.addEventListener('click', function () {
      var cur = htmlEl.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      htmlEl.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateUI(themeIcon, next);
      themeToggle.classList.add('rotating');
      setTimeout(function () {
        themeToggle.classList.remove('rotating');
      }, 500);
    });
  }
  function updateUI(el, theme) {
    if (!el) return;
    el.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    var logo = document.querySelector('.sidebar-logo');
    if (logo)
      logo.src =
        theme === 'dark'
          ? '../Assets/images/logo-dark.png'
          : '../Assets/images/logo-light.png';
  }

  loadProgress();
});

function toggleStep(num) {
  var body = document.getElementById('body-' + num);
  if (body) body.classList.toggle('open');
}

function markStep(num) {
  var check = document.getElementById('check-' + num);
  if (check) {
    check.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    check.classList.add('done');
  }
  var body = document.getElementById('body-' + num);
  if (body) body.classList.remove('open');
  saveProgress(num);
}

function loadProgress() {
  try {
    var stored = JSON.parse(
      localStorage.getItem('nibras_cli_progress') || '[]',
    );
    stored.forEach(function (num) {
      var check = document.getElementById('check-' + num);
      if (check) {
        check.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        check.classList.add('done');
      }
    });
    document.getElementById('cli-step-count').textContent = stored.length;
  } catch (_) {}
}

function saveProgress(num) {
  try {
    var stored = JSON.parse(
      localStorage.getItem('nibras_cli_progress') || '[]',
    );
    if (stored.indexOf(num) === -1) stored.push(num);
    localStorage.setItem('nibras_cli_progress', JSON.stringify(stored));
    document.getElementById('cli-step-count').textContent = stored.length;
  } catch (_) {}
}

function switchStep2Shell(shell, btn) {
  var parent = btn.closest('.step-body');
  if (!parent) return;
  parent.querySelectorAll('#step-02-os-tabs .os-tab').forEach(function (t) {
    t.classList.remove('active');
  });
  btn.classList.add('active');
  parent.querySelectorAll('.step2-shell').forEach(function (c) {
    c.style.display = 'none';
  });
  parent.querySelectorAll('.step2-shell.' + shell).forEach(function (c) {
    c.style.display = '';
  });
}

function switchWinShell(shell, btn) {
  document.querySelectorAll('.win-tabs .os-tab').forEach(function (t) {
    t.classList.remove('active');
  });
  btn.classList.add('active');
  document.querySelectorAll('.win-shell').forEach(function (c) {
    c.style.display = 'none';
  });
  document.querySelectorAll('.win-shell.' + shell).forEach(function (c) {
    c.style.display = '';
  });
}

function switchOs(os, btn) {
  document.querySelectorAll('.os-tab').forEach(function (t) {
    t.classList.remove('active');
  });
  btn.classList.add('active');
  document.querySelectorAll('.os-content').forEach(function (c) {
    c.style.display = 'none';
  });
  document.querySelectorAll('.os-content.' + os).forEach(function (c) {
    c.style.display = '';
  });
}

function copyCmd(btn) {
  var code = btn.previousElementSibling;
  if (!code) return;
  var text = code.textContent || code.innerText || '';
  navigator.clipboard
    .writeText(text.trim())
    .then(function () {
      btn.textContent = 'Copied!';
      setTimeout(function () {
        btn.textContent = 'Copy';
      }, 1500);
    })
    .catch(function () {
      btn.textContent = 'Failed';
    });
}
