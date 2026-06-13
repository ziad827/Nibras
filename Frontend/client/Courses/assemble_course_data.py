#!/usr/bin/env python3
"""Assemble refactored courseData.js from core template + preserved sections."""

import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

CORE = r"""(function () {
  const SELECTED_COURSE_KEY = 'selectedCourseId';
  const TRACKING_COURSE_KEY = 'nibras_tracking_course_id';
  const DEFAULT_COURSE_ID = 'cs106a-programming-methodology';
  const PRACTICE_LAB_COURSE_ID = 'practice-labs';

  const gradeScale = [
    { grade: 'A', range: '93-100%', color: 'a' },
    { grade: 'A-', range: '90-92%', color: 'a' },
    { grade: 'B+', range: '87-89%', color: 'a' },
    { grade: 'B', range: '83-86%', color: 'b' },
    { grade: 'B-', range: '80-82%', color: 'b' },
    { grade: 'C+', range: '77-79%', color: 'c' },
    { grade: 'C', range: '73-76%', color: 'c' },
    { grade: 'C-', range: '70-72%', color: 'c' },
    { grade: 'D+', range: '67-69%', color: 'd' },
    { grade: 'D', range: '63-66%', color: 'd' },
    { grade: 'D-', range: '60-62%', color: 'd' },
    { grade: 'F', range: 'Below 60%', color: 'f' },
  ];

  const gradeWeights = [
    { cat: 'Assignments', pct: '40%' },
    { cat: 'Projects', pct: '30%' },
    { cat: 'Quizzes', pct: '20%' },
    { cat: 'Participation', pct: '10%' },
  ];

  const youtubeIds = [
    'dQw4w9WgXcQ',
    'M7lc1UVf-VE',
    'aqz-KE-bpKQ',
    'jNQXAC9IVRw',
    '9bZkp7q19f0',
    'LeAltgu_pbM',
    'OPf0YbXqDm0',
    '7wtfhZwyrcc',
  ];

  const instructorRoster = [
    'Dr. Sarah Johnson',
    'Prof. Michael Chen',
    'Dr. Emily Rodriguez',
    'Dr. Ahmed Hassan',
    'Dr. Mariam Mahmoud',
    'Dr. Amir Hassan',
    'Dr. Osama Mohsen',
    'Dr. Salma Mohamed',
  ];

  /* COURSE_CATALOG_BEGIN */
  const COURSE_CATALOG = {"courses":[]};
  /* COURSE_CATALOG_END */

  function normalizeCourseField(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function slugifyTrack(track) {
    return normalizeCourseField(track)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function buildCourseId(code, title, track) {
    const base = `${normalizeCourseField(code)}-${normalizeCourseField(title)}`;
    const slug = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const trackSlug = track ? slugifyTrack(track) : '';
    return trackSlug ? `${slug}-${trackSlug}` : slug;
  }

  function buildTopics(code, title) {
    const normalizedCode = normalizeCourseField(code) || 'Course';
    const normalizedTitle = normalizeCourseField(title) || 'Course';
    const shortTitle = normalizedTitle.split('/')[0].trim();
    return [
      `${shortTitle} Fundamentals`,
      `${normalizedCode} Core Techniques`,
      `${shortTitle} Problem Solving`,
      `${shortTitle} Applied Practice`,
    ];
  }

  function buildCoursesMetaFromCatalog(catalog) {
    return (catalog?.courses || []).map((entry, index) => {
      const code = normalizeCourseField(entry.code) || `COURSE-${index + 1}`;
      const title = normalizeCourseField(entry.title) || code;
      const track = normalizeCourseField(entry.track) || null;
      return {
        id: buildCourseId(code, title, track),
        code,
        title,
        instructor: instructorRoster[index % instructorRoster.length],
        progress: Math.max(0, Math.min(100, 34 + ((index * 11) % 61))),
        rating: Number((4.3 + (index % 7) * 0.1).toFixed(1)),
        level: entry.level || 'Beginner',
        category: entry.category || track || 'core',
        track,
        description: normalizeCourseField(entry.description),
        lectures: Array.isArray(entry.lectures) ? entry.lectures : [],
        deadline: `${2 + (index % 5)} Assignments - Due in ${3 + (index % 6)} days`,
        isPopular: index % 4 === 0,
        topics: buildTopics(code, title),
      };
    });
  }

  const coursesMeta = buildCoursesMetaFromCatalog(COURSE_CATALOG);

  const practiceLabMeta = {
    id: PRACTICE_LAB_COURSE_ID,
    code: 'PRACTICE 001',
    title: 'Practice Labs',
    instructor: 'Competitive Programming • Adaptive Level',
    progress: 0,
    rating: 5,
    level: 'Beginner',
    category: 'comp_prog',
    deadline: '5-10 problems per lab',
    isPopular: true,
    topics: [
      'Topic-based problem sets',
      'AI hints',
      'Contest simulation',
      'Performance analytics',
    ],
    lectures: [],
  };

  function instructorInitials(name) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  function toPercent(value, fallback) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, parsed));
    return fallback;
  }

  function mapVideoToLessonItem(video, lessonId, lectureIndex, videoIndex) {
    const itemId = `${lessonId}-video-${videoIndex + 1}`;
    const duration = `${10 + ((lectureIndex + videoIndex) % 50)}:00`;
    const type = String(video?.type || 'youtube').toLowerCase();

    if (type === 'youtube') {
      const videoId = video.id || video.youtubeId || '';
      const embed = `https://www.youtube.com/embed/${videoId}`;
      return {
        id: itemId,
        title: video.title || `Video ${videoIndex + 1}`,
        duration,
        sourceType: 'youtube',
        youtube: embed,
      };
    }

    if (type === 'mp4_url') {
      return {
        id: itemId,
        title: video.title || `Video ${videoIndex + 1}`,
        duration,
        sourceType: 'html5',
        html5: video.url || '',
      };
    }

    if (type === 'bilibili') {
      const bvid = video.bvid || video.bilibiliId || '';
      const page = video.page || 1;
      return {
        id: itemId,
        title: video.title || `Video ${videoIndex + 1}`,
        duration,
        sourceType: 'bilibili',
        bilibili: `https://player.bilibili.com/player.html?bvid=${bvid}&page=${page}`,
      };
    }

    if (type === 'internet_archive') {
      const archiveId = video.archive_id || video.archiveId || '';
      const embed = archiveId.startsWith('http')
        ? archiveId
        : `https://archive.org/embed/${archiveId}`;
      return {
        id: itemId,
        title: video.title || `Video ${videoIndex + 1}`,
        duration,
        sourceType: 'internet_archive',
        youtube: embed,
      };
    }

    if (type === 'panopto') {
      const panoptoId = video.id || '';
      return {
        id: itemId,
        title: video.title || `Video ${videoIndex + 1}`,
        duration,
        sourceType: 'panopto',
        panopto: `https://stanford.hosted.panopto.com/Panopto/Pages/Embed.aspx?id=${panoptoId}`,
      };
    }

    const fallbackId = video.id || video.youtubeId || youtubeIds[videoIndex % youtubeIds.length];
    return {
      id: itemId,
      title: video.title || `Video ${videoIndex + 1}`,
      duration,
      sourceType: 'youtube',
      youtube: `https://www.youtube.com/embed/${fallbackId}`,
    };
  }

  function buildLessonVideoSources(videoItems) {
    const first = videoItems[0] || {};
    return {
      youtube: first.youtube || '',
      html5: first.html5 || '',
      bilibili: first.bilibili || '',
      panopto: first.panopto || '',
    };
  }

  function buildLessonsFromLectures(meta, completedLessons) {
    return (meta.lectures || []).map((lecture, lectureIndex) => {
      const lectureNumber = lecture.lecture || lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = (lecture.videos || []).map((video, videoIndex) =>
        mapVideoToLessonItem(video, lessonId, lectureIndex, videoIndex),
      );

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title || `Lecture ${lectureNumber}`}`,
        duration: `${videoItems.length} video${videoItems.length === 1 ? '' : 's'}`,
        completed: false,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: buildLessonVideoSources(videoItems),
        captions: { en: null },
      };
    });
  }

  function buildLessons(meta, completedLessons, seed) {
    const titles = [
      `Introduction to ${meta.title}`,
      `${meta.topics[0]} Foundations`,
      `${meta.topics[1]} in Practice`,
      `${meta.topics[2]} Workshop`,
      `${meta.topics[3]} Techniques`,
      `${meta.title} Problem Solving`,
      `Advanced ${meta.topics[1]}`,
      `${meta.title} Capstone Review`,
    ];

    return titles.map((title, index) => {
      const lessonNumber = index + 1;
      const isOpen = lessonNumber <= Math.max(completedLessons + 1, 3);
      return {
        id: `${meta.id}-lesson-${lessonNumber}`,
        title: `Lesson ${lessonNumber}: ${title}`,
        duration: `${12 + ((seed + index) % 14)}:${(10 + index * 7).toString().padStart(2, '0')}`,
        completed: false,
        locked: !isOpen,
        videoSources: {
          youtube: `https://www.youtube.com/embed/${youtubeIds[(seed + index) % youtubeIds.length]}`,
          html5: 'https://www.w3schools.com/html/mov_bbb.mp4',
        },
        captions: { en: null },
      };
    });
  }

"""

BUILD_COURSE = r"""
  function buildCourse(meta, index) {
    const progressPercent = toPercent(meta.progress, 50);
    const lectureCount = (meta.lectures || []).length || 8;
    const completedLectures = Math.max(
      1,
      Math.min(
        lectureCount,
        Math.round((progressPercent / 100) * lectureCount),
      ),
    );
    const completedAssignments = Math.max(
      1,
      Math.min(5, Math.round((progressPercent / 100) * 5)),
    );
    const term = 'Fall 2024';
    const currentWeek = Math.max(2, Math.min(8, 2 + index));
    const scoreBase = 60 + progressPercent * 0.35;
    const assignments = buildAssignments(meta, completedAssignments, index);
    const lessons = (meta.lectures || []).length
      ? buildLessonsFromLectures(meta, completedLectures)
      : buildLessons(meta, completedLectures, index);
    const currentLessonId = lessons[0]?.id || '';
    const description =
      meta.description ||
      `Learn ${meta.title} through guided modules, real practice, and continuous feedback focused on ${meta.topics.join(', ')}.`;

    return {
      id: meta.id,
      code: meta.code,
      title: meta.title,
      level: meta.level,
      category: meta.category,
      track: meta.track || null,
      instructor: meta.instructor,
      overview: {
        code: meta.code,
        title: `${meta.title} Fundamentals`,
        description,
        term,
        currentWeek,
        totalWeeks: 8,
        stats: {
          duration: '8 Weeks',
          commitment: '10-12 hours/week',
          enrolled: 180 + index * 19,
        },
        progress: {
          completedLectures,
          totalLectures: lessons.length,
          percent: progressPercent,
          avgScore: `${Math.round(scoreBase)}%`,
          assignmentsDone: `${completedAssignments}/5`,
        },
        instructor: {
          name: meta.instructor,
          role: `${meta.title} Instructor`,
          initials: instructorInitials(meta.instructor),
          rating: meta.rating,
          bio: `${meta.instructor} leads this course with practical coverage of ${meta.topics[0]} and ${meta.topics[1]}.`,
        },
        announcements: [
          {
            title: `Week ${currentWeek} session released`,
            date: 'Dec 18, 2024',
            content: `New learning material for ${meta.topics[2]} is now available in videos and assignments.`,
          },
          {
            title: 'Assignment update',
            date: 'Dec 17, 2024',
            content: `Rubric clarifications were posted for ${meta.topics[0]} submission tasks.`,
          },
          {
            title: 'Resources added',
            date: 'Dec 16, 2024',
            content: `A reference sheet covering ${meta.topics[1]} has been added to the course files.`,
          },
        ],
        objectives: [
          `Understand core concepts in ${meta.topics[0]}`,
          `Apply ${meta.topics[1]} in hands-on labs and assignments`,
          `Analyze real scenarios using ${meta.topics[2]}`,
          `Deliver a practical mini-project using ${meta.topics[3]}`,
          'Communicate technical decisions clearly and professionally',
        ],
        prerequisites: [
          'Basic computer literacy and internet navigation',
          'Readiness to practice 8-12 hours weekly',
          'A laptop with a modern browser and editor',
          `Willingness to experiment with ${meta.title} exercises`,
        ],
        curriculum: [
          {
            week: 1,
            title: `Introduction to ${meta.title}`,
            tags: [meta.topics[0], 'Foundations'],
            activity: 'Intro Lab',
            status: 'completed',
          },
          {
            week: 2,
            title: 'Core Concepts',
            tags: [meta.topics[1], 'Practice'],
            activity: 'Skill Check',
            status: 'completed',
          },
          {
            week: 3,
            title: 'Applied Workflows',
            tags: [meta.topics[2], 'Case Study'],
            activity: 'Workshop',
            status: 'completed',
          },
          {
            week: 4,
            title: 'Intermediate Implementation',
            tags: [meta.topics[3], 'Hands-on'],
            activity: 'Mini Build',
            status: 'current',
          },
          {
            week: 5,
            title: 'Optimization & Quality',
            tags: [meta.topics[0], 'Best Practices'],
            activity: 'Refactor Task',
            status: 'upcoming',
          },
          {
            week: 6,
            title: 'Project Sprint',
            tags: [meta.topics[1], 'Teamwork'],
            activity: 'Milestone 1',
            status: 'upcoming',
          },
          {
            week: 7,
            title: 'Testing & Validation',
            tags: [meta.topics[2], 'Evaluation'],
            activity: 'Milestone 2',
            status: 'upcoming',
          },
          {
            week: 8,
            title: 'Final Delivery',
            tags: [meta.topics[3], 'Presentation'],
            activity: 'Capstone Demo',
            status: 'upcoming',
          },
        ],
      },
      videos: {
        title: `${meta.title} Video Lessons`,
        progress: { completed: completedLectures, total: lessons.length },
        currentLessonId,
        lessons,
      },
      assignments: {
        stats: {
          completed: assignments.filter((item) => item.status === 'graded')
            .length,
          total: assignments.length,
          pointsEarned: assignments
            .filter((item) => item.score !== null)
            .reduce((sum, item) => sum + item.score, 0),
          pointsTotal: assignments.reduce((sum, item) => sum + item.points, 0),
          progressPercent: Math.round(
            (assignments.filter((item) => item.status === 'graded').length /
              assignments.length) *
              100,
          ),
        },
        items: assignments,
      },
      assignmentDetail: {
        title: assignments[0].title,
        points: assignments[0].points,
        scoreEarned: assignments[0].score || assignments[0].points - 2,
        description: assignments[0].description,
        dueDate: assignments[0].dueDate,
        dueTime: assignments[0].dueTime,
        submissionType: assignments[0].type,
        milestoneId: assignments[0].milestoneId,
        projectKey: assignments[0].projectKey,
        instructions: {
          intro: `Complete the assignment using concepts from ${meta.topics[0]} and ${meta.topics[1]}.`,
          points: [
            `Implement a working solution for ${meta.topics[0]}`,
            'Document design choices and assumptions',
            'Include tests/examples to validate behavior',
            'Submit organized files with clear naming',
          ],
        },
        files: [
          { name: `${meta.id}-requirements.pdf`, type: 'pdf' },
          { name: `${meta.id}-starter-template.zip`, type: 'zip' },
        ],
        rubric: [
          { criteria: 'Code Quality & Structure', percent: '40%' },
          { criteria: 'Requirements Coverage', percent: '40%' },
          { criteria: 'Documentation', percent: '20%' },
        ],
        feedback: {
          comment: `Good progress in ${meta.title}. Improve edge-case handling around ${meta.topics[2]}.`,
          grader: meta.instructor,
          date: 'Dec 19, 2024, 3:42 PM',
        },
      },
      projects: {
        subtitle: `${meta.code}: ${meta.title} • ${term}`,
        overallProgressPercent: Math.max(30, progressPercent - 10),
        primaryProjectId: `${meta.id}-project-1`,
        secondaryProjectId: `${meta.id}-project-2`,
        primaryProjectTitle: `${meta.title} Applied Project`,
        secondaryProjectTitle: `${meta.title} Portfolio Challenge`,
        primaryProjectDescription: `Build an applied solution that demonstrates ${meta.topics[0]}, ${meta.topics[1]}, and ${meta.topics[2]}.`,
        secondaryProjectDescription: `Develop an individual showcase focused on ${meta.topics[3]}.`,
        groupWorkspaceTitle: `Group Workspace: ${meta.title} Applied Project`,
      },
      grades: buildGrades(meta, assignments, scoreBase),
    };
  }

  const coursesById = {};
  coursesMeta.forEach((meta, index) => {
    coursesById[meta.id] = buildCourse(meta, index);
  });
  coursesById[practiceLabMeta.id] = {
    ...buildCourse(practiceLabMeta, coursesMeta.length),
    type: 'practice_lab',
    isPractice: true,
  };

"""

def main():
    assignments_path = "/tmp/course_assignments_grades.js"
    remote_path = "/tmp/course_remote.js"
    out_path = os.path.join(SCRIPT_DIR, "courseData.js")

    with open(assignments_path, encoding="utf-8") as f:
        assignments = f.read()
    with open(remote_path, encoding="utf-8") as f:
        remote = f.read()

    # Patch lookup index to register code+track composite keys
    remote = remote.replace(
        "      registerIndexEntry(\n        index.byCode,\n        normalizeIdentifierToken(meta.code),\n        localId,\n      );",
        """      registerIndexEntry(
        index.byCode,
        normalizeIdentifierToken(meta.code),
        localId,
      );
      if (meta.track) {
        registerIndexEntry(
          index.byCode,
          normalizeIdentifierToken(`${meta.code}-${meta.track}`),
          localId,
        );
      }""",
    )

    # Include track in getAllCoursesList
    remote = remote.replace(
        "        category: meta.category,\n        type: 'standard',",
        "        category: meta.category,\n        track: meta.track || null,\n        type: 'standard',",
    )

    content = CORE + assignments + BUILD_COURSE + remote
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
