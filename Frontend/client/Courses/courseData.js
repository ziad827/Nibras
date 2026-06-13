(function () {
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

  const beginnerCourseRows = [
    { code: 'CS106A', title: 'Programming Methodology', category: 'core' },
    { code: 'CS106B', title: 'Programming Abstractions', category: 'core' },
    {
      code: 'CS106X',
      title: 'Programming Abstractions (Accelerated)',
      category: 'core',
    },
    { code: 'MATH 18', title: 'Foundations for Calculus', category: 'core' },
    { code: 'MATH 19', title: 'Calculus I', category: 'core' },
    { code: 'MATH 20', title: 'Calculus II', category: 'core' },
    {
      code: 'MATH 21',
      title: 'Calculus III / Calculus with Infinite Processes',
      category: 'core',
    },
    {
      code: 'MATH 51',
      title: 'Linear Algebra, Multivariable Calculus, & Optimization',
      category: 'core',
    },
    {
      code: 'MATH 52',
      title: 'Multivariable Integration & Ordinary Differential Equations',
      category: 'core',
    },
    {
      code: 'MATH 53',
      title: 'Differential Calculus of Several Variables',
      category: 'core',
    },
    {
      code: 'CS 103',
      title: 'Mathematical Foundations of Computing',
      category: 'core',
    },
    {
      code: 'CS 109',
      title: 'Probability for Computer Scientists / Theory of Probability',
      category: 'core',
    },
    {
      code: 'PHYS 41',
      title: 'Introductory Mechanics Course (Classical Mechanics)',
      category: 'core',
    },
    { code: 'PHYS 43', title: 'Electricity and Magnetism', category: 'core' },
    { code: 'BIO', title: 'Biology', category: 'core' },
    { code: 'CHEM', title: 'Chemistry', category: 'core' },
  ];

  const intermediateCourseRows = [
    {
      code: 'CS 107',
      title: 'Computer Organization & Systems',
      category: 'core',
    },
    {
      code: 'CS 110',
      title: 'Principles of Computer Systems / Operating Systems Principles',
      category: 'core',
    },
    { code: 'CS 157', title: 'Computational Logic', category: 'core' },
    {
      code: 'CS 161',
      title: 'Design & Analysis of Algorithms',
      category: 'core',
    },
    {
      code: 'CS 181',
      title: 'Computers, Ethics, and Public Policy',
      category: 'elective',
    },
    {
      code: 'CS 181W',
      title: 'Computers, Ethics, and Public Policy (WIM)',
      category: 'elective',
    },
    { code: 'CS 194', title: 'Software Project', category: 'core' },
    {
      code: 'CS 205L',
      title:
        'Continuous Mathematical Methods with an Emphasis on Machine Learning',
      category: 'core',
    },
    {
      code: 'CS 210',
      title: 'Software Project Experience with Corporate Partners',
      category: 'core',
    },
    {
      code: 'CS 294',
      title: 'Research Project in Computer Science',
      category: 'core',
    },
    { code: 'MATH 104', title: 'Applied Matrix Theory', category: 'core' },
    { code: 'MATH 107', title: 'Graph Theory', category: 'core' },
    {
      code: 'MATH 108',
      title: 'Introduction to Combinatorics and Its Applications',
      category: 'core',
    },
    { code: 'MATH 109', title: 'Groups and Symmetry', category: 'core' },
    {
      code: 'MATH 110',
      title: 'Number Theory for Cryptography',
      category: 'core',
    },
    {
      code: 'MATH 113',
      title: 'Linear Algebra and Matrix Theory',
      category: 'core',
    },
    {
      code: 'EE 102',
      title: 'Introduction to Signals & Systems',
      category: 'core',
    },
    {
      code: 'ENGR 40M',
      title: 'Making: Integrated Engineering',
      category: 'elective',
    },
    {
      code: 'ENGR 76',
      title: 'Information Science & Engineering',
      category: 'elective',
    },
    { code: 'PHIL 251', title: 'Metalogic (PHIL 251)', category: 'core' },
    {
      code: 'Other EF',
      title: 'See Stanford list of approved EF courses',
      category: 'elective',
    },
    {
      code: 'STS options',
      title: 'Science, Technology, and Society courses',
      category: 'elective',
    },
  ];

  const advancedCourseRows = [
    {
      code: 'CS 221',
      title: 'Artificial Intelligence: Principles and Techniques',
      category: 'AI',
    },
    { code: 'CS 229', title: 'Machine Learning', category: 'AI' },
    {
      code: 'CS 224N',
      title: 'Natural Language Processing with Deep Learning',
      category: 'AI',
    },
    {
      code: 'CS 140',
      title: 'Operating Systems & Systems Programming',
      category: 'Systems',
    },
    { code: 'CS 143', title: 'Compilers', category: 'Systems' },
    {
      code: 'CS 144',
      title: 'Introduction to Computer Networking',
      category: 'Systems',
    },
    { code: 'CS 149', title: 'Parallel Computing', category: 'Systems' },
    {
      code: 'CS 154',
      title: 'Introduction to Automata and Complexity Theory',
      category: 'Theory',
    },
  ];

  const expertCourseRows = [
    {
      code: 'CS 231N',
      title: 'Deep Learning for Computer Vision',
      category: 'AI',
    },
    { code: 'CS 234', title: 'Reinforcement Learning', category: 'AI' },
    {
      code: 'CS 238',
      title: 'Decision Making under Uncertainty',
      category: 'AI',
    },
    {
      code: 'CS 155',
      title: 'Computer and Network Security',
      category: 'Systems',
    },
    {
      code: 'CS 240',
      title: 'Adv. Topics in Operating Systems',
      category: 'Systems',
    },
  ];

  function normalizeCourseField(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildCourseId(code, title) {
    const base = `${normalizeCourseField(code)}-${normalizeCourseField(title)}`;
    return base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
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

  function mapSpreadsheetRowsToMeta(rows, level, seedOffset) {
    return rows
      .filter(
        (row) =>
          normalizeCourseField(row?.code) || normalizeCourseField(row?.title),
      )
      .map((row, index) => {
        const seed = seedOffset + index;
        const code = normalizeCourseField(row.code) || `COURSE-${seed + 1}`;
        const title = normalizeCourseField(row.title) || code;
        return {
          id: buildCourseId(code, title),
          code,
          title,
          instructor: instructorRoster[seed % instructorRoster.length],
          progress: toPercent(34 + ((seed * 11) % 61), 50),
          rating: Number((4.3 + (seed % 7) * 0.1).toFixed(1)),
          level,
          category: row.category || 'core',
          deadline: `${2 + (seed % 5)} Assignments - Due in ${3 + (seed % 6)} days`,
          isPopular: seed % 4 === 0,
          topics: buildTopics(code, title),
        };
      });
  }

  const coursesMeta = [
    ...mapSpreadsheetRowsToMeta(beginnerCourseRows, 'Beginner', 0),
    ...mapSpreadsheetRowsToMeta(
      intermediateCourseRows,
      'Intermediate',
      beginnerCourseRows.length,
    ),
    ...mapSpreadsheetRowsToMeta(
      advancedCourseRows,
      'Advanced',
      beginnerCourseRows.length + intermediateCourseRows.length,
    ),
    ...mapSpreadsheetRowsToMeta(
      expertCourseRows,
      'Expert',
      beginnerCourseRows.length +
        intermediateCourseRows.length +
        advancedCourseRows.length,
    ),
  ];

  const cs106aMultiVideoLectures = [
    {
      title: 'Welcome to Code in Place',
      videos: [
        { title: 'Welcome', youtubeId: 'dxZFXJhZPvU' },
        { title: 'General Info', youtubeId: 'ukpUVAhdo94' },
        { title: 'Karel', youtubeId: 'LpxjnuQwTg4' },
      ],
    },
    {
      title: 'Control Flow in Karel',
      videos: [
        { title: 'Recap', youtubeId: 'xAQlbo82EuU' },
        { title: 'For Loops', youtubeId: 'yVmGFatf-Y8' },
        { title: 'While Loops', youtubeId: 'S5y2u7VITMo' },
        { title: 'If/Else', youtubeId: 'ACkcPIB5SZs' },
        { title: 'Steeple Chase', youtubeId: 'nxu8NBAv2pM' },
      ],
    },
    {
      title: 'Decomposition',
      videos: [
        { title: 'Recap', youtubeId: 'YFWUzglTrBQ' },
        { title: 'Morning', youtubeId: 'Cz-wnRvlAMI' },
        { title: 'Mountain', youtubeId: 'ecqDCBm8tkY' },
        { title: 'Rhoomba', youtubeId: 'JIQr_gtAWrc' },
        { title: 'WordSearch', youtubeId: '62RtoSXfitU' },
      ],
    },
    {
      title: 'Variables in Python',
      videos: [
        { title: 'Recap', youtubeId: 'pkh2gDQ8tjM' },
        { title: 'HelloWorld', youtubeId: 'wEbmXvfl8TM' },
        { title: 'Add2Numbers', youtubeId: 'oUuIMt5KmyQ' },
      ],
    },
    {
      title: 'Expressions',
      videos: [
        { title: 'Recap', youtubeId: 'YwePpeJn828' },
        { title: 'Expressions', youtubeId: 'iTBsRFnaoJ0' },
        { title: 'Constants', youtubeId: 'sAo9IdC223s' },
        { title: 'Math Library', youtubeId: 'H90Ud28sedo' },
        { title: 'Random Numbers', youtubeId: 'SQ2_cDLgrHI' },
        { title: 'Dice Simulator', youtubeId: '_rMzEF0v6UI' },
      ],
    },
    {
      title: 'Control Flow in Python',
      videos: [
        { title: 'Recap', youtubeId: '60AMFkbGZGY' },
        { title: 'Conditions', youtubeId: 'c6CZIQ3UFZE' },
        { title: 'Guess Num and Sentinel Sum', youtubeId: 'Y_IWN4OxhlM' },
        { title: 'Booleans', youtubeId: 'Y7evkU5j7TY' },
        { title: 'For Loops', youtubeId: '5BTJ4gVXaFQ' },
        { title: 'GameShow Teaser', youtubeId: 'mVoerPV6YLY' },
      ],
    },
    {
      title: 'Functions Revisited',
      videos: [
        { title: 'Recap with GameShow', youtubeId: 'wY68LUvnJ04' },
        { title: 'Functions are like Toasters', youtubeId: 'hmcuptr9WBE' },
        { title: 'Anatomy of a Function', youtubeId: 'lZ8DGnIRsng' },
        { title: 'Many Examples', youtubeId: 'CS-BMynY5ko' },
        { title: 'I/O', youtubeId: '8vXvRwj8fos' },
      ],
    },
    {
      title: 'Functions: More Practice',
      videos: [
        { title: 'Recap', youtubeId: 'vMy48Q6aPk0' },
        { title: 'Factorial', youtubeId: 'kZpiuJ1r3rg' },
        { title: 'DocTests', youtubeId: 'rXtLAPxeSgI' },
        { title: 'Passing Primitives', youtubeId: 'vmzFKkyjo4o' },
        { title: 'Calendar', youtubeId: '8PCQndHgkPE' },
      ],
    },
    {
      title: 'Images',
      videos: [
        { title: 'Recap', youtubeId: 'gjT_okH7HD8' },
        { title: 'Images in Python', youtubeId: 'iC82OUseeeY' },
        { title: 'First Examples', youtubeId: 'aeGbb8wC56g' },
        { title: 'GreenScreen', youtubeId: 'pAG9rAqA4N4' },
        { title: 'Mirrored', youtubeId: 'x0PpSbK4k_s' },
        { title: 'Nested For vs For Each Pixel', youtubeId: 'DhohL7AOzsw' },
      ],
    },
    {
      title: 'Graphics',
      videos: [
        { title: 'Recap', youtubeId: 'h9nnz_QSzZA' },
        { title: 'Blue Rect', youtubeId: '3RMrC1wWyFE' },
        { title: 'Programming is Awesome', youtubeId: 'SfiEWn9RCXM' },
        { title: 'Checkers', youtubeId: 'Y9Qi-6TWwpM' },
      ],
    },
    {
      title: 'Animations',
      videos: [
        { title: 'Recap', youtubeId: 'B8-lPPUU7eY' },
        { title: 'Animation Loop', youtubeId: 'jz02xtVaBo8' },
        { title: 'Move to Center', youtubeId: 'frTXMIWSuq0' },
        { title: 'Bouncing Ball', youtubeId: 'qjsxi3UzoA0' },
        { title: 'References', youtubeId: 'g0G4S_woMRA' },
        { title: 'Pong', youtubeId: 'XcvbczJF6CU' },
      ],
    },
    {
      title: 'Lists',
      videos: [
        { title: 'Recap with Console', youtubeId: 'QioUAmUAIgE' },
        { title: 'None', youtubeId: 'A-NrRd9GyYg' },
        { title: 'Lists', youtubeId: 'vhknJZ-2Bzg' },
        { title: 'Lists as Parameters', youtubeId: 'w4beNu04CMs' },
        { title: 'AverageScores', youtubeId: 'L_TyVmOQq-I' },
      ],
    },
    {
      title: 'Text Processing',
      videos: [
        { title: 'Hook and Recap', youtubeId: 'BQQVnsE2DZI' },
        { title: 'Working with Strings', youtubeId: 'xRhjkyJHFbE' },
        { title: 'Helpful String Functions', youtubeId: 'MOhsuyHr6fU' },
        { title: 'Just Number and DNA to mRNA', youtubeId: 'fNChmzR6rVs' },
        { title: 'Characters', youtubeId: 'SnJYJHmNW7s' },
        { title: 'Immutable', youtubeId: '-cIzBBzTnK8' },
        { title: 'ReverseString and Palindrome', youtubeId: 'PB4tJZHdcAk' },
        { title: 'FakeMedicine', youtubeId: 'BbE4dnoAmXs' },
      ],
    },
    {
      title: 'Dictionaries',
      videos: [
        { title: 'Recap with Files', youtubeId: 'GyexyR1qwZE' },
        { title: 'What are Dictionaries', youtubeId: 'iW6PlKk5XZk' },
        { title: 'Mutability and Dictionaries', youtubeId: 'vN9qV2hHbGk' },
        { title: 'Dictionapalooza', youtubeId: 'IUTaANNVS_w' },
        { title: 'CountWords', youtubeId: 'Pvcvy0W38T8' },
        { title: 'PhoneBook', youtubeId: 'jx8u6dFUxpY' },
      ],
    },
  ];

  const cs106bMultiVideoLectures = [
    {
      title: 'About the CS106 Series at Stanford',
      videos: [
        {
          title: 'Lecture 1',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture01.mp4',
        },
      ],
    },
    {
      title: 'Similarity between C++ & Java',
      videos: [
        {
          title: 'Lecture 2',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture02.mp4',
        },
      ],
    },
    {
      title: 'C++ Libraries - Standard Libraries',
      videos: [
        {
          title: 'Lecture 3',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture03.mp4',
        },
      ],
    },
    {
      title: 'C++ Console I/O',
      videos: [
        {
          title: 'Lecture 4',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture04.mp4',
        },
      ],
    },
    {
      title: 'Client Use of Templates',
      videos: [
        {
          title: 'Lecture 5',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture05.mp4',
        },
      ],
    },
    {
      title: 'More Containers',
      videos: [
        {
          title: 'Lecture 6',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture06.mp4',
        },
      ],
    },
    {
      title: 'Seeing Functions as Data',
      videos: [
        {
          title: 'Lecture 7',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture07.mp4',
        },
      ],
    },
    {
      title: 'Common Mistakes Stumbled Upon',
      videos: [
        {
          title: 'Lecture 8',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture08.mp4',
        },
      ],
    },
    {
      title: 'Thinking Recursively',
      videos: [
        {
          title: 'Lecture 9',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture09.mp4',
        },
      ],
    },
    {
      title: 'Refresh: Permute Code',
      videos: [
        {
          title: 'Lecture 10',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture10.mp4',
        },
      ],
    },
    {
      title: 'Backtracking Pseudocode',
      videos: [
        {
          title: 'Lecture 11',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture11.mp4',
        },
      ],
    },
    {
      title: 'Pointer Movie',
      videos: [
        {
          title: 'Lecture 12',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture12.mp4',
        },
      ],
    },
    {
      title: 'Coding with Linked List',
      videos: [
        {
          title: 'Lecture 13',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture13.mp4',
        },
      ],
    },
    {
      title: 'Algorithm Analysis',
      videos: [
        {
          title: 'Lecture 14',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture14.mp4',
        },
      ],
    },
    {
      title: 'Selection Sort',
      videos: [
        {
          title: 'Lecture 15',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture15.mp4',
        },
      ],
    },
    {
      title: 'Partitioning for Quicksort',
      videos: [
        {
          title: 'Lecture 16',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture16.mp4',
        },
      ],
    },
    {
      title: 'Sort Template with Callback',
      videos: [
        {
          title: 'Lecture 17',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture17.mp4',
        },
      ],
    },
    {
      title: 'Abstract Data Types',
      videos: [
        {
          title: 'Lecture 18',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture18.mp4',
        },
      ],
    },
    {
      title: 'Rules of Template Implementation',
      videos: [
        {
          title: 'Lecture 19',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture19.mp4',
        },
      ],
    },
    {
      title: 'Live Coding: Recap of Vector-based Implementation for Stack',
      videos: [
        {
          title: 'Lecture 20',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture20.mp4',
        },
      ],
    },
    {
      title: 'Buffer: Vector vs Stack',
      videos: [
        {
          title: 'Lecture 21',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture21.mp4',
        },
      ],
    },
    {
      title: 'Map as Vector',
      videos: [
        {
          title: 'Lecture 22',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture22.mp4',
        },
      ],
    },
    {
      title: 'Pathfinder Demo',
      videos: [
        {
          title: 'Lecture 23',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture23.mp4',
        },
      ],
    },
    {
      title: 'Compare Map Implementations',
      videos: [
        {
          title: 'Lecture 24',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture24.mp4',
        },
      ],
    },
    {
      title: 'Lexicon Case Study',
      videos: [
        {
          title: 'Lecture 25',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture25.mp4',
        },
      ],
    },
    {
      title: 'Final Showdown',
      videos: [
        {
          title: 'Lecture 26',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture26.mp4',
        },
      ],
    },
    {
      title: 'Guest Lecturer: Keith Schwarz',
      videos: [
        {
          title: 'Lecture 27',
          videoUrl:
            'http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture27.mp4',
        },
      ],
    },
  ];

  const cs106xMultiVideoLectures = [
    {
      title: 'Introduction',
      videos: [{ title: 'Lecture 1', bilibiliId: 'BV1PK411A7S4', page: 1 }],
    },
    {
      title: 'Functions',
      videos: [{ title: 'Lecture 2', bilibiliId: 'BV1PK411A7S4', page: 2 }],
    },
    {
      title: 'Strings, Streams, Grid',
      videos: [{ title: 'Lecture 3', bilibiliId: 'BV1PK411A7S4', page: 3 }],
    },
    {
      title: 'Vector, Big-Oh',
      videos: [{ title: 'Lecture 4', bilibiliId: 'BV1PK411A7S4', page: 4 }],
    },
    {
      title: 'Stacks and Queues',
      videos: [{ title: 'Lecture 5', bilibiliId: 'BV1PK411A7S4', page: 5 }],
    },
    {
      title: 'Sets and Maps',
      videos: [{ title: 'Lecture 6', bilibiliId: 'BV1PK411A7S4', page: 6 }],
    },
    {
      title: 'Recursion',
      videos: [{ title: 'Lecture 7', bilibiliId: 'BV1PK411A7S4', page: 7 }],
    },
    {
      title: 'Recursion 2',
      videos: [{ title: 'Lecture 8', bilibiliId: 'BV1PK411A7S4', page: 8 }],
    },
    {
      title: 'Recursion 3, Fractals',
      videos: [{ title: 'Lecture 9', bilibiliId: 'BV1PK411A7S4', page: 9 }],
    },
    {
      title: 'Exhaustive Search',
      videos: [{ title: 'Lecture 10', bilibiliId: 'BV1PK411A7S4', page: 10 }],
    },
    {
      title: 'Backtracking',
      videos: [{ title: 'Lecture 11', bilibiliId: 'BV1PK411A7S4', page: 11 }],
    },
    {
      title: 'Backtracking 2',
      videos: [{ title: 'Lecture 12', bilibiliId: 'BV1PK411A7S4', page: 12 }],
    },
    {
      title: 'Pointers and Nodes',
      videos: [{ title: 'Lecture 13', bilibiliId: 'BV1PK411A7S4', page: 13 }],
    },
    {
      title: 'Linked Lists',
      videos: [{ title: 'Lecture 14', bilibiliId: 'BV1PK411A7S4', page: 14 }],
    },
    {
      title: 'Linked Lists 2',
      videos: [{ title: 'Lecture 15', bilibiliId: 'BV1PK411A7S4', page: 15 }],
    },
    {
      title: 'Classes',
      videos: [{ title: 'Lecture 16', bilibiliId: 'BV1PK411A7S4', page: 16 }],
    },
    {
      title: 'Classes 2; Skip Lists',
      videos: [{ title: 'Lecture 17', bilibiliId: 'BV1PK411A7S4', page: 17 }],
    },
    {
      title: 'Arrays',
      videos: [{ title: 'Lecture 18', bilibiliId: 'BV1PK411A7S4', page: 18 }],
    },
    {
      title: 'Recursion 4, Memoization',
      videos: [{ title: 'Lecture 19', bilibiliId: 'BV1PK411A7S4', page: 19 }],
    },
    {
      title: 'Recursion 5, Sudoku',
      videos: [{ title: 'Lecture 20', bilibiliId: 'BV1PK411A7S4', page: 20 }],
    },
    {
      title: 'Implementing Map',
      videos: [{ title: 'Lecture 21', bilibiliId: 'BV1PK411A7S4', page: 21 }],
    },
    {
      title: 'Graphs 1, DFS',
      videos: [{ title: 'Lecture 22', bilibiliId: 'BV1PK411A7S4', page: 22 }],
    },
    {
      title: 'Graphs 2, BFS, Dijkstra',
      videos: [{ title: 'Lecture 23', bilibiliId: 'BV1PK411A7S4', page: 23 }],
    },
    {
      title: 'Graphs 3 - A*, Kruskal',
      videos: [{ title: 'Lecture 24', bilibiliId: 'BV1PK411A7S4', page: 24 }],
    },
    {
      title: 'Graphs 4 - Topological Sort',
      videos: [{ title: 'Lecture 25', bilibiliId: 'BV1PK411A7S4', page: 25 }],
    },
    {
      title: 'Inheritance, Hashing',
      videos: [{ title: 'Lecture 26', bilibiliId: 'BV1PK411A7S4', page: 26 }],
    },
    {
      title: 'Hashing 2, Inheritance 2',
      videos: [{ title: 'Lecture 27', bilibiliId: 'BV1PK411A7S4', page: 27 }],
    },
    {
      title: 'Sorting',
      videos: [{ title: 'Lecture 28', bilibiliId: 'BV1PK411A7S4', page: 28 }],
    },
    {
      title: 'Templates, STL',
      videos: [{ title: 'Lecture 29', bilibiliId: 'BV1PK411A7S4', page: 29 }],
    },
    {
      title: "What's Next",
      videos: [{ title: 'Lecture 30', bilibiliId: 'BV1PK411A7S4', page: 30 }],
    },
  ];

  const math18MultiVideoLectures = [
    {
      title: 'Introduction to Calculus',
      videos: [{ title: 'Lecture 1', youtubeId: 'fYyARMqiaag' }],
    },
    {
      title: 'Functions and Their Properties',
      videos: [{ title: 'Lecture 2', youtubeId: '1EGFSefe5II' }],
    },
    {
      title: 'Linear Functions and Rates of Change',
      videos: [{ title: 'Lecture 3', youtubeId: 'SzLF-wLZF_I' }],
    },
    {
      title: 'Polynomial and Rational Functions',
      videos: [{ title: 'Lecture 4', youtubeId: 'f-_UsIP5jyA' }],
    },
    {
      title: 'Exponential and Logarithmic Functions',
      videos: [{ title: 'Lecture 5', youtubeId: 'VSqOZNULRjQ' }],
    },
    {
      title: 'Trigonometric Functions',
      videos: [{ title: 'Lecture 6', youtubeId: 'OEE5-M4aY4k' }],
    },
    {
      title: 'Limits and Continuity',
      videos: [{ title: 'Lecture 7', youtubeId: 'PqQ5v94_NGM' }],
    },
    {
      title: 'Introduction to Derivatives',
      videos: [{ title: 'Lecture 8', youtubeId: '962lLfW-8Jo' }],
    },
    {
      title: 'Differentiation Rules',
      videos: [{ title: 'Lecture 9', youtubeId: 'EY6FHX6asU0' }],
    },
    {
      title: 'Chain Rule and Implicit Differentiation',
      videos: [{ title: 'Lecture 10', youtubeId: 'AvCQQ3X4Nuc' }],
    },
    {
      title: 'Derivatives of Trigonometric Functions',
      videos: [{ title: 'Lecture 11', youtubeId: 'qr1WXiq3S3k' }],
    },
    {
      title: 'Related Rates',
      videos: [{ title: 'Lecture 12', youtubeId: 'RJJSiNz5oto' }],
    },
    {
      title: 'Applications of Derivatives',
      videos: [{ title: 'Lecture 13', youtubeId: '8dr1dZjfhmc' }],
    },
    {
      title: 'Curve Sketching',
      videos: [{ title: 'Lecture 14', youtubeId: 'RUS4mKo9tBk' }],
    },
    {
      title: 'Optimization Problems',
      videos: [{ title: 'Lecture 15', youtubeId: '43Qt6wc44To' }],
    },
    {
      title: 'Introduction to Integration',
      videos: [{ title: 'Lecture 16', youtubeId: 'Mx39JbbzEAo' }],
    },
    {
      title: 'Definite Integrals',
      videos: [{ title: 'Lecture 17', youtubeId: 'qW89xdGfSzw' }],
    },
    {
      title: 'Fundamental Theorem of Calculus',
      videos: [{ title: 'Lecture 18', youtubeId: 'nQ6tOORDQ3I' }],
    },
    {
      title: 'Integration Techniques',
      videos: [{ title: 'Lecture 19', youtubeId: '29GbRaQxtzY' }],
    },
    {
      title: 'Integration by Parts',
      videos: [{ title: 'Lecture 20', youtubeId: '-PYebK8DKPc' }],
    },
    {
      title: 'Trigonometric Integrals',
      videos: [{ title: 'Lecture 21', youtubeId: '8u6woY05aL0' }],
    },
    {
      title: 'Integration of Rational Functions',
      videos: [{ title: 'Lecture 22', youtubeId: 'SWZcq_biZLw' }],
    },
    {
      title: 'Area Between Curves',
      videos: [{ title: 'Lecture 23', youtubeId: 'b2ZFpE_yrLg' }],
    },
    {
      title: 'Volumes of Revolution',
      videos: [{ title: 'Lecture 24', youtubeId: 'aiBD9aI69C8' }],
    },
    {
      title: 'Volumes Using Cross-Sections',
      videos: [{ title: 'Lecture 25', youtubeId: 'F0uuW-I6icY' }],
    },
    {
      title: 'Arc Length',
      videos: [{ title: 'Lecture 26', youtubeId: 'K0ORDCt5Ig0' }],
    },
    {
      title: 'Sequences and Series',
      videos: [{ title: 'Lecture 27', youtubeId: 'xjtEfS0vY2o' }],
    },
    {
      title: 'Infinite Series Convergence',
      videos: [{ title: 'Lecture 28', youtubeId: 'c7wur9Lixb0' }],
    },
    {
      title: 'Power Series',
      videos: [{ title: 'Lecture 29', youtubeId: 'GJOJl47l2_4' }],
    },
    {
      title: 'Taylor and Maclaurin Series',
      videos: [{ title: 'Lecture 30', youtubeId: 'BDmlottZVd4' }],
    },
    {
      title: 'Parametric Equations and Polar Coordinates',
      videos: [{ title: 'Lecture 31', youtubeId: '5Yuw1jCBq-0' }],
    },
  ];

  const engr40mMultiVideoLectures = [
    {
      title: 'Introduction and Lumped Abstraction',
      videos: [{ title: 'Lecture 1', youtubeId: 'AfQxyVuLeCs' }],
    },
    {
      title: 'Basic Circuit Analysis Method',
      videos: [{ title: 'Lecture 2', youtubeId: '2vHGYdepKLw' }],
    },
    {
      title: 'Superposition, Thévenin and Norton',
      videos: [{ title: 'Lecture 3', youtubeId: 'RsJ1eg7XNVs' }],
    },
    {
      title: 'The Digital Abstraction',
      videos: [{ title: 'Lecture 4', youtubeId: '4TCnYYpZxEc' }],
    },
    {
      title: 'Inside the Digital Gate',
      videos: [{ title: 'Lecture 5', youtubeId: 'v6vqWasIHaw' }],
    },
    {
      title: 'Nonlinear Analysis',
      videos: [{ title: 'Lecture 6', youtubeId: 'OGtElTMJidE' }],
    },
    {
      title: 'Incremental Analysis',
      videos: [{ title: 'Lecture 7', youtubeId: 'JqvKtMNz3RQ' }],
    },
    {
      title: 'Dependent Sources and Amplifiers',
      videos: [{ title: 'Lecture 8', youtubeId: 'bEJ0-8pANA9' }],
    },
    {
      title: 'MOSFET Amplifier Large Signal',
      videos: [
        { title: 'Part 1', youtubeId: 'Nijya-QJ45Y' },
        { title: 'Part 2', youtubeId: 'jURSAKBlIZA' },
      ],
    },
    {
      title: 'Amplifiers - Small Signal Model',
      videos: [{ title: 'Lecture 10', youtubeId: '9RqFFlZgf60' }],
    },
    {
      title: 'Small Signal Circuits',
      videos: [{ title: 'Lecture 11', youtubeId: 'R4KxlqsuZ0A' }],
    },
    {
      title: 'Capacitors and First-Order Systems',
      videos: [{ title: 'Lecture 12', youtubeId: 'COdQmA9g9S8' }],
    },
    {
      title: 'Digital Circuit Speed',
      videos: [{ title: 'Lecture 13', youtubeId: 'TXJIhDHtHSI' }],
    },
    {
      title: 'State and Memory',
      videos: [{ title: 'Lecture 14', youtubeId: 'bX8i2yECWaU' }],
    },
    {
      title: 'Second-Order Systems',
      videos: [
        { title: 'Part 1', youtubeId: 'ypX20WnHNQw' },
        { title: 'Part 2', youtubeId: '-gRXU-O1FY4' },
      ],
    },
    {
      title: 'Sinusoidal Steady State',
      videos: [{ title: 'Lecture 16', youtubeId: '3GdMaDzIUeQ' }],
    },
    {
      title: 'The Impedance Model',
      videos: [{ title: 'Lecture 17', youtubeId: 'Km9YIdkc2Oo' }],
    },
    {
      title: 'Filters',
      videos: [{ title: 'Lecture 18', youtubeId: 'WT-qzgaKeGI' }],
    },
    {
      title: 'The Operational Amplifier Abstraction',
      videos: [{ title: 'Lecture 19', youtubeId: 'V0z_f7qxLcY' }],
    },
    {
      title: 'Operational Amplifier Circuits',
      videos: [{ title: 'Lecture 20', youtubeId: '2SwT6JnfCq8' }],
    },
    {
      title: 'Op Amps Positive Feedback',
      videos: [{ title: 'Lecture 21', youtubeId: 'ke3SL_R92ys' }],
    },
    {
      title: 'Energy and Power',
      videos: [{ title: 'Lecture 22', youtubeId: 'wNuBD4PYWvs' }],
    },
    {
      title: 'Energy, CMOS',
      videos: [{ title: 'Lecture 23', youtubeId: 'JB2HgohNHYQ' }],
    },
    {
      title: 'Violating the Abstraction Barrier',
      videos: [{ title: 'Lecture 25', youtubeId: 'dyxcCoUgETU' }],
    },
  ];

  const engr76MultiVideoLectures = [
    {
      title: 'Bits and Codes',
      videos: [
        { title: 'Bits and Codes', bilibiliId: 'BV1g64y1M7zR', page: 1 },
      ],
    },
    {
      title: 'Compression',
      videos: [{ title: 'Compression', bilibiliId: 'BV1g64y1M7zR', page: 2 }],
    },
    {
      title: 'Noise and Errors',
      videos: [
        { title: 'Noise and Errors', bilibiliId: 'BV1g64y1M7zR', page: 3 },
      ],
    },
    {
      title: 'Probability 1',
      videos: [{ title: 'Probability 1', bilibiliId: 'BV1g64y1M7zR', page: 4 }],
    },
    {
      title: 'Probability 2',
      videos: [{ title: 'Probability 2', bilibiliId: 'BV1g64y1M7zR', page: 5 }],
    },
    {
      title: 'Communications 1',
      videos: [
        { title: 'Communications 1', bilibiliId: 'BV1g64y1M7zR', page: 6 },
      ],
    },
    {
      title: 'Communications 2',
      videos: [
        { title: 'Communications 2', bilibiliId: 'BV1g64y1M7zR', page: 7 },
      ],
    },
    {
      title: 'Processes',
      videos: [{ title: 'Processes', bilibiliId: 'BV1g64y1M7zR', page: 8 }],
    },
    {
      title: 'Inference 1',
      videos: [{ title: 'Inference 1', bilibiliId: 'BV1g64y1M7zR', page: 9 }],
    },
    {
      title: 'Inference 2',
      videos: [{ title: 'Inference 2', bilibiliId: 'BV1g64y1M7zR', page: 10 }],
    },
    {
      title: 'Maximum Entropy 1',
      videos: [
        { title: 'Maximum Entropy 1', bilibiliId: 'BV1g64y1M7zR', page: 11 },
      ],
    },
    {
      title: 'Maximum Entropy 2',
      videos: [
        { title: 'Maximum Entropy 2', bilibiliId: 'BV1g64y1M7zR', page: 12 },
      ],
    },
    {
      title: 'Physical Systems',
      videos: [
        { title: 'Physical Systems', bilibiliId: 'BV1g64y1M7zR', page: 13 },
      ],
    },
    {
      title: 'Energy 1',
      videos: [{ title: 'Energy 1', bilibiliId: 'BV1g64y1M7zR', page: 14 }],
    },
    {
      title: 'Energy 2',
      videos: [{ title: 'Energy 2', bilibiliId: 'BV1g64y1M7zR', page: 15 }],
    },
    {
      title: 'Temperature 1',
      videos: [
        { title: 'Temperature 1', bilibiliId: 'BV1g64y1M7zR', page: 16 },
      ],
    },
    {
      title: 'Temperature 2',
      videos: [
        { title: 'Temperature 2', bilibiliId: 'BV1g64y1M7zR', page: 17 },
      ],
    },
    {
      title: 'Quantum Information',
      videos: [
        { title: 'Quantum Information', bilibiliId: 'BV1g64y1M7zR', page: 18 },
      ],
    },
  ];

  const ee102MultiVideoLectures = [
    {
      title: 'Lecture 1',
      videos: [{ title: 'Lecture 1', youtubeId: '9gPuUVYImiQ' }],
    },
    {
      title: 'Lecture 2',
      videos: [{ title: 'Lecture 2', youtubeId: 'IVGPGQ8WRoo' }],
    },
    {
      title: 'Lecture 3',
      videos: [{ title: 'Lecture 3', youtubeId: 'dBu6dSWXeGk' }],
    },
    {
      title: 'Lecture 4',
      videos: [{ title: 'Lecture 4', youtubeId: 're7NLEqYjHA' }],
    },
    {
      title: 'Lecture 5',
      videos: [{ title: 'Lecture 5', youtubeId: 'b8Xz9CRJ-es' }],
    },
    {
      title: 'Lecture 7',
      videos: [{ title: 'Lecture 7', youtubeId: 'ymr7950ygdM' }],
    },
    {
      title: 'Lecture 9',
      videos: [{ title: 'Lecture 9', youtubeId: '88mup0b5c0U' }],
    },
    {
      title: 'Lecture 10',
      videos: [{ title: 'Lecture 10', youtubeId: 'I3DZM0rarTA' }],
    },
    {
      title: 'Lecture 11',
      videos: [{ title: 'Lecture 11', youtubeId: 'moAzNZo4bAE' }],
    },
    {
      title: 'Lecture 12',
      videos: [{ title: 'Lecture 12', youtubeId: 'TlFmw0kjQ3c' }],
    },
    {
      title: 'Lecture 13',
      videos: [{ title: 'Lecture 13', youtubeId: 'b7MGTr1R_Sk' }],
    },
    {
      title: 'Lecture 14',
      videos: [{ title: 'Lecture 14', youtubeId: 'TutXtjvzgh0' }],
    },
    {
      title: 'Lecture 16',
      videos: [{ title: 'Lecture 16', youtubeId: 'f3PbDgLOIpk' }],
    },
    {
      title: 'Lecture 17',
      videos: [{ title: 'Lecture 17', youtubeId: '-nDH8aSWaUM' }],
    },
    {
      title: 'Lecture 18',
      videos: [{ title: 'Lecture 18', youtubeId: 'mtOf7vYK8YU' }],
    },
    {
      title: 'Lecture 19',
      videos: [{ title: 'Lecture 19', youtubeId: 'XANTFFndQRY' }],
    },
    {
      title: 'Lecture 20',
      videos: [{ title: 'Lecture 20', youtubeId: 'NBIFWCbfZQ4' }],
    },
    {
      title: 'Lecture 23',
      videos: [{ title: 'Lecture 23', youtubeId: 'A90nje5JJuA' }],
    },
    {
      title: 'Lecture 24',
      videos: [{ title: 'Lecture 24', youtubeId: 'csL9VxDHPMg' }],
    },
    {
      title: 'Lecture 25',
      videos: [{ title: 'Lecture 25', youtubeId: 'QZEmtRdf6ww' }],
    },
    {
      title: 'Lecture 26',
      videos: [{ title: 'Lecture 26', youtubeId: 'GKYFFofkELA' }],
    },
  ];

  const math19MultiVideoLectures = [
    {
      title: 'Rate of Change',
      videos: [{ title: 'Lecture 1', youtubeId: '7K1sB05pE0A' }],
    },
    {
      title: 'Limits',
      videos: [{ title: 'Lecture 2', youtubeId: 'ryLdyDrBfvI' }],
    },
    {
      title: 'Derivatives',
      videos: [{ title: 'Lecture 3', youtubeId: 'kCPVBl953eY' }],
    },
    {
      title: 'Chain Rule',
      videos: [{ title: 'Lecture 4', youtubeId: '4sTKcvYMNxk' }],
    },
    {
      title: 'Implicit Differentiation',
      videos: [{ title: 'Lecture 5', youtubeId: '5q_3FDOkVRQ' }],
    },
    {
      title: 'Exponential and Log',
      videos: [{ title: 'Lecture 6', youtubeId: '9v25gg2qJYE' }],
    },
    {
      title: 'Exam 1 Review',
      videos: [{ title: 'Lecture 7', youtubeId: 'eHJuAByQf5A' }],
    },
    {
      title: 'Linear and Quadratic Approximations',
      videos: [{ title: 'Lecture 9', youtubeId: 'BSAA0akmPEU' }],
    },
    {
      title: 'Curve Sketching',
      videos: [{ title: 'Lecture 10', youtubeId: 'eRCN3daFCmU' }],
    },
    {
      title: 'Max-min',
      videos: [{ title: 'Lecture 11', youtubeId: 'twzGBqPeW0M' }],
    },
    {
      title: 'Related Rates',
      videos: [{ title: 'Lecture 12', youtubeId: 'YN7k_bXXggY' }],
    },
    {
      title: "Newton's Method",
      videos: [{ title: 'Lecture 13', youtubeId: 'sRIDVAcoG5A' }],
    },
    {
      title: 'Mean Value Theorem',
      videos: [{ title: 'Lecture 14', youtubeId: '4Q37iOyBq44' }],
    },
    {
      title: 'Antiderivatives',
      videos: [{ title: 'Lecture 15', youtubeId: '-MI0b4h3rS0' }],
    },
    {
      title: 'Differential Equations',
      videos: [{ title: 'Lecture 16', youtubeId: '60VGKnYBpbg' }],
    },
    {
      title: 'Definite Integrals',
      videos: [{ title: 'Lecture 18', youtubeId: 'hjZhPczMkL4' }],
    },
    {
      title: 'First Fundamental Theorem',
      videos: [{ title: 'Lecture 19', youtubeId: '1RLctDS2hUQ' }],
    },
    {
      title: 'Second Fundamental Theorem',
      videos: [{ title: 'Lecture 20', youtubeId: 'Pd2xP5zDsRw' }],
    },
    {
      title: 'Applications to Logarithms',
      videos: [{ title: 'Lecture 21', youtubeId: '_JXPe2J069c' }],
    },
    {
      title: 'Volumes',
      videos: [{ title: 'Lecture 22', youtubeId: 'ShGBRUx2ub8' }],
    },
    {
      title: 'Work, Probability',
      videos: [{ title: 'Lecture 23', youtubeId: 'R9a_NHXrBcg' }],
    },
    {
      title: 'Numerical Integration',
      videos: [{ title: 'Lecture 24', youtubeId: 'jBkXbAgMj6s' }],
    },
    {
      title: 'Exam 3 Review',
      videos: [{ title: 'Lecture 25', youtubeId: 'zUEuKrxgHws' }],
    },
    {
      title: 'Trig Integrals',
      videos: [{ title: 'Lecture 27', youtubeId: 'Bv9kVDcj7yo' }],
    },
    {
      title: 'Inverse Substitution',
      videos: [{ title: 'Lecture 28', youtubeId: 'CXKoCMVqM9s' }],
    },
    {
      title: 'Partial Fractions',
      videos: [{ title: 'Lecture 29', youtubeId: 'HgEqXhsIq_g' }],
    },
    {
      title: 'Integration by Parts',
      videos: [{ title: 'Lecture 30', youtubeId: 'aeXp1zC6Hls' }],
    },
    {
      title: 'Parametric Equations',
      videos: [{ title: 'Lecture 31', youtubeId: 'TpWQlKHPyJ4' }],
    },
    {
      title: 'Polar Coordinates',
      videos: [{ title: 'Lecture 32', youtubeId: 'XRkgBWbWvg4' }],
    },
    {
      title: 'Exam 4 Review',
      videos: [{ title: 'Lecture 33', youtubeId: 'BGE3wb7H2PA' }],
    },
    {
      title: 'Indeterminate Forms',
      videos: [{ title: 'Lecture 35', youtubeId: 'PNTnmH6jsRI' }],
    },
    {
      title: 'Improper Integrals',
      videos: [{ title: 'Lecture 36', youtubeId: 'KhwQKE_tld0' }],
    },
    {
      title: 'Infinite Series',
      videos: [{ title: 'Lecture 37', youtubeId: 'MK_0QHbUnIA' }],
    },
    {
      title: "Taylor's Series",
      videos: [{ title: 'Lecture 38', youtubeId: 'wOHrNt9ScYs' }],
    },
    {
      title: 'Final Review',
      videos: [{ title: 'Lecture 39', youtubeId: '--lPz7VFnKI' }],
    },
  ];

  const math20MultiVideoLectures = [
    {
      title: 'The Natural Log Function',
      videos: [{ title: 'Lecture 1', youtubeId: 'H9eCT6f_Ftw' }],
    },
    {
      title: 'Derivatives of Inverse Functions',
      videos: [{ title: 'Lecture 2', youtubeId: 'HnsUNWNYZ28' }],
    },
    {
      title: 'Derivatives and Integrals of Exponential Functions',
      videos: [{ title: 'Lecture 3', youtubeId: '5HlW7OnXUT4' }],
    },
    {
      title: 'Derivatives and Integrals of General Exponential Functions',
      videos: [{ title: 'Lecture 4', youtubeId: 'rR8imSHCuFk' }],
    },
    {
      title: 'Calculus of Inverse Trigonometric Functions',
      videos: [{ title: 'Lecture 5', youtubeId: 'ST3ORfqVYQw' }],
    },
    {
      title: 'A Discussion of Hyperbolic Functions',
      videos: [{ title: 'Lecture 6', youtubeId: '3kPg0gkJQgc' }],
    },
    {
      title: 'Evaluating Limits of Indeterminate Forms',
      videos: [{ title: 'Lecture 7', youtubeId: 'Zd7wd24jeok' }],
    },
    {
      title: 'Integration By Parts',
      videos: [{ title: 'Lecture 8', youtubeId: 'EOwjiFpDY_s' }],
    },
    {
      title: 'Techniques For Trigonometric Integrals',
      videos: [{ title: 'Lecture 9', youtubeId: 'pLrUBjiEo-w' }],
    },
    {
      title: 'Integrals By Trigonometric Substitution',
      videos: [{ title: 'Lecture 10', youtubeId: 'q6JwTGpG8b4' }],
    },
    {
      title: 'Integration By Partial Fractions',
      videos: [{ title: 'Lecture 11', youtubeId: 'KJGp0pyPoVo' }],
    },
    {
      title: 'Improper Integrals',
      videos: [{ title: 'Lecture 12', youtubeId: 'g-M8FHslgdk' }],
    },
    {
      title: 'Differential Equations',
      videos: [{ title: 'Lecture 13', youtubeId: 'WxVaVzxsDb0' }],
    },
    {
      title: 'Convergence and Divergence of Sequences',
      videos: [{ title: 'Lecture 14', youtubeId: 'FoNLQvf4NUs' }],
    },
    {
      title: 'Series and Divergence Test',
      videos: [{ title: 'Lecture 15', youtubeId: 'DGcWMdW-72M' }],
    },
    {
      title: 'Integral Test for Series',
      videos: [{ title: 'Lecture 16', youtubeId: '8jPpNK4GIVs' }],
    },
    {
      title: 'Comparison Test for Series',
      videos: [{ title: 'Lecture 17', youtubeId: 'ei8WKMAHky0' }],
    },
    {
      title: 'Alternating Series Test',
      videos: [{ title: 'Lecture 18', youtubeId: 'BhYPrQHDrjk' }],
    },
    {
      title: 'Absolute Convergence and Ratio Test',
      videos: [{ title: 'Lecture 19', youtubeId: 'g4iZJOwMkjU' }],
    },
    {
      title: 'Power Series',
      videos: [{ title: 'Lecture 20', youtubeId: 'TGD-TP1c7i4' }],
    },
    {
      title: 'Taylor and Maclaurin Series',
      videos: [{ title: 'Lecture 21', youtubeId: '3VHol7eosLA' }],
    },
    {
      title: 'Taylor Polynomials',
      videos: [{ title: 'Lecture 22', youtubeId: 'RbreIk02B3c' }],
    },
    {
      title: 'Parametric Equations',
      videos: [{ title: 'Lecture 23', youtubeId: 'd4KADBFqpR0' }],
    },
    {
      title: 'Calculus of Parametric Equations',
      videos: [{ title: 'Lecture 24', youtubeId: '1H6HrfX_qCA' }],
    },
    {
      title: 'Polar Coordinates',
      videos: [{ title: 'Lecture 25', youtubeId: 'sWUyFQQ5QeI' }],
    },
    {
      title: 'Calculus of Polar Equations',
      videos: [{ title: 'Lecture 26', youtubeId: 'Kh265EC11OI' }],
    },
    {
      title: 'Numerical Integration',
      videos: [{ title: 'Lecture 27', youtubeId: 'RTX-ik_8i-k' }],
    },
  ];

  const math21MultiVideoLectures = [
    {
      title: 'An Introduction to Vectors',
      videos: [{ title: 'Lecture 1', youtubeId: 'tGVnBAHLApA' }],
    },
    {
      title: 'Vectors in 3-D Coordinate System',
      videos: [{ title: 'Lecture 2', youtubeId: 'ZAv3bF2GznI' }],
    },
    {
      title: 'Using the Dot Product',
      videos: [{ title: 'Lecture 3', youtubeId: 'TKlGMRghcDs' }],
    },
    {
      title: 'The Cross Product',
      videos: [{ title: 'Lecture 4', youtubeId: 'qqfhgStQ-cA' }],
    },
    {
      title: 'Lines and Planes in 3-D',
      videos: [{ title: 'Lecture 5', youtubeId: 'IB1-lrPQjCw' }],
    },
    {
      title: 'Cylinders and Surfaces in 3-D',
      videos: [{ title: 'Lecture 6', youtubeId: 'aBlKxFsoMZw' }],
    },
    {
      title: 'Using Cylindrical and Spherical Coordinates',
      videos: [{ title: 'Lecture 7', youtubeId: 'rDeo721ogtk' }],
    },
    {
      title: 'An Introduction To Vector Functions',
      videos: [{ title: 'Lecture 8', youtubeId: 'YThPIdcwr78' }],
    },
    {
      title: 'Derivatives and Integrals of Vector Functions',
      videos: [{ title: 'Lecture 9', youtubeId: 'v_o-allq8LQ' }],
    },
    {
      title: 'Arc Length and Parameterization',
      videos: [{ title: 'Lecture 10', youtubeId: 'Hu72QVWsMlg' }],
    },
    {
      title: 'TNB Frames, Curvature, Torsion',
      videos: [{ title: 'Lecture 11', youtubeId: 'l7eDxflL-e0' }],
    },
    {
      title: 'Velocity and Acceleration',
      videos: [{ title: 'Lecture 12', youtubeId: 'yq4Cj1_bmnE' }],
    },
    {
      title: 'Intro to Multivariable Functions',
      videos: [{ title: 'Lecture 13', youtubeId: 'nIJQPX5kxp4' }],
    },
    {
      title: 'Limits and Continuity of Multivariable Functions',
      videos: [{ title: 'Lecture 14', youtubeId: 'MFF4mvyhAyA' }],
    },
    {
      title: 'Partial Derivatives',
      videos: [{ title: 'Lecture 15', youtubeId: 'EkZGBdY0vlg' }],
    },
    {
      title: 'Differentials of Multivariable Functions',
      videos: [{ title: 'Lecture 16', youtubeId: 'J72AKZtUpgY' }],
    },
    {
      title: 'The Chain Rule for Multivariable Functions',
      videos: [{ title: 'Lecture 17', youtubeId: 'tXryaM-mTpY' }],
    },
    {
      title: 'Directional Derivatives and Gradients',
      videos: [{ title: 'Lecture 18', youtubeId: 'tDPp5uWSIiU' }],
    },
    {
      title: 'Tangent Planes and Normal Lines',
      videos: [{ title: 'Lecture 19', youtubeId: 'yLbqHfuWsr8' }],
    },
    {
      title: 'Extrema of Functions of 2 Variables',
      videos: [{ title: 'Lecture 20', youtubeId: 'kPL28zgEFk8' }],
    },
    {
      title: 'Constrained Optimization with LaGrange Multipliers',
      videos: [{ title: 'Lecture 21', youtubeId: 'nUfYR5FBGZc' }],
    },
    {
      title: 'Introduction to Double Integrals',
      videos: [{ title: 'Lecture 22', youtubeId: 'lv_awaaT6gY' }],
    },
    {
      title: 'Double/Repeated/Iterated Integrals',
      videos: [{ title: 'Lecture 23', youtubeId: 'HxRG_phgGUw' }],
    },
    {
      title: 'Double Integrals over Polar Regions',
      videos: [{ title: 'Lecture 24', youtubeId: 'HA41kYxVYnw' }],
    },
    {
      title: 'Center of Mass for Lamina in 2-D',
      videos: [{ title: 'Lecture 25', youtubeId: 'WNZ8vMgaPgg' }],
    },
    {
      title: 'Triple Integrals',
      videos: [{ title: 'Lecture 26', youtubeId: 'uTLM_iEcVdA' }],
    },
    {
      title: 'Triple Integrals with Cylindrical and Spherical Coordinates',
      videos: [{ title: 'Lecture 27', youtubeId: 'R4vnw-yPnZ8' }],
    },
    {
      title: 'Change of Variables in Multiple Integrals',
      videos: [{ title: 'Lecture 28', youtubeId: 'VVPu5fWssPg' }],
    },
    {
      title: 'Introduction to Vector Fields',
      videos: [{ title: 'Lecture 29', youtubeId: '71Z1RVYZ8HY' }],
    },
    {
      title: 'Divergence and Curl of Vector Fields',
      videos: [{ title: 'Lecture 30', youtubeId: 'TMWevkxtS9s' }],
    },
    {
      title: 'Line Integrals Over Non-Conservative Fields',
      videos: [{ title: 'Lecture 31', youtubeId: 't6vtOOAnqyU' }],
    },
    {
      title: 'Line Integrals on Conservative Vector Fields',
      videos: [{ title: 'Lecture 32', youtubeId: 'HhopxDkW4L8' }],
    },
    {
      title: "Green's Theorem",
      videos: [{ title: 'Lecture 33', youtubeId: 'OnyCk62hEL4' }],
    },
    {
      title: 'Surface and Flux Integrals',
      videos: [{ title: 'Lecture 34', youtubeId: 'sQ0BJ3H-cZ8' }],
    },
  ];

  const math51MultiVideoLectures = [
    {
      title: '1. The Geometry of Linear Equations',
      videos: [{ title: 'Lecture 1', youtubeId: 'J7DzL2_Na80' }],
    },
    {
      title: '2. Elimination with Matrices',
      videos: [{ title: 'Lecture 2', youtubeId: 'QVKj3LADCnA' }],
    },
    {
      title: '3. Multiplication and Inverse Matrices',
      videos: [{ title: 'Lecture 3', youtubeId: 'FX4C-JpTFgY' }],
    },
    {
      title: '4. Factorization into A = LU',
      videos: [{ title: 'Lecture 4', youtubeId: 'MsIvs_6vC38' }],
    },
    {
      title: '5. Transposes, Permutations, Spaces R^n',
      videos: [{ title: 'Lecture 5', youtubeId: 'JibVXBElKL0' }],
    },
    {
      title: '6. Column Space and Nullspace',
      videos: [{ title: 'Lecture 6', youtubeId: '8o5Cmfpeo6g' }],
    },
    {
      title: '7. Solving Ax = 0',
      videos: [{ title: 'Lecture 7', youtubeId: 'VqP2tREMvt0' }],
    },
    {
      title: '8. Solving Ax = b',
      videos: [{ title: 'Lecture 8', youtubeId: '9Q1q7s1jTzU' }],
    },
    {
      title: '9. Independence, Basis, and Dimension',
      videos: [{ title: 'Lecture 9', youtubeId: 'yjBerM5jWsc' }],
    },
    {
      title: '10. The Four Fundamental Subspaces',
      videos: [{ title: 'Lecture 10', youtubeId: 'nHlE7EgJFds' }],
    },
    {
      title: '11. Matrix Spaces',
      videos: [{ title: 'Lecture 11', youtubeId: '2IdtqGM6KWU' }],
    },
    {
      title: '12. Graphs and Networks',
      videos: [{ title: 'Lecture 12', youtubeId: '6-wh6yvk6uc' }],
    },
    {
      title: '13. Quiz 1 Review',
      videos: [{ title: 'Lecture 13', youtubeId: 'l88D4r74gtM' }],
    },
    {
      title: '14. Orthogonal Vectors and Subspaces',
      videos: [{ title: 'Lecture 14', youtubeId: 'YzZUIYRCE38' }],
    },
    {
      title: '15. Projections and Least Squares',
      videos: [{ title: 'Lecture 15', youtubeId: 'Y_Ac6KiQ1t0' }],
    },
    {
      title: '16. Projection Matrices and Least Squares',
      videos: [{ title: 'Lecture 16', youtubeId: 'osh80YCg_GM' }],
    },
    {
      title: '17. Orthogonal Matrices and Gram-Schmidt',
      videos: [{ title: 'Lecture 17', youtubeId: '0MtwqhIwdrI' }],
    },
    {
      title: '18. Gram-Schmidt and A = QR',
      videos: [{ title: 'Lecture 18', youtubeId: 'srxexLishgY' }],
    },
    {
      title: '19. Determinants',
      videos: [{ title: 'Lecture 19', youtubeId: '23LLB9mNJvc' }],
    },
    {
      title: '20. Determinant Properties and Volume',
      videos: [{ title: 'Lecture 20', youtubeId: 'QNpj-gOXW9M' }],
    },
    {
      title: '21. Eigenvalues and Eigenvectors',
      videos: [{ title: 'Lecture 21', youtubeId: 'cdZnhQjJu4I' }],
    },
    {
      title: '22. Diagonalization and Powers of A',
      videos: [{ title: 'Lecture 22', youtubeId: '13r9QY6cmjc' }],
    },
    {
      title: '23. Differential Equations',
      videos: [{ title: 'Lecture 23', youtubeId: 'IZqwi0wJovM' }],
    },
    {
      title: '24. Complex Matrices',
      videos: [{ title: 'Lecture 24', youtubeId: 'lGGDIGizcQ0' }],
    },
    {
      title: '25. Similar Matrices and Jordan Form',
      videos: [{ title: 'Lecture 25', youtubeId: 'UCc9q_cAhho' }],
    },
    {
      title: '26. SVD',
      videos: [{ title: 'Lecture 26', youtubeId: 'M0Sa8fLOajA' }],
    },
    {
      title: '27. SVD Applications',
      videos: [{ title: 'Lecture 27', youtubeId: 'vF7eyJ2g3kU' }],
    },
    {
      title: '28. Quiz 2 Review',
      videos: [{ title: 'Lecture 28', youtubeId: 'TSdXJw83kyA' }],
    },
    {
      title: '29. Linear Transformations',
      videos: [{ title: 'Lecture 29', youtubeId: 'TX_vooSnhm8' }],
    },
    {
      title: '30. Change of Basis',
      videos: [{ title: 'Lecture 30', youtubeId: 'Ts3o2I8_Mxc' }],
    },
    {
      title: '31. Left Inverse and Right Inverse',
      videos: [{ title: 'Lecture 31', youtubeId: '0h43aV4aH7I' }],
    },
    {
      title: '32. Final Course Review',
      videos: [{ title: 'Lecture 32', youtubeId: 'HgC1l_6ySkc' }],
    },
    {
      title: '33. Final Exam Review',
      videos: [{ title: 'Lecture 33', youtubeId: 'Go2aLo7ZOlU' }],
    },
    {
      title: '34. Summary of Linear Algebra',
      videos: [{ title: 'Lecture 34', youtubeId: 'RWvi4Vx4CDc' }],
    },
  ];

  const math52MultiVideoLectures = [
    {
      title:
        "The Geometrical View of y'=f(x,y): Direction Fields, Integral Curves",
      videos: [{ title: 'Lecture 1', youtubeId: 'XDhJ8lVGbl8' }],
    },
    {
      title: "Euler's Numerical Method for y'=f(x,y) and its Generalizations",
      videos: [{ title: 'Lecture 2', youtubeId: 'LbKKzMag5Rc' }],
    },
    {
      title:
        "Solving First-order Linear ODE's; Steady-state and Transient Solutions",
      videos: [{ title: 'Lecture 3', youtubeId: 'tVzaX9u6YAE' }],
    },
    {
      title:
        "First-order Substitution Methods: Bernouilli and Homogeneous ODE's",
      videos: [{ title: 'Lecture 4', youtubeId: 'WBJ_iXudb-s' }],
    },
    {
      title: "First-order Autonomous ODE's: Qualitative Methods, Applications",
      videos: [{ title: 'Lecture 5', youtubeId: 'te6Mplq3DCU' }],
    },
    {
      title: 'Complex Numbers and Complex Exponentials',
      videos: [{ title: 'Lecture 6', youtubeId: 'EQJBp6Ym-6A' }],
    },
    {
      title:
        'First-order Linear with Constant Coefficients: Behavior of Solutions, Use of Complex Methods',
      videos: [{ title: 'Lecture 7', youtubeId: 'SioXozu-Loo' }],
    },
    {
      title:
        'Continuation: Applications to Temperature, Mixing, RC-circuit, Decay, and Growth Models',
      videos: [{ title: 'Lecture 8', youtubeId: 'MdzfsfBNJIw' }],
    },
    {
      title:
        "Solving Second-order Linear ODE's with Constant Coefficients: The Three Cases",
      videos: [{ title: 'Lecture 9', youtubeId: 'vP-oRQqmeg4' }],
    },
    {
      title:
        'Continuation: Complex Characteristic Roots; Undamped and Damped Oscillations',
      videos: [{ title: 'Lecture 10', youtubeId: 'YQ7HEE8-OfA' }],
    },
    {
      title:
        "Theory of General Second-order Linear Homogeneous ODE's: Superposition, Uniqueness, Wronskians",
      videos: [{ title: 'Lecture 11', youtubeId: 'rZ3-nFV6l8w' }],
    },
    {
      title:
        "Continuation: General Theory for Inhomogeneous ODE's. Stability Criteria for the Constant-coefficient ODE's",
      videos: [{ title: 'Lecture 12', youtubeId: 'eyNm7XGJr4s' }],
    },
    {
      title:
        "Finding Particular Solutions to Inhomogeneous ODE's: Operator and Solution Formulas Involving Exponentials",
      videos: [{ title: 'Lecture 13', youtubeId: '9KbpbBMThTE' }],
    },
    {
      title: 'Interpretation of the Exceptional Case: Resonance',
      videos: [{ title: 'Lecture 14', youtubeId: 'Y9_zrupnz0Q' }],
    },
    {
      title: 'Introduction to Fourier Series; Basic Formulas for Period 2π',
      videos: [{ title: 'Lecture 15', youtubeId: 'EWWw0jryj1A' }],
    },
    {
      title:
        'Continuation: More General Periods; Even and Odd Functions; Periodic Extension',
      videos: [{ title: 'Lecture 16', youtubeId: 'xWa5_OXI6VM' }],
    },
    {
      title:
        'Finding Particular Solutions via Fourier Series; Resonant Terms; Hearing Musical Sounds',
      videos: [{ title: 'Lecture 17', youtubeId: 'yD0_EQLxHcw' }],
    },
    {
      title:
        'Engineering Applications (Guest Lecture by Prof. Miller & Vandiver)',
      videos: [{ title: 'Lecture 18', youtubeId: 'pRIEYR5JHQA' }],
    },
    {
      title: 'Introduction to the Laplace Transform; Basic Formulas',
      videos: [{ title: 'Lecture 19', youtubeId: 'sZ2qulI6GEk' }],
    },
    {
      title:
        "Derivative Formulas; Using the Laplace Transform to Solve Linear ODE's",
      videos: [{ title: 'Lecture 20', youtubeId: 'qZHseRxAWZ8' }],
    },
    {
      title:
        'Convolution Formula: Proof, Connection with Laplace Transform, Application to Physical Problems',
      videos: [{ title: 'Lecture 21', youtubeId: '3ejfkMHr_DE' }],
    },
    {
      title: "Using Laplace Transform to Solve ODE's with Discontinuous Inputs",
      videos: [{ title: 'Lecture 22', youtubeId: '_YVcjNmjHik' }],
    },
    {
      title:
        'Use with Impulse Inputs; Dirac Delta Function, Weight and Transfer Functions',
      videos: [{ title: 'Lecture 23', youtubeId: 'peYvLk_HZdw' }],
    },
    {
      title:
        "Introduction to First-order Systems of ODE's; Solution by Elimination, Geometric Interpretation of a System",
      videos: [{ title: 'Lecture 24', youtubeId: 'MCrDzhpu3-s' }],
    },
    {
      title:
        'Homogeneous Linear Systems with Constant Coefficients: Solution via Matrix Eigenvalues (Real and Distinct Case)',
      videos: [{ title: 'Lecture 25', youtubeId: 'heBvViSi9xQ' }],
    },
    {
      title: 'Continuation: Repeated Real Eigenvalues, Complex Eigenvalues',
      videos: [{ title: 'Lecture 26', youtubeId: 'hEtWqTPPXuc' }],
    },
    {
      title:
        'Sketching Solutions of 2x2 Homogeneous Linear System with Constant Coefficients',
      videos: [{ title: 'Lecture 27', youtubeId: 'e3FfmXtkppM' }],
    },
    {
      title:
        'Matrix Methods for Inhomogeneous Systems: Theory, Fundamental Matrix, Variation of Parameters',
      videos: [{ title: 'Lecture 28', youtubeId: '2SuTN8rpe4I' }],
    },
    {
      title: 'Matrix Exponentials; Application to Solving Systems',
      videos: [{ title: 'Lecture 29', youtubeId: 'zreI4HllD80' }],
    },
    {
      title: 'Decoupling Linear Systems with Constant Coefficients',
      videos: [{ title: 'Lecture 30', youtubeId: 'uNOyxQwIV8o' }],
    },
    {
      title:
        'Non-linear Autonomous Systems: Finding the Critical Points and Sketching Trajectories; the Non-linear Pendulum',
      videos: [{ title: 'Lecture 31', youtubeId: 'UJG0f0BSX14' }],
    },
    {
      title: 'Limit Cycles: Existence and Non-existence Criteria',
      videos: [{ title: 'Lecture 32', youtubeId: 'z-meBrqcy_I' }],
    },
    {
      title:
        "Relation Between Non-linear Systems and First-order ODE's; Structural Stability of a System, Borderline Sketching Cases; Illustrations Using Volterra's Equation and Principle",
      videos: [{ title: 'Lecture 33', youtubeId: 'kRR9EVzr4lc' }],
    },
  ];

  const math53MultiVideoLectures = [
    {
      title: 'Dot Product',
      videos: [{ title: 'Lecture 1', youtubeId: 'PxCxlsl_YwY' }],
    },
    {
      title: 'Lecture 2',
      videos: [{ title: 'Lecture 2', youtubeId: '9FLItlbBUPY' }],
    },
    {
      title: 'Lecture 3',
      videos: [{ title: 'Lecture 3', youtubeId: 'bHdzkFrgRcA' }],
    },
    {
      title: 'Lecture 4',
      videos: [{ title: 'Lecture 4', youtubeId: 'YBajUR3EFSM' }],
    },
    {
      title: 'Lecture 5',
      videos: [{ title: 'Lecture 5', youtubeId: '57jzPlxf4fk' }],
    },
    {
      title: 'Lecture 6',
      videos: [{ title: 'Lecture 6', youtubeId: '0D4BbCa4gHo' }],
    },
    {
      title: 'Lecture 7',
      videos: [{ title: 'Lecture 7', youtubeId: 'U1EcnfTKXJ0' }],
    },
    {
      title: 'Lecture 8',
      videos: [{ title: 'Lecture 8', youtubeId: 'dK3NEf13nPc' }],
    },
    {
      title: 'Lecture 9',
      videos: [{ title: 'Lecture 9', youtubeId: 'UYe98CcxPbs' }],
    },
    {
      title: 'Lecture 10',
      videos: [{ title: 'Lecture 10', youtubeId: '3_goGnJm5sA' }],
    },
    {
      title: 'Lecture 11',
      videos: [{ title: 'Lecture 11', youtubeId: '7eZVshlT33Q' }],
    },
    {
      title: 'Lecture 12',
      videos: [{ title: 'Lecture 12', youtubeId: '2XraaWefBd8' }],
    },
    {
      title: 'Lecture 13',
      videos: [{ title: 'Lecture 13', youtubeId: '15HVevXRsBA' }],
    },
    {
      title: 'Lecture 14',
      videos: [{ title: 'Lecture 14', youtubeId: '23xbkrpQuAo' }],
    },
    {
      title: 'Lecture 15',
      videos: [{ title: 'Lecture 15', youtubeId: 'ChiM2-MV-qM' }],
    },
    {
      title: 'Lecture 16',
      videos: [{ title: 'Lecture 16', youtubeId: 'YP_B0AapU0c' }],
    },
    {
      title: 'Lecture 17',
      videos: [{ title: 'Lecture 17', youtubeId: '60e4hdCi1D4' }],
    },
    {
      title: 'Lecture 18',
      videos: [{ title: 'Lecture 18', youtubeId: 'UZb9hZIAvL4' }],
    },
    {
      title: 'Lecture 19',
      videos: [{ title: 'Lecture 19', youtubeId: 'xrypSZU8cBE' }],
    },
    {
      title: 'Lecture 20',
      videos: [{ title: 'Lecture 20', youtubeId: 'o7UCBjGsRTE' }],
    },
    {
      title: 'Lecture 21',
      videos: [{ title: 'Lecture 21', youtubeId: 'z5TPjZrsp2k' }],
    },
    {
      title: 'Lecture 22',
      videos: [{ title: 'Lecture 22', youtubeId: 'tYdoS0tkAHA' }],
    },
    {
      title: 'Lecture 23',
      videos: [{ title: 'Lecture 23', youtubeId: '_CdoRiNSrqI' }],
    },
    {
      title: 'Lecture 24',
      videos: [{ title: 'Lecture 24', youtubeId: 'PnPIqh7Frlw' }],
    },
    {
      title: 'Lecture 25',
      videos: [{ title: 'Lecture 25', youtubeId: '44R5HgbrUmc' }],
    },
    {
      title: 'Lecture 26',
      videos: [{ title: 'Lecture 26', youtubeId: 'RMBGQtwkoyU' }],
    },
    {
      title: 'Lecture 27',
      videos: [{ title: 'Lecture 27', youtubeId: 'phk05iSMezA' }],
    },
    {
      title: 'Lecture 28',
      videos: [{ title: 'Lecture 28', youtubeId: 'WfEQabCGAqI' }],
    },
    {
      title: 'Lecture 29',
      videos: [{ title: 'Lecture 29', youtubeId: 'wu8kXZSAp20' }],
    },
    {
      title: 'Lecture 30',
      videos: [{ title: 'Lecture 30', youtubeId: 'seO7-TwXH_I' }],
    },
    {
      title: 'Lecture 31',
      videos: [{ title: 'Lecture 31', youtubeId: 'tzoYhe3H5dM' }],
    },
    {
      title: 'Lecture 32',
      videos: [{ title: 'Lecture 32', youtubeId: 'sr7kCpzAuYw' }],
    },
    {
      title: 'Lecture 33',
      videos: [{ title: 'Lecture 33', youtubeId: 'BChhAS1sFvA' }],
    },
    {
      title: 'Lecture 34',
      videos: [{ title: 'Lecture 34', youtubeId: 'ZwpwmGP5ITM' }],
    },
    {
      title: 'Lecture 35',
      videos: [{ title: 'Lecture 35', youtubeId: '24v9onS9Kcg' }],
    },
  ];

  const cs103MultiVideoLectures = [
    {
      title: 'Introduction and Proofs',
      videos: [{ title: 'Lecture 1', youtubeId: 'L3LMbpZIKhQ' }],
    },
    {
      title: 'Induction',
      videos: [{ title: 'Lecture 2', youtubeId: 'z8HKWUWS-lA' }],
    },
    {
      title: 'Strong Induction',
      videos: [{ title: 'Lecture 3', youtubeId: 'NuGDkmwEObM' }],
    },
    {
      title: 'Number Theory I',
      videos: [{ title: 'Lecture 4', youtubeId: 'NuY7szYSXSw' }],
    },
    {
      title: 'Number Theory II',
      videos: [{ title: 'Lecture 5', youtubeId: 'XX7ePR21Ook' }],
    },
    {
      title: 'Graph Theory and Coloring',
      videos: [{ title: 'Lecture 6', youtubeId: 'h9wxtqoa1jY' }],
    },
    {
      title: 'Matching Problems',
      videos: [{ title: 'Lecture 7', youtubeId: '5RSMLgy06Ew' }],
    },
    {
      title: 'Graph Theory II: Minimum Spanning Trees',
      videos: [{ title: 'Lecture 8', youtubeId: 'GJpt_3ie4WU' }],
    },
    {
      title: 'Communication Networks',
      videos: [{ title: 'Lecture 9', youtubeId: 'bTyxpoi2dmM' }],
    },
    {
      title: 'Graph Theory III',
      videos: [{ title: 'Lecture 10', youtubeId: 'DOIp5D7VMS4' }],
    },
    {
      title: 'Relations, Partial Orders, and Scheduling',
      videos: [{ title: 'Lecture 11', youtubeId: '1nScXLQAQ9A' }],
    },
    {
      title: 'Sums',
      videos: [{ title: 'Lecture 12', youtubeId: 'fAeShezAGLE' }],
    },
    {
      title: 'Sums and Asymptotics',
      videos: [{ title: 'Lecture 13', youtubeId: 'X9eErxRjQEI' }],
    },
    {
      title: 'Divide and Conquer Recurrences',
      videos: [{ title: 'Lecture 14', youtubeId: 'Kqf0uO0oV6s' }],
    },
    {
      title: 'Linear Recurrences',
      videos: [{ title: 'Lecture 15', youtubeId: 'TWBB-JlmYUc' }],
    },
    {
      title: 'Counting Rules I',
      videos: [{ title: 'Lecture 16', youtubeId: 'pNt5Ll6hGqo' }],
    },
    {
      title: 'Counting Rules II',
      videos: [{ title: 'Lecture 17', youtubeId: '09yIb3VHhMI' }],
    },
    {
      title: 'Probability Introduction',
      videos: [{ title: 'Lecture 18', youtubeId: 'SmFwFdESMHI' }],
    },
    {
      title: 'Conditional Probability',
      videos: [{ title: 'Lecture 19', youtubeId: 'E6FbvM-FGZ8' }],
    },
    {
      title: 'Independence',
      videos: [{ title: 'Lecture 20', youtubeId: 'l1BCv3qqW4A' }],
    },
    {
      title: 'Random Variables',
      videos: [{ title: 'Lecture 21', youtubeId: 'MOfhhFaQdjw' }],
    },
    {
      title: 'Expectation I',
      videos: [{ title: 'Lecture 22', youtubeId: 'gGlMSe7uEkA' }],
    },
    {
      title: 'Expectation II',
      videos: [{ title: 'Lecture 23', youtubeId: 'oI9fMUqgfxY' }],
    },
    {
      title: 'Large Deviations',
      videos: [{ title: 'Lecture 24', youtubeId: 'q4mwO2qS2z4' }],
    },
    {
      title: 'Random Walks',
      videos: [{ title: 'Lecture 25', youtubeId: '56iFMY8QW2k' }],
    },
  ];

  const cs107MultiVideoLectures = [
    {
      title: 'Course Introduction',
      videos: [
        { title: 'Lecture 1', videoId: 'ucberkeley_webcast_gJJeUFyuvvg' },
      ],
    },
    {
      title: 'Intro to the C Programming Language, Part I',
      videos: [
        { title: 'Lecture 2', videoId: 'ucberkeley_webcast_mZgoX-yLqxM' },
      ],
    },
    {
      title: 'Intro to the C Programming Language, Part II',
      videos: [
        { title: 'Lecture 3', videoId: 'ucberkeley_webcast_DJa1tBk6gPM' },
      ],
    },
    {
      title: 'Intro to the C Programming Language, Part III',
      videos: [
        { title: 'Lecture 4', videoId: 'ucberkeley_webcast_7WTass69OYM' },
      ],
    },
    {
      title: 'Intro to Assembly Language, MIPS Intro',
      videos: [
        { title: 'Lecture 5', videoId: 'ucberkeley_webcast_zUYCZYKaUrk' },
      ],
    },
    {
      title: 'MIPS, MIPS Functions',
      videos: [
        { title: 'Lecture 6', videoId: 'ucberkeley_webcast_DEqOkfYhDS4' },
      ],
    },
    {
      title: 'MIPS Instruction Formats',
      videos: [
        { title: 'Lecture 7', videoId: 'ucberkeley_webcast_tjjWdaDiXio' },
      ],
    },
    {
      title: 'Running a Program (Compiling, Assembling, Linking, Loading)',
      videos: [
        { title: 'Lecture 8', videoId: 'ucberkeley_webcast_Z4r9AWu8D18' },
      ],
    },
    {
      title: 'Synchronous Digital Systems',
      videos: [
        { title: 'Lecture 9', videoId: 'ucberkeley_webcast_SstCrz0xUzw' },
      ],
    },
    {
      title: 'Finite State Machines, Functional Units',
      videos: [
        { title: 'Lecture 10', videoId: 'ucberkeley_webcast__MOzj6gXrU0' },
      ],
    },
    {
      title: 'Single-Cycle CPU Datapath & Control, Part 1',
      videos: [
        { title: 'Lecture 11', videoId: 'ucberkeley_webcast_OOBwKAXZjlk' },
      ],
    },
    {
      title: 'Single-Cycle CPU Datapath & Control, Part 2',
      videos: [
        { title: 'Lecture 12', videoId: 'ucberkeley_webcast_ZnxKHKVvQl4' },
      ],
    },
    {
      title: 'Pipelining',
      videos: [
        { title: 'Lecture 13', videoId: 'ucberkeley_webcast_oIawE3IseRA' },
      ],
    },
    {
      title: 'Caches Part 1',
      videos: [
        { title: 'Lecture 14', videoId: 'ucberkeley_webcast_XeOftiVV49o' },
      ],
    },
    {
      title: 'Caches Part 2',
      videos: [
        { title: 'Lecture 15', videoId: 'ucberkeley_webcast_ERtmeRRES5U' },
      ],
    },
    {
      title: 'Caches Part 3',
      videos: [
        { title: 'Lecture 16', videoId: 'ucberkeley_webcast_N4bfyyVEPRc' },
      ],
    },
    {
      title: 'Performance and Floating Point Arithmetic',
      videos: [
        { title: 'Lecture 17', videoId: 'ucberkeley_webcast_z8rFDWFDj8c' },
      ],
    },
    {
      title: "Amdahl's Law and Data-Level Parallelism",
      videos: [
        { title: 'Lecture 18', videoId: 'ucberkeley_webcast_xNJyfcv7YsQ' },
      ],
    },
    {
      title: 'Thread Level Parallelism (TLP) and OpenMP Intro',
      videos: [
        { title: 'Lecture 19', videoId: 'ucberkeley_webcast_OrrIbXqfu4U' },
      ],
    },
    {
      title: 'Thread Level Parallelism (TLP) and OpenMP',
      videos: [
        { title: 'Lecture 20', videoId: 'ucberkeley_webcast_1o6078uavdo' },
      ],
    },
    {
      title: 'Warehouse-Scale Computing, MapReduce, and Spark',
      videos: [
        { title: 'Lecture 21', videoId: 'ucberkeley_webcast_BDdvnVOWkSE' },
      ],
    },
    {
      title: 'Operating Systems, Interrupts, Virtual Memory Intro',
      videos: [
        { title: 'Lecture 22', videoId: 'ucberkeley_webcast_9X3Tioo3deA' },
      ],
    },
    {
      title: 'Virtual Memory, Intro to I/O',
      videos: [
        { title: 'Lecture 23', videoId: 'ucberkeley_webcast__bW31WWiQbo' },
      ],
    },
    {
      title: 'More I/O: DMA, Disks, Networking',
      videos: [
        { title: 'Lecture 24', videoId: 'ucberkeley_webcast_QhFnRQ2pJyw' },
      ],
    },
    {
      title: 'Dependability and RAID',
      videos: [
        { title: 'Lecture 25', videoId: 'ucberkeley_webcast_2hAJwG9G9PE' },
      ],
    },
    {
      title: 'Course Summary',
      videos: [
        { title: 'Lecture 26', videoId: 'ucberkeley_webcast_kpjywuTwpMc' },
      ],
    },
  ];

  const cs110MultiVideoLectures = [
    {
      title: 'Course Introduction',
      videos: [{ title: 'Lecture 1', youtubeId: '_LFGjZ0Sc6I' }],
    },
    {
      title: 'File Systems - Fundamentals',
      videos: [{ title: 'Lecture 2', youtubeId: 'Dbg2N7T6D_c' }],
    },
    {
      title: 'Unix v6 Filesystem Architecture',
      videos: [{ title: 'Lecture 3', youtubeId: 'vUyKpzg6vYk' }],
    },
    {
      title:
        'Filesystem Data Structures, System Calls, Intro to Multiprocessing',
      videos: [{ title: 'Lecture 4', youtubeId: 'DSPc5LIVWHw' }],
    },
    {
      title: 'execvp System Call - Introduction',
      videos: [{ title: 'Lecture 5', youtubeId: 'RDk_CY0HT_E' }],
    },
    {
      title: 'execvp, pipe, dup2, and Signals',
      videos: [{ title: 'Lecture 6', youtubeId: 'Yf380zTr_ro' }],
    },
    {
      title: 'Signals - Deep Dive',
      videos: [{ title: 'Lecture 7', youtubeId: 'd9Pou4L7j0s' }],
    },
    {
      title: 'Race Conditions, Deadlock, and Data Integrity',
      videos: [{ title: 'Lecture 8', youtubeId: 'YE4MW01u7mg' }],
    },
    {
      title: 'Introduction to Threads',
      videos: [{ title: 'Lecture 9', youtubeId: 'bw68rvYNG8k' }],
    },
    {
      title: 'From C Threads to C++ Threads',
      videos: [{ title: 'Lecture 10', youtubeId: 'lyODXaZ2Zg8' }],
    },
    {
      title: 'Multithreading, Condition Variables, and Semaphores',
      videos: [{ title: 'Lecture 11', youtubeId: '7U3Eo0ynmHo' }],
    },
    {
      title: 'Review: mutex, condition_variable_any, semaphore',
      videos: [{ title: 'Lecture 12', youtubeId: 'l4PrC3mCPJY' }],
    },
    {
      title: 'Ice Cream Shop Simulation - Concurrency Patterns',
      videos: [{ title: 'Lecture 13', youtubeId: 'rA4iG8eYzi4' }],
    },
    {
      title: 'Introduction to Networking',
      videos: [{ title: 'Lecture 14', youtubeId: 'oLvSC6TCqdI' }],
    },
    {
      title: 'Networks and Clients - Socket Programming',
      videos: [{ title: 'Lecture 15', youtubeId: 'akQOgmL2a-8' }],
    },
    {
      title: 'Network System Calls',
      videos: [{ title: 'Lecture 16', youtubeId: 'eTKrkFAg6WI' }],
    },
    {
      title: 'Web Proxy Implementation',
      videos: [{ title: 'Lecture 17', youtubeId: 'wqI_BRyB2tM' }],
    },
    {
      title: 'MapReduce - Distributed Computing Fundamentals',
      videos: [{ title: 'Lecture 18', youtubeId: 'y-MDGT5-OAY' }],
    },
    {
      title: 'Principles of System Design',
      videos: [{ title: 'Lecture 19', youtubeId: 'L3w6NE3_sCA' }],
    },
    {
      title: 'Course Wrap-up and Advanced Topics',
      videos: [{ title: 'Lecture 20', youtubeId: 'y5xvYX0m61E' }],
    },
  ];

  const cs294MultiVideoLectures = [
    {
      title: 'August 23, 2017',
      videos: [{ title: 'Lecture 1', youtubeId: 'Q4kF8sfggoI' }],
    },
    {
      title: 'August 28, 2017',
      videos: [{ title: 'Lecture 2', youtubeId: 'C_LGsoe36I8' }],
    },
    {
      title: 'August 30, 2017',
      videos: [{ title: 'Lecture 3', youtubeId: 'PTbxa6GsTWc' }],
    },
    {
      title: 'September 6, 2017',
      videos: [{ title: 'Lecture 4', youtubeId: 'tWNpiNzWuO8' }],
    },
    {
      title: 'September 11, 2017',
      videos: [{ title: 'Lecture 5', youtubeId: 'PpVhtJn-iZI' }],
    },
    {
      title: 'September 13, 2017',
      videos: [{ title: 'Lecture 6', youtubeId: 'k1vNh4rNYec' }],
    },
    {
      title: 'September 18, 2017',
      videos: [{ title: 'Lecture 7', youtubeId: 'nZXC5OdDfs4' }],
    },
    {
      title: 'September 20, 2017',
      videos: [{ title: 'Lecture 8', youtubeId: 'EfgC7v5V608' }],
    },
    {
      title: 'September 25, 2017',
      videos: [{ title: 'Lecture 9', youtubeId: 'yap_g0d7iBQ' }],
    },
    {
      title: 'September 27, 2017',
      videos: [{ title: 'Lecture 10', youtubeId: 'AwdauFLan7M' }],
    },
    {
      title: 'October 2, 2017',
      videos: [{ title: 'Lecture 11', youtubeId: 'vRkIwM4GktE' }],
    },
    {
      title: 'October 4, 2017',
      videos: [{ title: 'Lecture 12', youtubeId: 'iOYiPhu5GEk' }],
    },
    {
      title: 'October 9, 2017',
      videos: [{ title: 'Lecture 13', youtubeId: '-3BcZwgmZLk' }],
    },
    {
      title: 'October 11, 2017',
      videos: [{ title: 'Lecture 14', youtubeId: 'ycCtmp4hcUs' }],
    },
    {
      title: 'October 16, 2017',
      videos: [{ title: 'Lecture 15', youtubeId: 'npi6B4VQ-7s' }],
    },
    {
      title: 'October 18, 2017',
      videos: [{ title: 'Lecture 16', youtubeId: '0WbVUvKJpg4' }],
    },
    {
      title: 'October 23, 2017',
      videos: [{ title: 'Lecture 17', youtubeId: 'UqSx23W9RYE' }],
    },
    {
      title: 'October 25, 2017',
      videos: [{ title: 'Lecture 18', youtubeId: 'Xe9bktyYB34' }],
    },
    {
      title: 'October 30, 2017',
      videos: [{ title: 'Lecture 19', youtubeId: 'mc-DtbhhiKA' }],
    },
    {
      title: 'November 1, 2017',
      videos: [{ title: 'Lecture 20', youtubeId: 'j9QI21xtqV4' }],
    },
    {
      title: 'November 6, 2017',
      videos: [{ title: 'Lecture 21', youtubeId: 'QJpc_T65QRY' }],
    },
    {
      title: 'November 8, 2017',
      videos: [{ title: 'Lecture 22', youtubeId: 'CHKSBEx_k54' }],
    },
    {
      title: 'November 15, 2017',
      videos: [{ title: 'Lecture 23', youtubeId: 'ixtEeS6aCKU' }],
    },
    {
      title: 'November 20, 2017',
      videos: [{ title: 'Lecture 24', youtubeId: 'gqX8J38tESw' }],
    },
  ];

  const cs161PlaylistA_BlackboardLectures = [
    {
      title: 'Introduction & Asymptotic Analysis',
      source: 'Stanford Blackboard Lectures',
      videos: [
        { title: 'Lecture 1 - Introduction', youtubeId: 'yRM3sc57q0c' },
        { title: 'Lecture 2 - Big-O Notation', youtubeId: 'QfRSeibcugw' },
        {
          title: 'Lecture 3 - Asymptotic Analysis Examples',
          youtubeId: '5rZCkblZFZM',
        },
      ],
    },
    {
      title: 'Divide and Conquer',
      source: 'Stanford Blackboard Lectures',
      videos: [
        {
          title: 'Lecture 4 - MergeSort: Motivation and Example',
          youtubeId: 'kiyRJ7GVWro',
        },
        {
          title: 'Lecture 5 - MergeSort: Pseudocode',
          youtubeId: 'rBd5w0rQaFo',
        },
        { title: 'Lecture 6 - MergeSort: Analysis', youtubeId: '8ArtRiTkYEw' },
        {
          title: 'Lecture 7 - Karatsuba Multiplication',
          youtubeId: 'JCbZayFr9RE',
        },
      ],
    },
    {
      title: 'Master Method & Recurrences',
      source: 'Stanford Blackboard Lectures',
      videos: [
        {
          title: 'Lecture 8 - Master Method: Motivation',
          youtubeId: '6dGDcszz2DM',
        },
        {
          title: 'Lecture 9 - Master Method: Formal Statement',
          youtubeId: 'rXiojCN9nIs',
        },
        {
          title: 'Lecture 10 - Master Method: Six Examples',
          youtubeId: '4l1MvY7iGhs',
        },
        {
          title: 'Lecture 11 - Proof of the Master Method',
          youtubeId: '6BVNhKm0vpE',
        },
      ],
    },
    {
      title: 'Sorting & QuickSort',
      source: 'Stanford Blackboard Lectures',
      videos: [
        { title: 'Lecture 12 - QuickSort: Overview', youtubeId: 'ETo1cpLN7kk' },
        {
          title: 'Lecture 13 - Partitioning Around a Pivot',
          youtubeId: 'LYzdRN5iFdA',
        },
        {
          title: 'Lecture 14 - Choosing a Good Pivot',
          youtubeId: 'kqO46FOUTbI',
        },
        { title: 'Lecture 15 - QuickSort Analysis', youtubeId: 'sToWtKSYlMw' },
        { title: 'Lecture 16 - Sorting Lower Bound', youtubeId: 'aFveIyII5D4' },
      ],
    },
    {
      title: 'Randomized Algorithms & Linear-Time Selection',
      source: 'Stanford Blackboard Lectures',
      videos: [
        {
          title: 'Lecture 17 - Randomized Linear-Time Selection',
          youtubeId: 'nFw6x7DoYbs',
        },
        {
          title: 'Lecture 18 - Randomized Selection: Analysis',
          youtubeId: 'rX2u2CnpveQ',
        },
        {
          title: 'Lecture 19 - Deterministic Linear-Time Selection',
          youtubeId: 'L5-4cPW5HoU',
        },
        {
          title: 'Lecture 20 - Deterministic Selection: Analysis',
          youtubeId: '6ntwpZmHN-g',
        },
      ],
    },
    {
      title: 'Graphs & Graph Search',
      source: 'Stanford Blackboard Lectures',
      videos: [
        { title: 'Lecture 21 - Graphs: The Basics', youtubeId: '4Ih3UhVuEtw' },
        {
          title: 'Lecture 22 - Graph Representations',
          youtubeId: 'b-Mfu8dPv9U',
        },
        {
          title: 'Lecture 23 - Graph Search Overview',
          youtubeId: 'SW6jwg7WS48',
        },
        {
          title: 'Lecture 24 - Breadth-First Search',
          youtubeId: '73qCvXsYkfk',
        },
        { title: 'Lecture 25 - Depth-First Search', youtubeId: '_9_VUNrWGUs' },
        { title: 'Lecture 26 - Topological Sort', youtubeId: 'ozso3xxkVGU' },
      ],
    },
    {
      title: 'Strongly Connected Components',
      source: 'Stanford Blackboard Lectures',
      videos: [
        {
          title: 'Lecture 27 - Computing SCCs (Part 1)',
          youtubeId: 'O98hLTYVN3c',
        },
        {
          title: 'Lecture 28 - Computing SCCs (Part 2)',
          youtubeId: 'gbs3UNRJIYk',
        },
        {
          title: 'Lecture 29 - Structure of the Web',
          youtubeId: '7YodysGShlo',
        },
      ],
    },
    {
      title: "Shortest Paths & Dijkstra's Algorithm",
      source: 'Stanford Blackboard Lectures',
      videos: [
        {
          title: "Lecture 30 - Shortest Paths & Dijkstra's Algorithm",
          youtubeId: 'jRlNVmRjdRk',
        },
        {
          title: "Lecture 31 - Dijkstra's Algorithm: Examples",
          youtubeId: 'ahYhIzLklYo',
        },
        {
          title: "Lecture 32 - Correctness of Dijkstra's Algorithm",
          youtubeId: 'sb7j3EW055M',
        },
        {
          title: 'Lecture 33 - Implementation with Heaps',
          youtubeId: '00LtSn_PQjc',
        },
      ],
    },
    {
      title: 'Data Structures: Heaps, BSTs & Hash Tables',
      source: 'Stanford Blackboard Lectures',
      videos: [
        {
          title: 'Lecture 34 - Heaps: Operations and Applications',
          youtubeId: 'mNYHDv7SbDI',
        },
        {
          title: 'Lecture 35 - Heaps: Implementation Details',
          youtubeId: '6VI5kJu8Mv4',
        },
        {
          title: 'Lecture 36 - Balanced Search Trees',
          youtubeId: 'IbNZ-x1I2IM',
        },
        { title: 'Lecture 37 - Rotations', youtubeId: 'CZkBqasoH8c' },
        {
          title: 'Lecture 38 - Hash Tables: Operations & Applications',
          youtubeId: 'Qu183GFHbZQ',
        },
        {
          title: 'Lecture 39 - Hash Tables: Implementation',
          youtubeId: 'j5KkC-wjlK4',
        },
        { title: 'Lecture 40 - Bloom Filters', youtubeId: 'zYlxP7F3Z3c' },
      ],
    },
    {
      title: 'Greedy Algorithms & Minimum Spanning Trees',
      source: 'Stanford Blackboard Lectures',
      videos: [
        {
          title: 'Lecture 41 - Introduction to Greedy Algorithms',
          youtubeId: 'NTFmxA3qgoo',
        },
        {
          title: 'Lecture 42 - Minimum Spanning Trees: Problem Definition',
          youtubeId: 'tDj9BkaQDO8',
        },
        {
          title: "Lecture 43 - Prim's MST Algorithm",
          youtubeId: 'jsvOPssDVJA',
        },
        {
          title: "Lecture 44 - Kruskal's MST Algorithm",
          youtubeId: 'SZuCspj5AJc',
        },
        { title: 'Lecture 45 - Huffman Codes', youtubeId: 'NM6FZB7IfS8' },
        {
          title: 'Lecture 46 - Single-Link Clustering',
          youtubeId: 'MSSzOs1X4K8',
        },
      ],
    },
  ];

  const cs109MultiVideoLectures = [
    {
      title: 'Counting',
      videos: [{ title: 'Lecture 1', youtubeId: '2MuDZIAzBMY' }],
    },
    {
      title: 'Combinatorics',
      videos: [{ title: 'Lecture 2', youtubeId: 'ag4Ei15CG0c' }],
    },
    {
      title: 'What is Probability?',
      videos: [{ title: 'Lecture 3', youtubeId: 'EGgMCE2AgyU' }],
    },
    {
      title: 'Conditional Probability and Bayes',
      videos: [{ title: 'Lecture 4', youtubeId: 'NHRoXvPaZqY' }],
    },
    {
      title: 'Independence',
      videos: [{ title: 'Lecture 5', youtubeId: 'zTJDZ2wmaRU' }],
    },
    {
      title: 'Random Variables and Expectation',
      videos: [{ title: 'Lecture 6', youtubeId: '8QCg2ur-3fo' }],
    },
    {
      title: 'Variance, Bernoulli, Binomial',
      videos: [{ title: 'Lecture 7', youtubeId: 'I2UBspTNAG0' }],
    },
    {
      title: 'Poisson',
      videos: [{ title: 'Lecture 8', youtubeId: 'QV3IRiG6dVs' }],
    },
    {
      title: 'Continuous Random Variables',
      videos: [{ title: 'Lecture 9', youtubeId: 'OFgBn4rQkqc' }],
    },
    {
      title: 'Normal Distribution',
      videos: [{ title: 'Lecture 10', youtubeId: 'rpB_NNXiWlM' }],
    },
    {
      title: 'Joint Distributions',
      videos: [{ title: 'Lecture 11', youtubeId: '8Il2M7kbQSc' }],
    },
    {
      title: 'Inference I',
      videos: [{ title: 'Lecture 12', youtubeId: 'd0ImA7m4BEg' }],
    },
    {
      title: 'Inference II',
      videos: [{ title: 'Lecture 13', youtubeId: 'd0ImA7m4BEg' }],
    },
    {
      title: 'Modelling',
      videos: [{ title: 'Lecture 14', youtubeId: 'q9lk8l8P-E4' }],
    },
    {
      title: 'General Inference',
      videos: [{ title: 'Lecture 15', youtubeId: 'c0QGjtu9GZg' }],
    },
    {
      title: 'Beta',
      videos: [{ title: 'Lecture 16', youtubeId: 'aOhk9mFrHdU' }],
    },
    {
      title: 'Adding Random Variables',
      videos: [{ title: 'Lecture 17', youtubeId: 'UEyHbI9FRtM' }],
    },
    {
      title: 'Central Limit Theorem',
      videos: [{ title: 'Lecture 18', youtubeId: '6Q9wT6JGMMM' }],
    },
    {
      title: 'Bootstrapping and P-Values',
      videos: [{ title: 'Lecture 19', youtubeId: 'NXJwyPT1vsc' }],
    },
    {
      title: 'Algorithmic Analysis',
      videos: [{ title: 'Lecture 20', youtubeId: 'Ht9yUPtppwY' }],
    },
    {
      title: 'M.L.E.',
      videos: [{ title: 'Lecture 21', youtubeId: 'utFEufMXHgw' }],
    },
    {
      title: 'M.A.P.',
      videos: [{ title: 'Lecture 22', youtubeId: 'sL1zOr-P4xc' }],
    },
    {
      title: 'Naive Bayes',
      videos: [{ title: 'Lecture 23', youtubeId: 'yqF3DvDVpvw' }],
    },
    {
      title: 'Logistic Regression',
      videos: [{ title: 'Lecture 24', youtubeId: 'ILqZWvDWKEc' }],
    },
    {
      title: 'Deep Learning',
      videos: [{ title: 'Lecture 25', youtubeId: 'MSfI6TTgyl4' }],
    },
    {
      title: 'Fairness',
      videos: [{ title: 'Lecture 26', youtubeId: 'cbzwbr5H_LA' }],
    },
    {
      title: 'Advanced Probability',
      videos: [{ title: 'Lecture 27', youtubeId: 'BquE8Z9htws' }],
    },
    {
      title: 'Future of Probability',
      videos: [{ title: 'Lecture 28', youtubeId: 'SoXygq5LtiM' }],
    },
    {
      title: 'Counting (Review)',
      videos: [{ title: 'Lecture 29', youtubeId: 'yyKSsjRt42o' }],
    },
  ];

  const phys41MultiVideoLectures = [
    {
      title: 'Lecture 1',
      videos: [{ title: 'Lecture 1', youtubeId: '5ucfHd8FWKw' }],
    },
    {
      title: 'Lecture 2',
      videos: [{ title: 'Lecture 2', youtubeId: 'i4u7SZjoAs4' }],
    },
    {
      title: 'Lecture 3',
      videos: [{ title: 'Lecture 3', youtubeId: 'ErlP_SBcA1s' }],
    },
    {
      title: 'Lecture 4',
      videos: [{ title: 'Lecture 4', youtubeId: 'xZn4l1TSvPQ' }],
    },
    {
      title: 'Lecture 5',
      videos: [{ title: 'Lecture 5', youtubeId: 'Q3v_2znHCvg' }],
    },
    {
      title: 'Lecture 6',
      videos: [{ title: 'Lecture 6', youtubeId: '5zXYEVWSIsg' }],
    },
    {
      title: 'Lecture 7',
      videos: [{ title: 'Lecture 7', youtubeId: 'yLb_a1EE888' }],
    },
    {
      title: 'Lecture 8',
      videos: [{ title: 'Lecture 8', youtubeId: '89SjJv30kGU' }],
    },
    {
      title: 'Lecture 9',
      videos: [{ title: 'Lecture 9', youtubeId: 'NiCMMn12CIs' }],
    },
    {
      title: 'Lecture 10',
      videos: [{ title: 'Lecture 10', youtubeId: 'IV9NhNIrrDw' }],
    },
    {
      title: 'Lecture 11',
      videos: [{ title: 'Lecture 11', youtubeId: 'RBaBEjzMr4E' }],
    },
    {
      title: 'Lecture 12',
      videos: [{ title: 'Lecture 12', youtubeId: 'sffRo1-_D8E' }],
    },
    {
      title: 'Lecture 13',
      videos: [{ title: 'Lecture 13', youtubeId: '7WDiK3flILc' }],
    },
    {
      title: 'Lecture 14',
      videos: [{ title: 'Lecture 14', youtubeId: 'dlJtUvRaGdE' }],
    },
    {
      title: 'Lecture 15',
      videos: [{ title: 'Lecture 15', youtubeId: 'uo86ir31pn0' }],
    },
    {
      title: 'Lecture 16',
      videos: [{ title: 'Lecture 16', youtubeId: 'emrHcqEvXpw' }],
    },
    {
      title: 'Lecture 17',
      videos: [{ title: 'Lecture 17', youtubeId: '_0PrwAbgoMA' }],
    },
    {
      title: 'Lecture 18',
      videos: [{ title: 'Lecture 18', youtubeId: 'tniGFmPQc0E' }],
    },
    {
      title: 'Lecture 19',
      videos: [{ title: 'Lecture 19', youtubeId: 'gEX7MjWwocE' }],
    },
    {
      title: 'Lecture 20',
      videos: [{ title: 'Lecture 20', youtubeId: 'bX4liSWB4Gk' }],
    },
    {
      title: 'Lecture 21',
      videos: [{ title: 'Lecture 21', youtubeId: 'vkWY73HnNYA' }],
    },
    {
      title: 'Lecture 22',
      videos: [{ title: 'Lecture 22', youtubeId: '0mGd0JUmgm8' }],
    },
    {
      title: 'Lecture 23',
      videos: [{ title: 'Lecture 23', youtubeId: 'FNOfxJxceIM' }],
    },
    {
      title: 'Lecture 24',
      videos: [{ title: 'Lecture 24', youtubeId: '9NS0JcjNdp4' }],
    },
    {
      title: 'Lecture 25',
      videos: [{ title: 'Lecture 25', youtubeId: '30Ww1HsRblM' }],
    },
    {
      title: 'Lecture 26',
      videos: [{ title: 'Lecture 26', youtubeId: 'n1cXiw3s72k' }],
    },
    {
      title: 'Lecture 27',
      videos: [{ title: 'Lecture 27', youtubeId: '1GvCIlHihEA' }],
    },
    {
      title: 'Lecture 28',
      videos: [{ title: 'Lecture 28', youtubeId: 'Vg8t8_IOHDg' }],
    },
    {
      title: 'Lecture 29',
      videos: [{ title: 'Lecture 29', youtubeId: 'ol1COj0LACs' }],
    },
    {
      title: 'Lecture 30',
      videos: [{ title: 'Lecture 30', youtubeId: 'D2lW7o32fzk' }],
    },
    {
      title: 'Lecture 31',
      videos: [{ title: 'Lecture 31', youtubeId: 'sN-m5WkbMyI' }],
    },
    {
      title: 'Lecture 32',
      videos: [{ title: 'Lecture 32', youtubeId: 'YGR5_Hf9dDg' }],
    },
    {
      title: 'Lecture 33',
      videos: [{ title: 'Lecture 33', youtubeId: 'dvWKCH0ocu8' }],
    },
    {
      title: 'Lecture 34',
      videos: [{ title: 'Lecture 34', youtubeId: '7Kq8BINVDiw' }],
    },
    {
      title: 'Lecture 35',
      videos: [{ title: 'Lecture 35', youtubeId: 'bHocXJ4rv5g' }],
    },
    {
      title: 'Lecture 36',
      videos: [{ title: 'Lecture 36', youtubeId: '0qEIs6ie2q8' }],
    },
    {
      title: 'Lecture 37',
      videos: [{ title: 'Lecture 37', youtubeId: 'efpiHD_2O8E' }],
    },
    {
      title: 'Lecture 38',
      videos: [{ title: 'Lecture 38', youtubeId: '2TZa151GC-0' }],
    },
    {
      title: 'Lecture 39',
      videos: [{ title: 'Lecture 39', youtubeId: 'fLuyZ7ayDog' }],
    },
    {
      title: 'Lecture 40',
      videos: [{ title: 'Lecture 40', youtubeId: 'Lpd_TddOSZY' }],
    },
    {
      title: 'Lecture 41',
      videos: [{ title: 'Lecture 41', youtubeId: 'EX0uHJbIw68' }],
    },
    {
      title: 'Lecture 42',
      videos: [{ title: 'Lecture 42', youtubeId: 'nCDOa63Jd6M' }],
    },
    {
      title: 'Lecture 43',
      videos: [{ title: 'Lecture 43', youtubeId: 'z5JfWSocZUQ' }],
    },
    {
      title: 'Lecture 44',
      videos: [{ title: 'Lecture 44', youtubeId: 'EHCACV8rdig' }],
    },
    {
      title: 'Lecture 45',
      videos: [{ title: 'Lecture 45', youtubeId: 'MoRip5VVdkI' }],
    },
    {
      title: 'Lecture 46',
      videos: [{ title: 'Lecture 46', youtubeId: 'YLDRzy8Dcgo' }],
    },
    {
      title: 'Lecture 47',
      videos: [{ title: 'Lecture 47', youtubeId: '6-7BOpZ2k04' }],
    },
    {
      title: 'Lecture 48',
      videos: [{ title: 'Lecture 48', youtubeId: '-M8swpL-Ij8' }],
    },
    {
      title: 'Lecture 49',
      videos: [{ title: 'Lecture 49', youtubeId: 'efH7pq9YVQw' }],
    },
    {
      title: 'Lecture 50',
      videos: [{ title: 'Lecture 50', youtubeId: '0QF_uCgZW4Y' }],
    },
    {
      title: 'Lecture 51',
      videos: [{ title: 'Lecture 51', youtubeId: 'X9K8LT7SCZ0' }],
    },
    {
      title: 'Lecture 52',
      videos: [{ title: 'Lecture 52', youtubeId: 'O_M8asN10oQ' }],
    },
    {
      title: 'Lecture 53',
      videos: [{ title: 'Lecture 53', youtubeId: 'IWD-Aue6aIk' }],
    },
    {
      title: 'Lecture 54',
      videos: [{ title: 'Lecture 54', youtubeId: '6h3T3qIkxqw' }],
    },
    {
      title: 'Lecture 55',
      videos: [{ title: 'Lecture 55', youtubeId: 'Idx3VgOpUDk' }],
    },
    {
      title: 'Lecture 56',
      videos: [{ title: 'Lecture 56', youtubeId: 'mHVnpuhfpvI' }],
    },
    {
      title: 'Lecture 57',
      videos: [{ title: 'Lecture 57', youtubeId: 'DSk8HTcB7x0' }],
    },
    {
      title: 'Lecture 58',
      videos: [{ title: 'Lecture 58', youtubeId: 'EhgF2OViDDs' }],
    },
    {
      title: 'Lecture 59',
      videos: [{ title: 'Lecture 59', youtubeId: 'oILq3xz_XtU' }],
    },
    {
      title: 'Lecture 60',
      videos: [{ title: 'Lecture 60', youtubeId: 'hxa6jAYA980' }],
    },
    {
      title: 'Lecture 61',
      videos: [{ title: 'Lecture 61', youtubeId: 'ZMa-xKcM2L8' }],
    },
    {
      title: 'Lecture 62',
      videos: [{ title: 'Lecture 62', youtubeId: 'ThP6wQkf5ec' }],
    },
  ];

  const phys43MultiVideoLectures = [
    {
      title: 'Introduction',
      videos: [{ title: 'Introduction', youtubeId: 'rtlJoXxlSFE' }],
    },
    {
      title: "Electric Charges and Forces - Coulomb's Law - Polarization",
      videos: [{ title: 'Lecture 1', youtubeId: 'x1-SibwIPM4' }],
    },
    {
      title: 'Electric Field Lines, Superposition, Inductive Charging, Dipoles',
      videos: [{ title: 'Lecture 2', youtubeId: 'Pd9HY8iLiCA' }],
    },
    {
      title: "Electric Flux, Gauss' Law, Examples",
      videos: [{ title: 'Lecture 3', youtubeId: 'Zu2gomaDqnM' }],
    },
    {
      title: 'Electrostatic Potential, Electric Energy, Equipotential Surfaces',
      videos: [{ title: 'Lecture 4', youtubeId: 'QpVxj3XrLgk' }],
    },
    {
      title: 'E = -grad V, Conductors, Electrostatic Shielding (Faraday Cage)',
      videos: [{ title: 'Lecture 5', youtubeId: 'JhV-GOS4y8g' }],
    },
    {
      title: "High-voltage Breakdown, Lightning, Sparks, St. Elmo's Fire",
      videos: [{ title: 'Lecture 6', youtubeId: 'ww0XJUqFHXU' }],
    },
    {
      title: 'Capacitance, Electric Field Energy',
      videos: [{ title: 'Lecture 7', youtubeId: 'qyP1xZCB62E' }],
    },
    {
      title: 'Polarization, Dielectrics, Van de Graaff Generator, Capacitors',
      videos: [{ title: 'Lecture 8', youtubeId: 'GAtAG938AQc' }],
    },
    {
      title: "Electric Currents, Resistivity, Conductivity, Ohm's Law",
      videos: [{ title: 'Lecture 9', youtubeId: 'PJqOaHBgr30' }],
    },
    {
      title:
        "Batteries, Power, Kirchhoff's Rules, Circuits, Kelvin Water Dropper",
      videos: [{ title: 'Lecture 10', youtubeId: 'ViwSDL657L4' }],
    },
    {
      title: 'Magnetic Fields, Lorentz Force, Torques, Electric Motors (DC)',
      videos: [{ title: 'Lecture 11', youtubeId: '0y9x7CS5Vrk' }],
    },
    {
      title: 'First Exam Review',
      videos: [{ title: 'Lecture 12', youtubeId: '08WJDvgr2Zc' }],
    },
    {
      title: 'Moving Charges in B-fields, Cyclotrons, Mass Spectrometers, LHC',
      videos: [{ title: 'Lecture 13', youtubeId: 'sDnG1JhZ2N4' }],
    },
    {
      title: 'Biot-Savart, div B = 0, High-voltage Power Lines, Leyden Jar',
      videos: [{ title: 'Lecture 14', youtubeId: 'By2ogrSwgVo' }],
    },
    {
      title: "Ampere's Law, Solenoids, Kelvin Water Dropper (revisited)",
      videos: [{ title: 'Lecture 15', youtubeId: 'MXuZ1SRjpqk' }],
    },
    {
      title: "Electromagnetic Induction, Faraday's Law, Lenz Law, SUPER DEMO",
      videos: [{ title: 'Lecture 16', youtubeId: 'nGQbA2jwkWI' }],
    },
    {
      title: 'Motional EMF, Dynamos, Eddy Currents, Magnetic Breaking',
      videos: [{ title: 'Lecture 17', youtubeId: 'MzAPu_p2wI4' }],
    },
    {
      title: 'Displacement Current, Synchronous Motors, Explanation Secret Top',
      videos: [{ title: 'Lecture 18', youtubeId: '3sP9kh4xtKo' }],
    },
    {
      title:
        'Magnetic Levitation, Human Heart, Superconductivity, Aurora Borealis',
      videos: [{ title: 'Lecture 19', youtubeId: 'rLZLa-fyt1w' }],
    },
    {
      title: 'Inductance, RL Circuits, Magnetic Field Energy',
      videos: [{ title: 'Lecture 20', youtubeId: 't2micky_3uI' }],
    },
    {
      title: 'Magnetic Materials, Dia- Para- & Ferromagnetism',
      videos: [{ title: 'Lecture 21', youtubeId: '1xFRtdN5IJA' }],
    },
    {
      title: "Maxwell's Equations - 600 Daffodil Ceremony",
      videos: [{ title: 'Lecture 22', youtubeId: 'ckUyN5XNG0Y' }],
    },
    {
      title: 'Second Exam Review',
      videos: [{ title: 'Lecture 23', youtubeId: 'KrXbnIohemY' }],
    },
    {
      title: 'Transformers, Car Coils, RC Circuits',
      videos: [{ title: 'Lecture 24', youtubeId: '6w3SzI_s5Sg' }],
    },
    {
      title: 'Driven LRC Circuits, Metal Detectors',
      videos: [{ title: 'Lecture 25', youtubeId: 'FWMhk6x785Q' }],
    },
    {
      title: 'Traveling Waves, Standing Waves, Musical Instruments',
      videos: [{ title: 'Lecture 26', youtubeId: 'D_RIzl1uCxY' }],
    },
    {
      title: 'Destructive Resonance, Electromagnetic Waves, Speed of Light',
      videos: [{ title: 'Lecture 27', youtubeId: 'D3tnZzhSISo' }],
    },
    {
      title:
        'Poynting Vector, Oscillating Charges, Polarization, Radiation Pressure',
      videos: [{ title: 'Lecture 28', youtubeId: '6lb040GCs2M' }],
    },
    {
      title: "Snell's Law, Index of Refraction, Huygen's Principle, Color",
      videos: [{ title: 'Lecture 29', youtubeId: 'irpjwXpa4xU' }],
    },
    {
      title:
        "Polarizers, Malus' Law, Light Scattering, Blue Skies, Red Sunsets",
      videos: [{ title: 'Lecture 30', youtubeId: 'ESAPg7w3wm8' }],
    },
    {
      title: 'Rainbows, Fog Bows, Haloes, Glories, Sun Dogs',
      videos: [{ title: 'Lecture 31', youtubeId: 'pj0wXRLXai8' }],
    },
    {
      title: 'Third Exam Review',
      videos: [{ title: 'Lecture 32', youtubeId: '94dV7ucEEkY' }],
    },
    {
      title: 'Double-slit Interference, Interferometers',
      videos: [{ title: 'Lecture 33', youtubeId: '1rYF72PXVks' }],
    },
    {
      title: 'Diffraction, Gratings, Resolving Power, Angular Resolution',
      videos: [{ title: 'Lecture 34', youtubeId: 'sKO8n_-xtDc' }],
    },
    {
      title: 'Doppler Effect, Big Bang, Cosmology',
      videos: [{ title: 'Lecture 35', youtubeId: 'tDC2UDhRGkA' }],
    },
    {
      title: 'Farewell Special - My Early Days in Astrophysics, Huge Balloons',
      videos: [{ title: 'Lecture 36', youtubeId: 'lFTUtK6xBCU' }],
    },
    {
      title: "Kirchhoff's Loop Rule Is For The Birds",
      videos: [{ title: 'Bonus', youtubeId: 'LzT_YZ0xCFY' }],
    },
  ];

  const bioMultiVideoLectures = [
    {
      title: 'Introduction',
      videos: [{ title: 'Lecture 1', youtubeId: 'lm8ywGl9AIQ' }],
    },
    {
      title: 'Biochemistry I',
      videos: [{ title: 'Lecture 2', youtubeId: 'RJf9jRf-Ekw' }],
    },
    {
      title: 'Biochemistry II',
      videos: [{ title: 'Lecture 3', youtubeId: '3zJI3dYB7gc' }],
    },
    {
      title: 'Biochemistry III',
      videos: [{ title: 'Lecture 4', youtubeId: '6BPDK1b3jDg' }],
    },
    {
      title: 'Biochemistry IV',
      videos: [{ title: 'Lecture 5', youtubeId: '7aNYj3zyVkc' }],
    },
    {
      title: 'Biochemistry V',
      videos: [{ title: 'Lecture 6', youtubeId: 'SGHx6jKvxr8' }],
    },
    {
      title: 'Biochemistry VI',
      videos: [{ title: 'Lecture 7', youtubeId: 'R3DI6W9iKtU' }],
    },
    {
      title: 'Biochemistry VI (cont.) - DNA as Genetic Material',
      videos: [{ title: 'Lecture 8', youtubeId: '7ZlzvS7YoSM' }],
    },
    {
      title: 'Molecular Biology I',
      videos: [{ title: 'Lecture 9', youtubeId: 'mJhgkUWLtX8' }],
    },
    {
      title: 'Molecular Biology II - Process of Science',
      videos: [{ title: 'Lecture 10', youtubeId: 'Ncszdp4YQDY' }],
    },
    {
      title: 'Molecular Biology III',
      videos: [{ title: 'Lecture 11', youtubeId: 'Uf7qNWklQkE' }],
    },
    {
      title: 'Molecular Biology IV',
      videos: [{ title: 'Lecture 12', youtubeId: '40Sum5KfG1Q' }],
    },
    {
      title: 'Molecular Biology IV (cont.) - Gene Regulation I',
      videos: [{ title: 'Lecture 13', youtubeId: 'BhS5s1T1as8' }],
    },
    {
      title: 'Gene Regulation II',
      videos: [{ title: 'Lecture 14', youtubeId: 'vES9nISxtjk' }],
    },
    {
      title: 'Bacterial Genetics',
      videos: [{ title: 'Lecture 15', youtubeId: 'uQRTFmC5_GA' }],
    },
    {
      title: 'The Biosphere',
      videos: [{ title: 'Lecture 16', youtubeId: 'gaHQ_1Sp5_s' }],
    },
    {
      title: 'Carbon and Energy Metabolism',
      videos: [{ title: 'Lecture 17', youtubeId: '5WqgNOSoD_M' }],
    },
    {
      title: 'Productivity and Food Webs',
      videos: [{ title: 'Lecture 18', youtubeId: 'hWdAt9SzP0I' }],
    },
    {
      title: 'Regulation of Productivity',
      videos: [{ title: 'Lecture 19', youtubeId: '4owydSnRHuE' }],
    },
    {
      title: 'Limiting Factors and Biogeochemical Cycles',
      videos: [{ title: 'Lecture 20', youtubeId: 'zIXGgyOwtUk' }],
    },
    {
      title: 'Mendelian Genetics',
      videos: [{ title: 'Lecture 21', youtubeId: 'eiDX9dw866E' }],
    },
    {
      title: 'Mitosis and Meiosis',
      videos: [{ title: 'Lecture 22', youtubeId: 'g6VEnimixRk' }],
    },
    {
      title: 'Diploid Genetics',
      videos: [{ title: 'Lecture 23', youtubeId: 'fQKMD2iFe5w' }],
    },
    {
      title: 'Recombinant DNA I',
      videos: [{ title: 'Lecture 24', youtubeId: 'l5x9qAVUK7s' }],
    },
    {
      title: 'Recombinant DNA II',
      videos: [{ title: 'Lecture 25', youtubeId: 'EO9SMD6fIsI' }],
    },
    {
      title: 'Recombinant DNA III',
      videos: [{ title: 'Lecture 26', youtubeId: '5W4EnYzNRdA' }],
    },
    {
      title: 'Recombinant DNA III (cont.) - Immunology I',
      videos: [{ title: 'Lecture 27', youtubeId: 'kAN_eTW_ig0' }],
    },
    {
      title: 'Immunology II',
      videos: [{ title: 'Lecture 28', youtubeId: 'Y8eEMYqkwz0' }],
    },
    {
      title: 'Population Growth I',
      videos: [{ title: 'Lecture 29', youtubeId: 'Yr-cZg9eqp4' }],
    },
    {
      title: 'Population Growth II',
      videos: [{ title: 'Lecture 30', youtubeId: 'rKquepVheyM' }],
    },
    {
      title: 'Population Genetics and Evolution',
      videos: [{ title: 'Lecture 31', youtubeId: 'LBR4pEC7kwU' }],
    },
    {
      title: 'Molecular Evolution',
      videos: [{ title: 'Lecture 32', youtubeId: 'ONYokXoy04Q' }],
    },
    {
      title: 'Communities I',
      videos: [{ title: 'Lecture 33', youtubeId: 'GAArnLLlFtQ' }],
    },
    {
      title: 'Communities II',
      videos: [{ title: 'Lecture 34', youtubeId: '5_QWoGFUPaI' }],
    },
  ];

  const chemMultiVideoLectures = [
    {
      title: 'The Importance of Chemical Principles',
      videos: [{ title: 'Lecture 1', youtubeId: 'YkYeYhXUeEE' }],
    },
    {
      title: 'Atomic Structure',
      videos: [{ title: 'Lecture 2', youtubeId: 'ustfXi-mpkI' }],
    },
    {
      title: 'Wave-Particle Duality of Light',
      videos: [{ title: 'Lecture 3', youtubeId: '_U6YamvF7BE' }],
    },
    {
      title: 'Wave-Particle Duality of Matter; Schrödinger Equation',
      videos: [{ title: 'Lecture 4', youtubeId: 'Qg7pQ_CYaIQ' }],
    },
    {
      title: 'Hydrogen Atom Energy Levels',
      videos: [{ title: 'Lecture 5', youtubeId: 'kO0VmaLkgj8' }],
    },
    {
      title: 'Hydrogen Atom Wavefunctions (Orbitals)',
      videos: [{ title: 'Lecture 6', youtubeId: 'V-RPM3e8Ws0' }],
    },
    {
      title: 'Multielectron Atoms',
      videos: [{ title: 'Lecture 7', youtubeId: '-jJz5OMmuP0' }],
    },
    {
      title: 'The Periodic Table and Periodic Trends',
      videos: [{ title: 'Lecture 8', youtubeId: 'LWmVdG0uj2g' }],
    },
    {
      title: 'Periodic Table; Ionic and Covalent Bonds',
      videos: [{ title: 'Lecture 9', youtubeId: 'NIZFPnHtrBA' }],
    },
    {
      title: 'Introduction to Lewis Structures',
      videos: [{ title: 'Lecture 10', youtubeId: 'ed_XR1BzuQs' }],
    },
    {
      title: 'Lewis Structures: Breakdown of the Octet Rule',
      videos: [{ title: 'Lecture 11', youtubeId: 'Hc5ODj1Ml6c' }],
    },
    {
      title: 'The Shapes of Molecules: VSEPR Theory',
      videos: [{ title: 'Lecture 12', youtubeId: 'Ja9eEQQzTic' }],
    },
    {
      title: 'Molecular Orbital Theory',
      videos: [{ title: 'Lecture 13', youtubeId: 'O192jrR80oo' }],
    },
    {
      title: 'Valence Bond Theory and Hybridization',
      videos: [{ title: 'Lecture 14', youtubeId: 'BBbuj0XpaiQ' }],
    },
    {
      title: 'Thermodynamics: Bond and Reaction Enthalpies',
      videos: [{ title: 'Lecture 15', youtubeId: 'wS1MX-C2V9w' }],
    },
    {
      title: 'Thermodynamics: Gibbs Free Energy and Entropy',
      videos: [{ title: 'Lecture 16', youtubeId: 'OjhZYx1FbhI' }],
    },
    {
      title: 'Thermodynamics: Now What Happens When You Heat It Up?',
      videos: [{ title: 'Lecture 17', youtubeId: 'awdQqF9CFt0' }],
    },
    {
      title: 'Introduction to Chemical Equilibrium',
      videos: [{ title: 'Lecture 18', youtubeId: 'f0udxGcoztE' }],
    },
    {
      title: "Chemical Equilibrium: Le Châtelier's Principle",
      videos: [{ title: 'Lecture 19', youtubeId: 'AVL5AwJrrEU' }],
    },
    {
      title: 'Solubility and Acid-Base Equilibrium',
      videos: [{ title: 'Lecture 20', youtubeId: 'FJCVSswFXyE' }],
    },
    {
      title: 'Acid-Base Equilibrium: Is MIT Water Safe to Drink?',
      videos: [{ title: 'Lecture 21', youtubeId: 'pJdUR2uak2s' }],
    },
    {
      title: 'Acid-Base Equilibrium: Salt Solutions and Buffers',
      videos: [{ title: 'Lecture 22', youtubeId: 'caonmXHGB60' }],
    },
    {
      title: 'Acid-Base Titrations Part I',
      videos: [{ title: 'Lecture 23', youtubeId: 'pIwp65fPyYU' }],
    },
    {
      title: 'Acid-Base Titrations Part II',
      videos: [{ title: 'Lecture 24', youtubeId: 'Om_5b29d_9g' }],
    },
    {
      title: 'Oxidation-Reduction and Electrochemical Cells',
      videos: [{ title: 'Lecture 25', youtubeId: 'BZzkyqe6KD8' }],
    },
    {
      title: 'Chemical and Biological Oxidations',
      videos: [{ title: 'Lecture 26', youtubeId: 'f6Z99Gu6XEE' }],
    },
    {
      title: 'Introduction to Transition Metals',
      videos: [{ title: 'Lecture 27', youtubeId: 'JBgbUI3pxV0' }],
    },
    {
      title: 'Transition Metals: Crystal Field Theory Part I',
      videos: [{ title: 'Lecture 28', youtubeId: 'lLdPSLNxDqA' }],
    },
    {
      title: 'Transition Metals: Crystal Field Theory Part II',
      videos: [{ title: 'Lecture 29', youtubeId: 'CFPnZ66nge4' }],
    },
    {
      title: 'Kinetics: Rate Laws',
      videos: [{ title: 'Lecture 30', youtubeId: 'B7iFcW8USjQ' }],
    },
    {
      title: 'Nuclear Chemistry and Chemical Kinetics',
      videos: [{ title: 'Lecture 31', youtubeId: 'XKeAd4xybjM' }],
    },
    {
      title: 'Kinetics: Reaction Mechanisms',
      videos: [{ title: 'Lecture 32', youtubeId: '4q0T9c7jotw' }],
    },
    {
      title: 'Kinetics and Temperature',
      videos: [{ title: 'Lecture 33', youtubeId: 'KHkNrbSKFic' }],
    },
    {
      title: 'Kinetics: Catalysts',
      videos: [{ title: 'Lecture 34', youtubeId: 'p8AAjZXr5dg' }],
    },
    {
      title: 'Applying Chemical Principles',
      videos: [{ title: 'Lecture 35', youtubeId: 'pn1cxuBmhtI' }],
    },
  ];

  const cs221MultiVideoLectures = [
    {
      title: 'Intro & Course Overview',
      videos: [
        { title: 'General Intro', youtubeId: 'ZiwogMtbjr4' },
        { title: 'AI History', youtubeId: 'z8fEXuH0mu0' },
      ],
    },
    {
      title: 'AI Today & Linear Models',
      videos: [
        { title: 'Artificial Intelligence Today', youtubeId: 'C0IhR4D5KYc' },
        { title: 'AI & ML 1 - Overview', youtubeId: 'mtrYwgIrRNk' },
        { title: 'AI & ML 2 - Linear Regression', youtubeId: 'nEWNNt2KmfQ' },
      ],
    },
    {
      title: 'ML: Classification & SGD',
      videos: [
        {
          title: 'AI & ML 3 - Linear Classification',
          youtubeId: 'WcaMiqJR09s',
        },
        {
          title: 'AI & ML 4 - Stochastic Gradient Descent',
          youtubeId: 'bl2WgBLH0tI',
        },
        { title: 'AI & ML 5 - Group DRO', youtubeId: 'ZFK2XtWqUbw' },
      ],
    },
    {
      title: 'ML: Features & Neural Networks',
      videos: [
        { title: 'AI & ML 6 - Non Linear Features', youtubeId: 'eIxbNkB4byY' },
        { title: 'AI & ML 7 - Feature Templates', youtubeId: '2QfSBLtvioE' },
        { title: 'AI & ML 8 - Neural Networks', youtubeId: 'pnKXgBHuN58' },
        { title: 'ML 9 - Backpropagation', youtubeId: 'OcAF-l2xB9Y' },
      ],
    },
    {
      title: 'ML: Differentiable Programming & Generalization',
      videos: [
        {
          title: 'ML 10 - Differentiable Programming',
          youtubeId: 'c5btEEisp_g',
        },
        { title: 'AI & ML 11 - Generalization', youtubeId: 'Gq-Ah-QrOQM' },
        { title: 'AI & ML 12 - Best Practices', youtubeId: 'ouvGV2YZEEM' },
      ],
    },
    {
      title: 'ML: K-means & Search',
      videos: [
        { title: 'ML 13 - K-means', youtubeId: '5-Fn8R9fH7A' },
        {
          title: 'Search 1 - Dynamic Programming, Uniform Cost Search',
          youtubeId: 'aIsgJJYrlXk',
        },
        { title: 'Search 2 - A*', youtubeId: 'HEs1ZCvLH2s' },
      ],
    },
    {
      title: 'Markov Decision Processes',
      videos: [
        { title: 'MDPs 1 - Value Iteration', youtubeId: '9g32v7bK3Co' },
        { title: 'MDPs 2 - Reinforcement Learning', youtubeId: 'HpaHTfY52RQ' },
      ],
    },
    {
      title: 'Game Playing',
      videos: [
        {
          title: 'Game Playing 1 - Minimax, Alpha-beta Pruning',
          youtubeId: '3pU-Hrz_xy4',
        },
        {
          title: 'Game Playing 2 - TD Learning, Game Theory',
          youtubeId: 'WoFwXj4p4Sc',
        },
      ],
    },
    {
      title: 'Constraint Satisfaction Problems',
      videos: [
        { title: 'CSPs 1 - Overview', youtubeId: '-IO4fPO0rxk' },
        { title: 'CSPs 2 - Definitions', youtubeId: 'uj5wCcHsSlA' },
        { title: 'CSPs 3 - Examples', youtubeId: 'Tu6BiZhMDCc' },
        { title: 'CSPs 4 - Dynamic Ordering', youtubeId: 'Lyu8VzbIe_A' },
        { title: 'CSPs 5 - Arc Consistency', youtubeId: '5rlIYGJdPy4' },
        { title: 'CSPs 6 - Beam Search', youtubeId: 'XuWMeIHGkus' },
        { title: 'CSPs 7 - Local Search', youtubeId: 'VwZKPlK6jUg' },
      ],
    },
    {
      title: 'Markov & Bayesian Networks',
      videos: [
        { title: 'Markov Networks 1 - Overview', youtubeId: 'neeaJb3wCYw' },
        {
          title: 'Markov Networks 2 - Gibbs Sampling',
          youtubeId: 'k6aZZF2pk7k',
        },
        { title: 'Bayesian Networks 1 - Overview', youtubeId: 'fA7zP6EcVdw' },
        { title: 'Bayesian Networks 2 - Definition', youtubeId: 'xvC6XmZmR_U' },
      ],
    },
    {
      title: 'Bayesian Networks: Programming & Inference',
      videos: [
        {
          title: 'Bayesian Networks 3 - Probabilistic Programming',
          youtubeId: 'ZVk8y1zVoD4',
        },
        {
          title: 'Bayesian Networks 4 - Probabilistic Inference',
          youtubeId: '-dGOWB9Zh8s',
        },
        {
          title: 'Bayesian Networks 5 - Forward-backward Algorithm',
          youtubeId: 'N-ZPbpJOQs0',
        },
        {
          title: 'Bayesian Networks 6 - Particle Filtering',
          youtubeId: '8sOtXbQIOuE',
        },
      ],
    },
    {
      title: 'Bayesian Networks: Learning',
      videos: [
        {
          title: 'Bayesian Networks 7 - Supervised Learning',
          youtubeId: '_rbDjsJTgm8',
        },
        { title: 'Bayesian Networks 8 - Smoothing', youtubeId: 'M7rWvN_0xbw' },
        {
          title: 'Bayesian Networks 9 - EM Algorithm',
          youtubeId: 'CPVFJBd-Qcg',
        },
      ],
    },
    {
      title: 'Logic',
      videos: [
        {
          title: 'Logic 1 - Overview: Logic Based Models',
          youtubeId: 'oM5LUGPO7Zk',
        },
        {
          title: 'Logic 2 - Propositional Logic Syntax',
          youtubeId: 'LBjNaewGJzk',
        },
        {
          title: 'Logic 3 - Propositional Logic Semantics',
          youtubeId: 'N37yIn1jX98',
        },
        { title: 'Logic 4 - Inference Rules', youtubeId: 'RIk67yGMVv4' },
        {
          title: 'Logic 5 - Propositional Modus Ponens',
          youtubeId: '6bj4z2mt1KE',
        },
        {
          title: 'Logic 6 - Propositional Resolutions',
          youtubeId: 'egLAF4dFdBo',
        },
        { title: 'Logic 7 - First Order Logic', youtubeId: 'Z-O0Q3_oTJM' },
        {
          title: 'Logic 8 - First Order Modus Ponens',
          youtubeId: 'mndzhfBpyUw',
        },
        { title: 'Logic 9 - First Order Resolution', youtubeId: 'iG_tz7ZjZAI' },
        { title: 'Logic 10 - Recap', youtubeId: 'LYsOjtmLpPo' },
      ],
    },
    {
      title: 'Special Topics & Fireside Talks',
      videos: [
        { title: 'AI and Law', youtubeId: '_-hBu3_Jz-0' },
        { title: 'Fireside Talks: Robustness in ML', youtubeId: 'xr8AHGlieOE' },
        {
          title: 'Fireside Talks: State of Robotics',
          youtubeId: 'hVsR9DdR3qE',
        },
        {
          title: 'Inequality in Healthcare, AI & Data Science',
          youtubeId: '0IZhDmh1dmI',
        },
        { title: 'Fireside Talks: AI and Language', youtubeId: 'pI72PseZQo8' },
      ],
    },
    {
      title: 'Conclusion & AI Safety',
      videos: [
        { title: 'General Conclusion', youtubeId: 'iUGmupxCdjs' },
        {
          title: 'Externalities and Dual-Use Technologies',
          youtubeId: '2xQLCXqOtdU',
        },
        { title: 'The AI Alignment Problem', youtubeId: '5WHObJWE1FE' },
        { title: 'Encoding Human Values', youtubeId: 'aWAqgzXENr0' },
        { title: 'Algorithms and Distribution', youtubeId: 'olhFrDHP7iU' },
      ],
    },
  ];

  const cs229MultiVideoLectures = [
    {
      title: 'Course Introduction',
      videos: [{ title: 'Lecture 1', youtubeId: 'jGwO_UgTS7I' }],
    },
    {
      title: 'Linear Regression & Gradient Descent',
      videos: [{ title: 'Lecture 2', youtubeId: '4b4MUYve_U8' }],
    },
    {
      title: 'Locally Weighted & Logistic Regression',
      videos: [{ title: 'Lecture 3', youtubeId: 'het9HFqo1TQ' }],
    },
    {
      title: 'Perceptron & Generalized Linear Models',
      videos: [{ title: 'Lecture 4', youtubeId: 'iZTeva0WSTQ' }],
    },
    {
      title: 'GDA & Naive Bayes',
      videos: [{ title: 'Lecture 5', youtubeId: 'nt63k3bfXS0' }],
    },
    {
      title: 'Support Vector Machines',
      videos: [{ title: 'Lecture 6', youtubeId: 'lDwow4aOrtg' }],
    },
    {
      title: 'Kernels',
      videos: [{ title: 'Lecture 7', youtubeId: '8NYoQiRANpg' }],
    },
    {
      title: 'Data Splits, Models & Cross-Validation',
      videos: [{ title: 'Lecture 8', youtubeId: 'rjbkWSTjHzM' }],
    },
    {
      title: 'Learning Theory (Discussion Section)',
      videos: [{ title: 'Discussion Section', youtubeId: 'iVOxMcumR4A' }],
    },
    {
      title: 'Decision Trees & Ensemble Methods',
      videos: [{ title: 'Lecture 9', youtubeId: 'wr9gUr-eWdA' }],
    },
    {
      title: 'Introduction to Neural Networks',
      videos: [{ title: 'Lecture 10', youtubeId: 'MfIjxPh6Pys' }],
    },
    {
      title: 'Backpropagation & Improving Neural Networks',
      videos: [{ title: 'Lecture 11', youtubeId: 'zUazLXZZA2U' }],
    },
    {
      title: 'Debugging ML Models & Error Analysis',
      videos: [{ title: 'Lecture 12', youtubeId: 'ORrStCArmP4' }],
    },
    {
      title: 'Expectation-Maximization Algorithms',
      videos: [{ title: 'Lecture 13', youtubeId: 'rVfZHWTwXSA' }],
    },
    {
      title: 'EM Algorithm & Factor Analysis',
      videos: [{ title: 'Lecture 14', youtubeId: 'tw6cmL5STuY' }],
    },
    {
      title: 'PCA & ICA',
      videos: [{ title: 'Lecture 15', youtubeId: 'dyb_cFywuik' }],
    },
    {
      title: 'Independent Component Analysis & RL',
      videos: [{ title: 'Lecture 16', youtubeId: 'YQA9lLdLig8' }],
    },
    {
      title: 'MDPs & Value/Policy Iteration',
      videos: [{ title: 'Lecture 17', youtubeId: 'd5gaWTo6kDM' }],
    },
    {
      title: 'Continuous State MDP & Model Simulation',
      videos: [{ title: 'Lecture 18', youtubeId: 'QFu5nuc-S0s' }],
    },
    {
      title: 'Reward Model & Linear Dynamical Systems',
      videos: [{ title: 'Lecture 19', youtubeId: '0rt2CsEQv6U' }],
    },
    {
      title: 'RL Debugging & Diagnostics',
      videos: [{ title: 'Lecture 20', youtubeId: 'pLhPQynL0tY' }],
    },
  ];

  const cs224nMultiVideoLectures = [
    {
      title: 'Intro and Word Vectors',
      videos: [{ title: 'Lecture 1', youtubeId: 'DzpHeXVSC5I' }],
    },
    {
      title: 'Word Vectors and Language Models',
      videos: [{ title: 'Lecture 2', youtubeId: 'nBor4jfWetQ' }],
    },
    {
      title: 'Backpropagation, Neural Network',
      videos: [{ title: 'Lecture 3', youtubeId: 'HnliVHU2g9U' }],
    },
    {
      title: 'Dependency Parsing',
      videos: [{ title: 'Lecture 4', youtubeId: 'KVKvde-_MYc' }],
    },
    {
      title: 'Recurrent Neural Networks',
      videos: [{ title: 'Lecture 5', youtubeId: 'fyc0Jzr74y4' }],
    },
    {
      title: 'Sequence to Sequence Models',
      videos: [{ title: 'Lecture 6', youtubeId: 'Ba6Fn1-Jsfw' }],
    },
    {
      title: 'Attention, Final Projects and LLM Intro',
      videos: [{ title: 'Lecture 7', youtubeId: 'J7ruSOIzhrE' }],
    },
    {
      title: 'Self-Attention and Transformers',
      videos: [{ title: 'Lecture 8', youtubeId: 'LWMzyfvuehA' }],
    },
    {
      title: 'Pretraining',
      videos: [{ title: 'Lecture 9', youtubeId: 'DGfCRXuNA2w' }],
    },
    {
      title: 'Natural Language Generation',
      videos: [{ title: 'Lecture 11 (2023)', youtubeId: 'N9L32bFieEY' }],
    },
    {
      title: 'Post-training',
      videos: [
        { title: 'Lecture 10 - Archit Sharma', youtubeId: '35X6zlhoCy4' },
      ],
    },
    {
      title: 'Benchmarking',
      videos: [{ title: 'Lecture 11 - Yann Dubois', youtubeId: 'TO0CqzqiArM' }],
    },
    {
      title: 'Efficient Training',
      videos: [
        { title: 'Lecture 12 - Shikhar Murty', youtubeId: 'UVX7SYGCKkA' },
      ],
    },
    {
      title: 'Brain-Computer Interfaces',
      videos: [{ title: 'Lecture 13 - Chaofei Fan', youtubeId: 'tfVgHsKpRC8' }],
    },
    {
      title: 'Reasoning and Agents',
      videos: [
        { title: 'Lecture 14 - Shikhar Murty', youtubeId: 'I0tj4Y7xaOQ' },
      ],
    },
    {
      title: 'After DPO',
      videos: [
        { title: 'Lecture 15 - Nathan Lambert', youtubeId: 'dnF463_Ar9I' },
      ],
    },
    {
      title: 'ConvNets and TreeRNNs',
      videos: [{ title: 'Lecture 16', youtubeId: 'S8d-7v3f5MQ' }],
    },
    {
      title: 'NLP, Linguistics, Philosophy',
      videos: [{ title: 'Lecture 18', youtubeId: 'NxH0Y78xcF4' }],
    },
    {
      title: 'Multimodal Deep Learning',
      videos: [
        { title: 'Lecture 16 (2023) - Douwe Kiela', youtubeId: '5vfIT5LOkR0' },
      ],
    },
    {
      title: 'Model Interpretability & Editing',
      videos: [
        { title: 'Lec. 19 (2023) - Been Kim', youtubeId: 'cd3pRpEtjLs' },
      ],
    },
    {
      title: 'Python Tutorial',
      videos: [
        { title: 'Python Tutorial - Manasi Sharma', youtubeId: '8j4wpU98Q74' },
      ],
    },
    {
      title: 'PyTorch Tutorial',
      videos: [
        { title: 'PyTorch Tutorial - Drew Kaul', youtubeId: 'Uv0AIRr3ptg' },
      ],
    },
    {
      title: 'Hugging Face Tutorial',
      videos: [
        {
          title: 'Hugging Face Tutorial - Eric Frankel',
          youtubeId: 'b80by3Xk_A8',
        },
      ],
    },
  ];

  const cs231nMultiVideoLectures = [
    {
      title: 'Introduction',
      videos: [{ title: 'Lecture 1', youtubeId: '2fq9wYslV0A' }],
    },
    {
      title: 'Image Classification with Linear Classifiers',
      videos: [{ title: 'Lecture 2', youtubeId: 'pdqofxJeBN8' }],
    },
    {
      title: 'Regularization and Optimization',
      videos: [{ title: 'Lecture 3', youtubeId: 'dyNGd06MWn4' }],
    },
    {
      title: 'Neural Networks and Backpropagation',
      videos: [{ title: 'Lecture 4', youtubeId: '25zD5qJHYsk' }],
    },
    {
      title: 'Image Classification with CNNs',
      videos: [{ title: 'Lecture 5', youtubeId: 'f3g1zGdxptI' }],
    },
    {
      title: 'CNN Architectures',
      videos: [{ title: 'Lecture 6', youtubeId: 'aVJy4O5TOk8' }],
    },
    {
      title: 'Recurrent Neural Networks',
      videos: [{ title: 'Lecture 7', youtubeId: 'kG2lAPBF7zA' }],
    },
    {
      title: 'Attention and Transformers',
      videos: [{ title: 'Lecture 8', youtubeId: 'RQowiOF_FvQ' }],
    },
    {
      title: 'Object Detection, Image Segmentation, Visualizing',
      videos: [{ title: 'Lecture 9', youtubeId: 'PTypu6GqEd4' }],
    },
    {
      title: 'Video Understanding',
      videos: [{ title: 'Lecture 10', youtubeId: 'wElqklprhPE' }],
    },
    {
      title: 'Large Scale Distributed Training',
      videos: [{ title: 'Lecture 11', youtubeId: '9MvD-XsowsE' }],
    },
    {
      title: 'Self-Supervised Learning',
      videos: [{ title: 'Lecture 12', youtubeId: '4howBU7THbM' }],
    },
    {
      title: 'Generative Models 1',
      videos: [{ title: 'Lecture 13', youtubeId: 'zbHXQRUNlH0' }],
    },
    {
      title: 'Generative Models 2',
      videos: [{ title: 'Lecture 14', youtubeId: 'Edr4uZFh4EE' }],
    },
    {
      title: '3D Vision',
      videos: [{ title: 'Lecture 15', youtubeId: '7lxrKDKtykM' }],
    },
    {
      title: 'Vision and Language',
      videos: [{ title: 'Lecture 16', youtubeId: 'mQOK0Mfyrkk' }],
    },
    {
      title: 'Robot Learning',
      videos: [{ title: 'Lecture 17', youtubeId: 'XSfmOH_xVSU' }],
    },
    {
      title: 'Human-Centered AI',
      videos: [{ title: 'Lecture 18', youtubeId: 'g8UaBfj6Sh8' }],
    },
  ];

  const cs234MultiVideoLectures = [
    {
      title: 'Introduction to Reinforcement Learning',
      videos: [{ title: 'Lecture 1', youtubeId: 'WsvFL-LjA6U' }],
    },
    {
      title: 'Tabular MDP Planning',
      videos: [{ title: 'Lecture 2', youtubeId: 'gHdsUUGcBC0' }],
    },
    {
      title: 'Policy Evaluation',
      videos: [{ title: 'Lecture 3', youtubeId: 'jjq51TRNVvk' }],
    },
    {
      title: 'Q Learning and Function Approximation',
      videos: [{ title: 'Lecture 4', youtubeId: 'b_wvosA70f8' }],
    },
    {
      title: 'Policy Search 1',
      videos: [{ title: 'Lecture 5', youtubeId: 'L6OVEmV3NcE' }],
    },
    {
      title: 'Policy Search 2',
      videos: [{ title: 'Lecture 6', youtubeId: '8PwvNQ5WS-o' }],
    },
    {
      title: 'Policy Search 3',
      videos: [{ title: 'Lecture 7', youtubeId: '4ngb0IZTg8I' }],
    },
    {
      title: 'Offline RL 1',
      videos: [{ title: 'Lecture 8', youtubeId: 'IEbuJtjqtMU' }],
    },
    {
      title: 'Guest Lecture on DPO',
      videos: [
        {
          title: 'Lecture 9 - Rafailov, Sharma, Mitchell',
          youtubeId: 'Q7rl8ovBWwQ',
        },
      ],
    },
    {
      title: 'Offline RL 3',
      videos: [{ title: 'Lecture 10', youtubeId: 'F6APGIAm5fw' }],
    },
    {
      title: 'Exploration 1',
      videos: [{ title: 'Lecture 11', youtubeId: 'sqYii3nd78w' }],
    },
    {
      title: 'Exploration 2',
      videos: [{ title: 'Lecture 12', youtubeId: 'gFJNsfg_35E' }],
    },
    {
      title: 'Exploration 3',
      videos: [{ title: 'Lecture 13', youtubeId: 'pc7oayCSZmQ' }],
    },
    {
      title: 'Multi-Agent Game Playing',
      videos: [{ title: 'Lecture 14', youtubeId: 'UgANzoWc0nc' }],
    },
    {
      title: 'RL Applications',
      videos: [
        { title: 'Lecture 15 - Brunskill & Webber', youtubeId: 'FOlPpjNbHjE' },
      ],
    },
    {
      title: 'Value Alignment',
      videos: [{ title: 'Lecture 16', youtubeId: 'eenJzay5aLo' }],
    },
  ];

  const cs238MultiVideoLectures = [
    {
      title: 'Validation of Safety Critical Systems I Explainability',
      videos: [{ title: 'Video 1', youtubeId: '_U0EUX2E3k0' }],
    },
    {
      title: 'The Internal Details of TeX82 - Session 12',
      videos: [{ title: 'Video 2', youtubeId: 'eKttYyTf_30' }],
    },
    {
      title: 'The Internal Details of TeX82 - Session 11',
      videos: [{ title: 'Video 3', youtubeId: 'eotEOydYrco' }],
    },
    {
      title: 'The Internal Details of TeX82 - Session 10',
      videos: [{ title: 'Video 4', youtubeId: 'Uf3vpKWpu7A' }],
    },
    {
      title: 'The Internal Details of TeX82 - Session 9',
      videos: [{ title: 'Video 5', youtubeId: 'gza2a-JuWJg' }],
    },
    {
      title: 'The Internal Details of TeX82 - Session 8',
      videos: [{ title: 'Video 6', youtubeId: 'BMq3cCQ8ysQ' }],
    },
    {
      title: 'The Internal Details of TeX82 - Session 7',
      videos: [{ title: 'Video 7', youtubeId: 'nLJnNZxLEnk' }],
    },
    {
      title: 'The Internal Details of TeX82 - Session 6',
      videos: [{ title: 'Video 8', youtubeId: 'mxOZ-fSvr9Y' }],
    },
    {
      title: 'The Internal Details of TeX82 - Session 5',
      videos: [{ title: 'Video 9', youtubeId: 'WiHIOn1bemg' }],
    },
    {
      title: 'The Internal Details of TeX82 - Session 4',
      videos: [{ title: 'Video 10', youtubeId: '9astSKJdsV0' }],
    },
    {
      title: 'The Internal Details of TeX82 - Session 2',
      videos: [{ title: 'Video 11', youtubeId: '3RDtSdN7jPI' }],
    },
    {
      title: 'The Internal Details of TeX82 - Session 3',
      videos: [{ title: 'Video 12', youtubeId: '7B_9keAK6Qk' }],
    },
    {
      title: 'The Internal Details of TeX82 - Session 1',
      videos: [{ title: 'Video 13', youtubeId: 'kAk9GBVKsgk' }],
    },
    {
      title: 'Bayesian Structure Learning',
      videos: [{ title: 'Video 14', youtubeId: 'FfT5VTfHj_s' }],
    },
    {
      title: 'Online Planning and Policy Search',
      videos: [{ title: 'Video 15', youtubeId: 'iLMzsV0JOHk' }],
    },
    {
      title: 'Machine Learning from Human Preferences I Guest Lecture',
      videos: [{ title: 'Video 16', youtubeId: 'HFrCySzH9QI' }],
    },
    {
      title: 'Policy Gradient Estimation & Optimization',
      videos: [{ title: 'Video 17', youtubeId: 'PgPNfPhG4Wc' }],
    },
    {
      title: 'Linear Constrained Optimization',
      videos: [{ title: 'Video 18', youtubeId: 'gmdrc9vGnJ0' }],
    },
    {
      title: 'Policy Gradient Estimation and Optimization',
      videos: [{ title: 'Video 19', youtubeId: '-at-usqAIMc' }],
    },
    {
      title: 'Pi and The Art of Computer Programming',
      videos: [{ title: 'Video 20', youtubeId: '3DKo219ZHMw' }],
    },
    {
      title: 'Robert W Floyd, In Memoriam',
      videos: [{ title: 'Video 21', youtubeId: 'OJsMXu3EPCw' }],
    },
    {
      title: 'CS144C classroom lecture about disk storage and B-trees',
      videos: [{ title: 'Video 22', youtubeId: 'ab9_2VRI4-A' }],
    },
    {
      title: 'Can computers help produce beautiful books?',
      videos: [{ title: 'Video 23', youtubeId: 'H7CKoZpNF3M' }],
    },
    {
      title: 'TeX For Beginners - Session 1',
      videos: [{ title: 'Video 24', youtubeId: 'jbrMBOF61e0' }],
    },
    {
      title: 'TeX For Beginners - Session 2',
      videos: [{ title: 'Video 25', youtubeId: 'YRnpzxtdntw' }],
    },
    {
      title: 'TeX For Beginners - Session 4',
      videos: [{ title: 'Video 26', youtubeId: 'Yp9vAbvTo9I' }],
    },
    {
      title: 'TeX For Beginners - Session 3',
      videos: [{ title: 'Video 27', youtubeId: 'V1EmAqGQSFA' }],
    },
    {
      title: 'TeX For Beginners - Session 5',
      videos: [{ title: 'Video 28', youtubeId: 'JSOPnsFQGU8' }],
    },
    {
      title: 'Advanced TeXarcana - Session 1',
      videos: [{ title: 'Video 29', youtubeId: 'cUXgJfy7W7k' }],
    },
    {
      title: 'Advanced TeXarcana - Session 2',
      videos: [{ title: 'Video 30', youtubeId: 'VkbucteDmWQ' }],
    },
    {
      title: 'Advanced TeXarcana - Session 3',
      videos: [{ title: 'Video 31', youtubeId: 'qfGUdCDWINY' }],
    },
    {
      title: 'Advanced TeXarcana - Session 4',
      videos: [{ title: 'Video 32', youtubeId: 'mQrNOv77PLE' }],
    },
    {
      title: 'Advanced TeXarcana - Session 5',
      videos: [{ title: 'Video 33', youtubeId: 'fBRSfnwWixY' }],
    },
    {
      title: 'Mathematical Writing - Computer aids to writing',
      videos: [{ title: 'Video 34', youtubeId: 'KZy5p-uxh34' }],
    },
    {
      title: 'Dancing Links',
      videos: [{ title: 'Video 35', youtubeId: '_cR9zDlvP88' }],
    },
    {
      title: 'A Conjecture That Had To Be True',
      videos: [{ title: 'Video 36', youtubeId: 'BxQw4CdxLr8' }],
    },
    {
      title: 'Kenneth Arrow (In Memoriam)',
      videos: [{ title: 'Video 37', youtubeId: '3U72v8LJiJ0' }],
    },
    {
      title: 'The Analysis of Algorithms',
      videos: [{ title: 'Video 38', youtubeId: 'vkUNH9r6UCI' }],
    },
    {
      title: 'Hamiltonian Paths in Antiquity',
      videos: [{ title: 'Video 39', youtubeId: 'DjZB9HvddQk' }],
    },
    {
      title: 'Hamiltonian Paths in Antiquity (360 Degrees)',
      videos: [{ title: 'Video 40', youtubeId: 'ZK4jnuCWl0Y' }],
    },
    {
      title: 'Universal Commafree Codes',
      videos: [{ title: 'Video 41', youtubeId: '48iJx8FVuis' }],
    },
    {
      title: 'Marcian Ted Hoff',
      videos: [{ title: 'Video 42', youtubeId: 'Ei2fiZ5tR7o' }],
    },
    {
      title: '(3/2)-ary Trees',
      videos: [{ title: 'Video 43', youtubeId: 'P4AaGQIo0HY' }],
    },
    {
      title: '2014 Kailath Lecture: Donald Knuth',
      videos: [{ title: 'Video 44', youtubeId: 'gAXdDEQveKw' }],
    },
    {
      title: 'Morris Chang in conversation with John L. Hennessy',
      videos: [{ title: 'Video 45', youtubeId: 'wEh3ZgbvBrE' }],
    },
    {
      title: 'Kenneth Arrow',
      videos: [{ title: 'Video 46', youtubeId: 'kHBZCSss3oM' }],
    },
    {
      title: 'William J. Perry on Energy, National Security and Technology',
      videos: [{ title: 'Video 47', youtubeId: '2qXvFrS22Cg' }],
    },
    {
      title: 'Jim Clark in conversation with John Hennessy',
      videos: [{ title: 'Video 48', youtubeId: 'gXuOH9B6kTM' }],
    },
    {
      title: 'Martin Hellman Lecture',
      videos: [{ title: 'Video 49', youtubeId: 'EFiTgOx3Z7A' }],
    },
    {
      title: 'Martin Hellman: The Wisdom of Foolishness',
      videos: [{ title: 'Video 50', youtubeId: 'XDgLDsUU7og' }],
    },
    {
      title: 'Craig Barrett',
      videos: [{ title: 'Video 51', youtubeId: 'LM3sfeimcS8' }],
    },
    {
      title: 'Andreas Bechtolsheim: The Process of Innovation',
      videos: [{ title: 'Video 52', youtubeId: '08frKEAtav4' }],
    },
    {
      title: 'Bradford Parkinson: GPS for Humanity',
      videos: [{ title: 'Video 53', youtubeId: 'd6I6wFf-X_c' }],
    },
    {
      title: 'All Questions Answered',
      videos: [{ title: 'Video 54', youtubeId: 'CDokMxVtB3k' }],
    },
  ];

  const cs140MultiVideoLectures = [
    {
      title: 'Introduction',
      videos: [
        {
          title: 'Lecture 1',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-01-2022-04-17.mp4',
        },
      ],
    },
    {
      title: "OS: A Bird's-Eye View (Part 1)",
      videos: [
        {
          title: 'Lecture 2',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-02-2022-04-17.mp4',
        },
      ],
    },
    {
      title: "OS: A Bird's-Eye View (Part 2)",
      videos: [
        {
          title: 'Lecture 3',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-03-2022-04-20.mp4',
        },
      ],
    },
    {
      title: "OS: A Bird's-Eye View (Part 2)",
      videos: [
        {
          title: 'Lecture 4',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-04-2022-04-20.mp4',
        },
      ],
    },
    {
      title: 'Processes',
      videos: [
        {
          title: 'Lecture 5',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-05-2022-04-21.mp4',
        },
      ],
    },
    {
      title: 'Threads: An Instant Primer',
      videos: [
        {
          title: 'Lecture 6',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-06-2022-04-21.mp4',
        },
      ],
    },
    {
      title: 'Race Conditions',
      videos: [
        {
          title: 'Lecture 7',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-07-2022-04-24.mp4',
        },
      ],
    },
    {
      title: 'Semaphores: A First Cut',
      videos: [
        {
          title: 'Lecture 8',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-08-2022-04-24.mp4',
        },
      ],
    },
    {
      title: 'Semaphores: A First Cut (April 27)',
      videos: [
        {
          title: 'Lecture 9',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-09-2022-04-27.mp4',
        },
      ],
    },
    {
      title: 'Threads and Context Switching in BLITZ',
      videos: [
        {
          title: 'Lecture 10',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-10-2022-04-27.mp4',
        },
      ],
    },
    {
      title: 'Monitors and Condition Variables',
      videos: [
        {
          title: 'Lecture 11',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-11-2022-04-28.mp4',
        },
      ],
    },
    {
      title: 'Monitors and Condition Variables',
      videos: [
        {
          title: 'Lecture 12',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-12-2022-04-28.mp4',
        },
      ],
    },
    {
      title: 'The Dining Philosophers',
      videos: [
        {
          title: 'Lecture 13',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-13-2022-05-04.mp4',
        },
      ],
    },
    {
      title: 'The Sleeping Barber',
      videos: [
        {
          title: 'Lecture 14',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-14-2022-05-04.mp4',
        },
      ],
    },
    {
      title: 'Threads: A Deep Dive',
      videos: [
        {
          title: 'Lecture 15',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-15-2022-05-05.mp4',
        },
      ],
    },
    {
      title: 'Threads: A Deep Dive',
      videos: [
        {
          title: 'Lecture 16',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-16-2022-05-05.mp4',
        },
      ],
    },
    {
      title: 'Context Switching: A Deep Dive',
      videos: [
        {
          title: 'Lecture 17',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-17-2022-05-08.mp4',
        },
      ],
    },
    {
      title: 'Context Switching: A Deep Dive',
      videos: [
        {
          title: 'Lecture 18',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-18-2022-05-08.mp4',
        },
      ],
    },
    {
      title: 'Scheduling Policies: Introduction',
      videos: [
        {
          title: 'Lecture 19',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-19-2022-05-11.mp4',
        },
      ],
    },
    {
      title: 'MLFQ Scheduling',
      videos: [
        {
          title: 'Lecture 20',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-20-2022-05-11.mp4',
        },
      ],
    },
    {
      title: 'Proportional Share Scheduling',
      videos: [
        {
          title: 'Lecture 21',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-21-2022-05-12.mp4',
        },
      ],
    },
    {
      title: 'Multiprocessor Scheduling',
      videos: [
        {
          title: 'Lecture 22',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-22-2022-05-12.mp4',
        },
      ],
    },
    {
      title: 'Virtualizing Memory: Introduction',
      videos: [
        {
          title: 'Lecture 23',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-23-2022-05-15.mp4',
        },
      ],
    },
    {
      title: 'Segmentation',
      videos: [
        {
          title: 'Lecture 24',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-24-2022-05-15.mp4',
        },
      ],
    },
    {
      title: 'Free Space Management',
      videos: [
        {
          title: 'Lecture 25',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-25-2022-05-18.mp4',
        },
      ],
    },
    {
      title: 'Paging: Introduction',
      videos: [
        {
          title: 'Lecture 26',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-26-2022-05-18.mp4',
        },
      ],
    },
    {
      title: 'Paging: Smaller Tables',
      videos: [
        {
          title: 'Lecture 27',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-27-2022-05-19.mp4',
        },
      ],
    },
    {
      title: 'Paging: Faster Translations',
      videos: [
        {
          title: 'Lecture 28',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-28-2022-05-19.mp4',
        },
      ],
    },
    {
      title: 'Beyond Physical Memory',
      videos: [
        {
          title: 'Lecture 29',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-29-2022-05-22.mp4',
        },
      ],
    },
    {
      title: 'Beyond Physical Memory',
      videos: [
        {
          title: 'Lecture 30',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-30-2022-05-22.mp4',
        },
      ],
    },
    {
      title: 'Beyond Physical Memory',
      videos: [
        {
          title: 'Lecture 31',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-31-2022-05-25.mp4',
        },
      ],
    },
    {
      title: 'Page Replacement',
      videos: [
        {
          title: 'Lecture 32',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-32-2022-05-25.mp4',
        },
      ],
    },
    {
      title: 'Page Replacement',
      videos: [
        {
          title: 'Lecture 33',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-33-2022-05-26.mp4',
        },
      ],
    },
    {
      title: 'Page Replacement',
      videos: [
        {
          title: 'Lecture 34',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-34-2022-05-26.mp4',
        },
      ],
    },
    {
      title: 'File System Implementation',
      videos: [
        {
          title: 'Lecture 35',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-35-2022-05-29.mp4',
        },
      ],
    },
    {
      title: 'File System Implementation',
      videos: [
        {
          title: 'Lecture 36',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-36-2022-05-29.mp4',
        },
      ],
    },
    {
      title: 'File System Implementation',
      videos: [
        {
          title: 'Lecture 37',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-37-2022-06-01.mp4',
        },
      ],
    },
    {
      title: 'Journaling File Systems',
      videos: [
        {
          title: 'Lecture 38',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-38-2022-06-01.mp4',
        },
      ],
    },
    {
      title: 'Journaling File Systems',
      videos: [
        {
          title: 'Lecture 39',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-39-2022-06-05.mp4',
        },
      ],
    },
    {
      title: 'Input/Output Devices',
      videos: [
        {
          title: 'Lecture 40',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-40-2022-06-05.mp4',
        },
      ],
    },
    {
      title: 'Virtual Machine Monitors',
      videos: [
        {
          title: 'Lecture 41',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-41-2022-06-08.mp4',
        },
      ],
    },
    {
      title: 'Security: An Introduction',
      videos: [
        {
          title: 'Lecture 42',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-42-2022-06-08.mp4',
        },
      ],
    },
    {
      title: 'Systems Security',
      videos: [
        {
          title: 'Lecture 43',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-43-2022-06-09.mp4',
        },
      ],
    },
    {
      title: 'Systems Security',
      videos: [
        {
          title: 'Lecture 44',
          mp4Url:
            'https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-44-2022-06-09.mp4',
        },
      ],
    },
  ];

  const cs143MultiVideoLectures = [
    {
      title: '01-01-_Introduction',
      videos: [{ title: 'Video 1', bvid: 'BV17K4y147Bz', page: 1 }],
    },
    {
      title: '01-02-_Structure_of_a_Compiler',
      videos: [{ title: 'Video 2', bvid: 'BV17K4y147Bz', page: 2 }],
    },
    {
      title: '01-03-_The_Economy_of_Programming_Languages',
      videos: [{ title: 'Video 3', bvid: 'BV17K4y147Bz', page: 3 }],
    },
    {
      title: '02-01-_Cool_Overview',
      videos: [{ title: 'Video 4', bvid: 'BV17K4y147Bz', page: 4 }],
    },
    {
      title: '02-02-_Cool_Example_II',
      videos: [{ title: 'Video 5', bvid: 'BV17K4y147Bz', page: 5 }],
    },
    {
      title: '02-03-_Cool_Example_III',
      videos: [{ title: 'Video 6', bvid: 'BV17K4y147Bz', page: 6 }],
    },
    {
      title: '03-01-_Lexical_Analysis',
      videos: [{ title: 'Video 7', bvid: 'BV17K4y147Bz', page: 7 }],
    },
    {
      title: '03-02-_Lexical_Analysis_Examples',
      videos: [{ title: 'Video 8', bvid: 'BV17K4y147Bz', page: 8 }],
    },
    {
      title: '03-03-_Regular_Languages',
      videos: [{ title: 'Video 9', bvid: 'BV17K4y147Bz', page: 9 }],
    },
    {
      title: '03-04-_Formal_Languages',
      videos: [{ title: 'Video 10', bvid: 'BV17K4y147Bz', page: 10 }],
    },
    {
      title: '03-05-_Lexical_Specifications',
      videos: [{ title: 'Video 11', bvid: 'BV17K4y147Bz', page: 11 }],
    },
    {
      title: '04-01-_Lexical_Specification',
      videos: [{ title: 'Video 12', bvid: 'BV17K4y147Bz', page: 12 }],
    },
    {
      title: '04-02-_Finite_Automata',
      videos: [{ title: 'Video 13', bvid: 'BV17K4y147Bz', page: 13 }],
    },
    {
      title: '04-03-_Regular_Expressions_into_NFAs',
      videos: [{ title: 'Video 14', bvid: 'BV17K4y147Bz', page: 14 }],
    },
    {
      title: '04-04-_NFA_to_DFA',
      videos: [{ title: 'Video 15', bvid: 'BV17K4y147Bz', page: 15 }],
    },
    {
      title: '04-05-_Implementing_Finite_Automata',
      videos: [{ title: 'Video 16', bvid: 'BV17K4y147Bz', page: 16 }],
    },
    {
      title: '05-01-_Introduction_to_Parsing',
      videos: [{ title: 'Video 17', bvid: 'BV17K4y147Bz', page: 17 }],
    },
    {
      title: '05-02-_Context_Free_Grammars',
      videos: [{ title: 'Video 18', bvid: 'BV17K4y147Bz', page: 18 }],
    },
    {
      title: '05-03-_Derivations',
      videos: [{ title: 'Video 19', bvid: 'BV17K4y147Bz', page: 19 }],
    },
    {
      title: '05-04-_Ambiguity',
      videos: [{ title: 'Video 20', bvid: 'BV17K4y147Bz', page: 20 }],
    },
    {
      title: '06-01-_Error_Handling',
      videos: [{ title: 'Video 21', bvid: 'BV17K4y147Bz', page: 21 }],
    },
    {
      title: '06-02-_Abstract_Syntax_Trees',
      videos: [{ title: 'Video 22', bvid: 'BV17K4y147Bz', page: 22 }],
    },
    {
      title: '06-03-_Recursive_Descent_Parsing',
      videos: [{ title: 'Video 23', bvid: 'BV17K4y147Bz', page: 23 }],
    },
    {
      title: '06-04-_Recursive_Descent_Algorithm',
      videos: [{ title: 'Video 24', bvid: 'BV17K4y147Bz', page: 24 }],
    },
    {
      title: '06-04-1-_Recursive_Descent_Limitations',
      videos: [{ title: 'Video 25', bvid: 'BV17K4y147Bz', page: 25 }],
    },
    {
      title: '06-05-_Left_Recursion',
      videos: [{ title: 'Video 26', bvid: 'BV17K4y147Bz', page: 26 }],
    },
    {
      title: '07-01-_Predictive_Parsing',
      videos: [{ title: 'Video 27', bvid: 'BV17K4y147Bz', page: 27 }],
    },
    {
      title: '07-02-_First_Sets',
      videos: [{ title: 'Video 28', bvid: 'BV17K4y147Bz', page: 28 }],
    },
    {
      title: '07-03-_Follow_Sets',
      videos: [{ title: 'Video 29', bvid: 'BV17K4y147Bz', page: 29 }],
    },
    {
      title: '07-04-_LL1_Parsing_Tables',
      videos: [{ title: 'Video 30', bvid: 'BV17K4y147Bz', page: 30 }],
    },
    {
      title: '07-05-_Bottom-Up_Parsing',
      videos: [{ title: 'Video 31', bvid: 'BV17K4y147Bz', page: 31 }],
    },
    {
      title: '07-06-_Shift-Reduce_Parsing',
      videos: [{ title: 'Video 32', bvid: 'BV17K4y147Bz', page: 32 }],
    },
    {
      title: '08-01-_Handles',
      videos: [{ title: 'Video 33', bvid: 'BV17K4y147Bz', page: 33 }],
    },
    {
      title: '08-02-_Recognizing_Handles',
      videos: [{ title: 'Video 34', bvid: 'BV17K4y147Bz', page: 34 }],
    },
    {
      title: '08-03-_Recognizing_Viable_Prefixes',
      videos: [{ title: 'Video 35', bvid: 'BV17K4y147Bz', page: 35 }],
    },
    {
      title: '08-04-_Valid_Items',
      videos: [{ title: 'Video 36', bvid: 'BV17K4y147Bz', page: 36 }],
    },
    {
      title: '08-05-_SLR_Parsing',
      videos: [{ title: 'Video 37', bvid: 'BV17K4y147Bz', page: 37 }],
    },
    {
      title: '08-06-_SLR_Parsing_Example',
      videos: [{ title: 'Video 38', bvid: 'BV17K4y147Bz', page: 38 }],
    },
    {
      title: '08-07-_SLR_Improvements',
      videos: [{ title: 'Video 39', bvid: 'BV17K4y147Bz', page: 39 }],
    },
    {
      title: '08-08-_SLR_Examples',
      videos: [{ title: 'Video 40', bvid: 'BV17K4y147Bz', page: 40 }],
    },
    {
      title: '09_09-09-_Implementing_Type_Checking',
      videos: [{ title: 'Video 41', bvid: 'BV17K4y147Bz', page: 41 }],
    },
    {
      title: '09-01-_Introduction_to_Semantic_Analysis',
      videos: [{ title: 'Video 42', bvid: 'BV17K4y147Bz', page: 42 }],
    },
    {
      title: '09-02-_Scope',
      videos: [{ title: 'Video 43', bvid: 'BV17K4y147Bz', page: 43 }],
    },
    {
      title: '09-03-_Symbol_Tables',
      videos: [{ title: 'Video 44', bvid: 'BV17K4y147Bz', page: 44 }],
    },
    {
      title: '09-04-_Types',
      videos: [{ title: 'Video 45', bvid: 'BV17K4y147Bz', page: 45 }],
    },
    {
      title: '09-05-_Type_Checking',
      videos: [{ title: 'Video 46', bvid: 'BV17K4y147Bz', page: 46 }],
    },
    {
      title: '09-06-_Type_Environments',
      videos: [{ title: 'Video 47', bvid: 'BV17K4y147Bz', page: 47 }],
    },
    {
      title: '09-07-_Subtyping',
      videos: [{ title: 'Video 48', bvid: 'BV17K4y147Bz', page: 48 }],
    },
    {
      title: '09-08-_Typing_Methods',
      videos: [{ title: 'Video 49', bvid: 'BV17K4y147Bz', page: 49 }],
    },
    {
      title: '10-01-_Static_vs._Dynamic_Typing',
      videos: [{ title: 'Video 50', bvid: 'BV17K4y147Bz', page: 50 }],
    },
    {
      title: '10-02-_Self_Type',
      videos: [{ title: 'Video 51', bvid: 'BV17K4y147Bz', page: 51 }],
    },
    {
      title: '10-03-_Self_Type_Operations',
      videos: [{ title: 'Video 52', bvid: 'BV17K4y147Bz', page: 52 }],
    },
    {
      title: '10-04-_Self_Type_Usage',
      videos: [{ title: 'Video 53', bvid: 'BV17K4y147Bz', page: 53 }],
    },
    {
      title: '10-05-_Self_Type_Checking',
      videos: [{ title: 'Video 54', bvid: 'BV17K4y147Bz', page: 54 }],
    },
    {
      title: '10-06-_Error_Recovery',
      videos: [{ title: 'Video 55', bvid: 'BV17K4y147Bz', page: 55 }],
    },
    {
      title: '11-01-_Runtime_Organization',
      videos: [{ title: 'Video 56', bvid: 'BV17K4y147Bz', page: 56 }],
    },
    {
      title: '11-02-_Activations',
      videos: [{ title: 'Video 57', bvid: 'BV17K4y147Bz', page: 57 }],
    },
    {
      title: '11-03-_Activation_Records',
      videos: [{ title: 'Video 58', bvid: 'BV17K4y147Bz', page: 58 }],
    },
    {
      title: '11-04-_Globals_and_Heap',
      videos: [{ title: 'Video 59', bvid: 'BV17K4y147Bz', page: 59 }],
    },
    {
      title: '11-05-_Alignment',
      videos: [{ title: 'Video 60', bvid: 'BV17K4y147Bz', page: 60 }],
    },
    {
      title: '11-06-_Stack_Machines',
      videos: [{ title: 'Video 61', bvid: 'BV17K4y147Bz', page: 61 }],
    },
    {
      title: '12-01-_Introduction_to_Code_Generation',
      videos: [{ title: 'Video 62', bvid: 'BV17K4y147Bz', page: 62 }],
    },
    {
      title: '12-02-_Code_Generation_I',
      videos: [{ title: 'Video 63', bvid: 'BV17K4y147Bz', page: 63 }],
    },
    {
      title: '12-03-_Code_Generation_II',
      videos: [{ title: 'Video 64', bvid: 'BV17K4y147Bz', page: 64 }],
    },
    {
      title: '12-04-_Code_Generation_Example',
      videos: [{ title: 'Video 65', bvid: 'BV17K4y147Bz', page: 65 }],
    },
    {
      title: '12-05-_Temporaries',
      videos: [{ title: 'Video 66', bvid: 'BV17K4y147Bz', page: 66 }],
    },
    {
      title: '12-06-_Object_Layout',
      videos: [{ title: 'Video 67', bvid: 'BV17K4y147Bz', page: 67 }],
    },
    {
      title: '13-01-_Semantics_Overview',
      videos: [{ title: 'Video 68', bvid: 'BV17K4y147Bz', page: 68 }],
    },
    {
      title: '13-02-_Operational_Semantics',
      videos: [{ title: 'Video 69', bvid: 'BV17K4y147Bz', page: 69 }],
    },
    {
      title: '13-03-_Cool_Semantics_I',
      videos: [{ title: 'Video 70', bvid: 'BV17K4y147Bz', page: 70 }],
    },
    {
      title: '13-04-_Cool_Semantics_II',
      videos: [{ title: 'Video 71', bvid: 'BV17K4y147Bz', page: 71 }],
    },
    {
      title: '14-01-_Intermediate_Code',
      videos: [{ title: 'Video 72', bvid: 'BV17K4y147Bz', page: 72 }],
    },
    {
      title: '14-02-_Optimization_Overview',
      videos: [{ title: 'Video 73', bvid: 'BV17K4y147Bz', page: 73 }],
    },
    {
      title: '14-03-_Local_Optimization',
      videos: [{ title: 'Video 74', bvid: 'BV17K4y147Bz', page: 74 }],
    },
    {
      title: '14-04-_Peephole_Optimization',
      videos: [{ title: 'Video 75', bvid: 'BV17K4y147Bz', page: 75 }],
    },
    {
      title: '15-01-_Dataflow_Analysis',
      videos: [{ title: 'Video 76', bvid: 'BV17K4y147Bz', page: 76 }],
    },
    {
      title: '15-02-_Constant_Propagation',
      videos: [{ title: 'Video 77', bvid: 'BV17K4y147Bz', page: 77 }],
    },
    {
      title: '15-03-_Analysis_of_Loops',
      videos: [{ title: 'Video 78', bvid: 'BV17K4y147Bz', page: 78 }],
    },
    {
      title: '15-04-_Orderings',
      videos: [{ title: 'Video 79', bvid: 'BV17K4y147Bz', page: 79 }],
    },
    {
      title: '15-05-_Liveness_Analysis',
      videos: [{ title: 'Video 80', bvid: 'BV17K4y147Bz', page: 80 }],
    },
    {
      title: '16-01-_Register_Allocation',
      videos: [{ title: 'Video 81', bvid: 'BV17K4y147Bz', page: 81 }],
    },
    {
      title: '16-02-_Graph_Coloring',
      videos: [{ title: 'Video 82', bvid: 'BV17K4y147Bz', page: 82 }],
    },
    {
      title: '16-03-_Spilling',
      videos: [{ title: 'Video 83', bvid: 'BV17K4y147Bz', page: 83 }],
    },
    {
      title: '16-04-_Managing_Caches',
      videos: [{ title: 'Video 84', bvid: 'BV17K4y147Bz', page: 84 }],
    },
    {
      title: '17-01-_Automatic_Memory_Management',
      videos: [{ title: 'Video 85', bvid: 'BV17K4y147Bz', page: 85 }],
    },
    {
      title: '17-02-_Mark_and_Sweep',
      videos: [{ title: 'Video 86', bvid: 'BV17K4y147Bz', page: 86 }],
    },
    {
      title: '17-03-_Stop_and_Copy',
      videos: [{ title: 'Video 87', bvid: 'BV17K4y147Bz', page: 87 }],
    },
    {
      title: '17-04-_Conservative_Collection',
      videos: [{ title: 'Video 88', bvid: 'BV17K4y147Bz', page: 88 }],
    },
    {
      title: '17-05-_Reference_Counting',
      videos: [{ title: 'Video 89', bvid: 'BV17K4y147Bz', page: 89 }],
    },
    {
      title: '18-01-_Java',
      videos: [{ title: 'Video 90', bvid: 'BV17K4y147Bz', page: 90 }],
    },
    {
      title: '18-02-_Java_Arrays',
      videos: [{ title: 'Video 91', bvid: 'BV17K4y147Bz', page: 91 }],
    },
    {
      title: '18-03-_Java_Exceptions',
      videos: [{ title: 'Video 92', bvid: 'BV17K4y147Bz', page: 92 }],
    },
    {
      title: '18-04-_Java_Interfaces',
      videos: [{ title: 'Video 93', bvid: 'BV17K4y147Bz', page: 93 }],
    },
    {
      title: '18-05-_Java_Coercions',
      videos: [{ title: 'Video 94', bvid: 'BV17K4y147Bz', page: 94 }],
    },
    {
      title: '18-06-_Java_Threads',
      videos: [{ title: 'Video 95', bvid: 'BV17K4y147Bz', page: 95 }],
    },
    {
      title: '18-07-_Other_Topics',
      videos: [{ title: 'Video 96', bvid: 'BV17K4y147Bz', page: 96 }],
    },
    {
      title: 'DeduceIt_Demo',
      videos: [{ title: 'Video 97', bvid: 'BV17K4y147Bz', page: 97 }],
    },
  ];

  const cs144MultiVideoLectures = [
    {
      title: 'CS144 Fall 2013, Video 2-5: Error detection',
      videos: [{ title: 'Video 1', youtubeId: '8DRD-vQam60' }],
    },
    {
      title: 'CS144 Fall 2013, Video 2-6a: Finite state machines 1',
      videos: [{ title: 'Video 2', youtubeId: 'FYNk9VrMWwc' }],
    },
    {
      title: 'CS144 Fall 2013, Video 2-0: Transport (intro)',
      videos: [{ title: 'Video 3', youtubeId: '1CP6aF09OjI' }],
    },
    {
      title: 'CS144 Fall 2013, Video 2-1: TCP service model',
      videos: [{ title: 'Video 4', youtubeId: 'l3AhPe4WK0E' }],
    },
    {
      title: 'CS144 Fall 2013, Video 2-2: UDP service model',
      videos: [{ title: 'Video 5', youtubeId: 'umqdobwwbFc' }],
    },
    {
      title: 'CS144 Fall 2013, Video 2-3: ICMP service model',
      videos: [{ title: 'Video 6', youtubeId: 'LSobIghyLGU' }],
    },
    {
      title: 'CS144 Fall 2013, Video 2-4: End to End Principle',
      videos: [{ title: 'Video 7', youtubeId: 'mZcthYLpF9Q' }],
    },
    {
      title: 'CS144 Fall 2013, Video 2-12: Transport (recap)',
      videos: [{ title: 'Video 8', youtubeId: 'vtJ2JzhWTsk' }],
    },
    {
      title: 'CS144 Fall 2013, Video 4-0: Congestion Control',
      videos: [{ title: 'Video 9', youtubeId: 'nh970YyKRDA' }],
    },
    {
      title: '4-4 AIMD Multiple Flows',
      videos: [{ title: 'Video 10', youtubeId: 'OAHga4mQr_A' }],
    },
    {
      title: 'CS144 Fall 2013, Video 4-11: Congestion Control',
      videos: [{ title: 'Video 11', youtubeId: 'JMm2vDkCUJg' }],
    },
    {
      title: 'CS144 Fall 2013, Video 6-0: Routing',
      videos: [{ title: 'Video 12', youtubeId: 'yfIyxDhhWHU' }],
    },
    {
      title: 'CS144 Fall 2013, Video 6-9: Routing',
      videos: [{ title: 'Video 13', youtubeId: 'VJoYi6UZiCg' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-0: Security',
      videos: [{ title: 'Video 14', youtubeId: 'LHbynG7iYEY' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-1: Introduction to Network Security',
      videos: [{ title: 'Video 15', youtubeId: 'SERez34ww5c' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-2: Layer 2 Attacks',
      videos: [{ title: 'Video 16', youtubeId: 'GkqPLrCqkeo' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-2a: MAC Overflow Attack',
      videos: [{ title: 'Video 17', youtubeId: 'YC_oLgYd_qU' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-2b: DHCP Attack Demo',
      videos: [{ title: 'Video 18', youtubeId: '_eW_SDyhj-U' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-3: Layer 3 Attacks',
      videos: [{ title: 'Video 19', youtubeId: '6vudh-STvBM' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-5: Security Principles',
      videos: [{ title: 'Video 20', youtubeId: 'LxtJoXxeDyE' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-6a: Confidentiality',
      videos: [{ title: 'Video 21', youtubeId: 'Pr_vrfRYuvQ' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-7: Integrity',
      videos: [{ title: 'Video 22', youtubeId: 'sRBuAB0reNY' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-8: Public Key Cryptography',
      videos: [{ title: 'Video 23', youtubeId: 'aSh16igtLf4' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-9: Certificates',
      videos: [{ title: 'Video 24', youtubeId: 'gQ33dMv1aJ8' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-10a: TLS',
      videos: [{ title: 'Video 25', youtubeId: 'gsLEz6sRPr8' }],
    },
    {
      title: 'CS144 Fall 2013, Video 8-11: Security',
      videos: [{ title: 'Video 26', youtubeId: 'CxuyR9G1HwA' }],
    },
    {
      title: '4 Nandita Interview',
      videos: [{ title: 'Video 27', youtubeId: 'OVhJEn3cu5M' }],
    },
    {
      title: 'BGP: Putting the Inter in Internet',
      videos: [{ title: 'Video 28', youtubeId: 'HAhzj1E1ejI' }],
    },
    {
      title: 'Sanjit Biswas, CEO of Meraki (interviewed by Nick M)',
      videos: [{ title: 'Video 29', youtubeId: 'pHULhFc8pwA' }],
    },
    {
      title: 'Reed Hundt on security and openness',
      videos: [{ title: 'Video 30', youtubeId: '0jwuR8YANIk' }],
    },
  ];

  const cs149MultiVideoLectures = [
    {
      title: 'Lecture 1 - Why Parallelism? Why Efficiency?',
      videos: [{ title: 'Video 1', youtubeId: 'V1tINV2-9p4' }],
    },
    {
      title: 'Lecture 2 - A Modern Multi-Core Processor',
      videos: [{ title: 'Video 2', youtubeId: 'CKmNpAO5rS4' }],
    },
    {
      title:
        'Lecture 3 - Multi-core Arch Part II + ISPC Programming Abstractions',
      videos: [{ title: 'Video 3', youtubeId: 'F4bVSyz_jxo' }],
    },
    {
      title: 'Lecture 4 - Parallel Programming Basics',
      videos: [{ title: 'Video 4', youtubeId: '0-ztm8SKq70' }],
    },
    {
      title:
        'Lecture 5 - Performance Optimization I: Work Distribution and Scheduling',
      videos: [{ title: 'Video 5', youtubeId: 'mmO2Ri_dJkk' }],
    },
    {
      title:
        'Lecture 6 - Performance Optimization II: Locality, Communication, and Contention',
      videos: [{ title: 'Video 6', youtubeId: 'Mhdny2JNhmc' }],
    },
    {
      title: 'Lecture 7 - GPU architecture and CUDA Programming',
      videos: [{ title: 'Video 7', youtubeId: 'qQTDF0CBoxE' }],
    },
    {
      title: 'Lecture 8 - Data-Parallel Thinking',
      videos: [{ title: 'Video 8', youtubeId: 'Ba3TqxSgnTk' }],
    },
    {
      title: 'Lecture 9 - Distributed Data-Parallel Computing Using Spark',
      videos: [{ title: 'Video 9', youtubeId: 'jaMWmLq422U' }],
    },
    {
      title: 'Lecture 10 - Efficiently Evaluating DNNs on GPUs',
      videos: [{ title: 'Video 10', youtubeId: 'qbKtU0X6-WU' }],
    },
    {
      title: 'Lecture 11 - Cache Coherence',
      videos: [{ title: 'Video 11', youtubeId: 'lrCfG2CPDEw' }],
    },
    {
      title: 'Lecture 12 - Memory Consistency',
      videos: [{ title: 'Video 12', youtubeId: 'nFXWmo9MFiY' }],
    },
    {
      title:
        'Lecture 13 - Fine-Grained Synchronization and Lock-Free Programming',
      videos: [{ title: 'Video 13', youtubeId: 'GA1ObImqaMo' }],
    },
    {
      title: 'Lecture 14 - Midterm Review',
      videos: [{ title: 'Video 14', youtubeId: 'nHPKVtLz5Ko' }],
    },
    {
      title: 'Lecture 15 - Domain Specific Programming Languages',
      videos: [{ title: 'Video 15', youtubeId: 'sRuyBNxCkGQ' }],
    },
    {
      title: 'Lecture 16 - Transactional Memory 1',
      videos: [{ title: 'Video 16', youtubeId: 'rFFf3WIJ7BA' }],
    },
    {
      title: 'Lecture 17 - Transactional Memory 2',
      videos: [{ title: 'Video 17', youtubeId: 'Tbk1vnYLQqI' }],
    },
    {
      title: 'Lecture 18 - Hardware Specialization',
      videos: [{ title: 'Video 18', youtubeId: '2tAb3EgyjNw' }],
    },
    {
      title: 'Lecture 19 - Accessing Memory + Course Wrap Up',
      videos: [{ title: 'Video 19', youtubeId: 'J7v_ubArrno' }],
    },
  ];

  const cs154MultiVideoLectures = [
    {
      title: 'Introduction & Mathematical Foundations',
      videos: [
        { title: 'What is Computing?', youtubeId: 'YzKmKcBHogg' },
        { title: 'Course Curriculum', youtubeId: 'SrXZPzgJ3Jc' },
        { title: 'Proofs', youtubeId: 'FSf7KnMR4Is' },
      ],
    },
    {
      title: 'Deterministic Finite Automata',
      videos: [
        { title: 'DFA Overview', youtubeId: '-PJY5bHl_HA' },
        { title: 'DFA Deep Dive', youtubeId: 'mQqB7KER3r8' },
        { title: 'DFA Closure Properties', youtubeId: 'VDUs9g6rU7E' },
      ],
    },
    {
      title: 'Nondeterminism & Regular Expressions',
      videos: [
        { title: 'NFA Introduction', youtubeId: 'n_EG8J-VFJ4' },
        { title: 'NFA to DFA Conversion', youtubeId: 'AsAb2BiUw8c' },
        { title: 'DFA Closure Properties II', youtubeId: 'ukk9ZL3_Ff4' },
        { title: 'Regular Expressions', youtubeId: '9NMfJNDoZhQ' },
      ],
    },
    {
      title: 'Non-Regular Languages',
      videos: [
        { title: 'Pumping Lemma', youtubeId: '4XRR3UurDoQ' },
        { title: 'DFA Minimization', youtubeId: 'WzrXOMw_cEI' },
        { title: 'Myhill-Nerode Theorem', youtubeId: 'BJOABHS_OuM' },
      ],
    },
    {
      title: 'DFA Learning & Streaming',
      videos: [
        { title: 'Learning DFAs', youtubeId: '85QZN45-CoQ' },
        { title: 'Streaming Algorithms', youtubeId: '0xXV1jALAdQ' },
      ],
    },
    {
      title: 'Communication Complexity',
      videos: [{ title: 'Communication Complexity', youtubeId: '6iNbuivj1ZA' }],
    },
    {
      title: 'Turing Machines',
      videos: [
        { title: 'TM Overview', youtubeId: 'DRBDcMAB2qg' },
        { title: 'Turing Machines', youtubeId: 'dope-PGUbUM' },
        { title: 'TM Variants', youtubeId: 'Fz1hBSZC5mY' },
        { title: 'Universal TM', youtubeId: 'hFbnLn4bD58' },
      ],
    },
    {
      title: 'Undecidability',
      videos: [
        { title: 'Counting Argument', youtubeId: 'T0RJqD_yTLs' },
        { title: 'Concrete Undecidable Problems', youtubeId: 'S3bYfIAdEmM' },
        { title: 'Mapping Reductions', youtubeId: '_0163dZIBvw' },
      ],
    },
    {
      title: "Rice's Theorem & Oracle Reductions",
      videos: [
        { title: "Rice's Theorem", youtubeId: 'KHMyz1pAWg8' },
        { title: 'Oracle Reductions', youtubeId: '-EBYph6R1eI' },
        { title: 'Self-Reference', youtubeId: 'vUHmltEPXIk' },
      ],
    },
    {
      title: 'Logic & Kolmogorov Complexity',
      videos: [
        { title: 'Logic', youtubeId: 'KBhoU7sfR3k' },
        { title: 'Kolmogorov Complexity', youtubeId: 'PwNIDjc9cYc' },
      ],
    },
    {
      title: 'Time Complexity & NP',
      videos: [
        { title: 'Complexity Overview', youtubeId: 'r6lW-3Rttb0' },
        { title: 'Time Complexity', youtubeId: 'SqG_D1Mp5CY' },
        { title: 'Introduction to NP', youtubeId: 'ioq7srEOWvw' },
      ],
    },
    {
      title: 'NP-Completeness',
      videos: [
        { title: 'Polynomial-Time Reductions', youtubeId: 'mYwVCePIzG8' },
        { title: 'Cook-Levin Theorem', youtubeId: '-lLBjGmVqNY' },
        { title: 'More NP-Complete Problems', youtubeId: 'Ds5LKk73oZQ' },
      ],
    },
    {
      title: 'Beyond NP',
      videos: [
        { title: 'co-NP', youtubeId: 'LbLP_wIAJe4' },
        { title: 'Polynomial Hierarchy', youtubeId: 'IS1A0N1EF2o' },
      ],
    },
    {
      title: 'Space Complexity',
      videos: [
        { title: 'Space Complexity', youtubeId: 'fvNeT3n8Ubk' },
        { title: 'Interactive Proofs', youtubeId: '1XF9V-5YrIE' },
      ],
    },
    {
      title: 'Advanced Topics',
      videos: [
        { title: 'Algorithmic Fairness', youtubeId: 'YjRS91Mv-f4' },
        { title: 'Randomness', youtubeId: 'jmSSkC7yVog' },
        { title: 'Parting Thoughts', youtubeId: 'gt_pqWJy210' },
      ],
    },
  ];

  const cs155MultiVideoLectures = [
    {
      title: '1. Introduction, Threat Models',
      videos: [{ title: 'Video 1', youtubeId: 'GqmQg-cszw4' }],
    },
    {
      title: '2. Control Hijacking Attacks',
      videos: [{ title: 'Video 2', youtubeId: 'r4KjHEgg9Wg' }],
    },
    {
      title: '3. Buffer Overflow Exploits and Defenses',
      videos: [{ title: 'Video 3', youtubeId: 'xSQxaie_h1o' }],
    },
    {
      title: '4. Privilege Separation',
      videos: [{ title: 'Video 4', youtubeId: 'dNl22h1kW1k' }],
    },
    {
      title: '6. Capabilities',
      videos: [{ title: 'Video 5', youtubeId: 'TQhmua7Z2cY' }],
    },
    {
      title: '7. Sandboxing Native Code',
      videos: [{ title: 'Video 6', youtubeId: 'I0Psvvky-44' }],
    },
    {
      title: '8. Web Security Model',
      videos: [{ title: 'Video 7', youtubeId: 'eRJ_r8WF1Y0' }],
    },
    {
      title: '9. Securing Web Applications',
      videos: [{ title: 'Video 8', youtubeId: 'WlmKwIe9z1Q' }],
    },
    {
      title: '10. Symbolic Execution',
      videos: [{ title: 'Video 9', youtubeId: 'yRVZPvHYHzw' }],
    },
    {
      title: '11. Ur/Web',
      videos: [{ title: 'Video 10', youtubeId: 'XMEFdofERLI' }],
    },
    {
      title: '12. Network Security',
      videos: [{ title: 'Video 11', youtubeId: 'BZTWXl9QNK8' }],
    },
    {
      title: '13. Network Protocols',
      videos: [{ title: 'Video 12', youtubeId: 'QOtA76ga_fY' }],
    },
    {
      title: '14. SSL and HTTPS',
      videos: [{ title: 'Video 13', youtubeId: 'q1OF_0ICt9A' }],
    },
    {
      title: '15. Medical Software',
      videos: [{ title: 'Video 14', youtubeId: 'bA3xCpYLA34' }],
    },
    {
      title: '16. Side-Channel Attacks',
      videos: [{ title: 'Video 15', youtubeId: '3v5Von-oNUg' }],
    },
    {
      title: '17. User Authentication',
      videos: [{ title: 'Video 16', youtubeId: 'MT7X17ZRo1U' }],
    },
    {
      title: '18. Private Browsing',
      videos: [{ title: 'Video 17', youtubeId: 'YTWXAFJf8bw' }],
    },
    {
      title: '19. Anonymous Communication',
      videos: [{ title: 'Video 18', youtubeId: 'OgGTJIgNewE' }],
    },
    {
      title: '20. Mobile Phone Security',
      videos: [{ title: 'Video 19', youtubeId: 'uT7BXusDgDM' }],
    },
    {
      title: '21. Data Tracking',
      videos: [{ title: 'Video 20', youtubeId: 'WG5UbMrUiLU' }],
    },
    {
      title: '22. Guest Lecture by MIT IS&T',
      videos: [{ title: 'Video 21', youtubeId: '2PO8h1pVW50' }],
    },
    {
      title: '23. Security Economics',
      videos: [{ title: 'Video 22', youtubeId: '8PdnOZI7H5E' }],
    },
  ];

  const cs240MultiVideoLectures = [
    {
      title: '1. What is an Operating System?',
      videos: [
        { title: 'Video 1', archiveId: 'ucberkeley_webcast_ToySNfwFOyc' },
      ],
    },
    {
      title:
        '2. TDD (Test-Driven Design), BDD (Behavior-Driven Design), and all that',
      videos: [
        { title: 'Video 2', archiveId: 'ucberkeley_webcast_f9Fr7y5FJ94' },
      ],
    },
    {
      title: '3. OS Structure: Monolithic, Microkernel, Exokernel, Multikernel',
      videos: [
        { title: 'Video 3', archiveId: 'ucberkeley_webcast_5bwLaaP4weo' },
      ],
    },
    {
      title: '4. OS Structure (cont.): Modern Architecture',
      videos: [
        { title: 'Video 4', archiveId: 'ucberkeley_webcast_34QM3PLk_Lo' },
      ],
    },
    {
      title:
        '5. Processes, Fork, Exec, Interprocess Communication/Optimization',
      videos: [
        { title: 'Video 5', archiveId: 'ucberkeley_webcast_cBZE8Id2vlI' },
      ],
    },
    {
      title: '6. Parallelism and Synchronization',
      videos: [
        { title: 'Video 6', archiveId: 'ucberkeley_webcast_XlFv3t5Hy28' },
      ],
    },
    {
      title: '7. Synchronization and Scheduling Review',
      videos: [
        { title: 'Video 7', archiveId: 'ucberkeley_webcast_oEdqyWM_30o' },
      ],
    },
    {
      title: '8. Synchronization Approaches',
      videos: [
        { title: 'Video 8', archiveId: 'ucberkeley_webcast_wCFhmu2Csxk' },
      ],
    },
    {
      title: '9. Synchronization (cont.), Scheduling Review',
      videos: [
        { title: 'Video 9', archiveId: 'ucberkeley_webcast_aK2wUT251aA' },
      ],
    },
    {
      title: '10. Scheduling (cont.), Real-Time Scheduling',
      videos: [
        { title: 'Video 10', archiveId: 'ucberkeley_webcast_hYl_i9iK3pw' },
      ],
    },
    {
      title: '11. Scheduling (cont.), Real-Time Scheduling',
      videos: [
        { title: 'Video 11', archiveId: 'ucberkeley_webcast_PavfiyTgqAs' },
      ],
    },
    {
      title: '12. Dominant Resource Fairness (DRF), Two-Level Scheduling',
      videos: [
        { title: 'Video 12', archiveId: 'ucberkeley_webcast_nBOwIkNu3q0' },
      ],
    },
    {
      title:
        '13. Two-Level Scheduling (cont.), Segmentation/Paging/Virtual Memory',
      videos: [
        { title: 'Video 13', archiveId: 'ucberkeley_webcast_s7TNsvbq9tI' },
      ],
    },
    {
      title: '14. Segmentation, Paging, Virtual Memory',
      videos: [
        { title: 'Video 14', archiveId: 'ucberkeley_webcast_lOhENu_LY7U' },
      ],
    },
    {
      title: '15. Virtual Memory and Paging',
      videos: [
        { title: 'Video 15', archiveId: 'ucberkeley_webcast_gh90w5pItf8' },
      ],
    },
    {
      title: '16. Virtual Memory and Paging (cont.), Devices',
      videos: [
        { title: 'Video 16', archiveId: 'ucberkeley_webcast_foz4oaErIFw' },
      ],
    },
    {
      title: '17. Device Drivers: Slab Allocator',
      videos: [
        { title: 'Video 17', archiveId: 'ucberkeley_webcast_-QI3Nc_Ymjg' },
      ],
    },
    {
      title:
        '18. Device Drivers (cont.): IO Buses, Interrupts, Device Driver Structure',
      videos: [
        { title: 'Video 18', archiveId: 'ucberkeley_webcast_xXb_Wt-DBKU' },
      ],
    },
    {
      title: '19. Disk Modeling, File Systems Intro',
      videos: [
        { title: 'Video 19', archiveId: 'ucberkeley_webcast_uJnakBXap9M' },
      ],
    },
    {
      title:
        '20. File Systems (cont.): Reliability, Journaling, Durability, Scheduling',
      videos: [
        { title: 'Video 20', archiveId: 'ucberkeley_webcast_eeU1K2gB5Ig' },
      ],
    },
    {
      title:
        '21. File Systems (cont.): Distributed Storage, File Cache, Virtual Filesystem Switch',
      videos: [
        { title: 'Video 21', archiveId: 'ucberkeley_webcast_JoOTk3Y6TQw' },
      ],
    },
    {
      title:
        '22. Distributed File Systems (cont.): VFS Layer, Application-Specific File Systems',
      videos: [
        { title: 'Video 22', archiveId: 'ucberkeley_webcast_4oPjQdT07EY' },
      ],
    },
    {
      title: '23. Application-Specific File Systems, Deep Archival Storage',
      videos: [
        { title: 'Video 23', archiveId: 'ucberkeley_webcast_hBrNyhyH7rk' },
      ],
    },
    {
      title: '24. Security and Protection (cont.)',
      videos: [
        { title: 'Video 24', archiveId: 'ucberkeley_webcast_TlF4F6eZeUg' },
      ],
    },
    {
      title: '25. The Swarm, Extreme Distributed Storage, Quantum Computing',
      videos: [
        { title: 'Video 25', archiveId: 'ucberkeley_webcast_AAlJtNKU1LQ' },
      ],
    },
  ];

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
      const isCompleted = false;
      const isOpen = lessonNumber <= Math.max(completedLessons + 1, 3);
      return {
        id: `${meta.id}-lesson-${lessonNumber}`,
        title: `Lesson ${lessonNumber}: ${title}`,
        duration: `${12 + ((seed + index) % 14)}:${(10 + index * 7).toString().padStart(2, '0')}`,
        completed: isCompleted,
        locked: !isOpen,
        videoSources: {
          youtube: `https://www.youtube.com/embed/${youtubeIds[(seed + index) % youtubeIds.length]}`,
          html5: 'https://www.w3schools.com/html/mov_bbb.mp4',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs106aLessons(meta, completedLessons) {
    return cs106aMultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${10 + ((lectureIndex + videoIndex) % 16)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} videos`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs106bLessons(meta, completedLessons) {
    return cs106bMultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${40 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'html5',
        html5: video.videoUrl || '',
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: '',
          html5: videoItems[0]?.html5 || '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs106xLessons(meta, completedLessons) {
    return cs106xMultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${45 + ((lectureIndex + videoIndex) % 10)}:00`,
        sourceType: 'bilibili',
        bilibili: `https://player.bilibili.com/player.html?bvid=${video.bilibiliId}&page=${video.page}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: '',
          html5: '',
          bilibili: videoItems[0]?.bilibili || '',
        },
        captions: { en: null },
      };
    });
  }

  function buildMath18Lessons(meta, completedLessons) {
    return math18MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${30 + ((lectureIndex + videoIndex) % 20)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildEngr40mLessons(meta, completedLessons) {
    return engr40mMultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 20)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildEngr76Lessons(meta, completedLessons) {
    return engr76MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${45 + ((lectureIndex + videoIndex) % 10)}:00`,
        sourceType: 'bilibili',
        bilibili: `https://player.bilibili.com/player.html?bvid=${video.bilibiliId}&page=${video.page}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: '',
          html5: '',
          bilibili: videoItems[0]?.bilibili || '',
        },
        captions: { en: null },
      };
    });
  }

  function buildEe102Lessons(meta, completedLessons) {
    return ee102MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${45 + ((lectureIndex + videoIndex) % 10)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildMath19Lessons(meta, completedLessons) {
    return math19MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${45 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildMath20Lessons(meta, completedLessons) {
    return math20MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${45 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildMath21Lessons(meta, completedLessons) {
    return math21MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${45 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildMath51Lessons(meta, completedLessons) {
    return math51MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${45 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildMath52Lessons(meta, completedLessons) {
    return math52MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${30 + ((lectureIndex + videoIndex) % 20)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildMath53Lessons(meta, completedLessons) {
    return math53MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${30 + ((lectureIndex + videoIndex) % 20)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs103Lessons(meta, completedLessons) {
    return cs103MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);
      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${30 + ((lectureIndex + videoIndex) % 20)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCS107Lessons(meta, completedLessons) {
    return cs107MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => {
        const archiveId = video.videoId;
        const embedUrl = archiveId.startsWith('http')
          ? archiveId
          : `https://archive.org/embed/${archiveId}`;

        return {
          id: `${lessonId}-video-${videoIndex + 1}`,
          title: video.title,
          duration: `${70 + ((lectureIndex + videoIndex) % 15)}:00`,
          sourceType: 'internet_archive',
          youtube: embedUrl,
        };
      });

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCS110Lessons(meta, completedLessons) {
    return cs110MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${65 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCS294Lessons(meta, completedLessons) {
    return cs294MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCS161LessonsPlaylistA(meta, completedLessons) {
    return cs161PlaylistA_BlackboardLectures.map((topic, topicIndex) => {
      const lessonNumber = topicIndex + 1;
      const lessonId = `${meta.id}-topic-${lessonNumber}`;
      const isCompleted = false;
      const isOpen = lessonNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = topic.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${12 + ((topicIndex + videoIndex) % 8)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: topic.title,
        subtitle: topic.source,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs109Lessons(meta, completedLessons) {
    return cs109MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${60 + ((lectureIndex + videoIndex) % 20)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildPhys41Lessons(meta, completedLessons) {
    return phys41MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 10)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildPhys43Lessons(meta, completedLessons) {
    return phys43MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 10)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildBioLessons(meta, completedLessons) {
    return bioMultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: video.youtubeId.startsWith('PLACEHOLDER')
          ? ''
          : `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildChemLessons(meta, completedLessons) {
    return chemMultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: video.youtubeId.startsWith('PLACEHOLDER')
          ? ''
          : `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs221Lessons(meta, completedLessons) {
    return cs221MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs229Lessons(meta, completedLessons) {
    return cs229MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs224nLessons(meta, completedLessons) {
    return cs224nMultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs231nLessons(meta, completedLessons) {
    return cs231nMultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs234Lessons(meta, completedLessons) {
    return cs234MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs238Lessons(meta, completedLessons) {
    return cs238MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Video ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs140Lessons(meta, completedLessons) {
    return cs140MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'html5',
        html5: video.mp4Url,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: '',
          html5: videoItems[0]?.html5 || '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs143Lessons(meta, completedLessons) {
    return cs143MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://player.bilibili.com/player.html?bvid=${video.bvid}&p=${video.page}`,
      }));

      return {
        id: lessonId,
        title: `Video ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs144Lessons(meta, completedLessons) {
    return cs144MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Video ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs149Lessons(meta, completedLessons) {
    return cs149MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Video ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs154Lessons(meta, completedLessons) {
    return cs154MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${15 + ((lectureIndex + videoIndex) % 30)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs155Lessons(meta, completedLessons) {
    return cs155MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://www.youtube.com/embed/${video.youtubeId}`,
      }));

      return {
        id: lessonId,
        title: `Video ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildCs240Lessons(meta, completedLessons) {
    return cs240MultiVideoLectures.map((lecture, lectureIndex) => {
      const lectureNumber = lectureIndex + 1;
      const lessonId = `${meta.id}-lecture-${lectureNumber}`;
      const isCompleted = false;
      const isOpen = lectureNumber <= Math.max(completedLessons + 1, 3);

      const videoItems = lecture.videos.map((video, videoIndex) => ({
        id: `${lessonId}-video-${videoIndex + 1}`,
        title: video.title,
        duration: `${50 + ((lectureIndex + videoIndex) % 15)}:00`,
        sourceType: 'youtube',
        youtube: `https://archive.org/embed/${video.archiveId}`,
      }));

      return {
        id: lessonId,
        title: `Lecture ${lectureNumber}: ${lecture.title}`,
        duration: `${videoItems.length} video${videoItems.length > 1 ? 's' : ''}`,
        completed: isCompleted,
        locked: !isOpen,
        videoItems,
        activeVideoItemId: videoItems[0]?.id || '',
        videoSources: {
          youtube: videoItems[0]?.youtube || '',
          html5: '',
        },
        captions: { en: null },
      };
    });
  }

  function buildAssignments(meta, completedAssignments, seed) {
    const statuses = [
      'graded',
      'submitted',
      'not_started',
      'late',
      'not_started',
    ];
    const statusLabels = {
      graded: 'Graded',
      submitted: 'Submitted',
      not_started: 'Not Started',
      late: 'Late',
    };

    return Array.from({ length: 5 }).map((_, index) => {
      const assignmentNumber = index + 1;
      const status = statuses[index];
      const points = 15 + assignmentNumber * 5;
      const score = status === 'graded' ? Math.max(10, points - 2) : null;
      const dueDay = 10 + seed + assignmentNumber * 3;
      return {
        id: `${meta.id}-assignment-${assignmentNumber}`,
        title: `Assignment ${assignmentNumber}: ${meta.topics[index % meta.topics.length]}`,
        status,
        statusLabel: statusLabels[status],
        description: `Apply ${meta.topics[index % meta.topics.length]} concepts in ${meta.title}.`,
        points,
        score,
        dueDate: `Dec ${Math.min(dueDay, 29)}, 2024`,
        dueTime: '11:59 PM',
        type: assignmentNumber % 2 === 0 ? 'Quiz' : 'File Upload',
        action:
          score !== null
            ? 'View Details'
            : status === 'submitted'
              ? 'View Submission'
              : 'Submit',
        milestoneId: `${meta.id}-milestone-${assignmentNumber}`,
        projectKey: `${meta.id}-project-${Math.min(assignmentNumber, 2)}`,
        page: './Assignments Content/AssignmentContent.html',
      };
    });
  }

  function buildGrades(meta, assignments, scoreBase) {
    const gradedItems = assignments.filter((item) => item.score !== null);
    const earnedPoints = gradedItems.reduce((sum, item) => sum + item.score, 0);
    const totalPoints =
      gradedItems.reduce((sum, item) => sum + item.points, 0) || 1;
    const assignmentPercent = ((earnedPoints / totalPoints) * 100).toFixed(1);
    const overall = Math.max(55, Math.min(98, scoreBase));
    const classAverage = 82.5;

    return {
      stats: [
        {
          label: 'Overall Grade',
          value: `${overall.toFixed(1)}%`,
          sub: '',
          icon: 'fa-solid fa-award',
          type: 'primary',
          extra:
            overall >= 90
              ? 'A'
              : overall >= 80
                ? 'B'
                : overall >= 70
                  ? 'C'
                  : 'F',
        },
        {
          label: 'Class Average',
          value: `${classAverage}%`,
          sub: 'B',
          icon: 'fa-solid fa-bullseye',
          type: 'standard',
        },
        {
          label: 'vs Class Avg',
          value: `${(overall - classAverage).toFixed(1)}%`,
          sub: overall >= classAverage ? 'Above average' : 'Below average',
          icon:
            overall >= classAverage
              ? 'fa-solid fa-arrow-trend-up'
              : 'fa-solid fa-arrow-trend-down',
          type: 'standard',
          color: overall >= classAverage ? 'green' : 'red',
        },
        {
          label: 'Graded Items',
          value: `${gradedItems.length}/8`,
          sub: 'Completed',
          icon: 'fa-regular fa-circle-check',
          type: 'standard',
        },
      ],
      breakdown: [
        {
          category: 'Assignments',
          score: `${earnedPoints}/${totalPoints}`,
          percent: `${assignmentPercent}%`,
          weight: '40% of final grade',
          change: `+${(Number(assignmentPercent) * 0.4).toFixed(1)}% total`,
          color: '#f59e0b',
        },
        {
          category: 'Projects',
          score: '0/0',
          percent: '0.0%',
          weight: '30% of final grade',
          change: '+0.0% total',
          color: '#374151',
        },
        {
          category: 'Quizzes',
          score: '54/60',
          percent: '90.0%',
          weight: '20% of final grade',
          change: '+18.0% total',
          color: '#10b981',
        },
        {
          category: 'Participation',
          score: '9/10',
          percent: '90.0%',
          weight: '10% of final grade',
          change: '+9.0% total',
          color: '#10b981',
        },
      ],
      grades: [
        ...assignments.map((item) => ({
          title: item.title,
          type: item.type.toLowerCase().includes('quiz')
            ? 'quiz'
            : 'assignment',
          date: `Due: ${item.dueDate}`,
          score: item.score !== null ? `${item.score}/${item.points}` : null,
          percent:
            item.score !== null
              ? `${((item.score / item.points) * 100).toFixed(1)}%`
              : null,
          status:
            item.score !== null
              ? 'Graded'
              : item.status === 'late'
                ? 'Late Submission'
                : 'Pending',
        })),
        {
          title: `Project: ${meta.title} Applied Build`,
          type: 'project',
          date: 'Due: Jan 15, 2025',
          score: null,
          percent: null,
          status: 'Pending',
        },
      ],
      scale: gradeScale,
      weights: gradeWeights,
    };
  }

  function buildCourse(meta, index) {
    const progressPercent = toPercent(meta.progress, 50);
    const lectureCountMap = {
      'cs106a-programming-methodology': cs106aMultiVideoLectures.length,
      'cs106b-programming-abstractions': cs106bMultiVideoLectures.length,
      'cs106x-programming-abstractions-accelerated':
        cs106xMultiVideoLectures.length,
      'math-18-foundations-for-calculus': math18MultiVideoLectures.length,
      'math-19-calculus-i': math19MultiVideoLectures.length,
      'math-20-calculus-ii': math20MultiVideoLectures.length,
      'math-21-calculus-iii-calculus-with-infinite-processes':
        math21MultiVideoLectures.length,
      'math-51-linear-algebra-multivariable-calculus-optimization':
        math51MultiVideoLectures.length,
      'math-52-multivariable-integration-ordinary-differential-equations':
        math52MultiVideoLectures.length,
      'math-53-differential-calculus-of-several-variables':
        math53MultiVideoLectures.length,
      'cs-103-mathematical-foundations-of-computing':
        cs103MultiVideoLectures.length,
      'cs-107-computer-organization-systems': cs107MultiVideoLectures.length,
      'cs-110-principles-of-computer-systems-operating-systems-principles':
        cs110MultiVideoLectures.length,
      'cs-161-design-analysis-of-algorithms':
        cs161PlaylistA_BlackboardLectures.length,
      'cs-294-research-project-in-computer-science':
        cs294MultiVideoLectures.length,
      'cs-109-probability-for-computer-scientists-theory-of-probability':
        cs109MultiVideoLectures.length,
      'engr-40m-making-integrated-engineering':
        engr40mMultiVideoLectures.length,
      'engr-76-information-science-engineering':
        engr76MultiVideoLectures.length,
      'ee-102-introduction-to-signals-systems': ee102MultiVideoLectures.length,
      'phys-41-introductory-mechanics-course-classical-mechanics':
        phys41MultiVideoLectures.length,
      'phys-43-electricity-and-magnetism': phys43MultiVideoLectures.length,
      'bio-biology': bioMultiVideoLectures.length,
      'chem-chemistry': chemMultiVideoLectures.length,
      'cs-221-artificial-intelligence-principles-and-techniques':
        cs221MultiVideoLectures.length,
      'cs-229-machine-learning': cs229MultiVideoLectures.length,
      'cs-224n-natural-language-processing-with-deep-learning':
        cs224nMultiVideoLectures.length,
      'cs-231n-deep-learning-for-computer-vision':
        cs231nMultiVideoLectures.length,
      'cs-234-reinforcement-learning': cs234MultiVideoLectures.length,
      'cs-238-decision-making-under-uncertainty':
        cs238MultiVideoLectures.length,
      'cs-140-operating-systems-systems-programming':
        cs140MultiVideoLectures.length,
      'cs-143-compilers': cs143MultiVideoLectures.length,
      'cs-144-introduction-to-computer-networking':
        cs144MultiVideoLectures.length,
      'cs-149-parallel-computing': cs149MultiVideoLectures.length,
      'cs-154-introduction-to-automata-and-complexity-theory':
        cs154MultiVideoLectures.length,
      'cs-155-computer-and-network-security': cs155MultiVideoLectures.length,
      'cs-240-adv-topics-in-operating-systems': cs240MultiVideoLectures.length,
    };
    const lectureCount = lectureCountMap[meta.id] || 8;
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
    const lessons =
      meta.id === 'cs106a-programming-methodology'
        ? buildCs106aLessons(meta, completedLectures)
        : meta.id === 'cs106b-programming-abstractions'
          ? buildCs106bLessons(meta, completedLectures)
          : meta.id === 'cs106x-programming-abstractions-accelerated'
            ? buildCs106xLessons(meta, completedLectures)
            : meta.id === 'math-18-foundations-for-calculus'
              ? buildMath18Lessons(meta, completedLectures)
              : meta.id === 'math-19-calculus-i'
                ? buildMath19Lessons(meta, completedLectures)
                : meta.id === 'math-20-calculus-ii'
                  ? buildMath20Lessons(meta, completedLectures)
                  : meta.id ===
                      'math-21-calculus-iii-calculus-with-infinite-processes'
                    ? buildMath21Lessons(meta, completedLectures)
                    : meta.id ===
                        'math-51-linear-algebra-multivariable-calculus-optimization'
                      ? buildMath51Lessons(meta, completedLectures)
                      : meta.id ===
                          'math-52-multivariable-integration-ordinary-differential-equations'
                        ? buildMath52Lessons(meta, completedLectures)
                        : meta.id ===
                            'math-53-differential-calculus-of-several-variables'
                          ? buildMath53Lessons(meta, completedLectures)
                          : meta.id ===
                              'cs-103-mathematical-foundations-of-computing'
                            ? buildCs103Lessons(meta, completedLectures)
                            : meta.id === 'cs-107-computer-organization-systems'
                              ? buildCS107Lessons(meta, completedLectures)
                              : meta.id ===
                                  'cs-110-principles-of-computer-systems-operating-systems-principles'
                                ? buildCS110Lessons(meta, completedLectures)
                                : meta.id ===
                                    'cs-294-research-project-in-computer-science'
                                  ? buildCS294Lessons(meta, completedLectures)
                                  : meta.id ===
                                      'cs-161-design-analysis-of-algorithms'
                                    ? buildCS161LessonsPlaylistA(
                                        meta,
                                        completedLectures,
                                      )
                                    : meta.id ===
                                        'cs-109-probability-for-computer-scientists-theory-of-probability'
                                      ? buildCs109Lessons(
                                          meta,
                                          completedLectures,
                                        )
                                      : meta.id ===
                                          'engr-40m-making-integrated-engineering'
                                        ? buildEngr40mLessons(
                                            meta,
                                            completedLectures,
                                          )
                                        : meta.id ===
                                            'engr-76-information-science-engineering'
                                          ? buildEngr76Lessons(
                                              meta,
                                              completedLectures,
                                            )
                                          : meta.id ===
                                              'ee-102-introduction-to-signals-systems'
                                            ? buildEe102Lessons(
                                                meta,
                                                completedLectures,
                                              )
                                            : meta.id ===
                                                'phys-41-introductory-mechanics-course-classical-mechanics'
                                              ? buildPhys41Lessons(
                                                  meta,
                                                  completedLectures,
                                                )
                                              : meta.id ===
                                                  'phys-43-electricity-and-magnetism'
                                                ? buildPhys43Lessons(
                                                    meta,
                                                    completedLectures,
                                                  )
                                                : meta.id === 'bio-biology'
                                                  ? buildBioLessons(
                                                      meta,
                                                      completedLectures,
                                                    )
                                                  : meta.id === 'chem-chemistry'
                                                    ? buildChemLessons(
                                                        meta,
                                                        completedLectures,
                                                      )
                                                    : meta.id ===
                                                        'cs-221-artificial-intelligence-principles-and-techniques'
                                                      ? buildCs221Lessons(
                                                          meta,
                                                          completedLectures,
                                                        )
                                                      : meta.id ===
                                                          'cs-229-machine-learning'
                                                        ? buildCs229Lessons(
                                                            meta,
                                                            completedLectures,
                                                          )
                                                        : meta.id ===
                                                            'cs-224n-natural-language-processing-with-deep-learning'
                                                          ? buildCs224nLessons(
                                                              meta,
                                                              completedLectures,
                                                            )
                                                          : meta.id ===
                                                              'cs-231n-deep-learning-for-computer-vision'
                                                            ? buildCs231nLessons(
                                                                meta,
                                                                completedLectures,
                                                              )
                                                            : meta.id ===
                                                                'cs-234-reinforcement-learning'
                                                              ? buildCs234Lessons(
                                                                  meta,
                                                                  completedLectures,
                                                                )
                                                              : meta.id ===
                                                                  'cs-238-decision-making-under-uncertainty'
                                                                ? buildCs238Lessons(
                                                                    meta,
                                                                    completedLectures,
                                                                  )
                                                                : meta.id ===
                                                                    'cs-140-operating-systems-systems-programming'
                                                                  ? buildCs140Lessons(
                                                                      meta,
                                                                      completedLectures,
                                                                    )
                                                                  : meta.id ===
                                                                      'cs-143-compilers'
                                                                    ? buildCs143Lessons(
                                                                        meta,
                                                                        completedLectures,
                                                                      )
                                                                    : meta.id ===
                                                                        'cs-144-introduction-to-computer-networking'
                                                                      ? buildCs144Lessons(
                                                                          meta,
                                                                          completedLectures,
                                                                        )
                                                                      : meta.id ===
                                                                          'cs-149-parallel-computing'
                                                                        ? buildCs149Lessons(
                                                                            meta,
                                                                            completedLectures,
                                                                          )
                                                                        : meta.id ===
                                                                            'cs-154-introduction-to-automata-and-complexity-theory'
                                                                          ? buildCs154Lessons(
                                                                              meta,
                                                                              completedLectures,
                                                                            )
                                                                          : meta.id ===
                                                                              'cs-155-computer-and-network-security'
                                                                            ? buildCs155Lessons(
                                                                                meta,
                                                                                completedLectures,
                                                                              )
                                                                            : meta.id ===
                                                                                'cs-240-adv-topics-in-operating-systems'
                                                                              ? buildCs240Lessons(
                                                                                  meta,
                                                                                  completedLectures,
                                                                                )
                                                                              : buildLessons(
                                                                                  meta,
                                                                                  completedLectures,
                                                                                  index,
                                                                                );
    const currentLessonId = lessons[0]?.id || '';

    return {
      id: meta.id,
      code: meta.code,
      title: meta.title,
      level: meta.level,
      category: meta.category,
      instructor: meta.instructor,
      overview: {
        code: meta.code,
        title: `${meta.title} Fundamentals`,
        description: `Learn ${meta.title} through guided modules, real practice, and continuous feedback focused on ${meta.topics.join(', ')}.`,
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
          `Communicate technical decisions clearly and professionally`,
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
            title: `Core Concepts`,
            tags: [meta.topics[1], 'Practice'],
            activity: 'Skill Check',
            status: 'completed',
          },
          {
            week: 3,
            title: `Applied Workflows`,
            tags: [meta.topics[2], 'Case Study'],
            activity: 'Workshop',
            status: 'completed',
          },
          {
            week: 4,
            title: `Intermediate Implementation`,
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
            `Document design choices and assumptions`,
            `Include tests/examples to validate behavior`,
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

  const remoteCourseState = {
    loadingPromise: null,
    byLocalId: null,
    unresolved: [],
  };

  const remoteAssignmentsState = {};
  const emittedMappingWarnings = new Set();

  function normalizeText(value) {
    if (typeof value !== 'string') return '';
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function normalizeIdentifierValue(value) {
    if (value == null) return '';
    return String(value).trim();
  }

  function normalizeIdentifierToken(value) {
    return normalizeText(normalizeIdentifierValue(value));
  }

  function firstNonEmptyIdentifier(...values) {
    for (const candidate of values) {
      const normalized = normalizeIdentifierValue(candidate);
      if (normalized) return normalized;
    }
    return '';
  }

  function emitCourseMappingWarning(key, message) {
    if (!key || !message || emittedMappingWarnings.has(key)) return;
    emittedMappingWarnings.add(key);
    console.warn(`[NibrasCourses] ${message}`);
  }

  function buildMissingCourseMappingMessage(localCourseId, mappingType) {
    const localId = String(localCourseId || DEFAULT_COURSE_ID);
    if (mappingType === 'tracking') {
      return `Missing tracking course ID mapping for "${localId}". Falling back to local ID for tracking API calls.`;
    }
    return `Missing admin/backend course ID mapping for "${localId}". Remote course hydration is unavailable for this course.`;
  }

  function getRuntimeCourseIdOverrides() {
    const raw = window.NIBRAS_COURSE_ID_MAP || window.NIBRAS_COURSE_IDENTIFIERS;
    return raw && typeof raw === 'object' ? raw : {};
  }

  function getMetaByCourseId(localCourseId) {
    return coursesMeta.find((meta) => meta.id === localCourseId) || null;
  }

  function collectAliases(values, sink) {
    if (!Array.isArray(values)) return;
    values.forEach((item) => {
      const alias = normalizeIdentifierValue(item);
      if (alias) sink.push(alias);
    });
  }

  function getConfiguredCourseIdentifiers(localCourseId) {
    const localId = String(localCourseId || '');
    const meta = getMetaByCourseId(localId);
    const overrides = getRuntimeCourseIdOverrides();
    const overrideEntry =
      overrides?.[localId] && typeof overrides[localId] === 'object'
        ? overrides[localId]
        : {};
    const metaIdentifiers =
      meta?.identifiers && typeof meta.identifiers === 'object'
        ? meta.identifiers
        : {};
    const aliases = [];

    collectAliases(overrideEntry.aliases, aliases);
    collectAliases(overrideEntry.localAliases, aliases);
    collectAliases(metaIdentifiers.aliases, aliases);
    collectAliases(meta?.localAliases, aliases);

    return {
      trackingCourseId: firstNonEmptyIdentifier(
        overrideEntry.trackingCourseId,
        overrideEntry.trackingId,
        overrideEntry.tracking_course_id,
        meta?.trackingCourseId,
        metaIdentifiers.trackingCourseId,
      ),
      adminCourseId: firstNonEmptyIdentifier(
        overrideEntry.adminCourseId,
        overrideEntry.remoteCourseId,
        overrideEntry.admin_course_id,
        meta?.adminCourseId,
        metaIdentifiers.adminCourseId,
      ),
      backendCourseId: firstNonEmptyIdentifier(
        overrideEntry.backendCourseId,
        overrideEntry.backendId,
        overrideEntry.backend_course_id,
        meta?.backendCourseId,
        metaIdentifiers.backendCourseId,
      ),
      aliases,
    };
  }

  function registerIndexEntry(index, token, localId) {
    if (!token || !localId) return;
    if (!Object.prototype.hasOwnProperty.call(index, token)) {
      index[token] = localId;
      return;
    }
    if (index[token] !== localId) {
      index[token] = null;
    }
  }

  function resolveIndexEntry(index, token) {
    if (!token) return null;
    const found = index[token];
    return typeof found === 'string' && found ? found : null;
  }

  function buildLocalCourseLookupIndex() {
    const index = {
      byLocalAlias: {},
      byCode: {},
      byTitle: {},
      byAdminId: {},
      byTrackingId: {},
    };

    coursesMeta.forEach((meta) => {
      const localId = String(meta.id || '');
      if (!localId) return;
      const configured = getConfiguredCourseIdentifiers(localId);

      registerIndexEntry(
        index.byLocalAlias,
        normalizeIdentifierToken(localId),
        localId,
      );
      registerIndexEntry(
        index.byCode,
        normalizeIdentifierToken(meta.code),
        localId,
      );
      registerIndexEntry(
        index.byTitle,
        normalizeIdentifierToken(meta.title),
        localId,
      );
      registerIndexEntry(
        index.byAdminId,
        normalizeIdentifierToken(configured.adminCourseId),
        localId,
      );
      registerIndexEntry(
        index.byAdminId,
        normalizeIdentifierToken(configured.backendCourseId),
        localId,
      );
      registerIndexEntry(
        index.byTrackingId,
        normalizeIdentifierToken(configured.trackingCourseId),
        localId,
      );

      configured.aliases.forEach((alias) => {
        registerIndexEntry(
          index.byLocalAlias,
          normalizeIdentifierToken(alias),
          localId,
        );
      });
    });

    return index;
  }

  function resolveLocalCourseIdFromRemote(remoteCourse, lookupIndex) {
    const localAliasCandidates = [
      remoteCourse?.localCourseId,
      remoteCourse?.localId,
      remoteCourse?.courseSlug,
      remoteCourse?.slug,
      remoteCourse?.courseKey,
      remoteCourse?.courseAlias,
    ];
    for (const candidate of localAliasCandidates) {
      const localId = resolveIndexEntry(
        lookupIndex.byLocalAlias,
        normalizeIdentifierToken(candidate),
      );
      if (localId) return { localId, source: 'explicit-local-alias' };
    }

    const adminIdCandidates = [
      remoteCourse?._id,
      remoteCourse?.adminCourseId,
      remoteCourse?.backendCourseId,
      remoteCourse?.id,
      remoteCourse?.courseId,
    ];
    for (const candidate of adminIdCandidates) {
      const localId = resolveIndexEntry(
        lookupIndex.byAdminId,
        normalizeIdentifierToken(candidate),
      );
      if (localId) return { localId, source: 'explicit-admin-id' };
    }

    const trackingIdCandidates = [
      remoteCourse?.trackingCourseId,
      remoteCourse?.trackingId,
      remoteCourse?.tracking?.courseId,
    ];
    for (const candidate of trackingIdCandidates) {
      const localId = resolveIndexEntry(
        lookupIndex.byTrackingId,
        normalizeIdentifierToken(candidate),
      );
      if (localId) return { localId, source: 'explicit-tracking-id' };
    }

    const localIdByCode = resolveIndexEntry(
      lookupIndex.byCode,
      normalizeIdentifierToken(remoteCourse?.code || remoteCourse?.courseCode),
    );
    if (localIdByCode)
      return { localId: localIdByCode, source: 'exact-code-match' };

    const localIdByTitle = resolveIndexEntry(
      lookupIndex.byTitle,
      normalizeIdentifierToken(remoteCourse?.title),
    );
    if (localIdByTitle)
      return { localId: localIdByTitle, source: 'exact-title-match' };

    return { localId: null, source: 'unresolved' };
  }

  function resolveRemoteTrackingCourseId(remoteCourse) {
    return firstNonEmptyIdentifier(
      remoteCourse?.trackingCourseId,
      remoteCourse?.trackingId,
      remoteCourse?.tracking?.courseId,
      remoteCourse?.courseTrackingId,
    );
  }

  function formatDisplayDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'TBD';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function unwrapApiData(payload) {
    if (payload == null) return null;
    if (typeof payload !== 'object') return payload;
    if (Object.prototype.hasOwnProperty.call(payload, 'data'))
      return payload.data;
    return payload;
  }

  function getAdminBaseUrl() {
    return (
      window.NibrasShared?.resolveServiceUrl?.('admin') ||
      window.NibrasApi?.resolveServiceUrl?.('admin') ||
      window.NibrasApiConfig?.getServiceUrl?.('admin') ||
      window.NIBRAS_API_URL ||
      window.NIBRAS_BACKEND_URL ||
      (/^https?:/i.test(window.location?.origin || '')
        ? window.location.origin.replace(/\/+$/, '')
        : '')
    );
  }

  function getTrackingBaseUrl() {
    return (
      window.NibrasShared?.resolveServiceUrl?.('tracking') ||
      window.NibrasApi?.resolveServiceUrl?.('tracking') ||
      window.NibrasApiConfig?.getServiceUrl?.('tracking') ||
      window.NIBRAS_TRACKING_API_URL ||
      window.NIBRAS_API_URL ||
      (/^https?:/i.test(window.location?.origin || '')
        ? window.location.origin.replace(/\/+$/, '')
        : '')
    );
  }

  async function trackApiFetch(path) {
    const shared = window.NibrasShared;
    if (shared && typeof shared.apiFetch === 'function') {
      return shared.apiFetch(path, { service: 'tracking' });
    }

    const token =
      shared?.auth?.getToken?.() || window.NibrasApi?.getToken?.() || null;
    const headers = shared?.auth?.buildAuthHeaders
      ? shared.auth.buildAuthHeaders(
          { 'Content-Type': 'application/json' },
          { token },
        )
      : window.NibrasApi?.buildAuthHeaders?.(
          { 'Content-Type': 'application/json' },
          { token },
        ) || { 'Content-Type': 'application/json' };
    const response = await fetch(`${getTrackingBaseUrl()}${path}`, {
      headers,
    });

    const payload = await response.json();
    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        `Request failed (${response.status})`;
      throw new Error(message);
    }
    return payload;
  }

  async function adminApiFetch(path) {
    const shared = window.NibrasShared;
    if (shared && typeof shared.apiFetch === 'function') {
      return shared.apiFetch(path, { service: 'admin' });
    }

    const token =
      shared?.auth?.getToken?.() || window.NibrasApi?.getToken?.() || null;
    const headers = shared?.auth?.buildAuthHeaders
      ? shared.auth.buildAuthHeaders(
          { 'Content-Type': 'application/json' },
          { token },
        )
      : window.NibrasApi?.buildAuthHeaders?.(
          { 'Content-Type': 'application/json' },
          { token },
        ) || { 'Content-Type': 'application/json' };
    const response = await fetch(`${getAdminBaseUrl()}${path}`, {
      headers,
    });
    const payload = await response.json();
    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        `Request failed (${response.status})`;
      throw new Error(message);
    }
    return payload;
  }

  function parseArrayPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  }

  async function loadRemoteCourseMap() {
    if (remoteCourseState.byLocalId) return remoteCourseState.byLocalId;
    if (remoteCourseState.loadingPromise)
      return remoteCourseState.loadingPromise;

    const processCourses = (remoteList) => {
      const lookupIndex = buildLocalCourseLookupIndex();
      const byLocalId = {};
      const unresolved = [];

      remoteList.forEach((remoteCourse) => {
        const mapping = resolveLocalCourseIdFromRemote(
          remoteCourse,
          lookupIndex,
        );
        const localId = mapping.localId;
        if (!localId) {
          unresolved.push({
            title: remoteCourse?.title || '',
            remoteId: remoteCourse?._id || remoteCourse?.id || '',
          });
          return;
        }
        if (byLocalId[localId]) {
          emitCourseMappingWarning(
            `duplicate-remote-course:${localId}`,
            `Multiple remote courses mapped to "${localId}". Keeping first deterministic match and ignoring duplicates.`,
          );
          return;
        }

        byLocalId[localId] = {
          remoteId: remoteCourse?._id || null,
          adminCourseId: remoteCourse?._id || null,
          backendCourseId: remoteCourse?.backendCourseId || null,
          trackingCourseId: resolveRemoteTrackingCourseId(remoteCourse) || '',
          title: remoteCourse?.title || '',
          description: remoteCourse?.description || '',
          instructorName: remoteCourse?.instructor?.name || '',
          sections: Array.isArray(remoteCourse?.sections)
            ? remoteCourse.sections
            : [],
          mappingSource: mapping.source,
        };
      });

      remoteCourseState.byLocalId = byLocalId;
      remoteCourseState.unresolved = unresolved;
      if (unresolved.length) {
        const preview = unresolved
          .slice(0, 3)
          .map((item) => item.title || item.remoteId || 'unknown-course')
          .join(', ');
        emitCourseMappingWarning(
          'unresolved-admin-courses',
          `Could not map ${unresolved.length} admin course(s) to local IDs. Configure window.NIBRAS_COURSE_ID_MAP to map them explicitly. Examples: ${preview}.`,
        );
      }
      return byLocalId;
    };

    // Use Nibras-Backend (Railway) instead of tracking service
    const backendCoursesService = window.NibrasServices?.backendCoursesService;

    if (
      backendCoursesService &&
      typeof backendCoursesService.list === 'function'
    ) {
      console.log(
        '[NibrasCourses] Loading courses from Nibras-Backend (Railway)',
      );
      remoteCourseState.loadingPromise = backendCoursesService
        .list({ page: 1, limit: 100 })
        .then((payload) => {
          const data = unwrapApiData(payload);
          const remoteList = Array.isArray(data)
            ? data
            : Array.isArray(data?.courses)
              ? data.courses
              : [];
          return processCourses(remoteList);
        })
        .catch((error) => {
          console.warn(
            '[NibrasCourses] Failed to load from Nibras-Backend, falling back to tracking:',
            error?.message || error,
          );
          return trackApiFetch('/v1/tracking/courses?page=1&limit=100').then(
            (payload) => processCourses(parseArrayPayload(payload)),
          );
        })
        .finally(() => {
          remoteCourseState.loadingPromise = null;
        });
    } else {
      console.warn(
        '[NibrasCourses] backendCoursesService not available, using tracking service',
      );
      remoteCourseState.loadingPromise = trackApiFetch(
        '/v1/tracking/courses?page=1&limit=100',
      )
        .then((payload) => processCourses(parseArrayPayload(payload)))
        .catch((error) => {
          console.warn(
            '[NibrasCourses] Failed to load remote courses:',
            error?.message || error,
          );
          remoteCourseState.byLocalId = {};
          remoteCourseState.unresolved = [];
          return remoteCourseState.byLocalId;
        })
        .finally(() => {
          remoteCourseState.loadingPromise = null;
        });
    }

    return remoteCourseState.loadingPromise;
  }

  async function getAdminCoursesList() {
    const localCourses = getAllCoursesList();
    const remoteByLocalId = await loadRemoteCourseMap();

    return localCourses.map((course) => {
      if (course.type !== 'standard') return course;
      const remote = remoteByLocalId[course.id];
      const merged = !remote
        ? course
        : {
            ...course,
            title: remote.title || course.title,
            instructor: remote.instructorName || course.instructor,
            remoteCourseId: remote.remoteId || null,
          };
      const identifiers = resolveCourseIdentifiers(merged.id);
      if (!identifiers) return merged;
      return {
        ...merged,
        trackingCourseId: identifiers.trackingCourseId,
        trackingCourseIdForApi: identifiers.trackingCourseIdForApi,
        adminCourseId: identifiers.adminCourseId,
        backendCourseId: identifiers.backendCourseId,
        remoteCourseId:
          identifiers.adminCourseId || merged.remoteCourseId || null,
      };
    });
  }

  function resolveCourseIdentifiers(courseOrId, options = {}) {
    const requestedId =
      typeof courseOrId === 'string' ? courseOrId : courseOrId?.id;
    const localCourseId = isValidCourseId(requestedId)
      ? String(requestedId)
      : '';
    if (!localCourseId) return null;

    const resolvedCourse =
      typeof courseOrId === 'object' && courseOrId
        ? courseOrId
        : coursesById[localCourseId];
    const configured = getConfiguredCourseIdentifiers(localCourseId);
    const remote = remoteCourseState.byLocalId?.[localCourseId];

    let trackingFromStorage = '';
    try {
      trackingFromStorage = normalizeIdentifierValue(
        localStorage.getItem(TRACKING_COURSE_KEY),
      );
    } catch (_error) {
      trackingFromStorage = '';
    }
    const trackingCourseId = firstNonEmptyIdentifier(
      resolvedCourse?.trackingCourseId,
      resolvedCourse?.tracking?.courseId,
      resolvedCourse?.apiCourseId,
      configured.trackingCourseId,
      remote?.trackingCourseId,
      trackingFromStorage,
    );

    const adminCourseId = firstNonEmptyIdentifier(
      resolvedCourse?.adminCourseId,
      resolvedCourse?.remoteCourseId,
      configured.adminCourseId,
      remote?.adminCourseId,
      remote?.remoteId,
    );
    const backendCourseId = firstNonEmptyIdentifier(
      resolvedCourse?.backendCourseId,
      configured.backendCourseId,
      remote?.backendCourseId,
      adminCourseId,
    );

    const trackingCourseIdForApi = trackingCourseId || localCourseId;
    const messages = {
      tracking: trackingCourseId
        ? ''
        : buildMissingCourseMappingMessage(localCourseId, 'tracking'),
      admin: adminCourseId
        ? ''
        : buildMissingCourseMappingMessage(localCourseId, 'admin'),
    };

    if (options.warnOnMissing && messages.tracking) {
      emitCourseMappingWarning(
        `missing-tracking:${localCourseId}`,
        messages.tracking,
      );
    }
    if (options.warnOnMissing && messages.admin) {
      emitCourseMappingWarning(
        `missing-admin:${localCourseId}`,
        messages.admin,
      );
    }

    return {
      localCourseId,
      trackingCourseId,
      trackingCourseIdForApi,
      adminCourseId,
      backendCourseId,
      hasTrackingMapping: Boolean(trackingCourseId),
      hasAdminMapping: Boolean(adminCourseId),
      messages,
    };
  }

  async function resolveCourseIdentifiersAsync(courseOrId, options = {}) {
    if (options.loadRemote !== false) {
      await loadRemoteCourseMap();
    }
    return resolveCourseIdentifiers(courseOrId, options);
  }

  function enrichCourseWithIdentifiers(course) {
    if (!course || typeof course !== 'object' || !isValidCourseId(course.id))
      return course;
    if (course.type === 'practice_lab') return course;
    const identifiers = resolveCourseIdentifiers(course.id);
    if (!identifiers) return course;
    return {
      ...course,
      trackingCourseId: identifiers.trackingCourseId,
      trackingCourseIdForApi: identifiers.trackingCourseIdForApi,
      adminCourseId: identifiers.adminCourseId,
      backendCourseId: identifiers.backendCourseId,
      remoteCourseId:
        identifiers.adminCourseId || course.remoteCourseId || null,
    };
  }

  function normalizeAssignmentItem(item, index, localCourseId) {
    const pointsRaw = Number(
      item?.maxScore ?? item?.points ?? item?.totalPoints ?? 100,
    );
    const points =
      Number.isFinite(pointsRaw) && pointsRaw > 0 ? pointsRaw : 100;
    const scoreRaw = Number(item?.score ?? item?.grade ?? item?.earnedScore);
    const score = Number.isFinite(scoreRaw)
      ? Math.max(0, Math.min(points, scoreRaw))
      : null;
    const status =
      score !== null
        ? 'graded'
        : item?.submittedAt
          ? 'submitted'
          : 'not_started';
    const statusLabel =
      status === 'graded'
        ? 'Graded'
        : status === 'submitted'
          ? 'Submitted'
          : 'Not Started';
    const scopedCourseId = normalizeIdentifierValue(localCourseId) || 'course';
    const fallbackAssignmentId = `${scopedCourseId}-assignment-${index + 1}`;
    const assignmentId = String(item?._id || item?.id || fallbackAssignmentId);
    const milestoneId = String(
      item?.milestoneId ||
        item?.milestone_id ||
        item?._id ||
        `${scopedCourseId}-milestone-${index + 1}`,
    );
    const projectKey = String(
      item?.projectKey || item?.project_id || `${scopedCourseId}-project-1`,
    );

    return {
      id: assignmentId,
      backendAssignmentId: item?._id || null,
      title: item?.title || `Assignment ${index + 1}`,
      status,
      statusLabel,
      description: item?.description || 'No description provided.',
      points,
      score,
      dueDate: formatDisplayDate(item?.dueDate),
      dueTime: '11:59 PM',
      type: 'File Upload',
      action: score !== null ? 'View Details' : 'Submit',
      milestoneId,
      projectKey,
      page: './Assignments Content/AssignmentContent.html',
    };
  }

  function toAssignmentDetail(assignment, selectedCourse) {
    return {
      title: assignment.title,
      points: assignment.points,
      scoreEarned: assignment.score ?? 0,
      description: assignment.description,
      dueDate: assignment.dueDate,
      dueTime: assignment.dueTime,
      submissionType: assignment.type,
      milestoneId: assignment.milestoneId,
      projectKey: assignment.projectKey,
      instructions: {
        intro: `Complete this assignment for ${selectedCourse.title}.`,
        points: [
          'Follow all assignment requirements listed above.',
          'Submit clear and well-structured work.',
          'Include notes for important design decisions.',
        ],
      },
      files: [],
      rubric: [
        { criteria: 'Correctness', percent: '50%' },
        { criteria: 'Code Quality', percent: '30%' },
        { criteria: 'Documentation', percent: '20%' },
      ],
      feedback: {
        comment:
          assignment.score !== null
            ? 'Graded successfully.'
            : 'No feedback yet.',
        grader: selectedCourse.instructor,
        date: 'Pending',
      },
    };
  }

  async function getAdminAssignmentsByCourseId(localCourseId) {
    const normalizedLocalCourseId = isValidCourseId(localCourseId)
      ? String(localCourseId)
      : '';
    if (!normalizedLocalCourseId) return null;
    const selectedCourse = getCourseById(normalizedLocalCourseId);
    if (!selectedCourse) return null;

    const remoteByLocalId = await loadRemoteCourseMap();
    const identifiers = resolveCourseIdentifiers(normalizedLocalCourseId, {
      warnOnMissing: true,
    });
    const remoteCourseId = firstNonEmptyIdentifier(
      remoteByLocalId?.[normalizedLocalCourseId]?.remoteId,
      identifiers?.adminCourseId,
      identifiers?.backendCourseId,
    );
    if (!remoteCourseId) {
      const message =
        identifiers?.messages?.admin ||
        buildMissingCourseMappingMessage(normalizedLocalCourseId, 'admin');
      emitCourseMappingWarning(
        `missing-admin-assignments:${normalizedLocalCourseId}`,
        message,
      );
      const mappingError = new Error(message);
      mappingError.code = 'COURSE_ID_MAPPING_MISSING';
      throw mappingError;
    }

    if (remoteAssignmentsState[remoteCourseId]) {
      return remoteAssignmentsState[remoteCourseId];
    }

    try {
      const payload = await adminApiFetch(
        `/assignments/course/${encodeURIComponent(remoteCourseId)}?page=1&limit=50`,
      );
      const rawItems = parseArrayPayload(payload);
      if (!rawItems.length) return null;

      const items = rawItems.map((item, index) =>
        normalizeAssignmentItem(item, index, normalizedLocalCourseId),
      );
      const gradedItems = items.filter((item) => item.status === 'graded');
      const stats = {
        completed: gradedItems.length,
        total: items.length,
        pointsEarned: gradedItems.reduce(
          (sum, item) => sum + (item.score || 0),
          0,
        ),
        pointsTotal: items.reduce((sum, item) => sum + item.points, 0),
        progressPercent: items.length
          ? Math.round((gradedItems.length / items.length) * 100)
          : 0,
      };

      const result = {
        stats,
        items,
        assignmentDetail: toAssignmentDetail(items[0], selectedCourse),
      };
      remoteAssignmentsState[remoteCourseId] = result;
      return result;
    } catch (error) {
      console.warn(
        '[NibrasCourses] Failed to load remote assignments:',
        error?.message || error,
      );
      return null;
    }
  }

  async function getAdminCourseByLocalId(localCourseId) {
    const remoteByLocalId = await loadRemoteCourseMap();
    const normalizedLocalCourseId = isValidCourseId(localCourseId)
      ? String(localCourseId)
      : '';
    const remoteCourse = remoteByLocalId?.[normalizedLocalCourseId] || null;
    if (!remoteCourse && normalizedLocalCourseId) {
      emitCourseMappingWarning(
        `missing-admin-overview:${normalizedLocalCourseId}`,
        buildMissingCourseMappingMessage(normalizedLocalCourseId, 'admin'),
      );
    }
    return remoteCourse;
  }

  function getPracticeLabCourse() {
    return {
      id: PRACTICE_LAB_COURSE_ID,
      title: 'Practice Labs',
      instructor: 'Competitive Programming • Adaptive Level',
      progress: null,
      rating: null,
      level: null,
      deadline: '5-10 problems per lab',
      isPopular: true,
      isPractice: true,
      category: 'comp_prog',
      type: 'practice_lab',
      features: [
        'Topic-based problem sets',
        'AI hints & mistake analysis',
        'Contest simulation mode',
      ],
      page: '../Competitions/Practice/practice.html',
    };
  }

  function getAllCoursesList() {
    const standardCourses = coursesMeta.map((meta) => {
      const identifiers = resolveCourseIdentifiers(meta.id);
      return {
        id: meta.id,
        title: meta.title,
        instructor: meta.instructor,
        progress: meta.progress,
        rating: meta.rating,
        level: meta.level,
        deadline: meta.deadline,
        isPopular: meta.isPopular,
        category: meta.category,
        type: 'standard',
        trackingCourseId: identifiers?.trackingCourseId || '',
        trackingCourseIdForApi: identifiers?.trackingCourseIdForApi || meta.id,
        adminCourseId: identifiers?.adminCourseId || '',
        backendCourseId: identifiers?.backendCourseId || '',
        remoteCourseId: identifiers?.adminCourseId || null,
      };
    });

    return [...standardCourses, getPracticeLabCourse()];
  }

  function getCoursesList() {
    return getAllCoursesList().filter(
      (course) => course.type === 'practice_lab' || course.level === 'Beginner',
    );
  }

  function getIntermediateCoursesList() {
    return getAllCoursesList().filter(
      (course) => course.level === 'Intermediate',
    );
  }

  function getAdvancedCoursesList() {
    return getAllCoursesList().filter((course) => course.level === 'Advanced');
  }

  function getExpertCoursesList() {
    return getAllCoursesList().filter((course) => course.level === 'Expert');
  }

  function getCourseIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('courseId');
  }

  function isValidCourseId(courseId) {
    return typeof courseId === 'string' && !!coursesById[courseId];
  }

  function setSelectedCourseId(courseId) {
    if (isValidCourseId(courseId)) {
      localStorage.setItem(SELECTED_COURSE_KEY, courseId);
    }
  }

  function getStoredCourseId() {
    const stored = localStorage.getItem(SELECTED_COURSE_KEY);
    return isValidCourseId(stored) ? stored : null;
  }

  function resolveCourseId() {
    const fromUrl = getCourseIdFromUrl();
    if (isValidCourseId(fromUrl)) {
      setSelectedCourseId(fromUrl);
      return fromUrl;
    }

    const stored = getStoredCourseId();
    if (stored) return stored;

    setSelectedCourseId(DEFAULT_COURSE_ID);
    return DEFAULT_COURSE_ID;
  }

  function getCourseById(courseId) {
    const course = coursesById[courseId] || coursesById[DEFAULT_COURSE_ID];
    return enrichCourseWithIdentifiers(course);
  }

  function getSelectedCourse() {
    const courseId = resolveCourseId();
    return getCourseById(courseId);
  }

  function withCourseId(path, courseId) {
    if (!path) return path;
    if (path.includes('courseId=')) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}courseId=${encodeURIComponent(courseId)}`;
  }

  async function resolveLocalCourseIdByBackendId(backendId) {
    if (!backendId) return null;
    var normalized = normalizeIdentifierToken(String(backendId));
    if (!normalized) return null;

    // Try already-loaded map first
    var map = remoteCourseState.byLocalId;
    if (map) {
      for (var localId in map) {
        if (!Object.prototype.hasOwnProperty.call(map, localId)) continue;
        var remote = map[localId];
        var a = normalizeIdentifierToken(remote.adminCourseId || '');
        var b = normalizeIdentifierToken(remote.backendCourseId || '');
        if (normalized === a || normalized === b) return localId;
      }
    }

    // Load the map if needed
    try {
      map = await loadRemoteCourseMap();
      for (var localId2 in map) {
        if (!Object.prototype.hasOwnProperty.call(map, localId2)) continue;
        var remote2 = map[localId2];
        var a2 = normalizeIdentifierToken(remote2.adminCourseId || '');
        var b2 = normalizeIdentifierToken(remote2.backendCourseId || '');
        if (normalized === a2 || normalized === b2) return localId2;
      }
    } catch (_) {}

    return null;
  }

  window.NibrasCourses = {
    getCoursesList,
    getAdminCoursesList,
    getIntermediateCoursesList,
    getAdvancedCoursesList,
    getExpertCoursesList,
    getCourseById,
    getSelectedCourse,
    getAdminAssignmentsByCourseId,
    getAdminCourseByLocalId,
    resolveCourseIdentifiers,
    resolveCourseIdentifiersAsync,
    getCourseIdFromUrl,
    resolveCourseId,
    setSelectedCourseId,
    withCourseId,
    resolveLocalCourseIdByBackendId,
  };
})();
