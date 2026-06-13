(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PracticeProblems = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function buildPracticeProblemsPath(platform) {
    const value = String(platform || 'all').toLowerCase();
    if (value === 'codeforces') return '/practice/codeforces/problems';
    return '/problems';
  }

  function buildPracticeProblemsQuery(filters, platform) {
    const query = {};
    const resolvedPlatform = String(platform || filters.platform || 'all').toLowerCase();

    if (filters.page) query.page = filters.page;
    if (filters.limit) query.limit = filters.limit;

    if (resolvedPlatform === 'codeforces') {
      if (filters.search) query.q = filters.search;
      if (filters.tags) query.tag = filters.tags;
      if (filters.minRating) query.ratingMin = filters.minRating;
      if (filters.maxRating) query.ratingMax = filters.maxRating;
      if (filters.solved === 'solved') query.solved = 'true';
      if (filters.solved === 'unsolved') query.solved = 'false';
      return query;
    }

    if (filters.search) query.q = filters.search;
    if (filters.tags) query.tag = filters.tags;
    if (filters.minRating) query.difficultyMin = filters.minRating;
    if (filters.maxRating) query.difficultyMax = filters.maxRating;
    if (resolvedPlatform !== 'all') query.host = resolvedPlatform;
    if (filters.solved === 'solved') query.solved = 'true';
    if (filters.solved === 'unsolved') query.solved = 'false';
    return query;
  }

  function extractPracticeProblemList(payload) {
    if (payload == null) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload !== 'object') return [];
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.problems)) return payload.problems;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && typeof payload.data === 'object') {
      if (Array.isArray(payload.data.items)) return payload.data.items;
      if (Array.isArray(payload.data.problems)) return payload.data.problems;
    }
    return [];
  }

  function normalizePracticeProblem(raw, platformHint) {
    if (!raw || typeof raw !== 'object') return raw;
    const platform = String(
      raw.host || raw.platform || platformHint || '',
    ).toLowerCase();
    const title = raw.title || raw.name || 'Untitled Problem';
    const id =
      raw.id ||
      raw._id ||
      (raw.problemId && raw.index
        ? `${raw.problemId}${raw.index}`
        : raw.problemId || '');
    const rating =
      raw.rating != null
        ? Number(raw.rating)
        : raw.difficulty != null
          ? Number(raw.difficulty)
          : null;
    return {
      id,
      title,
      url: raw.url || '',
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      platform,
      rating: Number.isFinite(rating) ? rating : null,
      isSolved: Boolean(raw.solved ?? raw.isSolved),
    };
  }

  function parseListProblemsResponse(payload, filters, platform) {
    const resolvedPlatform = String(
      platform || filters.platform || 'all',
    ).toLowerCase();
    const items = extractPracticeProblemList(payload);
    const root =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload
        : {};
    const data =
      root.data && typeof root.data === 'object' ? root.data : root;
    const total = Number(
      data.total ?? root.total ?? items.length,
    );
    const page = Number(data.page ?? root.page ?? filters.page ?? 1);
    const limit = Number(
      data.limit ?? root.limit ?? filters.limit ?? (items.length || 1),
    );
    const pages = Math.max(
      1,
      Math.ceil(total / (limit || 1)),
    );
    const problems = items.map((item) =>
      normalizePracticeProblem(item, resolvedPlatform === 'all' ? '' : resolvedPlatform),
    );
    return {
      problems,
      total,
      page,
      limit,
      pages,
      warning: data.warning || root.warning || null,
      solvedCount: data.solvedCount ?? root.solvedCount ?? null,
    };
  }

  return {
    buildPracticeProblemsPath,
    buildPracticeProblemsQuery,
    extractPracticeProblemList,
    normalizePracticeProblem,
    parseListProblemsResponse,
  };
});
