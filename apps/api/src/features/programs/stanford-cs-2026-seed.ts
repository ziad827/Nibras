import type { ProgramSeedBlueprint } from './domain';

type CourseDef = [
  key: string,
  subjectCode: string,
  catalogNumber: string,
  title: string,
  units: number,
  department: string,
];

const C = (def: CourseDef) => ({
  key: def[0],
  subjectCode: def[1],
  catalogNumber: def[2],
  title: def[3],
  defaultUnits: def[4],
  department: def[5],
});

const SHARED_CATALOG: CourseDef[] = [
  ['MATH19', 'MATH', '19', 'Calculus', 5, 'Mathematics'],
  ['MATH20', 'MATH', '20', 'Calculus', 5, 'Mathematics'],
  ['MATH21', 'MATH', '21', 'Calculus', 5, 'Mathematics'],
  [
    'CS103',
    'CS',
    '103',
    'Mathematical Foundations of Computing',
    5,
    'Computer Science',
  ],
  [
    'CS109',
    'CS',
    '109',
    'Introduction to Probability for Computer Scientists',
    5,
    'Computer Science',
  ],
  [
    'MATH51',
    'MATH',
    '51',
    'Linear Algebra and Multivariable Calculus',
    5,
    'Mathematics',
  ],
  [
    'MATH52',
    'MATH',
    '52',
    'Integral Calculus of Several Variables',
    5,
    'Mathematics',
  ],
  ['PHYS41', 'PHYS', '41', 'Mechanics', 4, 'Physics'],
  ['PHYS43', 'PHYS', '43', 'Electricity and Magnetism', 4, 'Physics'],
  ['CHEM31A', 'CHEM', '31A', 'Chemical Principles', 4, 'Chemistry'],
  [
    'TIS-PLACEHOLDER',
    'TIS',
    '100',
    'Technology in Society (approved list)',
    3,
    'General Education',
  ],
  ['CS106B', 'CS', '106B', 'Programming Abstractions', 5, 'Computer Science'],
  ['ENGR40M', 'ENGR', '40M', 'An Intro to Making', 3, 'Engineering'],
  [
    'ENGR76',
    'ENGR',
    '76',
    'Information Science and Engineering',
    4,
    'Engineering',
  ],
  [
    'CS107',
    'CS',
    '107',
    'Computer Organization and Systems',
    5,
    'Computer Science',
  ],
  [
    'CS107E',
    'CS',
    '107E',
    'Computer Systems from the Ground Up',
    5,
    'Computer Science',
  ],
  ['CS111', 'CS', '111', 'Operating Systems Principles', 5, 'Computer Science'],
  [
    'CS161',
    'CS',
    '161',
    'Design and Analysis of Algorithms',
    5,
    'Computer Science',
  ],
  ['CS191', 'CS', '191', 'Senior Project', 3, 'Computer Science'],
  ['CS194', 'CS', '194', 'Software Project', 3, 'Computer Science'],
];

const TRACK_CATALOG: Record<string, CourseDef[]> = {
  'artificial-intelligence': [
    [
      'CS221',
      'CS',
      '221',
      'AI: Principles and Techniques',
      5,
      'Computer Science',
    ],
    ['CS229', 'CS', '229', 'Machine Learning', 5, 'Computer Science'],
    [
      'CS224N',
      'CS',
      '224N',
      'Natural Language Processing',
      5,
      'Computer Science',
    ],
    [
      'CS231N',
      'CS',
      '231N',
      'Deep Learning for Computer Vision',
      5,
      'Computer Science',
    ],
    ['CS234', 'CS', '234', 'Reinforcement Learning', 4, 'Computer Science'],
  ],
  information: [
    [
      'CS124',
      'CS',
      '124',
      'From Languages to Information',
      5,
      'Computer Science',
    ],
    [
      'CS224W',
      'CS',
      '224W',
      'Machine Learning with Graphs',
      5,
      'Computer Science',
    ],
    [
      'CS276',
      'CS',
      '276',
      'Information Retrieval and Web Search',
      4,
      'Computer Science',
    ],
  ],
  theory: [
    ['CS157', 'CS', '157', 'Computational Logic', 5, 'Computer Science'],
    ['CS254', 'CS', '254', 'Computational Complexity', 5, 'Computer Science'],
    ['CS259Q', 'CS', '259Q', 'Quantum Computing', 4, 'Computer Science'],
  ],
  'visual-computing': [
    ['CS131', 'CS', '131', 'Computer Graphics', 5, 'Computer Science'],
    ['CS231A', 'CS', '231A', 'Computer Vision', 5, 'Computer Science'],
    [
      'CS348A',
      'CS',
      '348A',
      'Computer Graphics: Geometric Modeling',
      4,
      'Computer Science',
    ],
  ],
  systems: [
    [
      'CS110',
      'CS',
      '110',
      'Principles of Computer Systems',
      5,
      'Computer Science',
    ],
    [
      'CS140',
      'CS',
      '140',
      'Operating Systems and Systems Programming',
      5,
      'Computer Science',
    ],
    ['CS143', 'CS', '143', 'Compilers', 5, 'Computer Science'],
  ],
  'human-computer-interaction': [
    [
      'CS147',
      'CS',
      '147',
      'Introduction to Human-Computer Interaction',
      5,
      'Computer Science',
    ],
    ['CS247', 'CS', '247', 'HCI Design', 5, 'Computer Science'],
    ['CS347', 'CS', '347', 'HCI Research', 5, 'Computer Science'],
    ['CS147L', 'CS', '147L', 'HCI Lab', 2, 'Computer Science'],
  ],
  'computer-engineering': [
    [
      'EE108',
      'EE',
      '108',
      'Digital System Design',
      5,
      'Electrical Engineering',
    ],
    [
      'EE180',
      'EE',
      '180',
      'Digital Systems Architecture',
      5,
      'Electrical Engineering',
    ],
    ['EE101A', 'EE', '101A', 'Circuits I', 5, 'Electrical Engineering'],
    ['EE102A', 'EE', '102A', 'Circuits II', 5, 'Electrical Engineering'],
    [
      'CS140E',
      'CS',
      '140E',
      'Embedded Operating Systems',
      5,
      'Computer Science',
    ],
  ],
  'computational-biology': [
    ['CS235', 'CS', '235', 'Computational Biology', 5, 'Computer Science'],
    [
      'CS279',
      'CS',
      '279',
      'Computational Biology: Structure and Organization',
      5,
      'Computer Science',
    ],
    ['CS373', 'CS', '373', 'Biomedical Informatics', 4, 'Computer Science'],
  ],
  unspecialized: [
    ['CS199', 'CS', '199', 'Independent Work', 3, 'Computer Science'],
    [
      'CS205L',
      'CS',
      '205L',
      'Continuous Mathematical Methods',
      5,
      'Computer Science',
    ],
  ],
  'individually-designed': [
    ['CS199', 'CS', '199', 'Independent Work', 3, 'Computer Science'],
    ['CS298', 'CS', '298', 'Independent Study', 3, 'Computer Science'],
  ],
};

function sharedGroups(): ProgramSeedBlueprint['sharedGroups'] {
  return [
    {
      title: 'Mathematics (26 units minimum)',
      category: 'foundation',
      minUnits: 26,
      minCourses: 7,
      notes: 'See program sheet notes 1 and 2.',
      sortOrder: 10,
      noDoubleCount: true,
      rules: [
        {
          ruleType: 'required',
          pickCount: null,
          note: 'Required math sequence and CS theory courses.',
          sortOrder: 10,
          courseKeys: ['MATH19', 'MATH20', 'MATH21', 'CS103', 'CS109'],
        },
        {
          ruleType: 'choose_n',
          pickCount: 2,
          note: 'Math electives (note 2).',
          sortOrder: 20,
          courseKeys: ['MATH51', 'MATH52'],
        },
      ],
    },
    {
      title: 'Science (11 units minimum)',
      category: 'foundation',
      minUnits: 11,
      minCourses: 3,
      notes: 'See program sheet note 3.',
      sortOrder: 20,
      noDoubleCount: true,
      rules: [
        {
          ruleType: 'required',
          pickCount: null,
          note: 'Physics sequence.',
          sortOrder: 10,
          courseKeys: ['PHYS41', 'PHYS43'],
        },
        {
          ruleType: 'choose_n',
          pickCount: 1,
          note: 'Science elective.',
          sortOrder: 20,
          courseKeys: ['CHEM31A'],
        },
      ],
    },
    {
      title: 'Technology in Society',
      category: 'foundation',
      minUnits: 3,
      minCourses: 1,
      notes: 'Approved TiS list at ughb.stanford.edu.',
      sortOrder: 30,
      noDoubleCount: true,
      rules: [
        {
          ruleType: 'elective_pool',
          pickCount: 1,
          note: 'One approved TiS course.',
          sortOrder: 10,
          courseKeys: ['TIS-PLACEHOLDER'],
        },
      ],
    },
    {
      title: 'Engineering Fundamentals (10 units minimum)',
      category: 'foundation',
      minUnits: 10,
      minCourses: 2,
      notes: '',
      sortOrder: 40,
      noDoubleCount: true,
      rules: [
        {
          ruleType: 'required',
          pickCount: null,
          note: 'CS 106B required.',
          sortOrder: 10,
          courseKeys: ['CS106B'],
        },
        {
          ruleType: 'choose_n',
          pickCount: 1,
          note: 'ENGR 40M or 76.',
          sortOrder: 20,
          courseKeys: ['ENGR40M', 'ENGR76'],
        },
      ],
    },
  ];
}

function trackGroups(
  trackSlug: string,
  trackTitle: string,
): ProgramSeedBlueprint['tracks'][0]['groups'] {
  const depthKeys = (
    TRACK_CATALOG[trackSlug] ?? [
      ['CS199', 'CS', '199', 'Independent Work', 3, 'Computer Science'],
    ]
  ).map((d) => d[0]);

  return [
    {
      title: 'Core (15 units minimum)',
      category: 'core',
      minUnits: 15,
      minCourses: 3,
      notes: `${trackTitle} core.`,
      sortOrder: 100,
      noDoubleCount: true,
      rules: [
        {
          ruleType: 'required',
          pickCount: null,
          note: 'CS core trio.',
          sortOrder: 10,
          courseKeys: ['CS107', 'CS111', 'CS161'],
        },
      ],
    },
    {
      title: 'Depth; Track and Electives (25 units and seven courses minimum)',
      category: 'depth',
      minUnits: 25,
      minCourses: 7,
      notes: 'Track requirements per program sheet notes.',
      sortOrder: 110,
      noDoubleCount: true,
      rules: [
        {
          ruleType: 'required',
          pickCount: null,
          note: 'Track requirement A.',
          sortOrder: 10,
          courseKeys: depthKeys.slice(0, 1),
        },
        {
          ruleType: 'choose_n',
          pickCount: 2,
          note: 'Track requirement B.',
          sortOrder: 20,
          courseKeys: depthKeys,
        },
        {
          ruleType: 'choose_n',
          pickCount: 1,
          note: 'Track requirement C.',
          sortOrder: 30,
          courseKeys: depthKeys,
        },
        {
          ruleType: 'choose_n',
          pickCount: 3,
          note: 'Track electives.',
          sortOrder: 40,
          courseKeys: [...depthKeys, 'CS199'],
        },
      ],
    },
    {
      title: 'Senior Project (1 course required)',
      category: 'capstone',
      minUnits: 3,
      minCourses: 1,
      notes: 'CS 191, 194, or equivalent.',
      sortOrder: 120,
      noDoubleCount: true,
      rules: [
        {
          ruleType: 'elective_pool',
          pickCount: 1,
          note: 'Senior project course.',
          sortOrder: 10,
          courseKeys: ['CS191', 'CS194'],
        },
      ],
    },
  ];
}

export const STANFORD_CS_TRACKS = [
  { slug: 'artificial-intelligence', title: 'Artificial Intelligence Track' },
  { slug: 'individually-designed', title: 'Individually Designed Track' },
  { slug: 'visual-computing', title: 'Visual Computing Track' },
  { slug: 'unspecialized', title: 'Unspecialized Track' },
  { slug: 'theory', title: 'Theory Track' },
  { slug: 'information', title: 'Information Track' },
  { slug: 'systems', title: 'Systems Track' },
  {
    slug: 'human-computer-interaction',
    title: 'Human-Computer Interaction Track',
  },
  { slug: 'computer-engineering', title: 'Computer Engineering Track' },
  { slug: 'computational-biology', title: 'Computational Biology Track' },
] as const;

export function buildStanfordCs2026Seed(): ProgramSeedBlueprint {
  const catalogKeys = new Set<string>();
  const catalogCourses: ProgramSeedBlueprint['catalogCourses'] = [];
  const addCourse = (def: CourseDef) => {
    if (catalogKeys.has(def[0])) return;
    catalogKeys.add(def[0]);
    catalogCourses.push(C(def));
  };
  for (const def of SHARED_CATALOG) addCourse(def);
  for (const defs of Object.values(TRACK_CATALOG)) {
    for (const def of defs) addCourse(def);
  }

  return {
    program: {
      slug: 'cs-program',
      title: 'Computer Science',
      code: 'CS',
      academicYear: '2025-2026',
      totalUnitRequirement: 95,
      status: 'published',
    },
    version: {
      versionLabel: '2025-2026',
      policyText:
        'Stanford CS 2025-2026 program sheet requirements. Select a track by year 2. No double counting across categories.',
      trackSelectionMinYear: 2,
      durationYears: 4,
      isActive: true,
    },
    catalogCourses,
    sharedGroups: sharedGroups(),
    tracks: STANFORD_CS_TRACKS.map((track, index) => ({
      slug: track.slug,
      title: track.title,
      description: `Stanford ${track.title} (2025-2026).`,
      selectionYearStart: 2,
      groups: trackGroups(track.slug, track.title).map((group) => ({
        ...group,
        sortOrder: group.sortOrder + index,
      })),
    })),
  };
}
