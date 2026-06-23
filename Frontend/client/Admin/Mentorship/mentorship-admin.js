window.NibrasReact.run(function () {
  var listEl = document.getElementById('mentor-profiles-list');
  var svc = window.NibrasServices && window.NibrasServices.mentorshipService;

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = String(str || '');
    return d.innerHTML;
  }

  function render(profiles) {
    if (!listEl) return;
    if (!profiles.length) {
      listEl.innerHTML =
        '<p style="color:var(--text-secondary);">No mentor profiles.</p>';
      return;
    }
    listEl.innerHTML = profiles
      .map(function (p) {
        var tags = (p.expertise || [])
          .map(function (t) {
            return '<span style="margin-right:6px;">' + esc(t) + '</span>';
          })
          .join('');
        return (
          '<div style="border:1px solid var(--border-color);border-radius:8px;padding:1rem;margin-bottom:12px;">' +
          '<strong>' +
          esc(p.userName || p.userId) +
          '</strong> · ' +
          esc(p.status) +
          '<p style="color:var(--text-secondary);margin:8px 0;">' +
          esc(p.bio || '') +
          '</p>' +
          '<div>' +
          tags +
          '</div>' +
          (p.status === 'pending'
            ? '<div style="margin-top:10px;display:flex;gap:8px;"><button class="btn-approve" data-user="' +
              esc(p.userId) +
              '">Approve</button><button class="btn-reject" data-user="' +
              esc(p.userId) +
              '">Reject</button></div>'
            : '') +
          '</div>'
        );
      })
      .join('');

    listEl.querySelectorAll('.btn-approve').forEach(function (btn) {
      btn.addEventListener('click', function () {
        svc
          .approveProfile(btn.getAttribute('data-user'))
          .then(load)
          .catch(function (err) {
            alert(err.message || 'Approve failed');
          });
      });
    });
    listEl.querySelectorAll('.btn-reject').forEach(function (btn) {
      btn.addEventListener('click', function () {
        svc
          .rejectProfile(btn.getAttribute('data-user'))
          .then(load)
          .catch(function (err) {
            alert(err.message || 'Reject failed');
          });
      });
    });
  }

  function load() {
    if (!svc) {
      listEl.innerHTML = '<p>Service unavailable.</p>';
      return;
    }
    svc
      .listProfiles('pending')
      .then(function (res) {
        var data = res && (res.data || res);
        var profiles = Array.isArray(data.profiles)
          ? data.profiles
          : Array.isArray(data)
            ? data
            : [];
        render(profiles);
      })
      .catch(function (err) {
        listEl.innerHTML =
          '<p style="color:#ef4444;">' + esc(err.message || 'Load failed') + '</p>';
      });
  }

  load();
});
