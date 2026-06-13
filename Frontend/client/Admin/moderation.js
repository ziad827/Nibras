window.NibrasReact.run(() => {
  const container = document.getElementById('mod-queue-container');
  const queueCount = document.getElementById('queue-count');
  let currentFilter = 'pending';

  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = now - d;
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString();
    } catch (_) {
      return String(dateStr || '');
    }
  }

  async function loadQueue(status) {
    container.innerHTML =
      '<div class="loading-state" style="text-align:center;padding:3rem;color:var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;margin-bottom:1rem;display:block;"></i><p>Loading moderation queue...</p></div>';

    try {
      const flagService = window.NibrasServices?.flagService;
      if (!flagService) {
        container.innerHTML =
          '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Flag service not available. Make sure you are signed in as admin.</p></div>';
        return;
      }

      const filters = {};
      if (status && status !== 'all') filters.status = status;
      const result = await flagService.getQueue(filters);
      const data = result?.data || result?.flags || result || [];
      const items = Array.isArray(data) ? data : [];

      if (queueCount) {
        queueCount.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
      }

      if (items.length === 0) {
        container.innerHTML =
          '<div class="empty-state"><i class="fa-solid fa-check-circle"></i><p>All clear! No items in the queue.</p></div>';
        return;
      }

      let html = '';
      items.forEach(function (flag) {
        const targetType = flag.targetType || 'unknown';
        const reason = flag.reason || 'No reason provided';
        const statusClass = flag.status === 'resolved' ? 'resolved' : '';
        const statusLabel = flag.status === 'resolved' ? ' (Resolved)' : '';
        const reporterName =
          flag.reporter?.name || flag.reporter || 'Anonymous';
        const targetPreview =
          flag.contentPreview ||
          flag.targetPreview ||
          (flag.targetBody
            ? flag.targetBody.substring(0, 200)
            : 'No preview available');

        html += `
                    <div class="flag-card ${statusClass}" data-id="${flag._id || flag.id}">
                        <div class="flag-header">
                            <div>
                                <strong>${targetType}</strong>
                                <span class="flag-reason">${escapeHtml(reason)}</span>
                            </div>
                            <span style="font-size:0.8rem;color:var(--text-secondary);">${formatDate(flag.createdAt)}</span>
                        </div>
                        <div class="flag-content-preview">${escapeHtml(targetPreview)}</div>
                        <div class="flag-meta">
                            <span><i class="fa-regular fa-flag"></i> Reported by: ${escapeHtml(reporterName)}</span>
                            <span><i class="fa-regular fa-clock"></i> Status: ${flag.status || 'pending'}${statusLabel}</span>
                        </div>
                        ${
                          flag.status !== 'resolved'
                            ? `
                        <div class="flag-actions">
                            <button class="btn-dismiss" data-action="dismiss" data-id="${flag._id || flag.id}"><i class="fa-regular fa-circle-check"></i> Dismiss</button>
                            <button class="btn-remove" data-action="remove" data-id="${flag._id || flag.id}"><i class="fa-solid fa-trash"></i> Remove Content</button>
                            <button class="btn-ban" data-action="ban" data-id="${flag._id || flag.id}"><i class="fa-solid fa-ban"></i> Ban User</button>
                        </div>
                        `
                            : ''
                        }
                    </div>
                `;
      });
      container.innerHTML = html;
    } catch (error) {
      console.error('Moderation queue error:', error);
      container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load queue: ${escapeHtml(error.message || 'Unknown error')}</p></div>`;
    }
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  container.addEventListener('click', async function (e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const flagId = btn.dataset.id;
    if (!flagId) return;

    btn.disabled = true;
    btn.style.opacity = '0.5';

    try {
      const flagService = window.NibrasServices?.flagService;
      if (!flagService) {
        alert('Flag service not available.');
        btn.disabled = false;
        btn.style.opacity = '';
        return;
      }

      const payload = { action };
      if (action === 'dismiss') {
        payload.note = 'Dismissed by moderator';
      } else if (action === 'remove') {
        if (!confirm('Remove this content? This action cannot be undone.')) {
          btn.disabled = false;
          btn.style.opacity = '';
          return;
        }
        payload.note = 'Content removed by moderator';
      } else if (action === 'ban') {
        if (
          !confirm(
            'Ban the user who posted this? This action cannot be undone.',
          )
        ) {
          btn.disabled = false;
          btn.style.opacity = '';
          return;
        }
        payload.note = 'User banned by moderator';
      }

      await flagService.resolve(flagId, payload);
      await loadQueue(currentFilter);
    } catch (error) {
      console.error('Resolve error:', error);
      alert(error.message || 'Failed to process action.');
      btn.disabled = false;
      btn.style.opacity = '';
    }
  });

  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn').forEach(function (b) {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = 'var(--text-secondary)';
      });
      btn.classList.add('active');
      btn.style.background = 'var(--accent-blue)';
      btn.style.color = '#fff';
      currentFilter = btn.dataset.status;
      loadQueue(currentFilter);
    });
  });

  function initTheme() {
    var btn = document.getElementById('themeBtn'),
      icon = btn?.querySelector('i'),
      logo = document.getElementById('app-logo');
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    if (cur === 'dark') {
      if (icon) icon.className = 'fa-solid fa-sun';
      if (logo) logo.src = '../Assets/images/logo-dark.png';
    } else {
      if (icon) icon.className = 'fa-regular fa-moon';
      if (logo) logo.src = '../Assets/images/logo-light.png';
    }
    if (btn)
      btn.addEventListener('click', function () {
        btn.style.transform = 'scale(1.2)';
        setTimeout(function () {
          btn.style.transform = 'scale(1)';
        }, 200);
        var h = document.documentElement,
          c = h.getAttribute('data-theme'),
          n = c === 'light' ? 'dark' : 'light';
        h.setAttribute('data-theme', n);
        localStorage.setItem('theme', n);
        if (n === 'dark') {
          if (icon) icon.className = 'fa-solid fa-sun';
          if (logo) logo.src = '../Assets/images/logo-dark.png';
        } else {
          if (icon) icon.className = 'fa-regular fa-moon';
          if (logo) logo.src = '../Assets/images/logo-light.png';
        }
      });
  }

  initTheme();
  loadQueue(currentFilter);
});
