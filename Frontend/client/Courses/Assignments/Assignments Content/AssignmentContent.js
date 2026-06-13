window.NibrasReact.run(() => {
  const selectedCourse = window.NibrasCourses?.getSelectedCourse?.();
  if (!selectedCourse) return;
  const courseId = selectedCourse.id;
  let data = selectedCourse.assignmentDetail;
  const storedDetailRaw = localStorage.getItem('selectedAssignmentDetail');
  if (storedDetailRaw) {
    try {
      const parsedDetail = JSON.parse(storedDetailRaw);
      if (parsedDetail?.courseId === courseId && parsedDetail?.title) {
        data = parsedDetail;
      }
    } catch (_) {}
  }

  var isInstructor = (function () {
    try {
      var u = JSON.parse(localStorage.getItem('user') || '{}');
      return (
        String(u?.role?.name || u?.role || '').toLowerCase() === 'instructor'
      );
    } catch (_) {
      return false;
    }
  })();

  const services = window.NibrasServices;
  const cs = services?.coursesService;
  const bcs = services?.backendCoursesService;
  const ev = services?.evaluationService;
  const tcs = services?.testCaseService;
  const rs = services?.rubricService;
  const fs = services?.feedbackService;
  const projectsClient = window.NibrasProjectsApi?.createClient?.();

  const assignmentId = data?.backendAssignmentId || data?.assignmentId;
  const backendCourseId =
    data?.backendCourseId ||
    selectedCourse?.adminCourseId ||
    selectedCourse?.backendCourseId;

  let pollingInterval = null;
  let submissionId = localStorage.getItem(`last_sub_${data?.milestoneId}`);

  // --- Sidebar Nav ---
  const sidebarNavLinks = document.querySelectorAll('.nav-link');
  sidebarNavLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      sidebarNavLinks.forEach((nav) => nav.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // --- Theme Toggle ---
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn ? themeBtn.querySelector('i') : null;
  const themeText = themeBtn ? themeBtn.querySelector('span') : null;
  function updateThemeBtn(theme) {
    if (!themeIcon || !themeText) return;
    if (theme === 'dark') {
      themeIcon.className = 'fa-solid fa-sun';
      themeText.textContent = 'Light Mode';
    } else {
      themeIcon.className = 'fa-solid fa-moon';
      themeText.textContent = 'Dark Mode';
    }
  }
  const curTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeBtn(curTheme);
  if (themeBtn) {
    themeBtn.classList.remove('rotating');
    void themeBtn.offsetWidth;
    themeBtn.addEventListener('click', () => {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const newTheme = current === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeBtn(newTheme);
      themeBtn.classList.add('rotating');
      setTimeout(() => {
        themeBtn.classList.remove('rotating');
      }, 500);
    });
  }

  // --- Update nav links ---
  const navLinks = [
    {
      key: 'courseContent',
      path: '../../Course Description/courseContent.html',
    },
    { key: 'videos', path: '../../Videos/videos.html' },
    { key: 'assignments', path: '../Assignments.html' },
    { key: 'grades', path: '../../Grades/grades.html' },
  ];
  navLinks.forEach(({ key, path }) => {
    const el = document.querySelector(`[data-nav-link="${key}"]`);
    if (el)
      el.setAttribute(
        'href',
        window.NibrasCourses.withCourseId(path, courseId),
      );
  });
  const backBtn = document.querySelector('.back-btn');
  if (backBtn)
    backBtn.setAttribute(
      'href',
      window.NibrasCourses.withCourseId('../../courses.html', courseId),
    );
  const crumbLink = document.querySelector('.crumb-link');
  if (crumbLink)
    crumbLink.setAttribute(
      'href',
      window.NibrasCourses.withCourseId('../Assignments.html', courseId),
    );
  const metaTitle = document.querySelector('.course-meta h4');
  const metaSubtitle = document.querySelector('.course-meta span');
  if (metaTitle)
    metaTitle.textContent = `${selectedCourse.code}: ${selectedCourse.title}`;
  if (metaSubtitle)
    metaSubtitle.textContent = `${selectedCourse.overview.term} • Week ${selectedCourse.overview.currentWeek}`;

  // --- Tab Switching ---
  const subTabs = document.querySelectorAll('.sub-tab');
  subTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      subTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document
        .querySelectorAll('.sub-panel')
        .forEach((p) => p.classList.remove('active'));
      const panel = document.getElementById('panel-' + tab.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });

  // --- Code Submission ---
  const btnSubmitCode = document.getElementById('btn-submit-code');
  const codeEditor = document.getElementById('code-editor');
  const codeLanguage = document.getElementById('code-language');
  const codeStatus = document.getElementById('code-status');

  if (btnSubmitCode) {
    btnSubmitCode.addEventListener('click', async () => {
      const code = codeEditor.value.trim();
      if (!code) {
        alert('Please write some code before submitting.');
        return;
      }
      const language = codeLanguage.value;
      try {
        btnSubmitCode.disabled = true;
        btnSubmitCode.textContent = 'Submitting...';
        setCodeStatus('Submitting code...', 'info');

        if (ev && ev.submit) {
          const res = await ev.submit(assignmentId, { code, language });
          const sid = res?.data?.submissionId || res?.submissionId;
          if (sid) {
            submissionId = sid;
            localStorage.setItem(`last_sub_${data?.milestoneId}`, sid);
            document.getElementById('submit-section').style.display = 'none';
            const pulseCard = document.getElementById('submission-pulse');
            if (pulseCard) pulseCard.classList.add('active');
            setCodeStatus('Submitted! Waiting for evaluation...', 'success');
            startPolling(sid);
          } else {
            throw new Error('No submission ID returned');
          }
        } else {
          throw new Error('Evaluation service unavailable');
        }
      } catch (err) {
        console.error('Code submission failed:', err);
        alert('Submission failed: ' + err.message);
        btnSubmitCode.disabled = false;
        btnSubmitCode.textContent = 'Submit Code';
        setCodeStatus('Failed: ' + err.message, 'error');
      }
    });
  }

  // --- File Upload Submission ---
  const btnSubmitFile = document.getElementById('btn-submit-file');
  const fileInput = document.getElementById('file-input');
  const fileStatus = document.getElementById('file-status');
  const fileListNames = document.getElementById('file-list-names');

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (!fileListNames) return;
      const files = fileInput.files;
      if (files.length === 0) {
        fileListNames.textContent = '';
        return;
      }
      const names = Array.from(files)
        .map((f) => f.name)
        .join(', ');
      fileListNames.textContent = files.length + ' file(s): ' + names;
    });
  }

  if (btnSubmitFile) {
    btnSubmitFile.addEventListener('click', async () => {
      const files = fileInput.files;
      if (!files || files.length === 0) {
        alert('Please select at least one file.');
        return;
      }
      try {
        btnSubmitFile.disabled = true;
        btnSubmitFile.textContent = 'Uploading...';
        setFileStatus('Uploading files...', 'info');

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
          formData.append('files', files[i]);
        }

        if (ev && ev.submit) {
          const res = await ev.submit(assignmentId, formData);
          const sid = res?.data?.submissionId || res?.submissionId;
          if (sid) {
            submissionId = sid;
            localStorage.setItem(`last_sub_${data?.milestoneId}`, sid);
            document.getElementById('submit-section').style.display = 'none';
            const pulseCard = document.getElementById('submission-pulse');
            if (pulseCard) pulseCard.classList.add('active');
            setFileStatus('Submitted! Waiting for evaluation...', 'success');
            startPolling(sid);
          } else {
            throw new Error('No submission ID returned');
          }
        } else {
          throw new Error('Evaluation service unavailable');
        }
      } catch (err) {
        console.error('File submission failed:', err);
        alert('Upload failed: ' + err.message);
        btnSubmitFile.disabled = false;
        btnSubmitFile.textContent = 'Upload & Submit';
        setFileStatus('Failed: ' + err.message, 'error');
      }
    });
  }

  // --- Legacy GitHub Submission ---
  const btnSubmitGithub = document.getElementById('btn-submit-github');
  const githubUrlInput = document.getElementById('github-url');
  const branchInput = document.getElementById('submission-branch');
  const commitShaInput = document.getElementById('submission-commit-sha');
  const pulseCard = document.getElementById('submission-pulse');

  if (btnSubmitGithub) {
    btnSubmitGithub.addEventListener('click', async () => {
      const repoUrl = githubUrlInput.value.trim();
      if (!repoUrl) {
        alert('Please enter a valid GitHub repository URL.');
        return;
      }
      try {
        btnSubmitGithub.disabled = true;
        btnSubmitGithub.textContent = 'Submitting...';
        let submissionResult = null;
        if (
          projectsClient &&
          typeof projectsClient.submitMilestone === 'function'
        ) {
          submissionResult = await projectsClient.submitMilestone({
            milestoneId: data.milestoneId || 'default-milestone',
            courseId: courseId,
            projectKey: String(data.projectKey || ''),
            submissionType: 'github',
            resourceLink: repoUrl,
            branch: String(branchInput?.value || 'main').trim() || 'main',
            commitSha: String(commitShaInput?.value || '').trim(),
          });
        } else {
          throw new Error('Submission service unavailable.');
        }
        if (submissionResult?.ok) {
          if (submissionResult.data?.submissionId && data?.milestoneId) {
            localStorage.setItem(
              `last_sub_${data.milestoneId}`,
              String(submissionResult.data.submissionId),
            );
          }
          document.getElementById('submit-section').style.display = 'none';
          if (pulseCard) pulseCard.classList.add('active');
          if (submissionResult.data?.submissionId) {
            startPolling(submissionResult.data.submissionId);
          } else {
            updatePulseUI('queued');
          }
          return;
        }
        throw new Error('Submission endpoint is currently unavailable.');
      } catch (err) {
        console.error('GitHub submission failed:', err);
        alert('Submission failed: ' + err.message);
        btnSubmitGithub.disabled = false;
        btnSubmitGithub.textContent = 'Submit';
      }
    });
  }

  function setCodeStatus(msg, type) {
    if (!codeStatus) return;
    codeStatus.textContent = msg;
    codeStatus.className = 'sub-status sub-status-' + (type || 'info');
  }

  function setFileStatus(msg, type) {
    if (!fileStatus) return;
    fileStatus.textContent = msg;
    fileStatus.className = 'sub-status sub-status-' + (type || 'info');
  }

  function startPolling(sid) {
    if (pollingInterval) clearInterval(pollingInterval);
    let attemptCount = 0;
    const maxAttempts = 120;

    updatePulseUI('queued');

    pollingInterval = setInterval(async () => {
      attemptCount++;
      if (attemptCount > maxAttempts) {
        clearInterval(pollingInterval);
        updatePulseUI('failed');
        return;
      }
      try {
        let results;
        if (ev && ev.getResults) {
          results = await ev.getResults(sid);
        } else {
          results = await projectsClient?.getSubmissionStatus?.(sid);
        }
        const status = String(results?.status || results?.data?.status || '');
        const evalStatus = String(
          results?.evaluationStatus ||
            results?.data?.evaluationStatus ||
            status,
        );

        updatePulseUI(evalStatus);

        if (
          evalStatus === 'completed' ||
          evalStatus === 'passed' ||
          evalStatus === 'approved' ||
          evalStatus === 'needs_review' ||
          evalStatus === 'failed' ||
          evalStatus === 'error'
        ) {
          clearInterval(pollingInterval);
          if (
            evalStatus === 'completed' ||
            evalStatus === 'passed' ||
            evalStatus === 'approved'
          ) {
            renderTestResults(sid);
            renderStyleReport(sid);
            renderBenchmark(sid);
          }
          renderFeedback(sid);
          showAIAnalysis(sid);
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    }, 3000);
  }

  function updatePulseUI(status) {
    const steps = {
      init: document.getElementById('step-init'),
      clone: document.getElementById('step-clone'),
      test: document.getElementById('step-test'),
      grade: document.getElementById('step-grade'),
    };
    Object.values(steps).forEach((el) => {
      if (el) el.classList.remove('step-active', 'step-done', 'step-failed');
    });
    const s = String(status || '').toLowerCase();
    if (s === 'queued' || s === 'pending') {
      if (steps.init) steps.init.classList.add('step-active');
    } else if (s === 'cloning' || s === 'processing') {
      if (steps.init) steps.init.classList.add('step-done');
      if (steps.clone) steps.clone.classList.add('step-active');
    } else if (s === 'running_tests' || s === 'running' || s === 'evaluating') {
      if (steps.init) steps.init.classList.add('step-done');
      if (steps.clone) steps.clone.classList.add('step-done');
      if (steps.test) steps.test.classList.add('step-active');
    } else if (s === 'grading' || s === 'generating_report') {
      if (steps.init) steps.init.classList.add('step-done');
      if (steps.clone) steps.clone.classList.add('step-done');
      if (steps.test) steps.test.classList.add('step-done');
      if (steps.grade) steps.grade.classList.add('step-active');
    } else if (
      s === 'completed' ||
      s === 'passed' ||
      s === 'approved' ||
      s === 'needs_review'
    ) {
      Object.values(steps).forEach((el) => {
        if (el) el.classList.add('step-done');
      });
    } else if (s === 'failed' || s === 'error') {
      const current =
        document.querySelector('.pulse-step.step-active') || steps.init;
      if (current) {
        current.classList.remove('step-active');
        current.classList.add('step-failed');
      }
    }
  }

  // --- Render Test Results ---
  async function renderTestResults(sid) {
    const section = document.getElementById('test-results-section');
    const container = document.getElementById('test-cases-container');
    if (!section || !container) return;
    try {
      let testCases;
      if (ev && ev.getResults) {
        const res = await ev.getResults(sid);
        testCases =
          res?.data?.testCases || res?.testCases || res?.data?.results || [];
      }
      if (!testCases || testCases.length === 0) return;
      section.style.display = 'block';
      let passed = 0,
        failed = 0;
      container.innerHTML = '';
      testCases.forEach((tc, idx) => {
        const isPass =
          tc.status === 'passed' || tc.passed === true || tc.status === 'pass';
        if (isPass) passed++;
        else failed++;
        const statusIcon = isPass ? 'fa-circle-check' : 'fa-circle-xmark';
        const statusClass = isPass ? 'tc-pass' : 'tc-fail';
        container.innerHTML += [
          '<div class="test-case ' + statusClass + '">',
          '<div class="tc-header">',
          '<span class="tc-icon"><i class="fa-regular ' +
            statusIcon +
            '"></i></span>',
          '<span class="tc-name">Test Case #' +
            (idx + 1) +
            (tc.name ? ': ' + tc.name : '') +
            '</span>',
          '<span class="tc-weight">Weight: ' + (tc.weight || 1) + '</span>',
          '</div>',
          '<div class="tc-details">',
          tc.input
            ? '<div class="tc-detail-row"><span class="tc-label">Input:</span><code class="tc-code">' +
              escHtml(tc.input) +
              '</code></div>'
            : '',
          tc.expectedOutput
            ? '<div class="tc-detail-row"><span class="tc-label">Expected:</span><code class="tc-code">' +
              escHtml(tc.expectedOutput) +
              '</code></div>'
            : '',
          tc.actualOutput
            ? '<div class="tc-detail-row"><span class="tc-label">Actual:</span><code class="tc-code">' +
              escHtml(tc.actualOutput) +
              '</code></div>'
            : '',
          tc.error
            ? '<div class="tc-detail-row"><span class="tc-label">Error:</span><span class="tc-error-msg">' +
              escHtml(tc.error) +
              '</span></div>'
            : '',
          '<div class="tc-metrics">',
          tc.timeMs != null
            ? '<span class="tc-metric"><i class="fa-regular fa-clock"></i> ' +
              tc.timeMs +
              'ms</span>'
            : '',
          tc.memoryKb != null
            ? '<span class="tc-metric"><i class="fa-solid fa-memory"></i> ' +
              formatMemory(tc.memoryKb) +
              '</span>'
            : '',
          '</div>',
          '</div>',
          '</div>',
        ].join('');
      });
      document.getElementById('test-pass-count').textContent =
        passed + ' passed';
      document.getElementById('test-fail-count').textContent =
        failed + ' failed';
      document.getElementById('test-total-count').textContent =
        testCases.length + ' total';
    } catch (err) {
      console.warn('Failed to load test results:', err);
    }
  }

  // --- Render Style Report ---
  async function renderStyleReport(sid) {
    const section = document.getElementById('style-section');
    const container = document.getElementById('style-issues-container');
    if (!section || !container) return;
    try {
      let report;
      if (ev && ev.getStyleReport) {
        const res = await ev.getStyleReport(sid);
        report = res?.data || res;
      }
      if (!report) return;
      section.style.display = 'block';
      document.getElementById('style-tool').textContent =
        'Tool: ' + (report.tool || 'Unknown');
      const issues = report.issues || [];
      document.getElementById('style-issues').textContent =
        issues.length + ' issues';
      container.innerHTML = '';
      if (issues.length === 0) {
        container.innerHTML =
          '<div class="style-clean"><i class="fa-solid fa-circle-check"></i> No style issues found!</div>';
        return;
      }
      issues.forEach((issue) => {
        const sev = issue.severity || 'warning';
        const sevIcon =
          sev === 'error' ? 'fa-circle-exclamation' : 'fa-triangle-exclamation';
        const sevClass =
          sev === 'error' ? 'style-issue-error' : 'style-issue-warning';
        container.innerHTML += [
          '<div class="style-issue ' + sevClass + '">',
          '<span class="style-issue-icon"><i class="fa-solid ' +
            sevIcon +
            '"></i></span>',
          '<div class="style-issue-body">',
          '<span class="style-issue-msg">' +
            escHtml(issue.message || issue.msg || '') +
            '</span>',
          issue.line != null
            ? '<span class="style-issue-loc">Line ' +
              issue.line +
              (issue.column ? ', Col ' + issue.column : '') +
              '</span>'
            : '',
          issue.ruleId
            ? '<span class="style-issue-rule">[' +
              escHtml(issue.ruleId) +
              ']</span>'
            : '',
          '</div>',
          '</div>',
        ].join('');
      });
    } catch (err) {
      console.warn('Failed to load style report:', err);
    }
  }

  // --- Render Benchmark ---
  async function renderBenchmark(sid) {
    const section = document.getElementById('benchmark-section');
    const container = document.getElementById('benchmark-container');
    if (!section || !container) return;
    try {
      let bench;
      if (ev && ev.getBenchmark) {
        const res = await ev.getBenchmark(sid);
        bench = res?.data || res;
      }
      if (!bench) return;
      section.style.display = 'block';
      container.innerHTML = '';
      const metrics = [
        {
          label: 'Your Runtime',
          value: bench.runtimeMs,
          unit: 'ms',
          icon: 'fa-regular fa-clock',
          median: bench.medianRuntimeMs,
          better: 'lower',
        },
        {
          label: 'Your Memory',
          value: bench.memoryKb,
          unit: null,
          icon: 'fa-solid fa-memory',
          median: bench.medianMemoryKb,
          better: 'lower',
        },
        {
          label: 'Test Cases Passed',
          value: bench.passed + '/' + bench.total,
          unit: '',
          icon: 'fa-solid fa-vial',
          median: null,
        },
        {
          label: 'Score',
          value: bench.score != null ? bench.score + '%' : '--',
          unit: '',
          icon: 'fa-solid fa-star',
          median: null,
        },
      ];
      metrics.forEach((m) => {
        let compareHtml = '';
        if (m.median != null && m.value != null && m.better) {
          const val = Number(m.value);
          const med = Number(m.median);
          const diff = (((val - med) / med) * 100).toFixed(1);
          const isBetter = m.better === 'lower' ? val < med : val > med;
          const betterText = isBetter ? 'better than' : 'slower than';
          const diffClass = isBetter ? 'bench-better' : 'bench-worse';
          compareHtml =
            '<div class="bench-compare ' +
            diffClass +
            '">' +
            diff +
            '% ' +
            betterText +
            ' class median (' +
            med +
            (m.unit || '') +
            ')</div>';
        }
        const displayVal = m.value != null ? m.value + (m.unit || '') : '--';
        container.innerHTML += [
          '<div class="bench-item">',
          '<div class="bench-icon"><i class="' + m.icon + '"></i></div>',
          '<div class="bench-info">',
          '<div class="bench-label">' + m.label + '</div>',
          '<div class="bench-value">' + displayVal + '</div>',
          compareHtml,
          '</div>',
          '</div>',
        ].join('');
      });
    } catch (err) {
      console.warn('Failed to load benchmark:', err);
    }
  }

  // --- Render Feedback ---
  async function renderFeedback(sid) {
    const section = document.getElementById('feedback-section');
    if (!section) return;
    try {
      let feedbackData;
      if (fs && fs.submitGrade) {
        const res = await ev?.getResults?.(sid);
        feedbackData = res?.data?.feedback || res?.feedback;
      }
      if (!feedbackData) return;
      section.style.display = 'block';

      const rubricContainer = document.getElementById(
        'feedback-rubric-container',
      );
      if (rubricContainer && feedbackData.rubricScores) {
        rubricContainer.innerHTML = '';
        feedbackData.rubricScores.forEach((rs) => {
          const pct = rs.maxPoints
            ? Math.round((rs.score / rs.maxPoints) * 100)
            : 0;
          rubricContainer.innerHTML += [
            '<div class="fb-rubric-item">',
            '<div class="fb-rubric-top">',
            '<span class="fb-rubric-name">' +
              escHtml(rs.criteria || rs.name || '') +
              '</span>',
            '<span class="fb-rubric-score">' +
              rs.score +
              '/' +
              rs.maxPoints +
              ' (' +
              pct +
              '%)</span>',
            '</div>',
            '<div class="fb-rubric-bar"><div class="fb-rubric-fill" style="width:' +
              pct +
              '%"></div></div>',
            '</div>',
          ].join('');
        });
      }

      const textEl = document.getElementById('feedback-text');
      if (textEl && feedbackData.comment)
        textEl.textContent = feedbackData.comment;
      else if (textEl) textEl.textContent = 'No feedback yet.';

      const graderEl = document.getElementById('grader-name');
      if (graderEl)
        graderEl.textContent =
          feedbackData.grader || feedbackData.gradedBy || '--';
      const dateEl = document.getElementById('graded-date');
      if (dateEl)
        dateEl.textContent = feedbackData.date || feedbackData.gradedAt || '--';

      if (feedbackData.videoUrl) {
        const videoContainer = document.getElementById(
          'feedback-video-container',
        );
        const videoLink = document.getElementById('feedback-video-link');
        if (videoContainer && videoLink) {
          videoContainer.style.display = 'block';
          videoLink.href = feedbackData.videoUrl;
        }
      }

      if (feedbackData.peerReviews && feedbackData.peerReviews.length > 0) {
        const prContainer = document.getElementById('peer-reviews-container');
        const prList = document.getElementById('peer-reviews-list');
        if (prContainer && prList) {
          prContainer.style.display = 'block';
          prList.innerHTML = '';
          feedbackData.peerReviews.forEach((pr) => {
            prList.innerHTML += [
              '<div class="peer-review-item">',
              '<div class="pr-header"><strong>' +
                escHtml(pr.reviewerName || 'Anonymous') +
                '</strong>',
              pr.score != null
                ? '<span class="pr-score">Score: ' + pr.score + '/5</span>'
                : '',
              '</div>',
              pr.comment
                ? '<p class="pr-comment">' + escHtml(pr.comment) + '</p>'
                : '',
              '</div>',
            ].join('');
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load feedback:', err);
    }
  }

  // --- AI Analysis (legacy) ---
  async function showAIAnalysis(sid) {
    const wrapper = document.getElementById('ai-analysis-wrapper');
    if (!wrapper) return;
    try {
      let review;
      if (
        projectsClient &&
        typeof projectsClient.getSubmissionReview === 'function'
      ) {
        review = await projectsClient.getSubmissionReview(sid);
      }
      if (
        review &&
        (review.reasoning ||
          review.evidence ||
          typeof review.confidence_score === 'number')
      ) {
        wrapper.style.display = 'block';
        const toggleBtn = document.getElementById('toggle-ai-analysis');
        const aiContainer = document.getElementById('ai-analysis-container');
        const confidencePercent =
          typeof review.confidence_score === 'number'
            ? Math.round(review.confidence_score * 100)
            : null;
        document.getElementById('ai-reasoning-text').textContent =
          review.reasoning || 'No semantic reasoning returned.';
        document.getElementById('ai-confidence').textContent =
          confidencePercent == null
            ? 'Confidence: --%'
            : 'Confidence: ' + confidencePercent + '%';
        document.getElementById('ai-evidence-code').textContent =
          review.evidence || '// No specific code snippet flagged.';
        if (toggleBtn) {
          toggleBtn.addEventListener('click', () => {
            const isHidden = aiContainer.style.display === 'none';
            aiContainer.style.display = isHidden ? 'block' : 'none';
            toggleBtn.innerHTML = isHidden
              ? '<i class="fa-solid fa-eye-slash"></i> Hide AI Analysis'
              : '<i class="fa-solid fa-brain"></i> View AI Analysis';
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch AI review:', err);
    }
  }

  // --- Helpers ---
  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMemory(kb) {
    if (kb == null) return '--';
    if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB';
    return kb + ' KB';
  }

  // --- Populate UI ---
  populateUI(data);

  // --- Async data fetching from backend ---
  if (assignmentId) {
    loadAssignmentFromBackend(assignmentId);
    if (submissionId) {
      loadExistingResults(submissionId);
    }
  }

  async function loadAssignmentFromBackend(aid) {
    try {
      let assignmentData;
      if (bcs && bcs.getAssignmentById) {
        const res = await bcs.getAssignmentById(aid);
        assignmentData = res?.data || res;
      }
      if (!assignmentData) {
        if (cs && cs.getById) {
          const res = await cs.getById(aid);
          assignmentData = res?.data || res;
        }
      }
      if (assignmentData && assignmentData.title) {
        data = { ...data, ...assignmentData };
        populateUI(data);
      }
    } catch (err) {
      console.warn(
        '[AssignmentContent] Backend fetch failed, using local data:',
        err,
      );
    }
  }

  async function loadExistingResults(sid) {
    try {
      const pulseCard = document.getElementById('submission-pulse');
      const submitSection = document.getElementById('submit-section');

      if (ev && ev.getResults) {
        const res = await ev.getResults(sid);
        const evalStatus = String(
          res?.data?.evaluationStatus ||
            res?.evaluationStatus ||
            res?.data?.status ||
            '',
        );
        if (
          evalStatus === 'completed' ||
          evalStatus === 'passed' ||
          evalStatus === 'approved'
        ) {
          if (submitSection) submitSection.style.display = 'none';
          if (pulseCard) pulseCard.classList.add('active');
          Object.values(document.querySelectorAll('.pulse-step')).forEach(
            (el) => el.classList.add('step-done'),
          );
          renderTestResults(sid);
          renderStyleReport(sid);
          renderBenchmark(sid);
          renderFeedback(sid);
          showAIAnalysis(sid);
          return;
        }
        if (evalStatus && evalStatus !== 'failed' && evalStatus !== 'error') {
          if (submitSection) submitSection.style.display = 'none';
          if (pulseCard) pulseCard.classList.add('active');
          startPolling(sid);
          return;
        }
      }

      const storedStatus = localStorage.getItem(
        `last_sub_status_${data?.milestoneId}`,
      );
      if (
        storedStatus &&
        (storedStatus === 'completed' ||
          storedStatus === 'passed' ||
          storedStatus === 'approved')
      ) {
        if (submitSection) submitSection.style.display = 'none';
      }
    } catch (err) {
      console.warn('Could not load existing results:', err);
    }
  }

  function populateUI(data) {
    document.getElementById('crumb-title').textContent = data.title;
    document.getElementById('assign-title').textContent = data.title;
    document.getElementById('assign-points').textContent = data.points;
    document.getElementById('assign-desc').textContent = data.description || '';
    const scoreEarned =
      typeof data.scoreEarned === 'number' ? data.scoreEarned : 0;
    document.getElementById('assign-score').textContent =
      scoreEarned + '/' + data.points;

    document.getElementById('meta-due').textContent = data.dueDate || 'TBD';
    document.getElementById('meta-time').textContent = data.dueTime || '';
    document.getElementById('meta-type').textContent =
      data.submissionType || 'Code';

    if (scoreEarned > 0 || isInstructor) {
      const submitSection = document.getElementById('submit-section');
      if (submitSection) submitSection.style.display = 'none';
    }

    const instrContainer = document.getElementById('instructions-container');
    if (data.instructions) {
      let instrHtml = '<p>' + (data.instructions.intro || '') + '</p><ul>';
      if (data.instructions.points) {
        data.instructions.points.forEach((pt) => {
          instrHtml += '<li>' + pt + '</li>';
        });
      }
      instrHtml += '</ul>';
      instrContainer.innerHTML = instrHtml;
    } else {
      instrContainer.innerHTML =
        '<p>' + (data.description || 'No instructions provided.') + '</p>';
    }

    const fileContainer = document.getElementById('files-container');
    if (data.files && data.files.length > 0) {
      fileContainer.innerHTML = '';
      data.files.forEach((file) => {
        let icon = 'fa-regular fa-file';
        if (file.type === 'pdf') icon = 'fa-regular fa-file-pdf';
        if (file.type === 'zip') icon = 'fa-regular fa-file-zipper';
        fileContainer.innerHTML +=
          '<div class="file-item"><div class="file-info"><i class="' +
          icon +
          '"></i> ' +
          (file.name || 'file') +
          '</div><a href="#" class="download-link">Download</a></div>';
      });
    } else {
      fileContainer.innerHTML =
        '<div style="color: var(--text-secondary); font-size: 0.9rem;">No files attached.</div>';
    }

    const rubricContainer = document.getElementById('rubric-container');
    if (data.rubric && data.rubric.length > 0) {
      rubricContainer.innerHTML = '';
      data.rubric.forEach((item) => {
        rubricContainer.innerHTML +=
          '<div class="rubric-item"><span class="rubric-name">' +
          (item.criteria || item.name || '') +
          '</span><span class="rubric-percent">' +
          (item.percent || item.maxPoints || '') +
          '</span></div>';
      });
    } else {
      rubricContainer.innerHTML =
        '<div style="color: var(--text-secondary); font-size: 0.9rem;">No rubric specified.</div>';
    }

    if (data.feedback) {
      document.getElementById('feedback-text').textContent =
        data.feedback.comment || 'No feedback yet.';
      document.getElementById('grader-name').textContent =
        data.feedback.grader || '--';
      document.getElementById('graded-date').textContent =
        data.feedback.date || '--';
      if (
        data.feedback.comment &&
        data.feedback.comment !== 'No feedback yet.' &&
        data.feedback.comment !== '...'
      ) {
        document.getElementById('feedback-section').style.display = 'block';
      }
    }
  }
});
