(function () {
  'use strict';

  var STATUS_LABELS = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    submitted: 'Submitted',
    graded: 'Graded',
    late: 'Late',
    pending: 'Pending',
  };

  var STATUS_BADGE = {
    graded: 'graded',
    submitted: 'submitted',
    late: 'late',
    not_started: 'pending',
    in_progress: 'pending',
    pending: 'pending',
  };

  function formatDueDate(iso) {
    if (!iso) return { dueDate: 'TBD', dueTime: '' };
    var due = new Date(iso);
    if (Number.isNaN(due.getTime())) return { dueDate: 'TBD', dueTime: '' };
    return {
      dueDate: due.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      dueTime: due.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }

  function mapTrackingStatus(status) {
    var normalized = String(status || 'not_started').toLowerCase();
    return {
      status: STATUS_BADGE[normalized] || 'pending',
      statusLabel: STATUS_LABELS[normalized] || 'Pending',
      rawStatus: normalized,
    };
  }

  function mapTrackingAssignmentToCard(item, courseId) {
    var due = formatDueDate(item.dueAt);
    var statusInfo = mapTrackingStatus(item.status);
    var score =
      item.score != null && Number.isFinite(Number(item.score))
        ? Number(item.score)
        : null;
    var points = Number(item.pointsPossible) || 100;
    var typeLabel =
      item.assignmentType === 'mcq' || item.assignmentType === 'quiz'
        ? 'Quiz'
        : 'File Upload';

    return {
      id: item.id,
      trackingAssignmentId: item.id,
      source: 'tracking',
      title: item.title || 'Untitled Assignment',
      description: item.description || '',
      dueDate: due.dueDate,
      dueTime: due.dueTime,
      status: statusInfo.status,
      statusLabel: statusInfo.statusLabel,
      rawStatus: statusInfo.rawStatus,
      points: points,
      score: score,
      type: typeLabel,
      action: score !== null ? 'View Details' : 'Submit',
      page: './Assignments Content/AssignmentContent.html',
      milestoneId: item.id,
      assignmentType: item.assignmentType || 'text',
    };
  }

  function mapNestjsAssignmentToCard(item, courseId) {
    var due = formatDueDate(item.dueDate);
    var points = Number(item.maxScore || item.points) || 100;
    return {
      id: item._id || item.id,
      backendAssignmentId: item._id || item.id,
      source: 'nestjs',
      title: item.title || 'Untitled Assignment',
      description: item.description || '',
      dueDate: due.dueDate,
      dueTime: due.dueTime,
      status: 'pending',
      statusLabel: 'Pending',
      rawStatus: 'not_started',
      points: points,
      score: null,
      type: 'Coding Assignment',
      action: 'Submit',
      page: './Assignments Content/AssignmentContent.html',
      milestoneId: item._id || item.id,
    };
  }

  function mergeAssignmentLists(lists) {
    var merged = [];
    var seen = new Set();
    lists.forEach(function (list) {
      (list || []).forEach(function (item) {
        if (!item || !item.title) return;
        var key =
          (item.source || 'static') +
          ':' +
          (item.trackingAssignmentId ||
            item.backendAssignmentId ||
            item.id ||
            item.title);
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(item);
      });
    });
    return merged;
  }

  function computeAssignmentStats(items) {
    var total = items.length;
    var completed = items.filter(function (item) {
      return item.status === 'graded' || item.status === 'submitted';
    }).length;
    var pointsEarned = items.reduce(function (sum, item) {
      return sum + (item.score != null ? Number(item.score) : 0);
    }, 0);
    var pointsTotal = items.reduce(function (sum, item) {
      return sum + (Number(item.points) || 0);
    }, 0);
    var progressPercent =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      total: total,
      completed: completed,
      pointsEarned: pointsEarned,
      pointsTotal: pointsTotal,
      progressPercent: progressPercent,
    };
  }

  function mapTrackingSectionsToLessons(sections, courseId) {
    var lessons = [];
    var videoIdByLessonId = {};
    var lessonIdByVideoId = {};

    (sections || []).forEach(function (section, sectionIndex) {
      var lessonId =
        'lesson-' + (section.id || sectionIndex + 1);
      var videoItems = (section.videos || []).map(function (video, vi) {
        var itemId = lessonId + '-video-' + (vi + 1);
        videoIdByLessonId[lessonId] = video.id;
        lessonIdByVideoId[video.id] = lessonId;
        var sourceType = 'html5';
        var youtube = '';
        var html5 = video.playbackUrl || '';
        if (html5 && /youtube\.com|youtu\.be/.test(html5)) {
          sourceType = 'youtube';
          youtube = html5;
          html5 = '';
        }
        return {
          id: itemId,
          trackingVideoId: video.id,
          title: video.title || 'Video ' + (vi + 1),
          duration: video.durationLabel || '10:00',
          sourceType: sourceType,
          youtube: youtube,
          html5: html5,
          bilibili: '',
          completed: Boolean(video.watched),
          locked: Boolean(video.locked),
        };
      });

      if (videoItems.length === 1) {
        videoIdByLessonId[lessonId] = videoItems[0].trackingVideoId;
        lessonIdByVideoId[videoItems[0].trackingVideoId] = lessonId;
      } else if (videoItems.length > 1) {
        videoItems.forEach(function (vi) {
          lessonIdByVideoId[vi.trackingVideoId] = lessonId;
        });
      }

      lessons.push({
        id: lessonId,
        trackingSectionId: section.id,
        title: section.title || 'Lecture ' + (sectionIndex + 1),
        duration: videoItems[0]?.duration || '10:00',
        locked: videoItems.some(function (v) {
          return v.locked;
        }),
        completed: videoItems.length > 0 && videoItems.every(function (v) {
          return v.completed;
        }),
        videoItems: videoItems,
        videoUrl: videoItems[0]?.html5 || videoItems[0]?.youtube || '',
      });
    });

    var completed = lessons.filter(function (l) {
      return l.completed;
    }).length;

    return {
      lessons: lessons,
      videoIdByLessonId: videoIdByLessonId,
      lessonIdByVideoId: lessonIdByVideoId,
      progress: {
        completed: completed,
        total: lessons.length,
      },
      currentLessonId: lessons[0]?.id || null,
    };
  }

  function letterGrade(percent) {
    if (percent >= 90) return 'A';
    if (percent >= 80) return 'B';
    if (percent >= 70) return 'C';
    if (percent >= 60) return 'D';
    return 'F';
  }

  function mapTrackingGradesToUi(rollup, selectedCourse, courseId) {
    var assignments = rollup?.assignments || [];
    var projects = rollup?.projects || [];
    var allItems = [];

    assignments.forEach(function (a) {
      var points = Number(a.pointsPossible) || 100;
      var score = a.score != null ? Number(a.score) : null;
      var percent =
        score != null && points > 0
          ? ((score / points) * 100).toFixed(1) + '%'
          : null;
      var status =
        a.status === 'graded'
          ? 'Graded'
          : a.status === 'late'
            ? 'Late Submission'
            : 'Pending';
      allItems.push({
        title: a.title,
        type: 'assignment',
        date: 'Assignment',
        score: score != null ? score + '/' + points : null,
        percent: percent,
        status: status,
        source: 'tracking',
        assignmentId: a.assignmentId,
        detailHref: window.NibrasCourseSidebar?.withCourseId
          ? window.NibrasCourseSidebar.withCourseId(
              '../Assignments/Assignments Content/AssignmentContent.html?assignmentId=' +
                encodeURIComponent(a.assignmentId) +
                '&source=tracking',
              courseId || selectedCourse?.id,
            )
          : '#',
      });
    });

    projects.forEach(function (p) {
      var max = Number(p.maxScore) || 0;
      var score = p.score != null ? Number(p.score) : null;
      var percent =
        score != null && max > 0 ? ((score / max) * 100).toFixed(1) + '%' : null;
      allItems.push({
        title: p.title,
        type: 'project',
        date: 'Project',
        score:
          score != null && max > 0 ? score + '/' + max : score != null ? String(score) : null,
        percent: percent,
        status: p.status === 'graded' ? 'Graded' : 'Pending',
        source: 'tracking',
        projectKey: p.projectKey,
        detailHref:
          p.projectKey && window.NibrasCourseSidebar?.withCourseId
            ? window.NibrasCourseSidebar.withCourseId(
                '../Projects/Projects.html',
                courseId || selectedCourse?.id,
              )
            : null,
      });
    });

    var gradedWithScores = allItems.filter(function (g) {
      return g.score != null && g.percent != null;
    });
    var earned = 0;
    var possible = 0;
    gradedWithScores.forEach(function (g) {
      var parts = String(g.score).split('/');
      if (parts.length === 2) {
        earned += Number(parts[0]) || 0;
        possible += Number(parts[1]) || 0;
      }
    });
    var overallPercent =
      possible > 0 ? (earned / possible) * 100 : 0;
    var gradedCount = allItems.filter(function (g) {
      return g.status === 'Graded';
    }).length;
    var totalCount = allItems.length;

    var assignmentEarned = 0;
    var assignmentPossible = 0;
    assignments.forEach(function (a) {
      assignmentPossible += Number(a.pointsPossible) || 0;
      if (a.score != null) assignmentEarned += Number(a.score);
    });
    var assignmentPercent =
      assignmentPossible > 0
        ? ((assignmentEarned / assignmentPossible) * 100).toFixed(1)
        : '0.0';

    var projectEarned = 0;
    var projectPossible = 0;
    projects.forEach(function (p) {
      if (p.maxScore != null) projectPossible += Number(p.maxScore);
      if (p.score != null) projectEarned += Number(p.score);
    });

    return {
      stats: [
        {
          label: 'Overall Grade',
          value: totalCount > 0 ? overallPercent.toFixed(1) + '%' : '—',
          sub: totalCount > 0 ? letterGrade(overallPercent) : '',
          icon: 'fa-solid fa-award',
          type: 'primary',
          extra: totalCount > 0 ? letterGrade(overallPercent) : '',
        },
        {
          label: 'Graded Items',
          value: gradedCount + '/' + totalCount,
          sub: 'Completed',
          icon: 'fa-regular fa-circle-check',
          type: 'standard',
        },
        {
          label: 'Assignment Points',
          value: assignmentEarned + '/' + assignmentPossible,
          sub: assignmentPercent + '%',
          icon: 'fa-regular fa-file-lines',
          type: 'standard',
        },
        {
          label: 'Project Points',
          value: projectEarned + '/' + projectPossible,
          sub: projects.length + ' projects',
          icon: 'fa-solid fa-diagram-project',
          type: 'standard',
        },
      ],
      breakdown: [
        {
          category: 'Assignments',
          score: assignmentEarned + '/' + assignmentPossible,
          percent: assignmentPercent + '%',
          weight: 'Assignments',
          change: '',
          color: '#f59e0b',
        },
        {
          category: 'Projects',
          score: projectEarned + '/' + projectPossible,
          percent:
            projectPossible > 0
              ? ((projectEarned / projectPossible) * 100).toFixed(1) + '%'
              : '0.0%',
          weight: 'Projects',
          change: '',
          color: '#374151',
        },
      ],
      grades: allItems,
      scale: (selectedCourse?.grades?.scale || []).length
        ? selectedCourse.grades.scale
        : [
            { grade: 'A', range: '90-100%', color: 'a' },
            { grade: 'B', range: '80-89%', color: 'b' },
            { grade: 'C', range: '70-79%', color: 'c' },
            { grade: 'D', range: '60-69%', color: 'd' },
            { grade: 'F', range: 'Below 60%', color: 'f' },
          ],
      weights: (selectedCourse?.grades?.weights || []).length
        ? selectedCourse.grades.weights
        : [
            { cat: 'Assignments', pct: '—' },
            { cat: 'Projects', pct: '—' },
          ],
    };
  }

  window.NibrasCourseMappers = {
    mapTrackingAssignmentToCard: mapTrackingAssignmentToCard,
    mapNestjsAssignmentToCard: mapNestjsAssignmentToCard,
    mergeAssignmentLists: mergeAssignmentLists,
    computeAssignmentStats: computeAssignmentStats,
    mapTrackingSectionsToLessons: mapTrackingSectionsToLessons,
    mapTrackingGradesToUi: mapTrackingGradesToUi,
    mapTrackingStatus: mapTrackingStatus,
    formatDueDate: formatDueDate,
  };
})();
