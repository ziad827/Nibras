(function runRecommendationPage(initializer) {
  if (window.NibrasReact && typeof window.NibrasReact.run === 'function') {
    window.NibrasReact.run(initializer);
    return;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializer, { once: true });
  } else {
    initializer();
  }
})(() => {
  const TRACK_DESCRIPTIONS = Object.freeze({
    'Artificial Intelligence':
      'Build intelligent systems that learn from data and make predictions.',
    'Information Track':
      'Focus on data-centric systems, analytics, and information management.',
    'Visual Computing':
      'Study computer graphics, vision, and image understanding techniques.',
    Systems:
      'Design reliable software systems, infrastructure, and performance-focused solutions.',
    Theory:
      'Dive into mathematical foundations and algorithmic reasoning in computer science.',
    'Computer Engineering':
      'Combine hardware and software to build integrated computing platforms.',
    'Human-Computer Interaction':
      'Design user-centered systems with strong usability and UX outcomes.',
    'Computational Biology':
      'Apply computation and data science to biological and health problems.',
  });

  const KNOWN_RECOMMENDER_COURSES = Object.freeze([
    'CS106A',
    'CS106B',
    'CS106X',
    'CS 107',
    'CS 110',
    'CS 161',
    'CS 103',
    'MATH 18',
    'MATH 19',
    'MATH 20',
    'MATH 21',
    'MATH 51',
    'MATH 52',
    'MATH 53',
    'MATH 104',
    'MATH 107',
    'MATH 108',
    'MATH 109',
    'MATH 110',
    'MATH 113',
    'PHIL 251',
    'CS 109',
    'CS 181',
    'CS 181W',
    'ENGR 40M',
    'ENGR 76',
    'CS 205L',
    'BIO',
    'CHEM',
  ]);

  const LETTER_GRADE_TO_PERCENT = Object.freeze({
    A: 95,
    'A+': 98,
    'A-': 91,
    B: 85,
    'B+': 88,
    'B-': 81,
    C: 75,
    'C+': 78,
    'C-': 71,
    D: 65,
    'D+': 68,
    'D-': 61,
    F: 50,
  });

  const COURSE_ALIAS_TO_CODE = (() => {
    const index = {};
    KNOWN_RECOMMENDER_COURSES.forEach((code) => {
      const normalized = String(code)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      index[normalized] = code;
    });
    return Object.freeze(index);
  })();

  const getRankMeta = (rank) => {
    if (rank === 1) return { rankClass: 'rank-gold', matchClass: 'match-high' };
    if (rank === 2)
      return { rankClass: 'rank-silver', matchClass: 'match-medium' };
    return { rankClass: 'rank-bronze', matchClass: 'match-low' };
  };

  const escapeHtml = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const toCourseCanonicalCode = (value) => {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    const rawNoSymbols = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (COURSE_ALIAS_TO_CODE[rawNoSymbols])
      return COURSE_ALIAS_TO_CODE[rawNoSymbols];

    const patterns = [
      /(CS\s*\d+[A-Z]?)/i,
      /(MATH\s*\d+[A-Z]?)/i,
      /(ENGR\s*\d+[A-Z]?)/i,
      /(PHIL\s*\d+[A-Z]?)/i,
      /\b(BIO|CHEM)\b/i,
    ];

    for (let i = 0; i < patterns.length; i += 1) {
      const match = raw.match(patterns[i]);
      if (!match) continue;
      const candidate = String(match[1] || match[0])
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      if (COURSE_ALIAS_TO_CODE[candidate])
        return COURSE_ALIAS_TO_CODE[candidate];
    }

    return null;
  };

  const normalizeGradeToPercent = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value >= 0 && value <= 4) return Number((value * 25).toFixed(2));
      if (value >= 0 && value <= 100) return Number(value.toFixed(2));
      return null;
    }

    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const upper = trimmed.toUpperCase();
    if (LETTER_GRADE_TO_PERCENT[upper] != null) {
      return LETTER_GRADE_TO_PERCENT[upper];
    }

    const percentMatch = upper.match(/^(\d+(?:\.\d+)?)\s*%$/);
    if (percentMatch) return normalizeGradeToPercent(Number(percentMatch[1]));

    const numeric = Number(upper);
    if (Number.isFinite(numeric)) return normalizeGradeToPercent(numeric);

    return null;
  };

  const pickValue = (obj, keys) => {
    if (!obj || typeof obj !== 'object') return null;
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const value = obj[key];
      if (value == null) continue;
      if (typeof value === 'string' && !value.trim()) continue;
      return value;
    }
    return null;
  };

  const walkObject = (root, visitor, depth = 0) => {
    if (depth > 7 || root == null) return;
    if (Array.isArray(root)) {
      root.forEach((entry) => walkObject(entry, visitor, depth + 1));
      return;
    }
    if (typeof root !== 'object') return;

    visitor(root);
    Object.keys(root).forEach((key) => {
      walkObject(root[key], visitor, depth + 1);
    });
  };

  const extractGradeEntries = (payload) => {
    const grades = {};

    walkObject(payload, (node) => {
      const codeValue = pickValue(node, [
        'courseCode',
        'course_code',
        'code',
        'courseId',
        'courseID',
        'courseName',
        'course',
        'name',
        'title',
      ]);
      const directCode =
        typeof codeValue === 'object'
          ? pickValue(codeValue, [
              'code',
              'courseCode',
              'course_code',
              'name',
              'title',
            ])
          : codeValue;
      const courseCode = toCourseCanonicalCode(directCode);
      if (!courseCode) return;

      let gradeValue = pickValue(node, [
        'grade',
        'finalGrade',
        'score',
        'percentage',
        'percent',
        'mark',
        'value',
      ]);
      if (gradeValue && typeof gradeValue === 'object') {
        gradeValue = pickValue(gradeValue, [
          'value',
          'grade',
          'score',
          'percentage',
          'percent',
        ]);
      }
      const normalizedGrade = normalizeGradeToPercent(gradeValue);
      if (normalizedGrade == null) return;

      if (grades[courseCode] == null || normalizedGrade > grades[courseCode]) {
        grades[courseCode] = normalizedGrade;
      }
    });

    return grades;
  };

  const extractTrackMatchMap = (explanationText) => {
    const text = String(explanationText || '');
    const map = {};
    const regex = /([A-Za-z][A-Za-z\s-]+?)\s*\((\d+(?:\.\d+)?)%\s*match\)/g;
    let match = regex.exec(text);
    while (match) {
      const trackName = String(match[1] || '').trim();
      const percent = Number(match[2]);
      if (trackName && Number.isFinite(percent)) {
        map[trackName.toLowerCase()] = percent;
      }
      match = regex.exec(text);
    }
    return map;
  };

  const extractTrackReason = (trackName, explanationText) => {
    const text = String(explanationText || '')
      .replace(/\n+/g, ' ')
      .trim();
    if (!text) return '';
    const target = String(trackName || '').toLowerCase();
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const matched = sentences.filter((sentence) =>
      sentence.toLowerCase().includes(target),
    );
    return matched.slice(0, 2).join(' ');
  };

  const formatExplanationToHtml = (rawText) => {
    const normalized = String(rawText || '')
      .replace(/\r/g, '')
      .trim();
    if (!normalized) {
      return '<p class="explanation-empty">No explanation is available for this recommendation yet.</p>';
    }

    const lines = normalized.split('\n');
    const htmlParts = [];
    let currentList = [];

    const flushList = () => {
      if (currentList.length === 0) return;
      htmlParts.push(
        `<ul class="explanation-list">${currentList.join('')}</ul>`,
      );
      currentList = [];
    };

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) {
        flushList();
        continue;
      }
      if (line.startsWith('## ')) {
        flushList();
        htmlParts.push(
          `<h5 class="explanation-heading">${escapeHtml(line.slice(3))}</h5>`,
        );
        continue;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        currentList.push(`<li>${escapeHtml(line.slice(2))}</li>`);
        continue;
      }
      flushList();
      htmlParts.push(
        `<p class="explanation-paragraph">${escapeHtml(line)}</p>`,
      );
    }

    flushList();
    return htmlParts.join('');
  };

  const trackContainer = document.getElementById('track-list-container');
  const explanationBody = document.getElementById(
    'recommendation-explanation-content',
  );
  const themeBtn = document.getElementById('themeBtn');
  const appLogo = document.getElementById('app-logo');
  const recommendationMeta = document.getElementById('recommendation-meta');

  const setThemeVisuals = () => {
    const icon = themeBtn?.querySelector('i');
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      if (icon) icon.className = 'fa-regular fa-sun';
      if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
      return;
    }
    if (icon) icon.className = 'fa-regular fa-moon';
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  };

  const setState = (state, message) => {
    if (!trackContainer) return;
    trackContainer.innerHTML = `
            <div class="recommendation-state state-${escapeHtml(state)}">
                <div class="state-icon"><i class="${state === 'loading' ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-circle-exclamation'}"></i></div>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
  };

  const buildTrackCards = (result, gradesCount) => {
    if (!trackContainer) return;
    const tracks = Array.isArray(result?.recommendations)
      ? result.recommendations
      : [];
    if (tracks.length === 0) {
      setState('error', 'The recommendation API returned no tracks.');
      return;
    }

    const strengths = Array.isArray(result?.strengths) ? result.strengths : [];
    const explanation = String(result?.explanation || '');
    const matchMap = extractTrackMatchMap(explanation);
    const fallbackMatch = [90, 76, 64];

    trackContainer.innerHTML = tracks
      .map((trackName, index) => {
        const rank = index + 1;
        const rankMeta = getRankMeta(rank);
        const safeTrackName = String(trackName || '').trim() || `Track ${rank}`;
        const trackDescription =
          TRACK_DESCRIPTIONS[safeTrackName] ||
          'Recommended based on your current academic capability profile.';
        const matchPercent = Number.isFinite(
          matchMap[safeTrackName.toLowerCase()],
        )
          ? Number(matchMap[safeTrackName.toLowerCase()].toFixed(2))
          : fallbackMatch[index] || 60;
        const reasonText =
          extractTrackReason(safeTrackName, explanation) ||
          `This track aligns with your strongest capabilities: ${strengths.join(', ') || 'available skills'}.`;
        const strengthsHtml = strengths.length
          ? strengths
              .map(
                (item) =>
                  `<span class="strength-chip">${escapeHtml(item)}</span>`,
              )
              .join('')
          : '<span class="strength-chip strength-chip-muted">No strengths provided</span>';

        return `
                <article class="track-card">
                    <div class="track-header">
                        <div class="track-left">
                            <div class="rank-circle ${rankMeta.rankClass}">
                                #${rank}
                                <span class="rank-label">Rank</span>
                            </div>
                            <div class="track-info">
                                <h2>${escapeHtml(safeTrackName)}</h2>
                                <p>${escapeHtml(trackDescription)}</p>
                            </div>
                        </div>
                        <div class="match-box">
                            <span class="match-badge ${rankMeta.matchClass}">${escapeHtml(String(matchPercent))}% Match</span>
                            <div class="match-bar-track">
                                <div class="match-bar-fill ${rankMeta.matchClass}" style="width:${Math.max(0, Math.min(100, matchPercent))}%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="explanation-section">
                        <div class="exp-title">Why this recommendation?</div>
                        <p class="track-reason">${escapeHtml(reasonText)}</p>
                    </div>

                    <div class="explanation-section">
                        <div class="exp-title">Strength signals (${gradesCount} graded course${gradesCount === 1 ? '' : 's'})</div>
                        <div class="strength-chips">${strengthsHtml}</div>
                    </div>
                </article>
            `;
      })
      .join('');
  };

  const updateExplanation = (rawExplanation) => {
    if (!explanationBody) return;
    explanationBody.innerHTML = formatExplanationToHtml(rawExplanation);
  };

  const loadBackendGrades = async () => {
    const services = window.NibrasServices || {};
    const recommendationService = services.recommendationService;
    const programService = services.programService;

    if (
      recommendationService &&
      typeof recommendationService.getGradesPayload === 'function'
    ) {
      const firstPayloadResult = await recommendationService.getGradesPayload();
      let grades = extractGradeEntries(
        firstPayloadResult?.payload || firstPayloadResult,
      );
      if (Object.keys(grades).length > 0) {
        return { grades, source: firstPayloadResult?.source || 'backend API' };
      }

      const refreshedPayloadResult =
        await recommendationService.getGradesPayload({ refreshSheet: true });
      grades = extractGradeEntries(
        refreshedPayloadResult?.payload || refreshedPayloadResult,
      );
      if (Object.keys(grades).length > 0) {
        return {
          grades,
          source: refreshedPayloadResult?.source || 'backend API (refreshed)',
        };
      }
    }

    if (programService && typeof programService.getSheet === 'function') {
      let sheetPayload = await programService.getSheet();
      let grades = extractGradeEntries(sheetPayload);
      if (Object.keys(grades).length > 0)
        return { grades, source: 'tracking:/v1/programs/student/me/sheet' };

      if (typeof programService.generateSheet === 'function') {
        await programService.generateSheet();
        sheetPayload = await programService.getSheet();
        grades = extractGradeEntries(sheetPayload);
        if (Object.keys(grades).length > 0)
          return {
            grades,
            source: 'tracking:/v1/programs/student/me/sheet (generated)',
          };
      }
    }

    throw new Error(
      'No compatible grade records were found from available backend endpoints. Ensure your account has graded courses mapped to supported recommender course codes.',
    );
  };

  const initRecommendation = async () => {
    if (!trackContainer) {
      console.error('[RECOMMENDATION.JS] track-list-container not found.');
      return;
    }

    setThemeVisuals();
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const html = document.documentElement;
        const current =
          html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        setThemeVisuals();
      });
    }

    setState(
      'loading',
      'Fetching your grades and generating recommendations...',
    );

    try {
      var aiService = window.NibrasServices?.aiService;
      var aiResult = null;
      var gradesCount = 0;

      if (aiService && typeof aiService.getRecommendation === 'function') {
        try {
          var aiRes = await aiService.getRecommendation();
          if (
            aiRes &&
            aiRes.success &&
            aiRes.data &&
            aiRes.data.recommendations &&
            aiRes.data.recommendations.length > 0
          ) {
            aiResult = {
              strengths: aiRes.data.strengths || [],
              recommendations: aiRes.data.recommendations || [],
              explanation: aiRes.data.explanation || '',
              source: 'ai-module',
            };
            gradesCount = aiRes.grades ? Object.keys(aiRes.grades).length : 0;
          }
        } catch (_) {}
      }

      if (!aiResult) {
        var gradeSource = await loadBackendGrades();
        var grades = gradeSource.grades;
        gradesCount = Object.keys(grades).length;
        var recommendationService =
          window.NibrasServices?.recommendationService || null;
        if (
          !recommendationService ||
          typeof recommendationService.recommend !== 'function'
        ) {
          throw new Error(
            'Recommendation service is unavailable in frontend API services.',
          );
        }
        var result = await recommendationService.recommend(grades);
        aiResult = result;
      }

      buildTrackCards(aiResult, gradesCount);
      updateExplanation(aiResult.explanation);

      if (recommendationMeta) {
        recommendationMeta.textContent =
          aiResult?.source === 'ai-module'
            ? `Using ${gradesCount} graded course records from Nibras-Backend AI module.`
            : aiResult?.source === 'local-fallback'
              ? `Using ${gradesCount} graded course records. Recommendation API is currently blocked from browser (CORS), so local fallback logic was used.`
              : `Using ${gradesCount} graded course records.`;
      }
    } catch (error) {
      const message = String(
        error?.message || 'Failed to load recommendations.',
      );
      setState('error', message);
      updateExplanation('');
      if (recommendationMeta) {
        if (/failed to fetch|network|cors/i.test(message)) {
          recommendationMeta.textContent =
            'Recommendation API call was blocked by browser CORS policy. The API server must return Access-Control-Allow-Origin for this frontend origin.';
        } else if (
          /route not found/i.test(message) ||
          /recommend/i.test(message)
        ) {
          recommendationMeta.textContent =
            'Recommendation API request failed. Check that the configured recommendation base points to a server that exposes /api/recommend.';
        } else {
          recommendationMeta.textContent =
            'Recommendation data could not be generated from backend grades.';
        }
      }
    }
  };

  initRecommendation();
});
