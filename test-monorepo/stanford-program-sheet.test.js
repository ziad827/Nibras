'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildStanfordCs2026Seed,
  STANFORD_CS_TRACKS,
} = require('../apps/api/dist/features/programs/stanford-cs-2026-seed.js');
const {
  getStanfordTrackTemplate,
} = require('../apps/api/dist/features/programs/stanford-sheet-templates/index.js');
const {
  buildProgramSheet,
} = require('../apps/api/dist/features/programs/domain.js');
const {
  buildSharedPage1,
} = require('../apps/api/dist/features/programs/stanford-sheet-templates/shared-page1.js');

test('seed includes 10 tracks and shared math/science groups', () => {
  const seed = buildStanfordCs2026Seed();
  assert.equal(seed.tracks.length, 10);
  assert.equal(STANFORD_CS_TRACKS.length, 10);
  assert.equal(seed.program.academicYear, '2025-2026');
  const mathGroup = seed.sharedGroups.find((g) =>
    g.title.startsWith('Mathematics'),
  );
  assert.ok(mathGroup);
  assert.equal(mathGroup.minUnits, 26);
  const hasMath19 = seed.catalogCourses.some(
    (c) => c.subjectCode === 'MATH' && c.catalogNumber === '19',
  );
  assert.ok(hasMath19);
});

test('shared page 1 template includes MATH 19/20/21 rows', () => {
  const page1 = buildSharedPage1();
  const table = page1.blocks.find((b) => b.type === 'course_table');
  assert.ok(table && table.type === 'course_table');
  const courses = table.rows.map((r) => r.course);
  assert.ok(courses.includes('19'));
  assert.ok(courses.includes('20'));
  assert.ok(courses.includes('21'));
});

test('each track slug has a sheet template', () => {
  for (const track of STANFORD_CS_TRACKS) {
    const template = getStanfordTrackTemplate(track.slug);
    assert.ok(template, `missing template for ${track.slug}`);
    assert.ok(template.page2Blocks.length > 0);
  }
});

test('buildProgramSheet returns stanford_2026 layout for CS 2025-2026', () => {
  const seed = buildStanfordCs2026Seed();
  const now = new Date().toISOString();
  const program = {
    id: 'prog',
    slug: seed.program.slug,
    title: seed.program.title,
    code: seed.program.code,
    academicYear: seed.program.academicYear,
    totalUnitRequirement: seed.program.totalUnitRequirement,
    status: seed.program.status,
    activeVersionId: 'ver',
    createdAt: now,
    updatedAt: now,
  };
  const version = {
    id: 'ver',
    programId: 'prog',
    versionLabel: '2025-2026',
    effectiveFrom: now,
    effectiveTo: null,
    isActive: true,
    policyText: seed.version.policyText,
    trackSelectionMinYear: 2,
    durationYears: 4,
    createdAt: now,
    updatedAt: now,
  };
  const track = {
    id: 'track-ai',
    programVersionId: 'ver',
    slug: 'artificial-intelligence',
    title: 'Artificial Intelligence Track',
    description: '',
    selectionYearStart: 2,
    createdAt: now,
    updatedAt: now,
  };
  const catalogCourses = seed.catalogCourses.map((c) => ({
    id: `cat-${c.key}`,
    programId: 'prog',
    subjectCode: c.subjectCode,
    catalogNumber: c.catalogNumber,
    title: c.title,
    defaultUnits: c.defaultUnits,
    department: c.department,
    plannerCode: c.key,
    trackingCourseId: null,
    prerequisiteIds: [],
    createdAt: now,
    updatedAt: now,
  }));
  const courseByKey = new Map(
    seed.catalogCourses.map((c) => [c.key, `cat-${c.key}`]),
  );
  let groupIndex = 0;
  const requirementGroups = [
    ...seed.sharedGroups,
    ...seed.tracks[0].groups,
  ].map((group) => {
    const groupId = `grp-${groupIndex++}`;
    return {
      id: groupId,
      programVersionId: 'ver',
      trackId:
        group.title.includes('Core') ||
        group.title.includes('Depth') ||
        group.title.includes('Senior')
          ? track.id
          : null,
      title: group.title,
      category: group.category,
      minUnits: group.minUnits,
      minCourses: group.minCourses,
      notes: group.notes,
      sortOrder: group.sortOrder,
      noDoubleCount: group.noDoubleCount,
      rules: group.rules.map((rule, ruleIndex) => {
        const ruleId = `rule-${groupId}-${ruleIndex}`;
        return {
          id: ruleId,
          requirementGroupId: groupId,
          ruleType: rule.ruleType,
          pickCount: rule.pickCount,
          note: rule.note,
          sortOrder: rule.sortOrder,
          courses: rule.courseKeys.map((key, ci) => ({
            id: `rc-${ruleId}-${ci}`,
            requirementRuleId: ruleId,
            catalogCourseId: courseByKey.get(key) ?? `cat-${key}`,
          })),
        };
      }),
      createdAt: now,
      updatedAt: now,
    };
  });

  const sheet = buildProgramSheet({
    studentProgram: {
      id: 'sp1',
      userId: 'u1',
      programVersionId: 'ver',
      selectedTrackId: track.id,
      suid: '0123456',
      expectedGraduationQuarter: 'Spring 2026',
      status: 'track_selected',
      isLocked: false,
      submittedForAdvisorAt: null,
      createdAt: now,
      updatedAt: now,
    },
    user: {
      id: 'u1',
      username: 'demo',
      email: 'demo@stanford.edu',
      displayName: 'Demo Student',
      githubLogin: 'demo',
      githubLinked: true,
      githubAppInstalled: true,
      systemRole: 'user',
      yearLevel: 2,
    },
    program,
    version,
    selectedTrack: track,
    requirementGroups,
    plannedCourses: [],
    catalogCourses,
    petitions: [],
    approvals: [],
    displayName: 'Demo Student',
  });

  assert.equal(sheet.sheetLayout, 'stanford_2026');
  assert.ok(sheet.header);
  assert.equal(sheet.pages.length, 2);
  assert.ok(sheet.pages[0].blocks.some((b) => b.type === 'course_table'));
});
