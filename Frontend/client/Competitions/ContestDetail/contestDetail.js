window.NibrasReact.run(function () {
  var competitionsService = window.NibrasServices?.competitionsService;
  var shared = window.NibrasShared || {};

  var contestData = null;
  var problems = [];
  var standings = [];
  var submissions = [];
  var selectedProblemIndex = -1;
  var currentTab = 'problems';
  var timerInterval = null;
  var socket = null;
  var contestId = getQueryParam('id');
  var currentUserId = null;
  var isPracticeMode = getQueryParam('mode') === 'practice';

  var els = {
    title: document.getElementById('contest-title'),
    platform: document.getElementById('contest-platform'),
    status: document.getElementById('contest-status'),
    scoring: document.getElementById('contest-scoring'),
    description: document.getElementById('contest-description'),
    timer: document.getElementById('timer-value'),
    problemsList: document.getElementById('problems-list'),
    solvedCount: document.getElementById('solved-count'),
    placeholder: document.getElementById('problem-placeholder'),
    problemContent: document.getElementById('problem-content'),
    problemTitle: document.getElementById('problem-title'),
    problemMeta: document.getElementById('problem-meta'),
    problemBody: document.getElementById('problem-body'),
    problemSample: document.getElementById('problem-sample'),
    codeEditor: document.getElementById('code-editor'),
    languageSelect: document.getElementById('language-select'),
    submitBtn: document.getElementById('submit-code-btn'),
    submissionStatus: document.getElementById('submission-status'),
    leaderboardBody: document.getElementById('leaderboard-body'),
    submissionsBody: document.getElementById('submissions-body'),
  };

  function getQueryParam(name) {
    var match = new RegExp('[?&]' + name + '=([^&]*)').exec(
      window.location.search,
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  function esc(str) {
    if (!str && str !== 0) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      var d = new Date(dateStr);
      var now = new Date();
      var diff = now - d;
      var mins = Math.floor(diff / 60000);
      var hours = Math.floor(diff / 3600000);
      var days = Math.floor(diff / 86400000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return mins + 'm ago';
      if (hours < 24) return hours + 'h ago';
      if (days < 7) return days + 'd ago';
      return d.toLocaleDateString();
    } catch (_) {
      return String(dateStr || '');
    }
  }

  function getProblemLetter(index) {
    return String.fromCharCode(65 + index);
  }

  // ==========================================
  // CONTEST LOADING
  // ==========================================
  function loadContest() {
    if (!contestId) {
      els.title.textContent = 'No contest specified';
      return;
    }

    if (!competitionsService) {
      els.title.textContent = 'Competitions service unavailable';
      return;
    }

    els.title.textContent = 'Loading...';

    if (isPracticeMode) {
      loadPracticeProblem();
      return;
    }

    competitionsService
      .getContestById(contestId)
      .then(function (data) {
        contestData = data;
        problems = data.problems || data.questions || [];
        standings = data.standings || [];
        currentUserId = getUserId();

        renderHeader();
        renderProblemsList();
        startTimer();
        loadSubmissions();
        initSocket();
      })
      .catch(function (err) {
        console.error('Failed to load contest:', err);
        els.title.textContent = 'Failed to load contest';
        els.title.parentElement.innerHTML +=
          '<p style="color:var(--text-secondary);">' +
          esc(err.message || 'Could not load contest details.') +
          '</p>';
      });
  }

  function loadPracticeProblem() {
    competitionsService
      .listProblems({})
      .then(function (problemsData) {
        var all = Array.isArray(problemsData)
          ? problemsData
          : Array.isArray(problemsData?.problems)
            ? problemsData.problems
            : [];
        var problem = all.find(function (p) {
          return (p._id || p.id) === contestId;
        });

        if (!problem) {
          els.title.textContent = 'Problem not found';
          els.problemsList.innerHTML =
            '<div class="loading-state">Problem not found.</div>';
          return;
        }

        problems = [problem];
        contestData = {
          name: problem.title || 'Practice',
          platform: 'Practice',
        };
        currentUserId = getUserId();

        hideContestTabs();
        els.timer.parentElement.style.display = 'none';
        els.solvedCount.parentElement.parentElement.style.display = 'none';
        els.title.textContent = problem.title || 'Untitled Problem';
        els.platform.textContent = 'Practice';
        els.status.textContent = 'practice';
        els.status.className = 'contest-status-badge ended';
        els.scoring.textContent = '';
        els.description.textContent = problem.description || '';

        renderProblemsList();

        var backLink = document.querySelector('.back-link');
        if (backLink) backLink.href = '../Practice/practice.html';
      })
      .catch(function (err) {
        console.error('Failed to load practice problem:', err);
        els.title.textContent = 'Failed to load problem';
        els.title.parentElement.innerHTML +=
          '<p style="color:var(--text-secondary);">' +
          esc(err.message || 'Could not load problem.') +
          '</p>';
      });
  }

  function hideContestTabs() {
    document.querySelectorAll('.contest-tab').forEach(function (tab) {
      if (tab.dataset.tab !== 'problems') {
        tab.style.display = 'none';
      }
    });
    document.querySelectorAll('.tab-content').forEach(function (content) {
      if (content.id !== 'tab-problems') {
        content.style.display = 'none';
      }
    });
  }

  function getUserId() {
    try {
      var user = JSON.parse(localStorage.getItem('user') || '{}');
      return user._id || user.id || null;
    } catch (_) {
      return null;
    }
  }

  function renderHeader() {
    if (!contestData) return;

    els.title.textContent =
      contestData.name || contestData.title || 'Untitled Contest';
    els.platform.textContent = contestData.platform || 'Internal';
    els.scoring.textContent = (contestData.scoringType || 'icpc').toUpperCase();

    var status = (contestData.status || 'upcoming').toLowerCase();
    els.status.textContent = status;
    els.status.className = 'contest-status-badge ' + status;

    els.description.textContent = contestData.description || '';
    els.solvedCount.textContent = '0/' + problems.length;
  }

  function startTimer() {
    if (!contestData) return;
    var endDate = contestData.endDate || contestData.endTime;
    if (!endDate) {
      els.timer.textContent = '--:--:--';
      return;
    }

    function tick() {
      var now = Date.now();
      var end = new Date(endDate).getTime();
      var diff = end - now;

      if (diff <= 0) {
        els.timer.textContent = '00:00:00';
        els.timer.className = 'timer-value expired';
        if (timerInterval) clearInterval(timerInterval);
        return;
      }

      var hours = Math.floor(diff / 3600000);
      var mins = Math.floor((diff % 3600000) / 60000);
      var secs = Math.floor((diff % 60000) / 1000);

      els.timer.textContent =
        String(hours).padStart(2, '0') +
        ':' +
        String(mins).padStart(2, '0') +
        ':' +
        String(secs).padStart(2, '0');

      if (diff < 600000) els.timer.className = 'timer-value warning';
      else els.timer.className = 'timer-value';
    }

    tick();
    timerInterval = setInterval(tick, 1000);
  }

  // ==========================================
  // PROBLEMS TAB
  // ==========================================
  function renderProblemsList() {
    if (!els.problemsList || problems.length === 0) {
      els.problemsList.innerHTML =
        '<div class="loading-state">No problems available.</div>';
      return;
    }

    var html = '';
    var solvedCount = 0;

    problems.forEach(function (p, i) {
      var letter = getProblemLetter(i);
      var title = p.title || p.name || 'Problem ' + letter;
      var difficulty = p.difficulty || 'medium';
      var status = p.userStatus || p.status || 'unsolved';
      var statusIcon = '';
      if (status === 'solved' || status === 'accepted') {
        statusIcon =
          '<span class="prob-status-icon solved"><i class="fa-regular fa-circle-check"></i></span>';
        solvedCount++;
      } else if (status === 'attempted') {
        statusIcon =
          '<span class="prob-status-icon attempted"><i class="fa-regular fa-circle-xmark"></i></span>';
      } else {
        statusIcon =
          '<span class="prob-status-icon"><i class="fa-regular fa-circle"></i></span>';
      }

      html +=
        '<div class="problem-list-item' +
        (i === selectedProblemIndex ? ' active' : '') +
        '" data-index="' +
        i +
        '">';
      html += '<span class="prob-letter">' + letter + '</span>';
      html += statusIcon;
      html += '<span class="prob-name">' + esc(title) + '</span>';
      html +=
        '<span class="prob-difficulty ' +
        esc(difficulty) +
        '">' +
        esc(difficulty) +
        '</span>';
      html += '</div>';
    });

    els.problemsList.innerHTML = html;
    els.solvedCount.textContent = solvedCount + '/' + problems.length;

    if (selectedProblemIndex === -1 && problems.length > 0) {
      selectProblem(0);
    }
  }

  function selectProblem(index) {
    if (index < 0 || index >= problems.length) return;
    selectedProblemIndex = index;
    var problem = problems[index];

    document.querySelectorAll('.problem-list-item').forEach(function (el) {
      el.classList.toggle('active', parseInt(el.dataset.index) === index);
    });

    els.placeholder.style.display = 'none';
    els.problemContent.style.display = 'flex';

    els.problemTitle.textContent =
      getProblemLetter(index) +
      '. ' +
      (problem.title || problem.name || 'Problem');
    els.problemMeta.innerHTML = '';
    var difficulty = problem.difficulty || 'medium';
    els.problemMeta.innerHTML +=
      '<span><i class="fa-solid fa-signal"></i> ' + esc(difficulty) + '</span>';
    if (problem.timeLimit)
      els.problemMeta.innerHTML +=
        '<span><i class="fa-regular fa-clock"></i> ' +
        esc(problem.timeLimit) +
        'ms</span>';
    if (problem.memoryLimit)
      els.problemMeta.innerHTML +=
        '<span><i class="fa-solid fa-memory"></i> ' +
        esc(problem.memoryLimit) +
        'MB</span>';
    if (problem.points)
      els.problemMeta.innerHTML +=
        '<span><i class="fa-solid fa-star"></i> ' +
        esc(problem.points) +
        ' pts</span>';
    if (Array.isArray(problem.tags) && problem.tags.length > 0) {
      problem.tags.forEach(function (t) {
        els.problemMeta.innerHTML +=
          '<span style="padding:2px 8px;border-radius:4px;background:var(--tag-bg);font-size:0.78rem;">' +
          esc(typeof t === 'string' ? t : t.name || t) +
          '</span>';
      });
    }

    var body =
      problem.description ||
      problem.statement ||
      problem.body ||
      'No description available.';
    els.problemBody.innerHTML =
      typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(body) : body;

    els.problemSample.innerHTML = '';
    var samples =
      problem.sampleIO ||
      problem.samples ||
      problem.testCases?.filter(function (tc) {
        return tc.isSample;
      }) ||
      problem.sampleTestCases ||
      [];
    if (Array.isArray(samples) && samples.length > 0) {
      samples.forEach(function (s, i) {
        var input = s.input || s.in || '';
        var output = s.output || s.expectedOutput || s.expected || s.out || '';
        if (!input && !output) return;
        els.problemSample.innerHTML +=
          '<div class="sample-label">Sample ' + (i + 1) + ':</div>';
        if (input)
          els.problemSample.innerHTML +=
            '<div class="sample-box"><strong>Input:</strong>\n' +
            esc(input) +
            '</div>';
        if (output)
          els.problemSample.innerHTML +=
            '<div class="sample-box"><strong>Output:</strong>\n' +
            esc(output) +
            '</div>';
      });
    }

    els.codeEditor.value = '';
    els.submissionStatus.textContent = '';
    els.submitBtn.disabled = false;
    els.submitBtn.innerHTML = '<i class="fa-solid fa-play"></i> Submit';
  }

  // ==========================================
  // SUBMISSIONS
  // ==========================================
  function loadSubmissions() {
    if (!contestId || !competitionsService) return;

    var token = getToken();
    if (!token) return;

    var query = '?contestId=' + encodeURIComponent(contestId);
    var currentUserIdVal = getUserId();
    if (currentUserIdVal)
      query += '&userId=' + encodeURIComponent(currentUserIdVal);

    competitionsService
      .listContests({})
      .then(function () {
        fetchSubmissionsFallback(query);
      })
      .catch(function () {
        fetchSubmissionsFallback(query);
      });
  }

  function fetchSubmissionsFallback(query) {
    var apiUrl = getApiBaseUrl();
    if (!apiUrl) return;

    var token = getToken();
    var url = apiUrl.replace(/\/+$/, '') + '/submissions' + query;

    fetch(url, {
      headers: { Authorization: token ? 'Bearer ' + token : '' },
    })
      .then(function (res) {
        if (!res.ok) return;
        return res.json();
      })
      .then(function (data) {
        var list =
          data?.data || data?.submissions || (Array.isArray(data) ? data : []);
        submissions = Array.isArray(list) ? list : [];
        renderSubmissions();
      })
      .catch(function () {});
  }

  function renderSubmissions() {
    if (!els.submissionsBody) return;
    if (submissions.length === 0) {
      els.submissionsBody.innerHTML =
        '<tr><td colspan="6" class="table-empty">No submissions yet.</td></tr>';
      return;
    }

    var html = '';
    submissions.forEach(function (s) {
      var probIndex = problems.findIndex(function (p) {
        return (p._id || p.id) === (s.problemId || s.problem);
      });
      var letter = probIndex >= 0 ? getProblemLetter(probIndex) : '?';
      var probName =
        s.problemName ||
        s.problemTitle ||
        (probIndex >= 0 ? problems[probIndex].title : 'Problem ' + letter);
      var lang = s.language || 'N/A';
      var status = s.status || 'pending';
      var statusClass = 'status-pending';
      if (status === 'accepted' || status === 'AC' || status === 'correct') {
        statusClass = 'status-accepted';
        status = 'Accepted';
      } else if (status === 'wrong' || status === 'WA') {
        statusClass = 'status-rejected';
        status = 'Wrong Answer';
      } else if (status === 'tle' || status === 'TLE') {
        statusClass = 'status-rejected';
        status = 'Time Limit Exceeded';
      } else if (status === 'mle' || status === 'MLE') {
        statusClass = 'status-rejected';
        status = 'Memory Limit Exceeded';
      } else if (status === 're' || status === 'RE' || status === 'error') {
        statusClass = 'status-rejected';
        status = 'Runtime Error';
      } else if (
        status === 'pending' ||
        status === 'PENDING' ||
        status === 'queue'
      ) {
        statusClass = 'status-pending';
        status = 'Pending...';
      }

      var runtime = s.runtime != null ? s.runtime + 'ms' : '—';
      var memory = s.memory != null ? s.memory + 'KB' : '—';

      html += '<tr>';
      html += '<td>' + esc(letter) + '. ' + esc(probName) + '</td>';
      html += '<td>' + esc(lang.toUpperCase()) + '</td>';
      html += '<td class="' + statusClass + '">' + esc(status) + '</td>';
      html += '<td>' + runtime + '</td>';
      html += '<td>' + memory + '</td>';
      html += '<td>' + formatDate(s.submittedAt || s.createdAt) + '</td>';
      html += '</tr>';
    });
    els.submissionsBody.innerHTML = html;
  }

  // ==========================================
  // CODE SUBMISSION
  // ==========================================
  function submitSolution() {
    var problem = problems[selectedProblemIndex];
    if (!problem) return;

    var code = els.codeEditor.value.trim();
    if (!code) {
      els.submissionStatus.textContent = 'Please write some code first.';
      return;
    }

    var language = els.languageSelect.value;
    var problemId = problem._id || problem.id;

    els.submitBtn.disabled = true;
    els.submitBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
    els.submissionStatus.textContent = 'Submitting...';
    els.submissionStatus.style.color = 'var(--text-secondary)';

    var token = getToken();
    var apiUrl = getApiBaseUrl();
    if (!apiUrl || !token) {
      els.submissionStatus.textContent = 'Sign in to submit solutions.';
      els.submitBtn.disabled = false;
      els.submitBtn.innerHTML = '<i class="fa-solid fa-play"></i> Submit';
      return;
    }

    var url;
    if (isPracticeMode) {
      url = apiUrl.replace(/\/+$/, '') + '/submissions';
    } else {
      url =
        apiUrl.replace(/\/+$/, '') +
        '/contests/' +
        encodeURIComponent(contestId) +
        '/submissions';
    }

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        problemId: problemId,
        language: language,
        code: code,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok)
            throw new Error(data.message || data.error || 'Submission failed');
          return data;
        });
      })
      .then(function (data) {
        els.submissionStatus.textContent = 'Submitted! Waiting for result...';
        els.submissionStatus.style.color = '#d97706';
        els.submitBtn.disabled = false;
        els.submitBtn.innerHTML = '<i class="fa-solid fa-play"></i> Submit';

        var submissionId =
          data._id || data.id || data.submission?._id || data.submission?.id;
        if (submissionId) {
          pollSubmissionStatus(submissionId);
        }
      })
      .catch(function (err) {
        console.error('Submit error:', err);
        els.submissionStatus.textContent = err.message || 'Submission failed.';
        els.submissionStatus.style.color = '#dc2626';
        els.submitBtn.disabled = false;
        els.submitBtn.innerHTML = '<i class="fa-solid fa-play"></i> Submit';
      });
  }

  function pollSubmissionStatus(submissionId) {
    var token = getToken();
    var apiUrl = getApiBaseUrl();
    if (!apiUrl || !token) return;

    var maxAttempts = 30;
    var attempt = 0;

    function poll() {
      attempt++;
      var url =
        apiUrl.replace(/\/+$/, '') +
        '/submissions/' +
        encodeURIComponent(submissionId);
      fetch(url, {
        headers: { Authorization: 'Bearer ' + token },
      })
        .then(function (res) {
          if (!res.ok) return null;
          return res.json();
        })
        .then(function (data) {
          var sub = data?.data || data?.submission || data;
          var status = (sub?.status || '').toLowerCase();

          if (
            status === 'accepted' ||
            status === 'ac' ||
            status === 'correct'
          ) {
            els.submissionStatus.textContent = 'Accepted!';
            els.submissionStatus.style.color = '#16a34a';
            updateProblemStatus(selectedProblemIndex, 'solved');
            loadSubmissions();
            if (!isPracticeMode) loadLeaderboard();
            return;
          }

          if (status === 'wrong' || status === 'wa') {
            els.submissionStatus.textContent = 'Wrong Answer';
            els.submissionStatus.style.color = '#dc2626';
            updateProblemStatus(selectedProblemIndex, 'attempted');
            loadSubmissions();
            return;
          }

          if (status === 'tle') {
            els.submissionStatus.textContent = 'Time Limit Exceeded';
            els.submissionStatus.style.color = '#dc2626';
            updateProblemStatus(selectedProblemIndex, 'attempted');
            loadSubmissions();
            return;
          }

          if (status === 'mle') {
            els.submissionStatus.textContent = 'Memory Limit Exceeded';
            els.submissionStatus.style.color = '#dc2626';
            updateProblemStatus(selectedProblemIndex, 'attempted');
            loadSubmissions();
            return;
          }

          if (status === 're' || status === 'error') {
            els.submissionStatus.textContent = 'Runtime Error';
            els.submissionStatus.style.color = '#dc2626';
            updateProblemStatus(selectedProblemIndex, 'attempted');
            loadSubmissions();
            return;
          }

          if (attempt < maxAttempts) {
            setTimeout(poll, 2000);
          } else {
            els.submissionStatus.textContent =
              'Result pending... check submissions tab.';
            els.submissionStatus.style.color = 'var(--text-secondary)';
          }
        })
        .catch(function () {
          if (attempt < maxAttempts) setTimeout(poll, 2000);
        });
    }

    setTimeout(poll, 2000);
  }

  function updateProblemStatus(index, status) {
    if (index >= 0 && index < problems.length) {
      problems[index].userStatus = status;
      renderProblemsList();
      selectProblem(selectedProblemIndex);
    }
    if (isPracticeMode && status === 'solved') {
      try {
        var solved = JSON.parse(
          localStorage.getItem('practice_solved') || '[]',
        );
        if (solved.indexOf(contestId) === -1) solved.push(contestId);
        localStorage.setItem('practice_solved', JSON.stringify(solved));
      } catch (_) {}
    }
  }

  function getToken() {
    try {
      if (typeof shared.auth?.getToken === 'function')
        return shared.auth.getToken();
    } catch (_) {}
    return localStorage.getItem('token') || null;
  }

  function getApiBaseUrl() {
    try {
      if (window.NibrasShared?.resolveServiceUrl) {
        return window.NibrasShared.resolveServiceUrl('admin');
      }
      if (window.NibrasApiConfig?.getServiceUrl) {
        return window.NibrasApiConfig.getServiceUrl('admin');
      }
    } catch (_) {}
    return (
      window.NIBRAS_API_URL ||
      window.NIBRAS_BACKEND_URL ||
      'https://nibras-backend.up.railway.app/api'
    );
  }

  // ==========================================
  // LEADERBOARD
  // ==========================================
  function loadLeaderboard() {
    if (!els.leaderboardBody) return;

    if (!contestData) {
      els.leaderboardBody.innerHTML =
        '<tr><td colspan="5" class="table-empty">Contest data not loaded.</td></tr>';
      return;
    }

    var standingsData = contestData.standings || contestData.leaderboard || [];

    if (standingsData.length === 0) {
      els.leaderboardBody.innerHTML =
        '<tr><td colspan="5" class="table-empty">No participants yet.</td></tr>';
      return;
    }

    renderLeaderboard(standingsData);
  }

  function renderLeaderboard(entries) {
    var html = '';
    var isIcpc = (contestData.scoringType || 'icpc').toLowerCase() === 'icpc';

    entries.forEach(function (entry, i) {
      var rank = i + 1;
      var rankClass = rank <= 3 ? 'rank-' + rank : '';
      var userName =
        entry.userName || entry.name || entry.user?.name || 'User ' + rank;
      var userId = entry.userId || entry.user?._id || entry.user?.id || '';
      var isCurrentUser =
        userId &&
        currentUserId &&
        (userId === currentUserId ||
          userId.toString() === currentUserId.toString());
      var solved = entry.solved || entry.problemsSolved || entry.score || 0;
      var penalty =
        entry.penalty ||
        entry.penaltyTime ||
        (entry.totalTime != null ? entry.totalTime : '—');
      var score = entry.totalScore || entry.score || entry.points || '';
      var userInitials = getInitials(userName);

      html += '<tr' + (isCurrentUser ? ' class="current-user-row"' : '') + '>';
      html += '<td><span class="' + rankClass + '">#' + rank + '</span></td>';
      html +=
        '<td class="col-user"><span class="user-avatar-small">' +
        userInitials +
        '</span><span class="user-name-display">' +
        esc(userName) +
        '</span></td>';
      html += '<td>' + solved + '</td>';
      html +=
        '<td>' + (penalty !== '—' && penalty != null ? penalty : '—') + '</td>';
      html += '<td>' + (score !== '' ? score : '—') + '</td>';
      html += '</tr>';
    });

    els.leaderboardBody.innerHTML = html;
  }

  function updateLeaderboardFromSocket(standingsData) {
    if (!standingsData || !Array.isArray(standingsData)) return;
    renderLeaderboard(standingsData);
  }

  // ==========================================
  // SOCKET.IO
  // ==========================================
  function initSocket() {
    if (typeof io === 'undefined') return;
    if (!contestId) return;

    try {
      var backendUrl = getApiBaseUrl()
        .replace(/\/api\/?$/, '')
        .replace(/\/+$/, '');
      if (!backendUrl) return;

      socket = io(backendUrl, { transports: ['websocket', 'polling'] });

      socket.on('connect', function () {
        socket.emit('contest:join', contestId);
      });

      socket.on('contest:standings', function (data) {
        if (data && Array.isArray(data)) {
          updateLeaderboardFromSocket(data);
        } else if (data && data.standings && Array.isArray(data.standings)) {
          updateLeaderboardFromSocket(data.standings);
        }
      });

      socket.on('submission:status', function (data) {
        if (data && (data.contestId === contestId || !data.contestId)) {
          loadSubmissions();
          var probIdx = -1;
          if (data.problemId) {
            probIdx = problems.findIndex(function (p) {
              return (p._id || p.id) === data.problemId;
            });
          }
          if (probIdx >= 0 && data.status) {
            var statusLower = String(data.status).toLowerCase();
            if (statusLower === 'accepted' || statusLower === 'ac') {
              updateProblemStatus(probIdx, 'solved');
            } else if (
              ['wrong', 'wa', 'tle', 'mle', 're'].indexOf(statusLower) !== -1
            ) {
              updateProblemStatus(probIdx, 'attempted');
            }
          }
        }
      });

      socket.on('disconnect', function () {});
      socket.on('connect_error', function () {});
    } catch (e) {
      console.warn('Socket.io init failed:', e);
    }
  }

  // ==========================================
  // TAB SWITCHING
  // ==========================================
  function switchTab(tab) {
    currentTab = tab;

    document.querySelectorAll('.contest-tab').forEach(function (el) {
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    document.querySelectorAll('.tab-content').forEach(function (el) {
      el.classList.toggle('active', el.id === 'tab-' + tab);
    });

    if (tab === 'leaderboard') loadLeaderboard();
    if (tab === 'submissions') loadSubmissions();
  }

  // ==========================================
  // THEME
  // ==========================================
  var themeBtn = document.getElementById('themeBtn');
  var themeIcon = themeBtn && themeBtn.querySelector('i');
  var appLogo = document.getElementById('app-logo');

  var savedTheme = localStorage.getItem('theme');
  if (savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme);
  var curTheme = document.documentElement.getAttribute('data-theme') || 'light';
  if (curTheme === 'dark') {
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
    if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  }

  if (themeBtn) {
    themeBtn.classList.remove('rotating');
    void themeBtn.offsetWidth;
    themeBtn.addEventListener('click', function () {
      themeBtn.classList.add('rotating');
      setTimeout(function () {
        themeBtn.classList.remove('rotating');
      }, 500);
      var html = document.documentElement;
      var cur = html.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      if (themeIcon)
        themeIcon.className =
          next === 'dark' ? 'fa-solid fa-sun' : 'fa-regular fa-moon';
      if (appLogo)
        appLogo.src =
          next === 'dark'
            ? '/Assets/images/logo-dark.png'
            : '/Assets/images/logo-light.png';
    });
  }

  // ==========================================
  // USER INFO
  // ==========================================
  try {
    var user = JSON.parse(localStorage.getItem('user') || '{}');
    var initials = user.name
      ? getInitials(user.name)
      : user.email
        ? user.email[0].toUpperCase()
        : '?';
    document
      .querySelectorAll('.avatar-circle, .profile-circle-small')
      .forEach(function (el) {
        if (el) el.textContent = initials;
      });
    var nameEl = document.querySelector('.user-info h4');
    if (nameEl) nameEl.textContent = user.name || 'User';
    var roleEl = document.querySelector('.user-info span');
    if (roleEl) roleEl.textContent = user.role?.name || user.role || 'student';
    var repEl = document.querySelector('.rep-badge');
    if (repEl) repEl.textContent = user.reputation || user.rep || 0;
  } catch (_) {}

  // ==========================================
  // EVENT BINDINGS
  // ==========================================

  els.problemsList.addEventListener('click', function (e) {
    var item = e.target.closest('.problem-list-item');
    if (item) selectProblem(parseInt(item.dataset.index));
  });

  els.submitBtn.addEventListener('click', submitSolution);

  document.querySelectorAll('.contest-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchTab(tab.dataset.tab);
    });
  });

  var refreshBtn = document.getElementById('refresh-standings-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      loadContest();
    });
  }

  // ==========================================
  // INIT
  // ==========================================

  if (!contestId) {
    els.title.textContent = 'No contest ID provided';
    els.problemsList.innerHTML =
      '<div class="loading-state">Add ?id=CONTEST_ID to the URL to view a contest.</div>';
    return;
  }

  loadContest();
});
