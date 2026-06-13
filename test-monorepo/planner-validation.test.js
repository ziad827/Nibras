const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateStudentPlan,
  buildRecommendedPlan,
  computeCatalogCompletionStatus,
} = require('../apps/api/dist/features/programs/planner-validation');

test('validateStudentPlan accepts completed prerequisite without planned placement', () => {
  const catalogCourses = [
    {
      id: 'cs101',
      programId: 'p1',
      subjectCode: 'CS',
      catalogNumber: '101',
      title: 'Intro',
      defaultUnits: 4,
      department: 'CS',
      plannerCode: 'CS101',
      trackingCourseId: null,
      prerequisiteIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cs102',
      programId: 'p1',
      subjectCode: 'CS',
      catalogNumber: '102',
      title: 'Data Structures',
      defaultUnits: 4,
      department: 'CS',
      plannerCode: 'CS102',
      trackingCourseId: null,
      prerequisiteIds: ['cs101'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const result = validateStudentPlan({
    plannedCourses: [
      { catalogCourseId: 'cs102', plannedYear: 1, plannedTerm: 'spring' },
    ],
    catalogCourses,
    requirementGroups: [],
    selectedTrack: null,
    durationYears: 4,
    programId: 'p1',
    completedCourseIds: new Set(['cs101']),
  });

  assert.equal(result.errorCount, 0);
  assert.ok(
    !result.issues.some((issue) => issue.code === 'missing_prerequisite'),
  );
});

test('validateStudentPlan emits requirement progress when studentProgram provided', () => {
  const catalogCourses = [
    {
      id: 'cs101',
      programId: 'p1',
      subjectCode: 'CS',
      catalogNumber: '101',
      title: 'Intro',
      defaultUnits: 4,
      department: 'CS',
      plannerCode: 'CS101',
      trackingCourseId: null,
      prerequisiteIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const requirementGroups = [
    {
      id: 'g1',
      programVersionId: 'v1',
      trackId: null,
      title: 'Year 1 Foundation',
      category: 'foundation',
      minUnits: 4,
      minCourses: 1,
      notes: '',
      sortOrder: 1,
      noDoubleCount: true,
      rules: [
        {
          id: 'r1',
          requirementGroupId: 'g1',
          ruleType: 'required',
          pickCount: null,
          note: '',
          sortOrder: 1,
          courses: [
            { id: 'rc1', requirementRuleId: 'r1', catalogCourseId: 'cs101' },
          ],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const result = validateStudentPlan({
    plannedCourses: [
      { catalogCourseId: 'cs101', plannedYear: 1, plannedTerm: 'fall' },
    ],
    catalogCourses,
    requirementGroups,
    selectedTrack: null,
    durationYears: 4,
    programId: 'p1',
    studentProgram: {
      id: 'sp1',
      userId: 'u1',
      programVersionId: 'v1',
      selectedTrackId: null,
      status: 'enrolled',
      isLocked: false,
      submittedForAdvisorAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    petitions: [],
  });

  assert.ok(result.requirementProgress.length > 0);
  assert.equal(result.requirementProgress[0].status, 'satisfied');
});

test('buildRecommendedPlan respects prerequisite ordering', () => {
  const catalogCourses = [
    {
      id: 'a',
      programId: 'p1',
      subjectCode: 'CS',
      catalogNumber: '101',
      title: 'A',
      defaultUnits: 4,
      department: 'CS',
      plannerCode: null,
      trackingCourseId: null,
      prerequisiteIds: [],
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'b',
      programId: 'p1',
      subjectCode: 'CS',
      catalogNumber: '102',
      title: 'B',
      defaultUnits: 4,
      department: 'CS',
      plannerCode: null,
      trackingCourseId: null,
      prerequisiteIds: ['a'],
      createdAt: '',
      updatedAt: '',
    },
  ];

  const requirementGroups = [
    {
      id: 'g1',
      programVersionId: 'v1',
      trackId: null,
      title: 'Foundation',
      category: 'foundation',
      minUnits: 8,
      minCourses: 2,
      notes: '',
      sortOrder: 1,
      noDoubleCount: true,
      rules: [
        {
          id: 'r1',
          requirementGroupId: 'g1',
          ruleType: 'required',
          pickCount: null,
          note: '',
          sortOrder: 1,
          courses: [
            { id: 'rc1', requirementRuleId: 'r1', catalogCourseId: 'b' },
            { id: 'rc2', requirementRuleId: 'r1', catalogCourseId: 'a' },
          ],
        },
      ],
      createdAt: '',
      updatedAt: '',
    },
  ];

  const planned = buildRecommendedPlan({
    catalogCourses,
    requirementGroups,
    selectedTrack: null,
    durationYears: 4,
  });

  const aPlacement = planned.find((entry) => entry.catalogCourseId === 'a');
  const bPlacement = planned.find((entry) => entry.catalogCourseId === 'b');
  assert.ok(aPlacement);
  assert.ok(bPlacement);
  assert.ok(
    aPlacement.plannedYear < bPlacement.plannedYear ||
      (aPlacement.plannedYear === bPlacement.plannedYear &&
        aPlacement.plannedTerm === 'fall' &&
        bPlacement.plannedTerm === 'spring'),
  );
});

test('computeCatalogCompletionStatus marks completed at 100%', () => {
  const status = computeCatalogCompletionStatus({
    catalogCourseId: 'c1',
    trackingCourseId: 't1',
    trackingSlug: 'slug',
    milestonePercent: 100,
    videoPercent: 80,
    isEnrolled: true,
  });
  assert.equal(status.status, 'completed');
});

test('validateStudentPlan flags prerequisite ordering errors', () => {
  const catalogCourses = [
    {
      id: 'cs101',
      programId: 'p1',
      subjectCode: 'CS',
      catalogNumber: '101',
      title: 'Intro',
      defaultUnits: 4,
      department: 'CS',
      plannerCode: 'CS101',
      trackingCourseId: null,
      prerequisiteIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cs102',
      programId: 'p1',
      subjectCode: 'CS',
      catalogNumber: '102',
      title: 'Data Structures',
      defaultUnits: 4,
      department: 'CS',
      plannerCode: 'CS102',
      trackingCourseId: null,
      prerequisiteIds: ['cs101'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const result = validateStudentPlan({
    plannedCourses: [
      { catalogCourseId: 'cs102', plannedYear: 1, plannedTerm: 'fall' },
      { catalogCourseId: 'cs101', plannedYear: 1, plannedTerm: 'spring' },
    ],
    catalogCourses,
    requirementGroups: [],
    selectedTrack: null,
    durationYears: 4,
    programId: 'p1',
  });

  assert.ok(result.errorCount > 0);
  assert.ok(result.issues.some((issue) => issue.code === 'prerequisite_order'));
});
