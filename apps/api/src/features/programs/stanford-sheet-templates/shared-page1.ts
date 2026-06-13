import type { SheetTemplateBundle } from './types';

export const STANFORD_SHEET_DISCLAIMER =
  'Final version of program sheet is due to the department no later than one month prior to the last quarter of senior year. *Follow all requirements as stated for the year of the program sheet used.*';

export const STANFORD_PAGE1_NOTES: string[] = [
  'All courses listed on this form can be included under only one category. There is no double counting.',
  'All courses listed on this form must be taken for a letter grade (unless taken Spring 2019-20, and Aut-Sum 2020-21).',
  'This printed form must be signed by the departmental representative (SSO), with changes petitioned (see UGHB, Petitions page) and initialed/dated by SSO.',
  'Minimum Grade Point Average (GPA) for all courses in ENGR Fundamentals and CS Core, Depth, and Senior Project (combined) is 2.0.',
  'Students without prior programming experience should first take CS106A. The major otherwise requires at most 95 units.',
  'AP (or IB/GCE) test credit for use in the major can be confirmed by checking your MAP record in the Bachelor of Science Mathematics, Science, and/or Fundamentals categories.',
  "Transfer credits in Math, Science, Fundamentals, & TiS must be approved by the SoE Dean's office. Transfer credit information and SoE & departmental petitions are available at https://ughb.stanford.edu/transfers-ap-exceptions. Transfer credits in CS Core, Depth and Senior Project must be approved by the Computer Science office.",
  'Courses must be taken for the number of units on the Program Sheet. CS 103, 106B, 107, 109, 111 and 161 must be taken for 5 units.',
];

export function buildSharedPage1(): SheetTemplateBundle['page1'] {
  return {
    blocks: [
      { type: 'section_header', text: 'Mathematics (26 units minimum)' },
      {
        type: 'course_table',
        rows: [
          {
            dept: 'MATH',
            course: '19',
            title: 'Calculus (see note 1)',
            noteRef: '1',
            slotId: 'math-19',
            matchCatalog: [{ subjectCode: 'MATH', catalogNumber: '19' }],
            groupTitle: 'Mathematics (26 units minimum)',
          },
          {
            dept: 'MATH',
            course: '20',
            title: '',
            slotId: 'math-20',
            matchCatalog: [{ subjectCode: 'MATH', catalogNumber: '20' }],
            groupTitle: 'Mathematics (26 units minimum)',
          },
          {
            dept: 'MATH',
            course: '21',
            title: '',
            slotId: 'math-21',
            matchCatalog: [{ subjectCode: 'MATH', catalogNumber: '21' }],
            groupTitle: 'Mathematics (26 units minimum)',
          },
          {
            dept: 'CS',
            course: '103',
            title: 'Mathematical Foundations of Computing',
            slotId: 'cs-103',
            matchCatalog: [{ subjectCode: 'CS', catalogNumber: '103' }],
            groupTitle: 'Mathematics (26 units minimum)',
          },
          {
            dept: 'CS',
            course: '109',
            title: 'Introduction to Probability for Computer Scientists',
            slotId: 'cs-109',
            matchCatalog: [{ subjectCode: 'CS', catalogNumber: '109' }],
            groupTitle: 'Mathematics (26 units minimum)',
          },
          {
            dept: '',
            course: '',
            title: 'Plus two electives (see note 2)',
            noteRef: '2',
            isPlaceholder: true,
            slotId: 'math-elective',
            groupTitle: 'Mathematics (26 units minimum)',
            ruleIndex: 1,
          },
          {
            dept: '',
            course: '',
            title: '',
            isPlaceholder: true,
            slotId: 'math-elective',
            groupTitle: 'Mathematics (26 units minimum)',
            ruleIndex: 1,
          },
        ],
      },
      { type: 'section_header', text: 'Mathematics Total (26 units minimum)' },
      { type: 'section_header', text: 'Science (11 units minimum)' },
      {
        type: 'course_table',
        rows: [
          {
            dept: 'PHYS',
            course: '41',
            title: 'Mechanics (or PHYS 21 or 61)',
            slotId: 'phys-41',
            matchCatalog: [{ subjectCode: 'PHYS', catalogNumber: '41' }],
            groupTitle: 'Science (11 units minimum)',
          },
          {
            dept: 'PHYS',
            course: '43',
            title: 'Electricity and Magnetism (or PHYS 23 or PHYS 81/63)',
            slotId: 'phys-43',
            matchCatalog: [{ subjectCode: 'PHYS', catalogNumber: '43' }],
            groupTitle: 'Science (11 units minimum)',
          },
          {
            dept: '',
            course: '',
            title: 'Elective (see note 3)',
            noteRef: '3',
            isPlaceholder: true,
            slotId: 'science-elective',
            groupTitle: 'Science (11 units minimum)',
            ruleIndex: 1,
          },
        ],
      },
      { type: 'section_header', text: 'Science Unit Total (11 units minimum)' },
      {
        type: 'section_header',
        text: '(37 units min. Math & Science combined)',
      },
      { type: 'spacer' },
      {
        type: 'section_header',
        text: "Technology in Society Requirement (1 course req'd from Approved TiS list at ughb.stanford.edu the year taken; see note 8)",
      },
      {
        type: 'course_table',
        rows: [
          {
            dept: '',
            course: '',
            title: '',
            isPlaceholder: true,
            slotId: 'tis-1',
            groupTitle: 'Technology in Society',
            ruleIndex: 0,
          },
        ],
      },
      { type: 'spacer' },
      {
        type: 'section_header',
        text: 'Engineering Fundamentals (10 units minimum)',
      },
      {
        type: 'course_table',
        rows: [
          {
            dept: 'CS',
            course: '106B',
            title: 'Programming Abstractions',
            slotId: 'cs-106b',
            matchCatalog: [{ subjectCode: 'CS', catalogNumber: '106B' }],
            groupTitle: 'Engineering Fundamentals (10 units minimum)',
          },
          {
            dept: 'ENGR',
            course: '40M or 76',
            title:
              'An Intro to Making: What is EE? -OR- Information Science+ENGR',
            slotId: 'engr-fund',
            matchCatalog: [
              { subjectCode: 'ENGR', catalogNumber: '40M' },
              { subjectCode: 'ENGR', catalogNumber: '76' },
            ],
            groupTitle: 'Engineering Fundamentals (10 units minimum)',
          },
        ],
      },
      {
        type: 'section_header',
        text: 'Engineering Fundamentals (10 units minimum)',
      },
      { type: 'spacer' },
      { type: 'notes', title: 'NOTES', items: STANFORD_PAGE1_NOTES },
    ],
  };
}

export const SHARED_PAGE1_FOOTNOTES: Array<{ number: string; text: string }> = [
  {
    number: '1',
    text: 'MATH 19/20/21 or equivalent (10 units AP BC, or transfer, with placement into MATH 51/CME 100) is acceptable. If 6-8 units AP or IB credit are used, must take Math 21.',
  },
  {
    number: '2',
    text: 'Math electives: Math 51, 52, 53, 104, 107, 108, 109, 110, 113; CS 157, 205L; PHIL 151; CME 100, 102, 104; ENGR 108.',
  },
  {
    number: '3',
    text: 'Any course of 3 or more units from the SoE Science List, PSYCH 30, or AP Chemistry may be used.',
  },
];
