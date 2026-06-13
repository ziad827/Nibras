import type {
  CatalogCourseRecord,
  PetitionRecord,
  RequirementGroupRecord,
  StudentProgramRecord,
  TrackRecord,
} from '../../store';
import {
  buildPrerequisiteGraph,
  buildRecommendedPlan,
  buildTrackPreview,
  computeCatalogCompletionStatus,
  validateStudentPlan,
  type AcademicTerm,
  type CatalogCompletionInput,
  type PlanValidationResult,
} from './planner-validation';

export function buildPrerequisiteMap(
  catalogCourses: CatalogCourseRecord[],
): Map<string, string[]> {
  return new Map(
    catalogCourses.map((course) => [course.id, course.prerequisiteIds ?? []]),
  );
}

export function validatePlanForStudent(args: {
  plannedCourses: Array<{
    catalogCourseId: string;
    plannedYear: number;
    plannedTerm: AcademicTerm;
    sourceType?: 'standard' | 'transfer' | 'petition' | 'manual';
    note?: string | null;
  }>;
  catalogCourses: CatalogCourseRecord[];
  requirementGroups: RequirementGroupRecord[];
  selectedTrack: TrackRecord | null;
  durationYears: number;
  programId: string;
  completedCourseIds?: Set<string>;
  studentProgram?: StudentProgramRecord;
  petitions?: PetitionRecord[];
}): PlanValidationResult {
  return validateStudentPlan({
    ...args,
    prerequisiteMap: buildPrerequisiteMap(args.catalogCourses),
  });
}

export function enrichStudentProgramPlan(
  plan: Omit<
    import('../../store').StudentProgramPlanRecord,
    'completions' | 'validation' | 'submittedForAdvisorAt'
  >,
  args: {
    studentProgram: StudentProgramRecord;
    completionInputs: CatalogCompletionInput[];
    petitions?: PetitionRecord[];
  },
): import('../../store').StudentProgramPlanRecord {
  const completions = args.completionInputs.map(computeCatalogCompletionStatus);
  const completedIds = new Set(
    completions
      .filter((entry) => entry.status === 'completed')
      .map((entry) => entry.catalogCourseId),
  );
  const validation = validatePlanForStudent({
    plannedCourses: plan.plannedCourses.map((course) => ({
      catalogCourseId: course.catalogCourseId,
      plannedYear: course.plannedYear,
      plannedTerm: course.plannedTerm,
      sourceType: course.sourceType,
      note: course.note,
    })),
    catalogCourses: plan.catalogCourses,
    requirementGroups: plan.requirementGroups,
    selectedTrack: plan.selectedTrack,
    durationYears: plan.version.durationYears,
    programId: plan.program.id,
    completedCourseIds: completedIds,
    studentProgram: args.studentProgram,
    petitions: args.petitions ?? plan.petitions,
  });

  return {
    ...plan,
    submittedForAdvisorAt: args.studentProgram.submittedForAdvisorAt,
    completions,
    validation,
  };
}

export function buildStudentPrerequisiteGraph(args: {
  catalogCourses: CatalogCourseRecord[];
  plannedCourses: import('../../store').StudentPlannedCourseRecord[];
  completionInputs: CatalogCompletionInput[];
}) {
  const plannedIds = new Set(
    args.plannedCourses.map((course) => course.catalogCourseId),
  );
  const completedIds = new Set(
    args.completionInputs
      .map((input) => computeCatalogCompletionStatus(input))
      .filter((entry) => entry.status === 'completed')
      .map((entry) => entry.catalogCourseId),
  );
  return buildPrerequisiteGraph({
    catalogCourses: args.catalogCourses,
    plannedCourseIds: plannedIds,
    completedCourseIds: completedIds,
    prerequisiteMap: buildPrerequisiteMap(args.catalogCourses),
  });
}

export { buildRecommendedPlan, buildTrackPreview };
