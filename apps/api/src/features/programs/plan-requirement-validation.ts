import type {
  CatalogCourseRecord,
  PetitionRecord,
  RequirementGroupRecord,
  StudentPlannedCourseRecord,
  StudentProgramRecord,
  TrackRecord,
} from '../../store';
import { evaluateRequirementGroups } from './domain';
import type {
  AcademicTerm,
  PlanValidationIssue,
  RequirementProgress,
} from './planner-validation';

const HARD_REQUIREMENT_CATEGORIES = new Set(['foundation', 'core', 'capstone']);

export function draftPlannedToRecords(
  plannedCourses: Array<{
    catalogCourseId: string;
    plannedYear: number;
    plannedTerm: AcademicTerm;
    sourceType?: StudentPlannedCourseRecord['sourceType'];
    note?: string | null;
  }>,
  studentProgramId: string,
): StudentPlannedCourseRecord[] {
  const now = new Date().toISOString();
  return plannedCourses.map((course) => ({
    id: `draft:${course.catalogCourseId}`,
    studentProgramId,
    catalogCourseId: course.catalogCourseId,
    plannedYear: course.plannedYear,
    plannedTerm: course.plannedTerm,
    sourceType: course.sourceType ?? 'standard',
    note: course.note ?? null,
    expectedGrade: null,
    createdAt: now,
    updatedAt: now,
  }));
}

function missingRequiredCourseIds(
  group: RequirementGroupRecord,
  matchedCatalogIds: Set<string>,
): string[] {
  const missing: string[] = [];
  for (const rule of group.rules) {
    if (rule.ruleType !== 'required') continue;
    for (const course of rule.courses) {
      if (!matchedCatalogIds.has(course.catalogCourseId)) {
        missing.push(course.catalogCourseId);
      }
    }
  }
  return [...new Set(missing)];
}

export function buildRequirementValidation(args: {
  studentProgram: StudentProgramRecord;
  plannedCourses: Array<{
    catalogCourseId: string;
    plannedYear: number;
    plannedTerm: AcademicTerm;
    sourceType?: StudentPlannedCourseRecord['sourceType'];
    note?: string | null;
  }>;
  catalogCourses: CatalogCourseRecord[];
  requirementGroups: RequirementGroupRecord[];
  selectedTrack: TrackRecord | null;
  petitions: PetitionRecord[];
}): {
  issues: PlanValidationIssue[];
  requirementProgress: RequirementProgress[];
} {
  const plannedRecords = draftPlannedToRecords(
    args.plannedCourses,
    args.studentProgram.id,
  );
  const { sections } = evaluateRequirementGroups({
    studentProgram: args.studentProgram,
    requirementGroups: args.requirementGroups,
    selectedTrack: args.selectedTrack,
    plannedCourses: plannedRecords,
    catalogCourses: args.catalogCourses,
    petitions: args.petitions,
  });

  const issues: PlanValidationIssue[] = [];
  const requirementProgress: RequirementProgress[] = [];

  for (const section of sections) {
    const group = args.requirementGroups.find(
      (g) => g.id === section.requirementGroupId,
    );
    const matchedCatalogIds = new Set(
      section.matchedCourses.map((c) => c.catalogCourseId),
    );
    const missingCourseIds = group
      ? missingRequiredCourseIds(group, matchedCatalogIds)
      : [];

    requirementProgress.push({
      requirementGroupId: section.requirementGroupId,
      title: section.title,
      status: section.status,
      usedUnits: section.usedUnits,
      minUnits: section.minUnits,
      usedCourses: section.usedCourses,
      minCourses: section.minCourses,
      missingCourseIds,
    });

    if (section.status === 'waived' || section.status === 'satisfied') continue;

    if (!group) continue;

    if (group.trackId && !args.selectedTrack) {
      issues.push({
        code: 'track_unselected',
        severity: 'warning',
        message: `Select a specialization track to complete "${section.title}".`,
        catalogCourseId: null,
        year: null,
        term: null,
      });
      continue;
    }

    const isHard = HARD_REQUIREMENT_CATEGORIES.has(section.category);
    const severity = isHard ? 'error' : 'warning';
    const code = isHard ? 'requirement_unsatisfied' : 'requirement_incomplete';

    if (missingCourseIds.length > 0) {
      const catalogById = new Map(args.catalogCourses.map((c) => [c.id, c]));
      const labels = missingCourseIds
        .slice(0, 4)
        .map((id) => {
          const c = catalogById.get(id);
          return c ? `${c.subjectCode} ${c.catalogNumber}` : id;
        })
        .join(', ');
      const suffix =
        missingCourseIds.length > 4
          ? ` (+${missingCourseIds.length - 4} more)`
          : '';
      issues.push({
        code,
        severity,
        message: `"${section.title}" missing required courses: ${labels}${suffix}.`,
        catalogCourseId: missingCourseIds[0] ?? null,
        year: null,
        term: null,
      });
    } else if (
      section.usedUnits < section.minUnits ||
      section.usedCourses < section.minCourses
    ) {
      issues.push({
        code,
        severity,
        message: `"${section.title}" needs ${section.minUnits} units and ${section.minCourses} courses (${section.usedUnits}u / ${section.usedCourses} courses planned).`,
        catalogCourseId: null,
        year: null,
        term: null,
      });
    }
  }

  const plannedOnce = new Map<string, string>();
  for (const course of plannedRecords) {
    plannedOnce.set(course.catalogCourseId, course.id);
  }
  const noDoubleGroups = args.requirementGroups.filter((g) => g.noDoubleCount);
  if (noDoubleGroups.length > 1) {
    for (const [catalogCourseId] of plannedOnce) {
      const eligibleGroups = noDoubleGroups.filter((group) => {
        const allowed = new Set(
          group.rules.flatMap((rule) =>
            rule.courses.map((c) => c.catalogCourseId),
          ),
        );
        return allowed.has(catalogCourseId);
      });
      if (eligibleGroups.length > 1) {
        const unsatisfied = eligibleGroups.filter((group) => {
          const section = sections.find(
            (s) => s.requirementGroupId === group.id,
          );
          return section && section.status === 'pending';
        });
        if (unsatisfied.length > 1) {
          const catalog = args.catalogCourses.find(
            (c) => c.id === catalogCourseId,
          );
          const code = catalog
            ? `${catalog.subjectCode} ${catalog.catalogNumber}`
            : catalogCourseId;
          issues.push({
            code: 'double_count_conflict',
            severity: 'warning',
            message: `${code} may only count toward one of: ${unsatisfied.map((g) => g.title).join(', ')}.`,
            catalogCourseId,
            year: null,
            term: null,
          });
        }
      }
    }
  }

  return { issues, requirementProgress };
}
