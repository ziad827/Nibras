import type { SheetTemplateBlock, SheetTrackTemplate } from './types';

function standardCoreRows(): SheetTemplateBlock {
  return {
    type: 'course_table',
    showHeader: true,
    rows: [
      {
        dept: 'CS',
        course: '107 or 107E',
        title: 'Computer Organization and Systems',
        slotId: 'core-107',
        matchCatalog: [
          { subjectCode: 'CS', catalogNumber: '107' },
          { subjectCode: 'CS', catalogNumber: '107E' },
        ],
        groupTitle: 'Core (15 units minimum)',
      },
      {
        dept: 'CS',
        course: '111',
        title: 'Operating Systems Principles',
        slotId: 'core-111',
        matchCatalog: [{ subjectCode: 'CS', catalogNumber: '111' }],
        groupTitle: 'Core (15 units minimum)',
      },
      {
        dept: 'CS',
        course: '161',
        title: 'Design and Analysis of Algorithms',
        slotId: 'core-161',
        matchCatalog: [{ subjectCode: 'CS', catalogNumber: '161' }],
        groupTitle: 'Core (15 units minimum)',
      },
    ],
  };
}

function standardSeniorRow(): SheetTemplateBlock {
  return {
    type: 'course_table',
    rows: [
      {
        dept: 'CS',
        course:
          'At least 3 units of 191, 191W, 194, 194H, 194W, 210B, or 294 (see note 8)',
        title: '',
        noteRef: '8',
        isPlaceholder: true,
        slotId: 'senior-project',
        groupTitle: 'Senior Project (1 course required)',
      },
    ],
  };
}

function depthRows(config: {
  trackReqA?: {
    dept: string;
    course: string;
    title: string;
    slotId: string;
    catalog: string;
  };
  trackReqBLabel?: string;
  trackReqBCount?: number;
  trackReqCLabel?: string;
  trackReqCCount?: number;
  electiveCount?: number;
  optionalElective?: boolean;
}): SheetTemplateBlock[] {
  const rows: SheetTemplateBlock = {
    type: 'course_table',
    showHeader: true,
    rows: [],
  };
  if (config.trackReqA) {
    rows.rows.push({
      dept: config.trackReqA.dept,
      course: config.trackReqA.course,
      title: config.trackReqA.title,
      slotId: config.trackReqA.slotId,
      matchCatalog: [
        {
          subjectCode: config.trackReqA.dept,
          catalogNumber: config.trackReqA.catalog,
        },
      ],
      groupTitle:
        'Depth; Track and Electives (25 units and seven courses minimum)',
    });
  }
  const bCount = config.trackReqBCount ?? 2;
  for (let i = 0; i < bCount; i++) {
    rows.rows.push({
      dept: config.trackReqA?.dept ?? 'CS',
      course: config.trackReqBLabel ?? 'Track Requirement B (see note 4)',
      title: '',
      noteRef: '4',
      isPlaceholder: true,
      slotId: 'depth-b',
      groupTitle:
        'Depth; Track and Electives (25 units and seven courses minimum)',
      ruleIndex: 1,
    });
  }
  const cCount = config.trackReqCCount ?? 1;
  for (let i = 0; i < cCount; i++) {
    rows.rows.push({
      dept: '',
      course: config.trackReqCLabel ?? 'Track Requirement C (see note 5)',
      title: '',
      noteRef: '5',
      isPlaceholder: true,
      slotId: 'depth-c',
      groupTitle:
        'Depth; Track and Electives (25 units and seven courses minimum)',
      ruleIndex: 2,
    });
  }
  const electiveCount = config.electiveCount ?? 3;
  for (let i = 0; i < electiveCount; i++) {
    rows.rows.push({
      dept: '',
      course: '',
      title: 'Elective (see note 6)',
      noteRef: '6',
      isPlaceholder: true,
      slotId: 'depth-elective',
      groupTitle:
        'Depth; Track and Electives (25 units and seven courses minimum)',
      ruleIndex: 3,
    });
  }
  if (config.optionalElective) {
    rows.rows.push({
      dept: '',
      course: '',
      title: 'Optional Elective',
      isPlaceholder: true,
      slotId: 'depth-optional',
      groupTitle:
        'Depth; Track and Electives (25 units and seven courses minimum)',
      ruleIndex: 3,
    });
  }
  return [rows];
}

function buildStandardPage2(
  continuedTitle: string,
  depthSectionTitle: string,
  depthBlocks: SheetTemplateBlock[],
): SheetTemplateBlock[] {
  return [
    { type: 'section_header', text: continuedTitle },
    { type: 'section_header', text: depthSectionTitle },
    {
      type: 'section_header',
      text: 'Be advised: no course may be listed twice; no double counting.',
      subtitle: null,
    },
    { type: 'spacer' },
    { type: 'section_header', text: 'Core (15 units minimum)' },
    standardCoreRows(),
    { type: 'spacer' },
    {
      type: 'section_header',
      text: 'Depth; Track and Electives (25 units and seven courses minimum)',
    },
    ...depthBlocks,
    { type: 'section_header', text: 'Total depth units (25 units minimum)' },
    { type: 'section_header', text: 'Senior Project (1 course required)' },
    standardSeniorRow(),
    {
      type: 'section_header',
      text: 'Computer Science Core, Depth and Senior Project Total (43 units minimum)',
    },
    { type: 'spacer' },
    { type: 'approvals' },
    { type: 'section_header', text: 'NOTES (continued from page 1)' },
  ];
}

const WIM_NOTE =
  "The WiM req't may be met by taking CS121, or CS 181W or 182W as TiS, or via Senior Project course (CS 191W, 194W, or 210B only).";

export const STANFORD_TRACK_TEMPLATES: Record<string, SheetTrackTemplate> = {
  'artificial-intelligence': {
    trackSlug: 'artificial-intelligence',
    trackSheetTitle: 'Artificial Intelligence Track',
    continuedTitle:
      'CS Artificial Intelligence Track Program Sheet (continued)',
    depthSectionTitle:
      'AI Track Core, Depth, and Senior Project (43 units minimum)',
    page2Blocks: buildStandardPage2(
      'CS Artificial Intelligence Track Program Sheet (continued)',
      'AI Track Core, Depth, and Senior Project (43 units minimum)',
      depthRows({
        trackReqA: {
          dept: 'CS',
          course: '221',
          title: 'AI: Principles and Techniques (Track Requirement A)',
          slotId: 'depth-a',
          catalog: '221',
        },
        optionalElective: true,
      }),
    ),
    footnotes: [
      {
        number: '4',
        text: 'Track Requirement B: Two courses, each from a different area (AI Methods, NLP, Vision, or Robotics).',
      },
      {
        number: '5',
        text: 'Track Requirement C: One additional course from the Track Requirement B list or approved AI electives.',
      },
      {
        number: '6',
        text: 'Track Electives: At least three additional courses from Track B/C lists or General CS Electives.',
      },
      {
        number: '7',
        text: 'General CS Electives: see UGHB for the full list.',
      },
      { number: '8', text: WIM_NOTE },
    ],
  },
  'individually-designed': {
    trackSlug: 'individually-designed',
    trackSheetTitle: 'Individually Designed Track',
    continuedTitle: 'CS Individually Designed Track Program Sheet (continued)',
    depthSectionTitle:
      'Individually Designed Track Core, Depth, and Senior Project (43 units minimum)',
    page2Blocks: buildStandardPage2(
      'CS Individually Designed Track Program Sheet (continued)',
      'Individually Designed Track Core, Depth, and Senior Project (43 units minimum)',
      depthRows({
        trackReqBCount: 3,
        trackReqCCount: 2,
        electiveCount: 2,
        optionalElective: true,
      }),
    ),
    footnotes: [
      {
        number: '4',
        text: 'Depth courses must be approved by your faculty advisor.',
      },
      {
        number: '5',
        text: 'See department website for individually designed track guidelines.',
      },
      { number: '6', text: 'Electives supporting your approved study plan.' },
      { number: '8', text: WIM_NOTE },
    ],
  },
  'visual-computing': {
    trackSlug: 'visual-computing',
    trackSheetTitle: 'Visual Computing Track',
    continuedTitle: 'CS Visual Computing Track Program Sheet (continued)',
    depthSectionTitle:
      'Visual Computing Track Core, Depth, and Senior Project (43 units minimum)',
    page2Blocks: buildStandardPage2(
      'CS Visual Computing Track Program Sheet (continued)',
      'Visual Computing Track Core, Depth, and Senior Project (43 units minimum)',
      depthRows({
        trackReqA: {
          dept: 'CS',
          course: '131',
          title: 'Computer Graphics (Track Requirement A)',
          slotId: 'depth-a',
          catalog: '131',
        },
        optionalElective: true,
      }),
    ),
    footnotes: [
      {
        number: '4',
        text: 'Track Requirement B: Two courses from graphics, vision, or interaction areas.',
      },
      {
        number: '5',
        text: 'Track Requirement C: One additional visual computing course.',
      },
      {
        number: '6',
        text: 'Track electives from approved visual computing list.',
      },
      { number: '8', text: WIM_NOTE },
    ],
  },
  unspecialized: {
    trackSlug: 'unspecialized',
    trackSheetTitle: 'Unspecialized Track',
    continuedTitle: 'CS Unspecialized Track Program Sheet (continued)',
    depthSectionTitle:
      'Unspecialized Track Core, Depth, and Senior Project (43 units minimum)',
    page2Blocks: buildStandardPage2(
      'CS Unspecialized Track Program Sheet (continued)',
      'Unspecialized Track Core, Depth, and Senior Project (43 units minimum)',
      depthRows({
        trackReqBCount: 2,
        trackReqCCount: 1,
        electiveCount: 4,
        optionalElective: true,
      }),
    ),
    footnotes: [
      {
        number: '4',
        text: 'Choose breadth courses across CS areas with advisor approval.',
      },
      { number: '6', text: 'General CS electives from approved list.' },
      { number: '8', text: WIM_NOTE },
    ],
  },
  theory: {
    trackSlug: 'theory',
    trackSheetTitle: 'Theory Track',
    continuedTitle: 'CS Theory Track Program Sheet (continued)',
    depthSectionTitle:
      'Theory Track Core, Depth, and Senior Project (43 units minimum)',
    page2Blocks: buildStandardPage2(
      'CS Theory Track Program Sheet (continued)',
      'Theory Track Core, Depth, and Senior Project (43 units minimum)',
      depthRows({
        trackReqA: {
          dept: 'CS',
          course: '161',
          title: 'Design and Analysis of Algorithms (Track Requirement A)',
          slotId: 'depth-a',
          catalog: '161',
        },
        optionalElective: true,
      }),
    ),
    footnotes: [
      {
        number: '4',
        text: 'Track Requirement B: Two theory courses from approved list.',
      },
      {
        number: '5',
        text: 'Track Requirement C: One additional theory-oriented course.',
      },
      { number: '6', text: 'Theory electives.' },
      { number: '8', text: WIM_NOTE },
    ],
  },
  information: {
    trackSlug: 'information',
    trackSheetTitle: 'Information Track',
    continuedTitle: 'CS Information Track Program Sheet (continued)',
    depthSectionTitle:
      'Information Track Core, Depth, and Senior Project (43 units minimum)',
    page2Blocks: buildStandardPage2(
      'CS Information Track Program Sheet (continued)',
      'Information Track Core, Depth, and Senior Project (43 units minimum)',
      depthRows({
        trackReqA: {
          dept: 'CS',
          course: '124',
          title: 'From Languages to Information (Track Requirement A)',
          slotId: 'depth-a',
          catalog: '124',
        },
        optionalElective: true,
      }),
    ),
    footnotes: [
      {
        number: '4',
        text: 'Track Requirement B: Two information-area courses.',
      },
      {
        number: '5',
        text: 'Track Requirement C: One additional information course.',
      },
      { number: '6', text: 'Information track electives.' },
      { number: '8', text: WIM_NOTE },
    ],
  },
  systems: {
    trackSlug: 'systems',
    trackSheetTitle: 'Systems Track',
    continuedTitle: 'CS Systems Track Program Sheet (continued)',
    depthSectionTitle:
      'Systems Track Core, Depth, and Senior Project (43 units minimum)',
    page2Blocks: buildStandardPage2(
      'CS Systems Track Program Sheet (continued)',
      'Systems Track Core, Depth, and Senior Project (43 units minimum)',
      depthRows({
        trackReqA: {
          dept: 'CS',
          course: '110',
          title: 'Principles of Computer Systems (Track Requirement A)',
          slotId: 'depth-a',
          catalog: '110',
        },
        optionalElective: true,
      }),
    ),
    footnotes: [
      {
        number: '4',
        text: 'Track Requirement B: Two systems courses from approved list.',
      },
      {
        number: '5',
        text: 'Track Requirement C: One additional systems course.',
      },
      { number: '6', text: 'Systems electives.' },
      { number: '8', text: WIM_NOTE },
    ],
  },
  'human-computer-interaction': {
    trackSlug: 'human-computer-interaction',
    trackSheetTitle: 'Human-Computer Interaction Track',
    continuedTitle:
      'CS Human-Computer Interaction Track Program Sheet (continued)',
    depthSectionTitle:
      'HCI Track Core, Depth, and Senior Project (43 units minimum)',
    page2Blocks: buildStandardPage2(
      'CS Human-Computer Interaction Track Program Sheet (continued)',
      'HCI Track Core, Depth, and Senior Project (43 units minimum)',
      [
        {
          type: 'course_table',
          showHeader: true,
          rows: [
            {
              dept: 'CS',
              course: '147',
              title: 'Intro to HCI (Track Requirement A)',
              slotId: 'depth-a',
              matchCatalog: [{ subjectCode: 'CS', catalogNumber: '147' }],
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
            },
            {
              dept: 'CS',
              course: '247',
              title: 'HCI Design',
              slotId: 'depth-b-1',
              matchCatalog: [{ subjectCode: 'CS', catalogNumber: '247' }],
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
            },
            {
              dept: 'CS',
              course: '347',
              title: 'HCI Research',
              slotId: 'depth-b-2',
              matchCatalog: [{ subjectCode: 'CS', catalogNumber: '347' }],
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
            },
            {
              dept: 'CS',
              course: '147L',
              title: 'HCI Lab',
              slotId: 'depth-c',
              matchCatalog: [{ subjectCode: 'CS', catalogNumber: '147L' }],
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
            },
            {
              dept: '',
              course: '',
              title: 'Elective (see note 6)',
              noteRef: '6',
              isPlaceholder: true,
              slotId: 'depth-elective',
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
              ruleIndex: 3,
            },
            {
              dept: '',
              course: '',
              title: 'Elective (see note 6)',
              noteRef: '6',
              isPlaceholder: true,
              slotId: 'depth-elective',
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
              ruleIndex: 3,
            },
            {
              dept: '',
              course: '',
              title: 'Optional Elective',
              isPlaceholder: true,
              slotId: 'depth-optional',
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
              ruleIndex: 3,
            },
          ],
        },
      ],
    ),
    footnotes: [
      { number: '6', text: 'HCI track electives from approved list.' },
      { number: '8', text: WIM_NOTE },
    ],
  },
  'computer-engineering': {
    trackSlug: 'computer-engineering',
    trackSheetTitle: 'Computer Engineering Track',
    continuedTitle: 'CS Computer Engineering Track Program Sheet (continued)',
    depthSectionTitle:
      'Computer Engineering Track Core, Depth, and Senior Project (43 units minimum)',
    page2Blocks: buildStandardPage2(
      'CS Computer Engineering Track Program Sheet (continued)',
      'Computer Engineering Track Core, Depth, and Senior Project (43 units minimum)',
      [
        {
          type: 'course_table',
          showHeader: true,
          rows: [
            {
              dept: 'EE',
              course: '108',
              title: 'Digital System Design (Track Requirement A)',
              slotId: 'depth-a-1',
              matchCatalog: [{ subjectCode: 'EE', catalogNumber: '108' }],
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
            },
            {
              dept: 'EE',
              course: '180',
              title: 'Digital Systems Architecture (Track Requirement A)',
              slotId: 'depth-a-2',
              matchCatalog: [{ subjectCode: 'EE', catalogNumber: '180' }],
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
            },
            {
              dept: 'EE',
              course: 'Track Requirement B (see note 4)',
              title: '',
              noteRef: '4',
              isPlaceholder: true,
              slotId: 'depth-b',
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
              ruleIndex: 1,
            },
            {
              dept: 'EE',
              course: 'Track Requirement B (see note 4)',
              title: '',
              noteRef: '4',
              isPlaceholder: true,
              slotId: 'depth-b',
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
              ruleIndex: 1,
            },
            {
              dept: '',
              course: 'Track Requirement C (see note 5)',
              title: '',
              noteRef: '5',
              isPlaceholder: true,
              slotId: 'depth-c',
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
              ruleIndex: 2,
            },
            {
              dept: '',
              course: 'Track Requirement C (see note 5)',
              title: '',
              noteRef: '5',
              isPlaceholder: true,
              slotId: 'depth-c',
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
              ruleIndex: 2,
            },
            {
              dept: '',
              course: 'Track Requirement C (see note 5)',
              title: '',
              noteRef: '5',
              isPlaceholder: true,
              slotId: 'depth-c',
              groupTitle:
                'Depth; Track and Electives (25 units and seven courses minimum)',
              ruleIndex: 2,
            },
          ],
        },
      ],
    ),
    footnotes: [
      {
        number: '4',
        text: 'Track Requirement B: Two courses selected from EE 101A, 101B, 102A, 102B.',
      },
      {
        number: '5',
        text: 'Track Requirement C: One concentration (Digital Systems, Robotics, or Networking).',
      },
      { number: '6', text: WIM_NOTE },
    ],
  },
  'computational-biology': {
    trackSlug: 'computational-biology',
    trackSheetTitle: 'Computational Biology Track',
    continuedTitle: 'CS Computational Biology Track Program Sheet (continued)',
    depthSectionTitle:
      'CS Computational Biology Track Core, Depth, and Senior Project (43 units minimum)',
    page2Blocks: buildStandardPage2(
      'CS Computational Biology Track Program Sheet (continued)',
      'CS Computational Biology Track Core, Depth, and Senior Project (43 units minimum)',
      depthRows({
        trackReqA: {
          dept: 'CS',
          course: '235',
          title: 'Computational Biology (Track Requirement A)',
          slotId: 'depth-a',
          catalog: '235',
        },
        optionalElective: true,
      }),
    ),
    footnotes: [
      {
        number: '4',
        text: 'Track Requirement B: Two computational biology courses.',
      },
      {
        number: '5',
        text: 'Track Requirement C: One additional comp bio course.',
      },
      { number: '6', text: 'Comp bio electives.' },
      { number: '8', text: WIM_NOTE },
    ],
  },
};
