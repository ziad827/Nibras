(function runAiTutorRecommendationPage(initializer) {
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
      'Focus on data systems, analytics, and information management.',
    'Visual Computing':
      'Explore computer graphics, vision, and image understanding.',
    Systems: 'Design scalable systems and software infrastructure.',
    Theory: 'Strengthen mathematical and algorithmic foundations of computing.',
    'Computer Engineering':
      'Blend hardware and software engineering practices.',
    'Human-Computer Interaction':
      'Design user-centered systems with strong UX outcomes.',
    'Computational Biology':
      'Apply computation and data science to biological domains.',
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

  const escapeHtml = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

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
    if (LETTER_GRADE_TO_PERCENT[upper] != null)
      return LETTER_GRADE_TO_PERCENT[upper];

    const percentMatch = upper.match(/^(\d+(?:\.\d+)?)\s*%$/);
    if (percentMatch) return normalizeGradeToPercent(Number(percentMatch[1]));

    const numeric = Number(upper);
    if (Number.isFinite(numeric)) return normalizeGradeToPercent(numeric);

    return null;
  };

  const toCourseCanonicalCode = (value) => {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    const normalized = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (COURSE_ALIAS_TO_CODE[normalized])
      return COURSE_ALIAS_TO_CODE[normalized];

    const match = raw.match(
      /(CS\s*\d+[A-Z]?|MATH\s*\d+[A-Z]?|ENGR\s*\d+[A-Z]?|PHIL\s*\d+[A-Z]?|BIO|CHEM)/i,
    );
    if (!match) return null;
    const compact = String(match[1])
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    return COURSE_ALIAS_TO_CODE[compact] || null;
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
    if (!normalized) return '<p>No explanation is available yet.</p>';

    const lines = normalized.split('\n');
    const htmlParts = [];
    let listItems = [];

    const flushList = () => {
      if (listItems.length === 0) return;
      htmlParts.push(
        `<ul class="rec-explanation-list">${listItems.join('')}</ul>`,
      );
      listItems = [];
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }
      if (trimmed.startsWith('## ')) {
        flushList();
        htmlParts.push(`<h5>${escapeHtml(trimmed.slice(3))}</h5>`);
        return;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        listItems.push(`<li>${escapeHtml(trimmed.slice(2))}</li>`);
        return;
      }
      flushList();
      htmlParts.push(`<p>${escapeHtml(trimmed)}</p>`);
    });

    flushList();
    return htmlParts.join('');
  };

  const toPriority = (index) => {
    if (index === 0) return { label: 'High Priority', className: 'badge-high' };
    if (index === 1)
      return { label: 'Medium Priority', className: 'badge-medium' };
    return { label: 'Low Priority', className: 'badge-low' };
  };

  const recContainer = document.getElementById('rec-list-container');
  const sourceNote = document.getElementById('rec-source-note');
  const explanationContainer = document.getElementById(
    'rec-explanation-content',
  );

  const setThemeVisuals = () => {
    const themeBtn = document.getElementById('themeBtn');
    const themeIcon = themeBtn?.querySelector('i');
    const appLogo = document.getElementById('app-logo');
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      if (themeIcon) themeIcon.className = 'fa-regular fa-sun';
      if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
      return;
    }
    if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  };

  const setLoadingState = (message) => {
    if (!recContainer) return;
    recContainer.innerHTML = `
            <div class="rec-state">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>${escapeHtml(message)}</span>
            </div>
        `;
  };

  const setErrorState = (message) => {
    if (!recContainer) return;
    recContainer.innerHTML = `
            <div class="rec-state rec-state-error">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>${escapeHtml(message)}</span>
            </div>
        `;
  };

  const loadBackendGrades = async () => {
    const recommendationService = window.NibrasServices?.recommendationService;
    const programService = window.NibrasServices?.programService;
    const coursesService = window.NibrasServices?.coursesService;

    // Try new courses backend first (GitHub backend: Dummy-Nibras)
    if (coursesService && typeof coursesService.getGrades === 'function') {
      try {
        const response = await coursesService.getGrades();
        if (response?.success && response?.data?.grades) {
          const grades = extractGradeEntries(response.data.grades);
          if (Object.keys(grades).length > 0) {
            return { grades, source: 'courses:/ai/grades' };
          }
        }
      } catch (error) {
        console.warn(
          '[RECOMMENDATION.JS] Courses backend grades failed:',
          error?.message || error,
        );
      }
    }

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
      let payload = await programService.getSheet();
      let grades = extractGradeEntries(payload);
      if (Object.keys(grades).length > 0)
        return { grades, source: 'tracking:/v1/programs/student/me/sheet' };

      if (typeof programService.generateSheet === 'function') {
        await programService.generateSheet();
        payload = await programService.getSheet();
        grades = extractGradeEntries(payload);
        if (Object.keys(grades).length > 0)
          return {
            grades,
            source: 'tracking:/v1/programs/student/me/sheet (generated)',
          };
      }
    }

    throw new Error(
      'No compatible grade records were found from available backend endpoints.',
    );
  };

  const renderRecommendations = (result, gradesCount) => {
    const recommendations = Array.isArray(result?.recommendations)
      ? result.recommendations
      : [];
    const strengths = Array.isArray(result?.strengths) ? result.strengths : [];
    const explanation = String(result?.explanation || '');

    if (recommendations.length === 0) {
      setErrorState('The recommendation API returned no tracks.');
      return;
    }

    recContainer.innerHTML = recommendations
      .map((track, index) => {
        const priority = toPriority(index);
        const safeTrack = String(track || '').trim() || `Track ${index + 1}`;
        const reason =
          extractTrackReason(safeTrack, explanation) ||
          TRACK_DESCRIPTIONS[safeTrack] ||
          'Recommended from your current profile.';
        const strengthChips = strengths.length
          ? strengths
              .map(
                (entry) =>
                  `<span class="rec-strength-chip">${escapeHtml(entry)}</span>`,
              )
              .join('')
          : '<span class="rec-strength-chip rec-strength-chip-muted">No strengths provided</span>';

        return `
                <article class="rec-item">
                    <div class="rec-left">
                        <div class="rec-icon-box">
                            <i class="fa-solid fa-lightbulb"></i>
                        </div>
                        <div class="rec-content">
                            <h4>${escapeHtml(safeTrack)}</h4>
                            <span class="rec-desc">${escapeHtml(reason)}</span>
                            <div class="rec-meta">
                                <span class="rec-badge ${priority.className}">${priority.label}</span>
                            </div>
                            <div class="rec-strength-list">${strengthChips}</div>
                        </div>
                    </div>
                    <button class="btn-start-learning" type="button">Explore Track</button>
                </article>
            `;
      })
      .join('');

    if (sourceNote) {
      sourceNote.textContent = `Using ${gradesCount} graded course records from backend APIs.`;
    }
    if (explanationContainer) {
      explanationContainer.innerHTML = formatExplanationToHtml(explanation);
    }
  };

  const initRecommendationPage = async () => {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.forEach((entry) => entry.classList.remove('active'));
        link.classList.add('active');
      });
    });

    const themeBtn = document.getElementById('themeBtn');
    setThemeVisuals();
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        themeBtn.classList.remove('rotating');
        void themeBtn.offsetWidth;
        themeBtn.classList.add('rotating');
        setTimeout(() => themeBtn.classList.remove('rotating'), 400);
        const html = document.documentElement;
        const current =
          html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        setThemeVisuals();
      });
    }

    setLoadingState('Loading personalized recommendations...');
    try {
      var aiResult = null;
      var gradesCount = 0;

      var aiService = window.NibrasServices?.aiService;
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
          window.NibrasServices?.recommendationService;
        if (
          !recommendationService ||
          typeof recommendationService.recommend !== 'function'
        ) {
          throw new Error('Recommendation API service is unavailable.');
        }
        var result = await recommendationService.recommend(grades);
        aiResult = result;
      }

      renderRecommendations(aiResult, gradesCount);
      if (sourceNote) {
        sourceNote.textContent =
          aiResult?.source === 'ai-module'
            ? `Using ${gradesCount} graded course records from Nibras-Backend AI module.`
            : `Using ${gradesCount} graded course records.`;
      }
    } catch (error) {
      const message = String(
        error?.message || 'Failed to load recommendations.',
      );
      setErrorState(message);
      if (sourceNote) {
        if (/route not found/i.test(message) || /recommend/i.test(message)) {
          sourceNote.textContent =
            'Recommendation API request failed. Configure a recommendation base URL (not a full /api/recommend path).';
        } else {
          sourceNote.textContent =
            'Recommendation data could not be generated from backend grades.';
        }
      }
      if (explanationContainer) {
        explanationContainer.innerHTML = '<p>No explanation is available.</p>';
      }
    }
  };

  initRecommendationPage();
});
