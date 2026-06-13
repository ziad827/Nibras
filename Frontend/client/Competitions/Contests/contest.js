(window.NibrasReact && typeof window.NibrasReact.run === 'function'
  ? window.NibrasReact.run.bind(window.NibrasReact)
  : (initializer) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializer, {
          once: true,
        });
      } else {
        initializer();
      }
    })(() => {
  const shared = window.NibrasShared || {};
  const uiStates = shared.uiStates;
  const competitionsService = window.NibrasServices?.competitionsService;
  const token = (() => {
    try {
      if (typeof shared.auth?.getToken === 'function')
        return shared.auth.getToken();
    } catch (_) {}
    return localStorage.getItem('token') || null;
  })();
  let authEnabled = Boolean(token);

  const statsContainer = document.getElementById('stats-container');
  const liveContainer = document.getElementById('live-container');
  const upcomingContainer = document.getElementById('upcoming-container');
  const bookmarksContainer = document.getElementById('bookmarks-container');
  const remindersContainer = document.getElementById('reminders-container');
  const contentWrapper = document.querySelector('.content-wrapper');
  const feedbackNotice = document.createElement('div');
  feedbackNotice.hidden = true;
  feedbackNotice.style.marginBottom = '14px';
  if (contentWrapper)
    contentWrapper.insertBefore(
      feedbackNotice,
      contentWrapper.children[2] || null,
    );

  let runningContests = [];
  let upcomingContests = [];
  let bookmarkedContestIds = new Set();
  let reminderContestIds = new Set();
  let bookmarkedContests = [];
  let reminderContests = [];
  const isAuthError = (error) =>
    Number(error?.status || 0) === 401 || Number(error?.status || 0) === 403;

  let allContests = [];
  let currentView = 'list';
  let calendarViewMode = 'month';
  let currentMonth = new Date().getMonth() + 1;
  let currentYear = new Date().getFullYear();
  let selectedPlatform = 'all';
  let calendarDate = new Date();

  const showFeedback = (message, tone = 'info') => {
    if (!message) {
      feedbackNotice.hidden = true;
      feedbackNotice.textContent = '';
      return;
    }
    feedbackNotice.hidden = false;
    if (uiStates?.render) {
      uiStates.render(feedbackNotice, { mode: 'notice', state: tone, message });
      return;
    }
    feedbackNotice.textContent = message;
  };

  const formatDateKey = (isoValue) => {
    if (!isoValue) return null;
    const d = new Date(isoValue);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const groupContestsByDate = (contests) => {
    const grouped = {};
    contests.forEach((c) => {
      const key = formatDateKey(c.startTime);
      if (!key) return;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    });
    return grouped;
  };

  const getGoogleCalendarLink = (contest) => {
    if (!contest || !contest.startTime) return '#';
    const start = new Date(contest.startTime);
    const dur = Number(contest.duration) || 120;
    const end = new Date(start.getTime() + dur * 60000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = encodeURIComponent(contest.title || 'Contest');
    const details = encodeURIComponent(
      `Platform: ${contest.platform || ''}\nContest: ${contest.url || ''}`,
    );
    const location = encodeURIComponent(contest.url || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&details=${details}&location=${location}`;
  };

  const getChipClass = (platform) => {
    const p = (platform || '').toLowerCase();
    if (p === 'codeforces') return 'calendar-chip-codeforces';
    if (p === 'leetcode') return 'calendar-chip-leetcode';
    if (p === 'atcoder') return 'calendar-chip-atcoder';
    return '';
  };

  const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (year, month) =>
    new Date(year, month - 1, 1).getDay();

  const filterContestsByPlatform = (contests, platform) => {
    if (!platform || platform === 'all') return contests;
    return contests.filter(
      (c) => (c.platform || '').toLowerCase() === platform.toLowerCase(),
    );
  };

  const formatDateTime = (isoValue) => {
    if (!isoValue) return 'TBD';
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return 'TBD';
    return date.toLocaleString();
  };

  const formatDuration = (minutes) => {
    const value = Number(minutes || 0);
    if (!value) return 'N/A';
    if (value < 60) return `${value} min`;
    const hours = Math.floor(value / 60);
    const rem = value % 60;
    return rem ? `${hours}h ${rem}m` : `${hours}h`;
  };

  const timeLeftText = (startTime) => {
    const date = new Date(startTime);
    if (Number.isNaN(date.getTime())) return 'Live now';
    const ms = date.getTime() - Date.now();
    if (ms <= 0) return 'Started';
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m left`;
  };

  const contestIdFromEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return null;
    if (entry.contestId && typeof entry.contestId === 'string')
      return entry.contestId;
    if (entry.contestId && typeof entry.contestId === 'object') {
      return entry.contestId._id || entry.contestId.id || null;
    }
    return entry._id || entry.id || null;
  };

  const refreshStats = () => {
    if (!statsContainer) return;
    const stats = [
      {
        label: 'Running Contests',
        value: String(runningContests.length),
        icon: 'fa-solid fa-bolt',
        color: 'yellow',
        action: null,
      },
      {
        label: 'Upcoming Contests',
        value: String(upcomingContests.length),
        icon: 'fa-solid fa-calendar-days',
        color: 'green',
        action: null,
      },
      {
        label: 'Bookmarked',
        value: String(bookmarkedContestIds.size),
        icon: 'fa-regular fa-bookmark',
        color: 'blue',
        action: null,
      },
      {
        label: 'Reminders',
        value: String(reminderContestIds.size),
        icon: 'fa-regular fa-bell',
        color: 'purple',
        action: null,
      },
    ];
    statsContainer.innerHTML = '';
    stats.forEach((stat) => {
      let bgVar;
      let textVar;
      if (stat.color === 'yellow') {
        bgVar = 'var(--stat-yellow-bg)';
        textVar = 'var(--stat-yellow-text)';
      }
      if (stat.color === 'green') {
        bgVar = 'var(--stat-green-bg)';
        textVar = 'var(--stat-green-text)';
      }
      if (stat.color === 'blue') {
        bgVar = 'var(--stat-blue-bg)';
        textVar = 'var(--stat-blue-text)';
      }
      if (stat.color === 'purple') {
        bgVar = 'var(--stat-purple-bg)';
        textVar = 'var(--stat-purple-text)';
      }
      statsContainer.innerHTML += `
                <div class="stat-card" data-color="${stat.color}" ${stat.action ? `style="cursor:pointer" data-action="${stat.action}"` : ''}>
                    <div class="stat-info">
                        <span>${stat.label}</span>
                        <h2>${stat.value}</h2>
                    </div>
                    <div class="stat-icon" style="background-color: ${bgVar}; color: ${textVar}">
                        <i class="${stat.icon}"></i>
                    </div>
                </div>
            `;
    });
  };

  const showBookmarksModal = async () => {
    if (!competitionsService) return;
    if (!authEnabled) {
      showFeedback('Sign in to view bookmarked contests.', 'unauthorized');
      return;
    }
    try {
      const result = await competitionsService.listBookmarks({
        page: 1,
        limit: 100,
      });
      const bookmarkedContests = result?.contests || [];
      if (bookmarkedContests.length === 0) {
        showFeedback('No bookmarked contests yet.', 'info');
        return;
      }
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
                <div class="modal-content" style="max-width:500px;max-height:80vh;overflow-y:auto;background:var(--bg-card);padding:20px;border-radius:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                        <h3 style="margin:0;">Bookmarked Contests</h3>
                        <button class="modal-close" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button>
                    </div>
                    <div class="bookmarks-list">
                        ${bookmarkedContests
                          .map(
                            (c) => `
                            <div style="padding:12px;border-bottom:1px solid var(--border-color);">
                                <h4 style="margin:0 0 8px 0;">${c.title || 'Untitled Contest'}</h4>
                                <div style="font-size:12px;color:var(--text-secondary);">
                                    <span>${c.platform || ''}</span> | 
                                    <span>${formatDateTime(c.startTime)}</span> | 
                                    <span>${formatDuration(c.duration)}</span>
                                </div>
                                <button class="btn-register-full" data-action="unbookmark" data-id="${c._id || c.id}" style="margin-top:8px;">
                                    <i class="fa-solid fa-bookmark"></i> Remove
                                </button>
                            </div>
                        `,
                          )
                          .join('')}
                    </div>
                </div>
            `;
      document.body.appendChild(modal);
      modal
        .querySelector('.modal-close')
        .addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
      });
      modal.querySelectorAll('[data-action="unbookmark"]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.closest('[data-id]').dataset.id;
          await handleContestAction('bookmark', id);
          modal.remove();
        });
      });
    } catch (error) {
      showFeedback('Failed to load bookmarks.', 'error');
    }
  };

  const renderRunning = () => {
    if (!liveContainer) return;
    const filtered = filterContestsByPlatform(
      runningContests,
      selectedPlatform,
    );
    if (!filtered.length) {
      if (uiStates?.render) {
        uiStates.render(liveContainer, {
          state: 'empty',
          message: 'No running contests right now.',
        });
      } else {
        liveContainer.innerHTML = '<p>No running contests right now.</p>';
      }
      return;
    }

    liveContainer.innerHTML = '';
    filtered.forEach((contest) => {
      const contestId = contest._id || contest.id || '';
      const platformBadge = contest.platform
        ? `<span class="badge bg-blue">${contest.platform}</span>`
        : '';
      liveContainer.innerHTML += `
                <div class="contest-card">
                    <div class="cc-header">
                        <div>
                            <h4>${contest.title || 'Untitled Contest'}</h4>
                            <p>${contest.contestIdOnPlatform || ''}</p>
                        </div>
                        <div class="cc-badges">
                            <span class="badge bg-green">LIVE</span>
                            ${platformBadge}
                        </div>
                    </div>
                    <div class="cc-meta">
                        <span><i class="fa-regular fa-clock"></i> ${timeLeftText(contest.startTime)}</span>
                        <span><i class="fa-regular fa-file-lines"></i> ${formatDuration(contest.duration)}</span>
                    </div>
                    <button class="btn-continue" data-action="open" data-id="${contestId}">Open Contest</button>
                    <button class="btn-continue" data-action="solve" data-id="${contestId}" style="background:var(--accent-blue);margin-top:8px;"><i class="fa-solid fa-code"></i> Solve</button>
                </div>
            `;
    });
  };

  const renderUpcoming = () => {
    if (!upcomingContainer) return;
    const filtered = filterContestsByPlatform(
      upcomingContests,
      selectedPlatform,
    );
    if (!filtered.length) {
      if (uiStates?.render) {
        uiStates.render(upcomingContainer, {
          state: 'empty',
          message: 'No upcoming contests available.',
        });
      } else {
        upcomingContainer.innerHTML = '<p>No upcoming contests available.</p>';
      }
      return;
    }

    upcomingContainer.innerHTML = '';
    filtered.forEach((contest) => {
      const contestId = contest._id || contest.id || '';
      const isBookmarked = bookmarkedContestIds.has(contestId);
      const hasReminder = reminderContestIds.has(contestId);
      const badge = contest.platform
        ? `<span class="badge ${contest.platform === 'leetcode' ? 'bg-blue' : 'bg-green'}">${contest.platform}</span>`
        : '';
      upcomingContainer.innerHTML += `
                <div class="upcoming-card">
                    <div class="uc-top">
                        <div class="uc-info">
                            <h4>${contest.title || 'Untitled Contest'} ${badge}</h4>
                            <p class="uc-desc">${contest.contestIdOnPlatform || ''}</p>
                            <div class="uc-meta-row">
                                <span><i class="fa-regular fa-clock"></i> ${formatDuration(contest.duration)}</span>
                                <span><i class="fa-regular fa-calendar"></i> ${formatDateTime(contest.startTime)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="uc-meta-row" style="margin-top: 10px; gap: 8px;">
                        <button class="btn-register-full" data-action="join" data-id="${contestId}" data-url="${getJoinUrl(contest)}">Register</button>
                        <button class="btn-register-full" data-action="bookmark" data-id="${contestId}">
                            ${isBookmarked ? '<i class="fa-solid fa-bookmark"></i> Bookmarked' : '<i class="fa-regular fa-bookmark"></i> Bookmark'}
                        </button>
                        <button class="btn-register-full" data-action="reminder" data-id="${contestId}">
                            ${hasReminder ? '<i class="fa-solid fa-bell"></i> Remove' : '<i class="fa-regular fa-bell"></i> Set Reminder'}
                        </button>
                        <button class="btn-register-full" data-action="open" data-id="${contestId}" ${contest.status === 'upcoming' ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>Open</button>
                        <button class="btn-register-full" data-action="solve" data-id="${contestId}" ${contest.status === 'upcoming' ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}><i class="fa-solid fa-code"></i> Solve</button>
                    </div>
                </div>
            `;
    });
  };

  const renderCalendar = () => {
    if (!document.getElementById('calendar-grid')) return;
    if (calendarViewMode === 'month') renderMonthGrid();
    else if (calendarViewMode === 'week') renderWeekGrid();
    else if (calendarViewMode === 'day') renderDayGrid();
  };

  const refreshContestViews = () => {
    refreshStats();
    renderRunning();
    renderUpcoming();
    renderBookmarks();
    renderReminders();
    renderCalendar();
  };

  const renderMonthGrid = () => {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    const title = document.getElementById('nav-title');
    if (title) {
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      title.textContent = `${months[currentMonth - 1]} ${currentYear}`;
    }

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const daysInPrev = getDaysInMonth(currentYear, currentMonth - 1);
    const filtered = filterContestsByPlatform(allContests, selectedPlatform);
    const grouped = groupContestsByDate(filtered);
    const today = new Date();
    const todayKey = formatDateKey(today.toISOString());

    let html = '<div class="calendar-weekday-header">';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d) => {
      html += `<div class="calendar-weekday-cell">${d}</div>`;
    });
    html += '</div><div class="calendar-month-grid">';

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      let dayNum;
      let isOutside = false;
      let dateKey;

      if (i < firstDay) {
        dayNum = daysInPrev - firstDay + i + 1;
        isOutside = true;
        const pm = currentMonth === 1 ? 12 : currentMonth - 1;
        const py = currentMonth === 1 ? currentYear - 1 : currentYear;
        dateKey = `${py}-${String(pm).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      } else {
        const dayOfMonth = i - firstDay + 1;
        if (dayOfMonth > daysInMonth) {
          dayNum = dayOfMonth - daysInMonth;
          isOutside = true;
          const nm = currentMonth === 12 ? 1 : currentMonth + 1;
          const ny = currentMonth === 12 ? currentYear + 1 : currentYear;
          dateKey = `${ny}-${String(nm).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        } else {
          dayNum = dayOfMonth;
          dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        }
      }

      const dayContests = grouped[dateKey] || [];
      const isToday = dateKey === todayKey;

      let cellClass = 'calendar-day-cell';
      if (isOutside) cellClass += ' calendar-day-cell-outside';
      if (isToday) cellClass += ' calendar-day-cell-today';

      html += `<div class="${cellClass}">`;
      if (isToday) {
        html += `<span class="calendar-day-number-today">${dayNum}</span>`;
      } else {
        html += `<span class="calendar-day-number">${dayNum}</span>`;
      }

      const visibleChips = 3;
      const chipsToShow = dayContests.slice(0, visibleChips);
      const remaining = dayContests.length - visibleChips;

      if (chipsToShow.length > 0) {
        html += '<div class="calendar-chip-row">';
        chipsToShow.forEach((c) => {
          const chipClass = getChipClass(c.platform);
          const calLink = getGoogleCalendarLink(c);
          html += '<div class="calendar-chip-row-inner">';
          html += `<a href="${c.url || '#'}" target="_blank" rel="noopener noreferrer" class="calendar-contest-chip ${chipClass}" title="${c.title || ''} - ${new Date(c.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}">${c.title || 'Untitled'}</a>`;
          html += `<a href="${calLink}" target="_blank" rel="noopener noreferrer" class="calendar-cal-link" title="Add to Google Calendar">+</a>`;
          html += '</div>';
        });
        if (remaining > 0) {
          html += `<span class="calendar-more-link">+${remaining} more</span>`;
        }
        html += '</div>';
      }

      html += '</div>';
    }

    html += '</div>';
    grid.innerHTML = html;
  };

  const renderWeekGrid = () => {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    const title = document.getElementById('nav-title');
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const d = new Date(currentYear, currentMonth - 1, calendarDate.getDate());
    const dayOfWeek = d.getDay();
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    if (title) {
      title.textContent = `${months[sunday.getMonth()]} ${sunday.getDate()} - ${months[saturday.getMonth()]} ${saturday.getDate()}, ${saturday.getFullYear()}`;
    }

    const filtered = filterContestsByPlatform(allContests, selectedPlatform);
    const grouped = groupContestsByDate(filtered);

    let html = '<div class="calendar-week-grid">';
    html += '<div class="calendar-week-header-cell"></div>';
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      const dateKey = formatDateKey(day.toISOString());
      html += `<div class="calendar-week-header-cell">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]} ${day.getDate()}</div>`;
    }

    for (let hour = 0; hour < 24; hour++) {
      const hLabel =
        hour === 0
          ? '12 AM'
          : hour < 12
            ? `${hour} AM`
            : hour === 12
              ? '12 PM'
              : `${hour - 12} PM`;
      html += `<div class="calendar-week-hour">${hLabel}</div>`;
      for (let i = 0; i < 7; i++) {
        const day = new Date(sunday);
        day.setDate(sunday.getDate() + i);
        day.setHours(hour, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(hour + 1);
        const dateKey = formatDateKey(day.toISOString());
        const hourContests = (grouped[dateKey] || []).filter((c) => {
          const cs = new Date(c.startTime);
          return cs >= day && cs < dayEnd;
        });
        html += `<div class="calendar-week-cell">`;
        hourContests.forEach((c) => {
          const chipClass = getChipClass(c.platform);
          html += `<a href="${c.url || '#'}" target="_blank" rel="noopener noreferrer" class="calendar-contest-chip ${chipClass}" title="${c.title || ''}">${c.title || 'Contest'}</a>`;
        });
        html += '</div>';
      }
    }
    html += '</div>';
    grid.innerHTML = html;
  };

  const renderDayGrid = () => {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    const title = document.getElementById('nav-title');
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const d = new Date(currentYear, currentMonth - 1, calendarDate.getDate());
    if (title) {
      title.textContent = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }

    const filtered = filterContestsByPlatform(allContests, selectedPlatform);
    const dateKey = formatDateKey(d.toISOString());
    const dayContests = groupContestsByDate(filtered)[dateKey] || [];

    let html = '<div class="calendar-day-grid">';
    html += `<div class="calendar-day-header-cell">${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} - ${dayContests.length} contest${dayContests.length !== 1 ? 's' : ''}</div>`;

    for (let hour = 0; hour < 24; hour++) {
      const hLabel =
        hour === 0
          ? '12 AM'
          : hour < 12
            ? `${hour} AM`
            : hour === 12
              ? '12 PM'
              : `${hour - 12} PM`;
      html += `<div class="calendar-day-hour">${hLabel}</div>`;
      const hourStart = new Date(d);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hour + 1);
      const hourContests = dayContests.filter((c) => {
        const cs = new Date(c.startTime);
        return cs >= hourStart && cs < hourEnd;
      });
      html += `<div class="calendar-day-slot">`;
      if (hourContests.length === 0) {
        html +=
          '<span style="color:var(--text-tertiary);font-size:0.7rem;padding:4px 0;">—</span>';
      } else {
        hourContests.forEach((c) => {
          const chipClass = getChipClass(c.platform);
          const calLink = getGoogleCalendarLink(c);
          html += `<a href="${c.url || '#'}" target="_blank" rel="noopener noreferrer" class="calendar-contest-chip ${chipClass}" title="${c.title || ''}">${c.title || 'Contest'}</a>`;
          html += `<a href="${calLink}" target="_blank" rel="noopener noreferrer" class="calendar-cal-link" title="Add to Google Calendar" style="display:inline-flex;align-items:center;">+</a>`;
        });
      }
      html += '</div>';
    }
    html += '</div>';
    grid.innerHTML = html;
  };

  const switchView = (view) => {
    currentView = view;
    document.querySelectorAll('.view-toggle-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    const calendarView = document.getElementById('calendar-view');
    const listView = document.getElementById('list-view');
    if (calendarView)
      calendarView.style.display = view === 'calendar' ? 'block' : 'none';
    if (listView) listView.style.display = view === 'list' ? 'block' : 'none';
    if (view === 'calendar') renderCalendar();
  };

  const switchCalendarViewMode = (mode) => {
    const prevMode = calendarViewMode;
    calendarViewMode = mode;
    document.querySelectorAll('.cal-view-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.calView === mode);
    });

    if (prevMode === 'month' && (mode === 'week' || mode === 'day')) {
      calendarDate = new Date(currentYear, currentMonth - 1, 15);
    }
    if (prevMode !== 'month' && mode === 'month') {
      currentMonth = calendarDate.getMonth() + 1;
      currentYear = calendarDate.getFullYear();
    }

    renderCalendar();
  };

  const setPlatformFilter = (platform) => {
    selectedPlatform = platform;
    document.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.platform === platform);
    });
    refreshContestViews();
  };

  const navigateCalendar = (direction) => {
    if (calendarViewMode === 'month') {
      if (direction === 'prev') {
        currentMonth--;
        if (currentMonth < 1) {
          currentMonth = 12;
          currentYear--;
        }
      } else if (direction === 'next') {
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      } else {
        const now = new Date();
        currentMonth = now.getMonth() + 1;
        currentYear = now.getFullYear();
        calendarDate = new Date();
      }
    } else if (calendarViewMode === 'week') {
      if (direction === 'prev') {
        calendarDate.setDate(calendarDate.getDate() - 7);
      } else if (direction === 'next') {
        calendarDate.setDate(calendarDate.getDate() + 7);
      } else {
        calendarDate = new Date();
      }
      currentMonth = calendarDate.getMonth() + 1;
      currentYear = calendarDate.getFullYear();
    } else {
      if (direction === 'prev') {
        calendarDate.setDate(calendarDate.getDate() - 1);
      } else if (direction === 'next') {
        calendarDate.setDate(calendarDate.getDate() + 1);
      } else {
        calendarDate = new Date();
      }
      currentMonth = calendarDate.getMonth() + 1;
      currentYear = calendarDate.getFullYear();
    }
    renderCalendar();
  };

  const renderBookmarks = () => {
    if (!bookmarksContainer) return;

    if (!authEnabled) {
      bookmarksContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-bookmark"></i>
                    <p>Sign in to view your bookmarked contests</p>
                </div>
            `;
      return;
    }

    if (!bookmarkedContests.length) {
      bookmarksContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-bookmark"></i>
                    <p>No bookmarked contests yet</p>
                </div>
            `;
      return;
    }

    bookmarksContainer.innerHTML = '';
    bookmarkedContests.forEach((contest) => {
      const contestId = contest._id || contest.id || '';
      const hasReminder = reminderContestIds.has(contestId);
      const badge = contest.platform
        ? `<span class="saved-platform">${contest.platform}</span>`
        : '';

      bookmarksContainer.innerHTML += `
                <div class="saved-card">
                    <div class="saved-info">
                        <h4>${contest.title || 'Untitled Contest'} ${badge}</h4>
                        <div class="saved-meta">
                            <span><i class="fa-regular fa-clock"></i> ${formatDuration(contest.duration)}</span>
                            <span><i class="fa-regular fa-calendar"></i> ${formatDateTime(contest.startTime)}</span>
                            ${contest.status ? `<span class="badge ${contest.status === 'running' ? 'bg-green' : 'bg-blue'}">${contest.status}</span>` : ''}
                        </div>
                    </div>
                    <div class="saved-actions">
                        <button class="btn-icon remove" data-action="bookmark" data-id="${contestId}" title="Remove bookmark">
                            <i class="fa-solid fa-bookmark"></i>
                        </button>
                        <button class="btn-icon ${hasReminder ? 'active' : ''}" data-action="reminder" data-id="${contestId}" title="${hasReminder ? 'Remove reminder' : 'Set reminder'}">
                            <i class="fa-${hasReminder ? 'solid' : 'regular'} fa-bell"></i>
                        </button>
                        <button class="btn-icon" data-action="open" data-id="${contestId}" title="Open contest">
                            <i class="fa-solid fa-external-link-alt"></i>
                        </button>
                    </div>
                </div>
            `;
    });
  };

  const renderReminders = () => {
    if (!remindersContainer) return;

    if (!authEnabled) {
      remindersContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-bell"></i>
                    <p>Sign in to view your reminders</p>
                </div>
            `;
      return;
    }

    if (!reminderContests.length) {
      remindersContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-bell"></i>
                    <p>No reminders set</p>
                </div>
            `;
      return;
    }

    remindersContainer.innerHTML = '';
    reminderContests.forEach((contest) => {
      const contestId = contest._id || contest.id || '';
      const isBookmarked = bookmarkedContestIds.has(contestId);
      const badge = contest.platform
        ? `<span class="saved-platform">${contest.platform}</span>`
        : '';

      remindersContainer.innerHTML += `
                <div class="saved-card">
                    <div class="saved-info">
                        <h4>${contest.title || 'Untitled Contest'} ${badge}</h4>
                        <div class="saved-meta">
                            <span><i class="fa-regular fa-clock"></i> ${formatDuration(contest.duration)}</span>
                            <span><i class="fa-regular fa-calendar"></i> ${formatDateTime(contest.startTime)}</span>
                            ${contest.status ? `<span class="badge ${contest.status === 'running' ? 'bg-green' : 'bg-blue'}">${contest.status}</span>` : ''}
                        </div>
                    </div>
                    <div class="saved-actions">
                        <button class="btn-icon ${isBookmarked ? 'active' : ''}" data-action="bookmark" data-id="${contestId}" title="${isBookmarked ? 'Remove bookmark' : 'Bookmark'}">
                            <i class="fa-${isBookmarked ? 'solid' : 'regular'} fa-bookmark"></i>
                        </button>
                        <button class="btn-icon remove" data-action="reminder" data-id="${contestId}" title="Remove reminder">
                            <i class="fa-solid fa-bell"></i>
                        </button>
                        <button class="btn-icon" data-action="open" data-id="${contestId}" title="Open contest">
                            <i class="fa-solid fa-external-link-alt"></i>
                        </button>
                    </div>
                </div>
            `;
    });
  };

  const findContestById = (id) => {
    const all = runningContests.concat(upcomingContests);
    return all.find((entry) => (entry._id || entry.id) === id) || null;
  };

  function getJoinUrl(contest) {
    if (!contest) return '';
    var url = contest.joinUrl;
    if (!url && contest.contestIdOnPlatform) {
      var p = (contest.platform || '').toLowerCase();
      if (p === 'codeforces')
        url =
          'https://codeforces.com/contestRegistration/' +
          contest.contestIdOnPlatform;
      else if (p === 'leetcode')
        url = 'https://leetcode.com/contest/' + contest.contestIdOnPlatform;
      else if (p === 'atcoder')
        url = 'https://atcoder.jp/contests/' + contest.contestIdOnPlatform;
    }
    return url || '';
  }

  const ensureAuth = () => {
    if (!authEnabled) {
      showFeedback(
        'Sign in to use bookmarks, reminders, and participation actions.',
        'unauthorized',
      );
      return false;
    }
    return true;
  };

  const handleContestAction = async (action, contestId) => {
    if (!contestId || !competitionsService) return;
    const contest = findContestById(contestId);
    if (action === 'solve') {
      window.location.href =
        '../ContestDetail/contestDetail.html?id=' +
        encodeURIComponent(contestId);
      return;
    }
    if (action === 'open') {
      if (contest?.status === 'upcoming') {
        showFeedback(
          'This contest has not started yet. You can join when it begins.',
          'info',
        );
        return;
      }
      if (contest?.url) {
        window.open(contest.url, '_blank', 'noopener,noreferrer');
      } else {
        showFeedback('Contest URL is not available yet.', 'info');
      }
      return;
    }

    if (!ensureAuth()) return;
    try {
      if (action === 'join') {
        await competitionsService.joinContest(contestId);
        showFeedback('Contest joined successfully.', 'info');
      } else if (action === 'bookmark') {
        if (bookmarkedContestIds.has(contestId)) {
          await competitionsService.removeBookmark(contestId);
          bookmarkedContestIds.delete(contestId);
          bookmarkedContests = bookmarkedContests.filter(
            (c) => (c._id || c.id) !== contestId,
          );
          showFeedback('Bookmark removed.', 'info');
        } else {
          await competitionsService.bookmarkContest(contestId);
          bookmarkedContestIds.add(contestId);
          const contest = findContestById(contestId);
          if (
            contest &&
            !bookmarkedContests.some((c) => (c._id || c.id) === contestId)
          ) {
            bookmarkedContests.push(contest);
          } else if (!contest) {
            const result = await competitionsService.listBookmarks({
              page: 1,
              limit: 100,
            });
            bookmarkedContests = (result?.contests || [])
              .map((entry) => {
                if (entry.contestId && typeof entry.contestId === 'object')
                  return entry.contestId;
                return entry;
              })
              .filter(Boolean);
          }
          showFeedback('Contest bookmarked.', 'info');
        }
      } else if (action === 'reminder') {
        if (reminderContestIds.has(contestId)) {
          await competitionsService.removeReminder(contestId);
          reminderContestIds.delete(contestId);
          reminderContests = reminderContests.filter(
            (c) => (c._id || c.id) !== contestId,
          );
          showFeedback('Reminder removed.', 'info');
        } else {
          await competitionsService.setReminder(contestId);
          reminderContestIds.add(contestId);
          const contest = findContestById(contestId);
          if (
            contest &&
            !reminderContests.some((c) => (c._id || c.id) === contestId)
          ) {
            reminderContests.push(contest);
          } else if (!contest) {
            const result = await competitionsService.listReminders({
              page: 1,
              limit: 100,
            });
            reminderContests = (result?.contests || [])
              .map((entry) => {
                if (entry.contestId && typeof entry.contestId === 'object')
                  return entry.contestId;
                return entry;
              })
              .filter(Boolean);
          }
          showFeedback('Reminder set.', 'info');
        }
      }
      refreshContestViews();
    } catch (error) {
      if (isAuthError(error)) {
        authEnabled = false;
        showFeedback(
          'Your current session is not authorized for competitions actions. Public contests are still available.',
          'unauthorized',
        );
        refreshContestViews();
        return;
      }
      const stateInfo = uiStates?.fromError
        ? uiStates.fromError(error, 'Action failed.')
        : { state: 'error', message: error?.message || 'Action failed.' };
      showFeedback(stateInfo.message, stateInfo.state);
    }
  };

  const loadContestData = async () => {
    if (!competitionsService) {
      showFeedback(
        'Competitions service is unavailable on this page.',
        'error',
      );
      return;
    }

    if (uiStates?.render) {
      uiStates.render(liveContainer, {
        state: 'loading',
        message: 'Loading running contests...',
      });
      uiStates.render(upcomingContainer, {
        state: 'loading',
        message: 'Loading upcoming contests...',
      });
    }

    try {
      const [runningResult, upcomingResult] = await Promise.all([
        competitionsService.listContests({
          status: 'running',
          limit: 50,
          page: 1,
          sortBy: 'startTime',
          order: 'asc',
        }),
        competitionsService.listContests({
          status: 'upcoming',
          limit: 100,
          page: 1,
          sortBy: 'startTime',
          order: 'asc',
        }),
      ]);

      runningContests = Array.isArray(runningResult?.contests)
        ? runningResult.contests
        : [];
      upcomingContests = Array.isArray(upcomingResult?.contests)
        ? upcomingResult.contests
        : [];
      allContests = [...runningContests, ...upcomingContests];

      bookmarkedContestIds = new Set();
      reminderContestIds = new Set();
      bookmarkedContests = [];
      reminderContests = [];
      if (authEnabled) {
        const [bookmarkResult, reminderResult] = await Promise.allSettled([
          competitionsService.listBookmarks({ page: 1, limit: 100 }),
          competitionsService.listReminders({ page: 1, limit: 100 }),
        ]);
        if (bookmarkResult.status === 'fulfilled') {
          const bookmarkContests = bookmarkResult.value?.contests || [];
          bookmarkedContests = bookmarkContests
            .map((entry) => {
              if (entry.contestId && typeof entry.contestId === 'object') {
                return entry.contestId;
              }
              return entry;
            })
            .filter(Boolean);
          bookmarkedContestIds = new Set(
            bookmarkContests.map(contestIdFromEntry).filter(Boolean),
          );
        } else if (isAuthError(bookmarkResult.reason)) {
          authEnabled = false;
        }
        if (reminderResult.status === 'fulfilled') {
          const reminderContestList = reminderResult.value?.contests || [];
          reminderContests = reminderContestList
            .map((entry) => {
              if (entry.contestId && typeof entry.contestId === 'object') {
                return entry.contestId;
              }
              return entry;
            })
            .filter(Boolean);
          reminderContestIds = new Set(
            reminderContestList.map(contestIdFromEntry).filter(Boolean),
          );
        } else if (isAuthError(reminderResult.reason)) {
          authEnabled = false;
        }
      }
      showFeedback('');
      if (!authEnabled) {
        showFeedback(
          'Public contests loaded. Competitions account authorization is required for bookmarks/reminders.',
          'unauthorized',
        );
      }
      refreshContestViews();
    } catch (error) {
      const stateInfo = uiStates?.fromError
        ? uiStates.fromError(error, 'Could not load contests right now.')
        : {
            state: 'error',
            message: error?.message || 'Could not load contests.',
          };
      showFeedback(stateInfo.message, stateInfo.state);
      if (uiStates?.render) {
        uiStates.render(liveContainer, {
          state: stateInfo.state,
          message: stateInfo.message,
        });
        uiStates.render(upcomingContainer, {
          state: stateInfo.state,
          message: stateInfo.message,
        });
      }
    }
  };

  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.forEach((entry) => entry.classList.remove('active'));
      link.classList.add('active');
    });
  });

  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn?.querySelector('i');
  const appLogo = document.getElementById('app-logo');
  const applyThemeAssets = () => {
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark';
    if (themeIcon)
      themeIcon.className = isDark ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
    if (appLogo)
      appLogo.src = isDark
        ? '/Assets/images/logo-dark.png'
        : '/Assets/images/logo-light.png';
  };
  applyThemeAssets();
  themeBtn?.classList.remove('rotating');
  if (themeBtn) void themeBtn.offsetWidth;
  themeBtn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (_) {
      // ignore storage write errors
    }
    applyThemeAssets();
    themeBtn.classList.add('rotating');
    setTimeout(() => {
      themeBtn.classList.remove('rotating');
    }, 500);
  });

  const contentTabs = document.querySelectorAll('.tab-btn');
  contentTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      contentTabs.forEach((entry) => entry.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  function onContestClick(event) {
    var button = event.target.closest('button[data-action][data-id]');
    if (!button) return;
    var action = button.dataset.action;
    var id = button.dataset.id;

    if (action === 'join') {
      var url = button.dataset.url;
      if (url) {
        console.log('[Join] Opening:', url);
        var link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
    }

    handleContestAction(action, id);
  }

  liveContainer?.addEventListener('click', onContestClick);
  upcomingContainer?.addEventListener('click', onContestClick);
  bookmarksContainer?.addEventListener('click', onContestClick);
  remindersContainer?.addEventListener('click', onContestClick);

  statsContainer?.addEventListener('click', (event) => {
    const statCard = event.target.closest('.stat-card');
    if (!statCard) return;
    const action = statCard.dataset.action;
    if (action === 'view-bookmarks') {
      showBookmarksModal();
    }
  });

  // View Toggle
  document.querySelectorAll('.view-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Platform Filters
  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () =>
      setPlatformFilter(chip.dataset.platform),
    );
  });

  // Calendar Navigation
  document
    .getElementById('prev-btn')
    ?.addEventListener('click', () => navigateCalendar('prev'));
  document
    .getElementById('next-btn')
    ?.addEventListener('click', () => navigateCalendar('next'));
  document
    .getElementById('today-btn')
    ?.addEventListener('click', () => navigateCalendar('today'));

  // Calendar View Toggle (Month/Week/Day)
  document.querySelectorAll('.cal-view-btn').forEach((btn) => {
    btn.addEventListener('click', () =>
      switchCalendarViewMode(btn.dataset.calView),
    );
  });

  refreshStats();
  void loadContestData();
});
