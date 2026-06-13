(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DailyProblemUi = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function difficultyLabel(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value ?? '—');
    if (num < 1200) return 'Easy';
    if (num < 2000) return 'Medium';
    return 'Hard';
  }

  function normalizeDailyTodayPayload(payload) {
    const root = payload && typeof payload === 'object' ? payload : {};
    const streakRoot =
      root.streak && typeof root.streak === 'object' ? root.streak : {};
    const assignment =
      root.assignment && typeof root.assignment === 'object'
        ? root.assignment
        : null;
    return {
      paused: Boolean(root.paused),
      pausedUntil: root.pausedUntil || null,
      assignment,
      currentStreak: Number(streakRoot.current ?? root.currentStreak ?? 0),
      longestStreak: Number(streakRoot.longest ?? root.longestStreak ?? 0),
      totalCompleted: Number(streakRoot.totalCompleted ?? 0),
      freezesLeft: Number(streakRoot.freezesLeft ?? 0),
      solvedToday: Boolean(assignment?.solved),
      skippedToday: Boolean(assignment?.skipped),
      problem: assignment?.problem || root.problem || null,
      source: assignment?.source || null,
    };
  }

  function formatActionRewards(result) {
    if (!result || typeof result !== 'object') return '';
    const parts = [];
    if (result.reputationEarned) {
      parts.push(`+${result.reputationEarned} reputation`);
    }
    if (result.milestoneBonus) {
      parts.push(`+${result.milestoneBonus} milestone bonus`);
    }
    if (Array.isArray(result.newBadges) && result.newBadges.length) {
      parts.push(`Badges: ${result.newBadges.join(', ')}`);
    }
    return parts.join(' · ');
  }

  function emptyStateMessage(normalized) {
    if (normalized.paused) {
      const until = normalized.pausedUntil
        ? new Date(normalized.pausedUntil).toLocaleString()
        : 'later';
      return `Daily challenge is paused until ${until}.`;
    }
    if (normalized.skippedToday) {
      return "You skipped today's problem.";
    }
    if (!normalized.assignment) {
      return 'No daily problem assigned for today.';
    }
    return 'No daily problem assigned for today.';
  }

  function canVerifyOnPlatform(platform) {
    const value = String(platform || '').toLowerCase();
    return value === 'codeforces' || value === 'leetcode';
  }

  return {
    difficultyLabel,
    normalizeDailyTodayPayload,
    formatActionRewards,
    emptyStateMessage,
    canVerifyOnPlatform,
  };
});
