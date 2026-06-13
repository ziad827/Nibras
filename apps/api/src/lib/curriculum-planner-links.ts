/**
 * Single source of truth linking planner catalog codes to Nibras tracking courses.
 * Uses official Stanford course numbers (2025-2026 program sheet).
 */
export type CurriculumPlannerLink = {
  plannerCode: string;
  /** Omit when no dedicated Nibras course exists; at most one catalog row may use each slug (trackingCourseId is unique). */
  trackingSlug?: string;
  subjectCode: string;
  catalogNumber: string;
  title: string;
  defaultUnits: number;
  department: string;
};

/** Ensures each tracking course is linked to at most one catalog row. */
export function assignTrackingCourseId(
  trackingCourseId: string | null | undefined,
  usedTrackingIds: Set<string>,
): string | null {
  if (!trackingCourseId) return null;
  if (usedTrackingIds.has(trackingCourseId)) return null;
  usedTrackingIds.add(trackingCourseId);
  return trackingCourseId;
}

export const CURRICULUM_PLANNER_LINKS: CurriculumPlannerLink[] = [
  {
    plannerCode: 'CS106B',
    trackingSlug: 'stanford-cs106b',
    subjectCode: 'CS',
    catalogNumber: '106B',
    title: 'Programming Abstractions',
    defaultUnits: 5,
    department: 'Computer Science',
  },
  {
    plannerCode: 'CS103',
    trackingSlug: 'year1-cs103',
    subjectCode: 'CS',
    catalogNumber: '103',
    title: 'Mathematical Foundations of Computing',
    defaultUnits: 5,
    department: 'Computer Science',
  },
  {
    plannerCode: 'CS109',
    trackingSlug: 'stanford-cs109',
    subjectCode: 'CS',
    catalogNumber: '109',
    title: 'Introduction to Probability for Computer Scientists',
    defaultUnits: 5,
    department: 'Computer Science',
  },
  {
    plannerCode: 'MATH19',
    trackingSlug: 'year1-math111',
    subjectCode: 'MATH',
    catalogNumber: '19',
    title: 'Calculus',
    defaultUnits: 5,
    department: 'Mathematics',
  },
  {
    plannerCode: 'MATH20',
    trackingSlug: 'year1-math112',
    subjectCode: 'MATH',
    catalogNumber: '20',
    title: 'Calculus',
    defaultUnits: 5,
    department: 'Mathematics',
  },
  {
    plannerCode: 'MATH21',
    subjectCode: 'MATH',
    catalogNumber: '21',
    title: 'Calculus',
    defaultUnits: 5,
    department: 'Mathematics',
  },
  {
    plannerCode: 'PHYS41',
    trackingSlug: 'year1-phy101',
    subjectCode: 'PHYS',
    catalogNumber: '41',
    title: 'Mechanics',
    defaultUnits: 4,
    department: 'Physics',
  },
  {
    plannerCode: 'PHYS43',
    subjectCode: 'PHYS',
    catalogNumber: '43',
    title: 'Electricity and Magnetism',
    defaultUnits: 4,
    department: 'Physics',
  },
  {
    plannerCode: 'CS107',
    trackingSlug: 'year2-cs201',
    subjectCode: 'CS',
    catalogNumber: '107',
    title: 'Computer Organization and Systems',
    defaultUnits: 5,
    department: 'Computer Science',
  },
  {
    plannerCode: 'CS111',
    trackingSlug: 'year2-cs204',
    subjectCode: 'CS',
    catalogNumber: '111',
    title: 'Operating Systems Principles',
    defaultUnits: 5,
    department: 'Computer Science',
  },
  {
    plannerCode: 'CS161',
    trackingSlug: 'year2-cs202',
    subjectCode: 'CS',
    catalogNumber: '161',
    title: 'Design and Analysis of Algorithms',
    defaultUnits: 5,
    department: 'Computer Science',
  },
  {
    plannerCode: 'CS221',
    trackingSlug: 'stanford-cs221',
    subjectCode: 'CS',
    catalogNumber: '221',
    title: 'AI: Principles and Techniques',
    defaultUnits: 5,
    department: 'Computer Science',
  },
  {
    plannerCode: 'CS229',
    trackingSlug: 'stanford-cs229',
    subjectCode: 'CS',
    catalogNumber: '229',
    title: 'Machine Learning',
    defaultUnits: 5,
    department: 'Computer Science',
  },
  {
    plannerCode: 'CS143',
    trackingSlug: 'stanford-cs143',
    subjectCode: 'CS',
    catalogNumber: '143',
    title: 'Compilers',
    defaultUnits: 5,
    department: 'Computer Science',
  },
];

/** Default prerequisite edges by planner code (prerequisite → course). */
export const DEFAULT_PREREQUISITE_EDGES: Array<[string, string]> = [
  ['CS106B', 'CS107'],
  ['CS106B', 'CS161'],
  ['CS103', 'CS161'],
  ['CS109', 'CS229'],
  ['MATH19', 'MATH20'],
  ['MATH20', 'MATH21'],
  ['CS107', 'CS111'],
];

export function plannerLinkByCode(
  code: string,
): CurriculumPlannerLink | undefined {
  return CURRICULUM_PLANNER_LINKS.find((entry) => entry.plannerCode === code);
}
