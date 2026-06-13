import type {
  CatalogCourseRecord,
  PetitionRecord,
  RequirementGroupRecord,
  StudentProgramRecord,
  StudentPlannedCourseRecord,
  TrackRecord,
} from '../../store';
import { buildRequirementValidation } from './plan-requirement-validation';

export type AcademicTerm = 'fall' | 'spring' | 'summer' | 'away';

export type PlanValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  catalogCourseId: string | null;
  year: number | null;
  term: AcademicTerm | null;
};

export type RequirementProgress = {
  requirementGroupId: string;
  title: string;
  status: 'pending' | 'satisfied' | 'waived' | 'petition_pending';
  usedUnits: number;
  minUnits: number;
  usedCourses: number;
  minCourses: number;
  missingCourseIds: string[];
};

export type PlanValidationResult = {
  issues: PlanValidationIssue[];
  errorCount: number;
  warningCount: number;
  requirementProgress: RequirementProgress[];
};

export type CatalogCompletionInput = {
  catalogCourseId: string;
  trackingCourseId: string | null;
  trackingSlug: string | null;
  milestonePercent: number;
  videoPercent: number;
  isEnrolled: boolean;
};

export type CatalogCourseCompletion = {
  catalogCourseId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  percent: number | null;
  trackingCourseId: string | null;
  trackingSlug: string | null;
};

export type PrerequisiteGraphNode = {
  id: string;
  subjectCode: string;
  catalogNumber: string;
  title: string;
  plannerCode: string | null;
  trackingCourseId: string | null;
  isPlanned: boolean;
  isCompleted: boolean;
  hasUnmetPrerequisites: boolean;
};

export type PrerequisiteGraphEdge = {
  id: string;
  source: string;
  target: string;
};

export type PrerequisiteGraph = {
  nodes: PrerequisiteGraphNode[];
  edges: PrerequisiteGraphEdge[];
};

const TERM_ORDER: Record<AcademicTerm, number> = {
  fall: 0,
  spring: 1,
  summer: 2,
  away: 3,
};

export const MAX_TERM_UNITS = 18;

const PLACEMENT_TERMS: AcademicTerm[] = ['fall', 'spring'];

function termSortKey(year: number, term: AcademicTerm): number {
  return year * 10 + TERM_ORDER[term];
}

function summarizeValidation(
  issues: PlanValidationIssue[],
  requirementProgress: RequirementProgress[] = [],
): PlanValidationResult {
  const errorCount = issues.filter(
    (issue) => issue.severity === 'error',
  ).length;
  const warningCount = issues.filter(
    (issue) => issue.severity === 'warning',
  ).length;
  return { issues, errorCount, warningCount, requirementProgress };
}

export function computeCatalogCompletionStatus(
  input: CatalogCompletionInput,
): CatalogCourseCompletion {
  if (!input.trackingCourseId) {
    return {
      catalogCourseId: input.catalogCourseId,
      status: 'not_started',
      percent: null,
      trackingCourseId: null,
      trackingSlug: input.trackingSlug,
    };
  }
  const percent = Math.max(input.milestonePercent, input.videoPercent);
  if (percent >= 100) {
    return {
      catalogCourseId: input.catalogCourseId,
      status: 'completed',
      percent: 100,
      trackingCourseId: input.trackingCourseId,
      trackingSlug: input.trackingSlug,
    };
  }
  if (input.isEnrolled || percent > 0) {
    return {
      catalogCourseId: input.catalogCourseId,
      status: 'in_progress',
      percent: Math.round(percent),
      trackingCourseId: input.trackingCourseId,
      trackingSlug: input.trackingSlug,
    };
  }
  return {
    catalogCourseId: input.catalogCourseId,
    status: 'not_started',
    percent: null,
    trackingCourseId: input.trackingCourseId,
    trackingSlug: input.trackingSlug,
  };
}

export function canApproveStudentProgram(
  studentProgram: StudentProgramRecord,
): boolean {
  return studentProgram.status === 'submitted_for_advisor';
}

export function submitStudentProgramForAdvisor(
  studentProgram: StudentProgramRecord,
  now: string,
): StudentProgramRecord {
  return {
    ...studentProgram,
    status: 'submitted_for_advisor',
    isLocked: true,
    submittedForAdvisorAt: now,
    updatedAt: now,
  };
}

function prereqIsSatisfied(
  prereqId: string,
  placementByCourseId: Map<
    string,
    { plannedYear: number; plannedTerm: AcademicTerm }
  >,
  completedCourseIds: Set<string>,
): {
  satisfied: boolean;
  placement?: { plannedYear: number; plannedTerm: AcademicTerm };
} {
  if (completedCourseIds.has(prereqId)) {
    return { satisfied: true };
  }
  const placement = placementByCourseId.get(prereqId);
  if (!placement) {
    return { satisfied: false };
  }
  return { satisfied: true, placement };
}

export function validateStudentPlan(args: {
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
  durationYears: number;
  programId: string;
  prerequisiteMap?: Map<string, string[]>;
  completedCourseIds?: Set<string>;
  studentProgram?: StudentProgramRecord;
  petitions?: PetitionRecord[];
}): PlanValidationResult {
  const issues: PlanValidationIssue[] = [];
  const catalogById = new Map(
    args.catalogCourses.map((course) => [course.id, course]),
  );
  const validCatalogIds = new Set(
    args.catalogCourses.map((course) => course.id),
  );
  const placementByCourseId = new Map(
    args.plannedCourses.map((course) => [course.catalogCourseId, course]),
  );
  const completedCourseIds = args.completedCourseIds ?? new Set<string>();

  for (const planned of args.plannedCourses) {
    if (planned.plannedYear > args.durationYears) {
      issues.push({
        code: 'year_exceeds_duration',
        severity: 'error',
        message: `Year ${planned.plannedYear} exceeds the ${args.durationYears}-year program.`,
        catalogCourseId: planned.catalogCourseId,
        year: planned.plannedYear,
        term: planned.plannedTerm,
      });
    }
    if (!validCatalogIds.has(planned.catalogCourseId)) {
      issues.push({
        code: 'invalid_catalog_course',
        severity: 'error',
        message: 'A planned course is not part of this program catalog.',
        catalogCourseId: planned.catalogCourseId,
        year: planned.plannedYear,
        term: planned.plannedTerm,
      });
    }
  }

  const unitsByTerm = new Map<string, number>();
  for (const planned of args.plannedCourses) {
    if (planned.plannedTerm === 'away') continue;
    const catalog = catalogById.get(planned.catalogCourseId);
    if (!catalog) continue;
    const key = `${planned.plannedYear}:${planned.plannedTerm}`;
    unitsByTerm.set(key, (unitsByTerm.get(key) ?? 0) + catalog.defaultUnits);
  }
  for (const [key, units] of unitsByTerm) {
    const [yearStr, term] = key.split(':') as [string, AcademicTerm];
    if (units > MAX_TERM_UNITS) {
      issues.push({
        code: 'term_overload',
        severity: 'warning',
        message: `Year ${yearStr} ${term} has ${units} units (recommended max ${MAX_TERM_UNITS}).`,
        catalogCourseId: null,
        year: Number(yearStr),
        term,
      });
    }
  }

  if (!args.selectedTrack) {
    const trackGroups = args.requirementGroups.filter((group) => group.trackId);
    for (const planned of args.plannedCourses) {
      for (const group of trackGroups) {
        const allowed = new Set(
          group.rules.flatMap((rule) =>
            rule.courses.map((course) => course.catalogCourseId),
          ),
        );
        if (allowed.has(planned.catalogCourseId)) {
          const catalog = catalogById.get(planned.catalogCourseId);
          issues.push({
            code: 'track_course_without_track',
            severity: 'warning',
            message: `${catalog?.subjectCode ?? ''} ${catalog?.catalogNumber ?? ''} belongs to a track-specific group but no track is selected.`,
            catalogCourseId: planned.catalogCourseId,
            year: planned.plannedYear,
            term: planned.plannedTerm,
          });
        }
      }
    }
  }

  const prerequisiteMap =
    args.prerequisiteMap ??
    new Map(
      args.catalogCourses.map((course) => [
        course.id,
        course.prerequisiteIds ?? [],
      ]),
    );

  for (const planned of args.plannedCourses) {
    const prereqIds = prerequisiteMap.get(planned.catalogCourseId) ?? [];
    const plannedKey = termSortKey(planned.plannedYear, planned.plannedTerm);
    for (const prereqId of prereqIds) {
      const catalog = catalogById.get(planned.catalogCourseId);
      const prereqCatalog = catalogById.get(prereqId);
      const { satisfied, placement } = prereqIsSatisfied(
        prereqId,
        placementByCourseId,
        completedCourseIds,
      );
      if (!satisfied) {
        issues.push({
          code: 'missing_prerequisite',
          severity: 'error',
          message: `${catalog?.subjectCode ?? ''} ${catalog?.catalogNumber ?? ''} requires ${prereqCatalog?.subjectCode ?? ''} ${prereqCatalog?.catalogNumber ?? ''} to be planned earlier or completed.`,
          catalogCourseId: planned.catalogCourseId,
          year: planned.plannedYear,
          term: planned.plannedTerm,
        });
        continue;
      }
      if (placement) {
        const prereqKey = termSortKey(
          placement.plannedYear,
          placement.plannedTerm,
        );
        if (prereqKey >= plannedKey) {
          issues.push({
            code: 'prerequisite_order',
            severity: 'error',
            message: `${catalog?.subjectCode ?? ''} ${catalog?.catalogNumber ?? ''} must be scheduled after its prerequisites.`,
            catalogCourseId: planned.catalogCourseId,
            year: planned.plannedYear,
            term: planned.plannedTerm,
          });
        }
      }
    }
  }

  let requirementProgress: RequirementProgress[] = [];
  if (args.studentProgram) {
    const requirementValidation = buildRequirementValidation({
      studentProgram: args.studentProgram,
      plannedCourses: args.plannedCourses,
      catalogCourses: args.catalogCourses,
      requirementGroups: args.requirementGroups,
      selectedTrack: args.selectedTrack,
      petitions: args.petitions ?? [],
    });
    issues.push(...requirementValidation.issues);
    requirementProgress = requirementValidation.requirementProgress;
  }

  return summarizeValidation(issues, requirementProgress);
}

function topologicalSortCourseIds(
  courseIds: string[],
  prerequisiteMap: Map<string, string[]>,
): string[] {
  const idSet = new Set(courseIds);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of courseIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const id of courseIds) {
    for (const prereqId of prerequisiteMap.get(id) ?? []) {
      if (!idSet.has(prereqId)) continue;
      adjacency.get(prereqId)!.push(id);
      inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
    }
  }

  const queue = courseIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const next of adjacency.get(current) ?? []) {
      const nextDegree = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, nextDegree);
      if (nextDegree === 0) queue.push(next);
    }
  }

  const remaining = courseIds.filter((id) => !sorted.includes(id));
  return [...sorted, ...remaining];
}

function generateTermSlots(
  durationYears: number,
): Array<{ year: number; term: AcademicTerm }> {
  const slots: Array<{ year: number; term: AcademicTerm }> = [];
  for (let year = 1; year <= durationYears; year++) {
    for (const term of PLACEMENT_TERMS) {
      slots.push({ year, term });
    }
  }
  return slots;
}

export function buildRecommendedPlan(args: {
  catalogCourses: CatalogCourseRecord[];
  requirementGroups: RequirementGroupRecord[];
  selectedTrack: TrackRecord | null;
  durationYears: number;
}): Array<{
  catalogCourseId: string;
  plannedYear: number;
  plannedTerm: AcademicTerm;
  sourceType: 'standard';
  note: string | null;
}> {
  const groups = args.requirementGroups.filter((group) => {
    if (group.trackId) {
      return args.selectedTrack && group.trackId === args.selectedTrack.id;
    }
    return group.category === 'foundation' || group.category === 'core';
  });

  const courseIdSet = new Set<string>();
  for (const group of groups) {
    for (const rule of group.rules) {
      if (rule.ruleType !== 'required') continue;
      for (const course of rule.courses) {
        courseIdSet.add(course.catalogCourseId);
      }
    }
  }

  if (courseIdSet.size === 0) {
    const foundation = args.requirementGroups.find(
      (group) => group.category === 'foundation',
    );
    if (!foundation) return [];
    for (const rule of foundation.rules) {
      for (const course of rule.courses) {
        courseIdSet.add(course.catalogCourseId);
      }
    }
  }

  const catalogById = new Map(
    args.catalogCourses.map((course) => [course.id, course]),
  );
  const prerequisiteMap = new Map(
    args.catalogCourses.map((course) => [
      course.id,
      course.prerequisiteIds ?? [],
    ]),
  );
  const sortedIds = topologicalSortCourseIds([...courseIdSet], prerequisiteMap);
  const termSlots = generateTermSlots(args.durationYears);
  const unitsBySlot = new Map<string, number>();
  const placementByCourseId = new Map<
    string,
    { year: number; term: AcademicTerm }
  >();

  const planned: Array<{
    catalogCourseId: string;
    plannedYear: number;
    plannedTerm: AcademicTerm;
    sourceType: 'standard';
    note: string | null;
  }> = [];

  for (const catalogCourseId of sortedIds) {
    const catalog = catalogById.get(catalogCourseId);
    if (!catalog) continue;
    const prereqIds = prerequisiteMap.get(catalogCourseId) ?? [];

    let placed = false;
    for (const slot of termSlots) {
      const prereqsMet = prereqIds.every((prereqId) => {
        const prereqPlacement = placementByCourseId.get(prereqId);
        if (!prereqPlacement) return false;
        return (
          termSortKey(prereqPlacement.year, prereqPlacement.term) <
          termSortKey(slot.year, slot.term)
        );
      });
      if (!prereqsMet) continue;

      const slotKey = `${slot.year}:${slot.term}`;
      const currentUnits = unitsBySlot.get(slotKey) ?? 0;
      if (currentUnits + catalog.defaultUnits > MAX_TERM_UNITS) continue;

      placementByCourseId.set(catalogCourseId, {
        year: slot.year,
        term: slot.term,
      });
      unitsBySlot.set(slotKey, currentUnits + catalog.defaultUnits);
      planned.push({
        catalogCourseId,
        plannedYear: slot.year,
        plannedTerm: slot.term,
        sourceType: 'standard',
        note: null,
      });
      placed = true;
      break;
    }

    if (!placed) {
      const fallback = termSlots[termSlots.length - 1];
      planned.push({
        catalogCourseId,
        plannedYear: fallback.year,
        plannedTerm: fallback.term,
        sourceType: 'standard',
        note: null,
      });
      placementByCourseId.set(catalogCourseId, fallback);
    }
  }

  return planned;
}

export function buildPrerequisiteGraph(args: {
  catalogCourses: CatalogCourseRecord[];
  plannedCourseIds: Set<string>;
  completedCourseIds: Set<string>;
  prerequisiteMap: Map<string, string[]>;
}): PrerequisiteGraph {
  const nodes: PrerequisiteGraphNode[] = args.catalogCourses.map((course) => {
    const prereqIds = args.prerequisiteMap.get(course.id) ?? [];
    const hasUnmetPrerequisites = prereqIds.some(
      (prereqId) =>
        !args.plannedCourseIds.has(prereqId) &&
        !args.completedCourseIds.has(prereqId),
    );
    return {
      id: course.id,
      subjectCode: course.subjectCode,
      catalogNumber: course.catalogNumber,
      title: course.title,
      plannerCode: course.plannerCode ?? null,
      trackingCourseId: course.trackingCourseId ?? null,
      isPlanned: args.plannedCourseIds.has(course.id),
      isCompleted: args.completedCourseIds.has(course.id),
      hasUnmetPrerequisites,
    };
  });

  const edges: PrerequisiteGraphEdge[] = [];
  for (const course of args.catalogCourses) {
    for (const prereqId of args.prerequisiteMap.get(course.id) ?? []) {
      edges.push({
        id: `${prereqId}->${course.id}`,
        source: prereqId,
        target: course.id,
      });
    }
  }

  return { nodes, edges };
}

export function buildTrackPreview(args: {
  track: TrackRecord;
  requirementGroups: RequirementGroupRecord[];
  catalogCourses: CatalogCourseRecord[];
}): {
  trackId: string;
  trackTitle: string;
  depthGroups: RequirementGroupRecord[];
  estimatedUnits: number;
  exclusiveCourseCount: number;
} {
  const depthGroups = args.requirementGroups.filter(
    (group) => group.trackId === args.track.id,
  );
  const courseIds = new Set<string>();
  let estimatedUnits = 0;
  const catalogById = new Map(
    args.catalogCourses.map((course) => [course.id, course]),
  );
  for (const group of depthGroups) {
    for (const rule of group.rules) {
      for (const course of rule.courses) {
        if (courseIds.has(course.catalogCourseId)) continue;
        courseIds.add(course.catalogCourseId);
        estimatedUnits +=
          catalogById.get(course.catalogCourseId)?.defaultUnits ?? 0;
      }
    }
  }
  return {
    trackId: args.track.id,
    trackTitle: args.track.title,
    depthGroups,
    estimatedUnits,
    exclusiveCourseCount: courseIds.size,
  };
}
