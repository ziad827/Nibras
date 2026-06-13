const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validatePlanForStudent,
} = require('../apps/api/dist/features/programs/plan-enrichment');

test('validatePlanForStudent returns requirementProgress array', () => {
  const result = validatePlanForStudent({
    plannedCourses: [],
    catalogCourses: [
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
    ],
    requirementGroups: [
      {
        id: 'g1',
        programVersionId: 'v1',
        trackId: null,
        title: 'Foundation',
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
    ],
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

  assert.ok(Array.isArray(result.requirementProgress));
  assert.ok(
    result.issues.some((issue) => issue.code === 'requirement_unsatisfied'),
  );
});
