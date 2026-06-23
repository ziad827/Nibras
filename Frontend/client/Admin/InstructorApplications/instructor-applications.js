window.NibrasReact.run(function () {
  var listEl = document.getElementById('applications-list');
  var svc = window.NibrasServices && window.NibrasServices.instructorApplicationService;

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = String(str || '');
    return d.innerHTML;
  }

  function render(rows) {
    if (!listEl) return;
    if (!rows.length) {
      listEl.innerHTML =
        '<p style="color:var(--text-secondary);">No pending applications.</p>';
      return;
    }
    listEl.innerHTML = rows
      .map(function (row) {
        return (
          '<div class="mod-card" style="border:1px solid var(--border-color);border-radius:8px;padding:1rem;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;">' +
          '<div><strong>' +
          esc(row.userName || row.userEmail || row.userId) +
          '</strong><br><span style="color:var(--text-secondary);">' +
          esc(row.department) +
          ' · ' +
          esc(row.status) +
          '</span></div>' +
          '<div style="display:flex;gap:8px;">' +
          (row.status === 'pending'
            ? '<button class="btn-approve" data-id="' +
              esc(row.id) +
              '">Approve</button><button class="btn-reject" data-id="' +
              esc(row.id) +
              '">Reject</button>'
            : '') +
          '</div></div>'
        );
      })
      .join('');

    listEl.querySelectorAll('.btn-approve').forEach(function (btn) {
      btn.addEventListener('click', function () {
        approve(btn.getAttribute('data-id'));
      });
    });
    listEl.querySelectorAll('.btn-reject').forEach(function (btn) {
      btn.addEventListener('click', function () {
        reject(btn.getAttribute('data-id'));
      });
    });
  }

  function load() {
    if (!svc) {
      listEl.innerHTML = '<p>Service unavailable.</p>';
      return;
    }
    svc
      .listAdmin('pending')
      .then(function (res) {
        var rows = Array.isArray(res) ? res : res && res.data ? res.data : [];
        render(rows);
      })
      .catch(function (err) {
        listEl.innerHTML =
          '<p style="color:#ef4444;">' + esc(err.message || 'Load failed') + '</p>';
      });
  }

  function approve(id) {
    svc.approve(id).then(load).catch(function (err) {
      alert(err.message || 'Approve failed');
    });
  }

  function reject(id) {
    svc.reject(id).then(load).catch(function (err) {
      alert(err.message || 'Reject failed');
    });
  }

  load();
});
