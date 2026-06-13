import { z } from 'zod';

export const ProgramStatusSchema = z.enum(['draft', 'published', 'archived']);
export const RequirementGroupCategorySchema = z.enum([
  'foundation',
  'core',
  'depth',
  'elective',
  'capstone',
  'policy',
]);
export const RequirementRuleTypeSchema = z.enum([
  'required',
  'choose_n',
  'elective_pool',
  'track_gate',
]);
export const StudentProgramStatusSchema = z.enum([
  'enrolled',
  'track_selected',
  'submitted_for_advisor',
  'advisor_approved',
  'department_approved',
]);
export const PlannedCourseSourceTypeSchema = z.enum([
  'standard',
  'transfer',
  'petition',
  'manual',
]);
export const StudentRequirementDecisionStatusSchema = z.enum([
  'pending',
  'satisfied',
  'waived',
  'petition_pending',
]);
export const RequirementDecisionSourceTypeSchema = z.enum([
  'planned_course',
  'transfer_credit',
  'petition',
  'waiver',
]);
export const PetitionTypeSchema = z.enum([
  'transfer_credit',
  'substitution',
  'waiver',
]);
export const PetitionStatusSchema = z.enum([
  'pending_advisor',
  'pending_department',
  'approved',
  'rejected',
]);
export const ApprovalStageSchema = z.enum(['advisor', 'department']);
export const ApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export const AcademicTermSchema = z.enum(['fall', 'spring', 'summer', 'away']);

export const ProgramSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  code: z.string().min(1),
  academicYear: z.string().min(1),
  totalUnitRequirement: z.number().int().positive(),
  status: ProgramStatusSchema,
  activeVersionId: z.string().min(1).nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ProgramVersionSummarySchema = z.object({
  id: z.string().min(1),
  programId: z.string().min(1),
  versionLabel: z.string().min(1),
  effectiveFrom: z.string().datetime().nullable().default(null),
  effectiveTo: z.string().datetime().nullable().default(null),
  isActive: z.boolean(),
  policyText: z.string().default(''),
  trackSelectionMinYear: z.number().int().min(1).max(4).default(2),
  durationYears: z.number().int().min(1).default(4),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TrackSummarySchema = z.object({
  id: z.string().min(1),
  programVersionId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  selectionYearStart: z.number().int().min(1).max(4).default(2),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CatalogCourseSchema = z.object({
  id: z.string().min(1),
  programId: z.string().min(1),
  subjectCode: z.string().min(1),
  catalogNumber: z.string().min(1),
  title: z.string().min(1),
  defaultUnits: z.number().int().positive(),
  department: z.string().min(1),
  plannerCode: z.string().nullable().default(null),
  trackingCourseId: z.string().min(1).nullable().default(null),
  prerequisiteIds: z.array(z.string().min(1)).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const RequirementCourseSchema = z.object({
  id: z.string().min(1),
  requirementRuleId: z.string().min(1),
  catalogCourseId: z.string().min(1),
});

export const RequirementRuleSchema = z.object({
  id: z.string().min(1),
  requirementGroupId: z.string().min(1),
  ruleType: RequirementRuleTypeSchema,
  pickCount: z.number().int().positive().nullable().default(null),
  note: z.string().default(''),
  sortOrder: z.number().int().nonnegative().default(0),
  courses: z.array(RequirementCourseSchema).default([]),
});

export const RequirementGroupSchema = z.object({
  id: z.string().min(1),
  programVersionId: z.string().min(1),
  trackId: z.string().min(1).nullable().default(null),
  title: z.string().min(1),
  category: RequirementGroupCategorySchema,
  minUnits: z.number().int().nonnegative().default(0),
  minCourses: z.number().int().nonnegative().default(0),
  notes: z.string().default(''),
  sortOrder: z.number().int().nonnegative().default(0),
  noDoubleCount: z.boolean().default(true),
  rules: z.array(RequirementRuleSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ProgramVersionDetailSchema = z.object({
  program: ProgramSummarySchema,
  version: ProgramVersionSummarySchema,
  tracks: z.array(TrackSummarySchema),
  catalogCourses: z.array(CatalogCourseSchema),
  requirementGroups: z.array(RequirementGroupSchema),
});

export const ExpectedGradeSchema = z.enum([
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'C-',
  'D+',
  'D',
  'D-',
  'F',
  'P',
  'NP',
]);

export const StudentPlannedCourseSchema = z.object({
  id: z.string().min(1),
  studentProgramId: z.string().min(1),
  catalogCourseId: z.string().min(1),
  plannedYear: z.number().int().min(1),
  plannedTerm: AcademicTermSchema,
  sourceType: PlannedCourseSourceTypeSchema,
  note: z.string().nullable().default(null),
  expectedGrade: ExpectedGradeSchema.nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const StudentRequirementDecisionSchema = z.object({
  id: z.string().min(1),
  studentProgramId: z.string().min(1),
  requirementGroupId: z.string().min(1),
  status: StudentRequirementDecisionStatusSchema,
  sourceType: RequirementDecisionSourceTypeSchema.nullable().default(null),
  notes: z.string().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PetitionCourseLinkSchema = z.object({
  id: z.string().min(1),
  petitionId: z.string().min(1),
  originalCatalogCourseId: z.string().min(1).nullable().default(null),
  substituteCatalogCourseId: z.string().min(1).nullable().default(null),
});

export const PetitionSchema = z.object({
  id: z.string().min(1),
  studentProgramId: z.string().min(1),
  type: PetitionTypeSchema,
  status: PetitionStatusSchema,
  justification: z.string().min(1),
  attachmentUrl: z.string().url().nullable().default(null),
  targetRequirementGroupId: z.string().min(1).nullable().default(null),
  submittedByUserId: z.string().min(1),
  reviewerUserId: z.string().min(1).nullable().default(null),
  reviewerNotes: z.string().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  courseLinks: z.array(PetitionCourseLinkSchema).default([]),
});

export const ProgramApprovalSchema = z.object({
  id: z.string().min(1),
  studentProgramId: z.string().min(1),
  stage: ApprovalStageSchema,
  status: ApprovalStatusSchema,
  reviewerUserId: z.string().min(1).nullable().default(null),
  notes: z.string().nullable().default(null),
  decidedAt: z.string().datetime().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ProgramSheetSectionCourseSchema = z.object({
  plannedCourseId: z.string().min(1),
  catalogCourseId: z.string().min(1),
  subjectCode: z.string().min(1),
  catalogNumber: z.string().min(1),
  title: z.string().min(1),
  units: z.number().int().positive(),
  plannedYear: z.number().int().min(1),
  plannedTerm: AcademicTermSchema,
  sourceType: PlannedCourseSourceTypeSchema,
});

export const ProgramSheetSectionSchema = z.object({
  requirementGroupId: z.string().min(1),
  title: z.string().min(1),
  category: RequirementGroupCategorySchema,
  minUnits: z.number().int().nonnegative(),
  minCourses: z.number().int().nonnegative(),
  notes: z.string().default(''),
  matchedCourses: z.array(ProgramSheetSectionCourseSchema),
  usedUnits: z.number().int().nonnegative(),
  usedCourses: z.number().int().nonnegative(),
  status: StudentRequirementDecisionStatusSchema,
});

export const ProgramSheetLayoutSchema = z.enum(['stanford_2026', 'legacy']);

export const ProgramSheetHeaderSchema = z.object({
  schoolLine: z.string().min(1),
  programLine: z.string().min(1),
  trackLine: z.string().min(1),
  academicYear: z.string().min(1),
  disclaimer: z.string().default(''),
});

export const ProgramSheetStudentFieldsSchema = z.object({
  fullName: z.string().default(''),
  suid: z.string().nullable().default(null),
  email: z.string().email(),
  todayDate: z.string().default(''),
  expectedGraduationQuarter: z.string().nullable().default(null),
});

export const ProgramSheetMatchedRowSchema = z.object({
  plannedCourseId: z.string().min(1),
  catalogCourseId: z.string().min(1),
  units: z.number().int().positive(),
  grade: z.string().nullable().default(null),
  transferApproved: z.boolean().default(false),
});

export const ProgramSheetCourseRowSchema = z.object({
  dept: z.string().default(''),
  course: z.string().default(''),
  title: z.string().default(''),
  noteRef: z.string().nullable().default(null),
  isPlaceholder: z.boolean().default(false),
  slotId: z.string().nullable().default(null),
  matched: ProgramSheetMatchedRowSchema.nullable().default(null),
});

export const ProgramSheetSectionHeaderBlockSchema = z.object({
  type: z.literal('section_header'),
  text: z.string().min(1),
  subtitle: z.string().nullable().default(null),
});

export const ProgramSheetCourseTableBlockSchema = z.object({
  type: z.literal('course_table'),
  showHeader: z.boolean().default(true),
  rows: z.array(ProgramSheetCourseRowSchema),
});

export const ProgramSheetNotesBlockSchema = z.object({
  type: z.literal('notes'),
  title: z.string().default('NOTES'),
  items: z.array(z.string()),
});

export const ProgramSheetApprovalsBlockSchema = z.object({
  type: z.literal('approvals'),
});

export const ProgramSheetSpacerBlockSchema = z.object({
  type: z.literal('spacer'),
});

export const ProgramSheetBlockSchema = z.discriminatedUnion('type', [
  ProgramSheetSectionHeaderBlockSchema,
  ProgramSheetCourseTableBlockSchema,
  ProgramSheetNotesBlockSchema,
  ProgramSheetApprovalsBlockSchema,
  ProgramSheetSpacerBlockSchema,
]);

export const ProgramSheetPageSchema = z.object({
  title: z.string().nullable().default(null),
  blocks: z.array(ProgramSheetBlockSchema),
});

export const ProgramSheetFootnoteSchema = z.object({
  number: z.string().min(1),
  text: z.string().min(1),
});

export const ProgramSheetViewSchema = z.object({
  studentProgramId: z.string().min(1),
  sheetLayout: ProgramSheetLayoutSchema.default('legacy'),
  student: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
    email: z.string().email(),
    yearLevel: z.number().int().min(1).max(4),
  }),
  program: ProgramSummarySchema,
  version: ProgramVersionSummarySchema,
  selectedTrack: TrackSummarySchema.nullable().default(null),
  status: StudentProgramStatusSchema,
  isLocked: z.boolean(),
  canSelectTrack: z.boolean(),
  generatedAt: z.string().datetime().nullable().default(null),
  policyText: z.string().default(''),
  header: ProgramSheetHeaderSchema.nullable().default(null),
  studentFields: ProgramSheetStudentFieldsSchema.nullable().default(null),
  pages: z.array(ProgramSheetPageSchema).default([]),
  footnotes: z.array(ProgramSheetFootnoteSchema).default([]),
  sections: z.array(ProgramSheetSectionSchema),
  petitions: z.array(PetitionSchema),
  approvals: z.array(ProgramApprovalSchema),
});

export const CatalogCourseCompletionSchema = z.object({
  catalogCourseId: z.string().min(1),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  percent: z.number().min(0).max(100).nullable().default(null),
  trackingCourseId: z.string().min(1).nullable().default(null),
  trackingSlug: z.string().nullable().default(null),
});

export const PlanValidationIssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(['error', 'warning']),
  message: z.string().min(1),
  catalogCourseId: z.string().min(1).nullable().default(null),
  year: z.number().int().min(1).nullable().default(null),
  term: AcademicTermSchema.nullable().default(null),
});

export const RequirementProgressSchema = z.object({
  requirementGroupId: z.string().min(1),
  title: z.string().min(1),
  status: StudentRequirementDecisionStatusSchema,
  usedUnits: z.number().int().nonnegative(),
  minUnits: z.number().int().nonnegative(),
  usedCourses: z.number().int().nonnegative(),
  minCourses: z.number().int().nonnegative(),
  missingCourseIds: z.array(z.string().min(1)).default([]),
});

export const PlanValidationResultSchema = z.object({
  issues: z.array(PlanValidationIssueSchema),
  errorCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  requirementProgress: z.array(RequirementProgressSchema).default([]),
});

export const PrerequisiteGraphNodeSchema = z.object({
  id: z.string().min(1),
  subjectCode: z.string().min(1),
  catalogNumber: z.string().min(1),
  title: z.string().min(1),
  plannerCode: z.string().nullable().default(null),
  trackingCourseId: z.string().min(1).nullable().default(null),
  isPlanned: z.boolean(),
  isCompleted: z.boolean(),
  hasUnmetPrerequisites: z.boolean(),
});

export const PrerequisiteGraphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
});

export const PrerequisiteGraphSchema = z.object({
  nodes: z.array(PrerequisiteGraphNodeSchema),
  edges: z.array(PrerequisiteGraphEdgeSchema),
});

export const RecommendedPlannedCourseSchema = z.object({
  catalogCourseId: z.string().min(1),
  plannedYear: z.number().int().min(1),
  plannedTerm: AcademicTermSchema,
  sourceType: PlannedCourseSourceTypeSchema.default('standard'),
  note: z.string().nullable().default(null),
  expectedGrade: ExpectedGradeSchema.nullable().optional(),
});

export const RecommendedPlanSchema = z.object({
  plannedCourses: z.array(RecommendedPlannedCourseSchema),
});

export const TrackPreviewSchema = z.object({
  trackId: z.string().min(1),
  trackTitle: z.string().min(1),
  depthGroups: z.array(RequirementGroupSchema),
  estimatedUnits: z.number().int().nonnegative(),
  exclusiveCourseCount: z.number().int().nonnegative(),
});

export const StudentProgramSummarySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email(),
  status: StudentProgramStatusSchema,
  submittedForAdvisorAt: z.string().datetime().nullable().default(null),
  selectedTrackTitle: z.string().nullable().default(null),
});

export const StudentProgramPlanSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  program: ProgramSummarySchema,
  version: ProgramVersionSummarySchema,
  selectedTrack: TrackSummarySchema.nullable().default(null),
  availableTracks: z.array(TrackSummarySchema),
  status: StudentProgramStatusSchema,
  isLocked: z.boolean(),
  canSelectTrack: z.boolean(),
  submittedForAdvisorAt: z.string().datetime().nullable().default(null),
  catalogCourses: z.array(CatalogCourseSchema),
  requirementGroups: z.array(RequirementGroupSchema),
  plannedCourses: z.array(StudentPlannedCourseSchema),
  decisions: z.array(StudentRequirementDecisionSchema),
  petitions: z.array(PetitionSchema),
  approvals: z.array(ProgramApprovalSchema),
  latestSheet: ProgramSheetViewSchema.nullable().default(null),
  completions: z.array(CatalogCourseCompletionSchema).default([]),
  validation: PlanValidationResultSchema.nullable().default(null),
});

export const CreateProgramRequestSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(1),
  code: z.string().min(1),
  academicYear: z.string().min(1),
  totalUnitRequirement: z.number().int().positive().default(120),
  status: ProgramStatusSchema.default('draft'),
});

export const CreateProgramVersionRequestSchema = z.object({
  versionLabel: z.string().min(1),
  effectiveFrom: z.string().datetime().nullable().default(null),
  effectiveTo: z.string().datetime().nullable().default(null),
  isActive: z.boolean().default(false),
  policyText: z.string().default(''),
  trackSelectionMinYear: z.number().int().min(1).max(4).default(2),
  durationYears: z.number().int().min(1).default(4),
});

export const CreateCatalogCourseRequestSchema = z.object({
  subjectCode: z.string().min(1),
  catalogNumber: z.string().min(1),
  title: z.string().min(1),
  defaultUnits: z.number().int().positive(),
  department: z.string().min(1),
});

const RequirementCourseRefSchema = z.object({
  catalogCourseId: z.string().min(1),
});

const RequirementRuleInputSchema = z.object({
  ruleType: RequirementRuleTypeSchema,
  pickCount: z.number().int().positive().nullable().default(null),
  note: z.string().default(''),
  sortOrder: z.number().int().nonnegative().default(0),
  courses: z.array(RequirementCourseRefSchema).default([]),
});

export const CreateRequirementGroupRequestSchema = z.object({
  programVersionId: z.string().min(1),
  trackId: z.string().min(1).nullable().default(null),
  title: z.string().min(1),
  category: RequirementGroupCategorySchema,
  minUnits: z.number().int().nonnegative().default(0),
  minCourses: z.number().int().nonnegative().default(0),
  notes: z.string().default(''),
  sortOrder: z.number().int().nonnegative().default(0),
  noDoubleCount: z.boolean().default(true),
  rules: z.array(RequirementRuleInputSchema).default([]),
});

export const UpdateRequirementGroupRequestSchema =
  CreateRequirementGroupRequestSchema.partial().omit({
    programVersionId: true,
  });

export const CreateTrackRequestSchema = z.object({
  programVersionId: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(1),
  description: z.string().default(''),
  selectionYearStart: z.number().int().min(1).max(4).default(2),
});

export const UpdateTrackRequestSchema = CreateTrackRequestSchema.partial().omit(
  {
    programVersionId: true,
  },
);

export const SelectTrackRequestSchema = z.object({
  trackId: z.string().min(1),
});

export const UpdateStudentPlanRequestSchema = z
  .object({
    plannedCourses: z
      .array(
        z.object({
          catalogCourseId: z.string().min(1),
          plannedYear: z.number().int().min(1),
          plannedTerm: AcademicTermSchema,
          sourceType: PlannedCourseSourceTypeSchema.default('standard'),
          note: z.string().nullable().default(null),
          expectedGrade: ExpectedGradeSchema.nullable().optional(),
        }),
      )
      .optional(),
    suid: z.string().nullable().optional(),
    expectedGraduationQuarter: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.plannedCourses) return true;
      return (
        new Set(data.plannedCourses.map((c) => c.catalogCourseId)).size ===
        data.plannedCourses.length
      );
    },
    {
      message: 'Each course may only appear once in the plan.',
      path: ['plannedCourses'],
    },
  );

export const CreatePetitionRequestSchema = z.object({
  type: PetitionTypeSchema,
  justification: z.string().min(1),
  attachmentUrl: z.string().url().nullable().default(null),
  targetRequirementGroupId: z.string().min(1).nullable().default(null),
  originalCatalogCourseId: z.string().min(1).nullable().default(null),
  substituteCatalogCourseId: z.string().min(1).nullable().default(null),
});

export const SubmitForAdvisorRequestSchema = z.object({
  note: z.string().nullable().default(null),
});

export const SetCatalogPrerequisitesRequestSchema = z.object({
  prerequisiteCourseIds: z.array(z.string().min(1)),
});

export const UpdatePetitionRequestSchema = z.object({
  status: PetitionStatusSchema,
  reviewerNotes: z.string().nullable().default(null),
});

export const ProgramApprovalRequestSchema = z.object({
  status: ApprovalStatusSchema.default('approved'),
  notes: z.string().nullable().default(null),
});

export const TrackRecommendationSchema = z.object({
  trackId: z.string().min(1),
  trackTitle: z.string().min(1),
  trackSlug: z.string().min(1),
  trackDescription: z.string().default(''),
  matchScore: z.number().int().min(0).max(100),
  matchedUnits: z.number().int().nonnegative(),
  totalTrackUnits: z.number().int().nonnegative(),
  matchedCourseCount: z.number().int().nonnegative(),
  reason: z.string().min(1),
});

export const TrackRecommendationResponseSchema = z.object({
  recommendations: z.array(TrackRecommendationSchema),
  year1CourseCount: z.number().int().nonnegative(),
});

export type ProgramSummary = z.infer<typeof ProgramSummarySchema>;
export type ProgramVersionSummary = z.infer<typeof ProgramVersionSummarySchema>;
export type TrackSummary = z.infer<typeof TrackSummarySchema>;
export type CatalogCourse = z.infer<typeof CatalogCourseSchema>;
export type RequirementCourse = z.infer<typeof RequirementCourseSchema>;
export type RequirementRule = z.infer<typeof RequirementRuleSchema>;
export type RequirementGroup = z.infer<typeof RequirementGroupSchema>;
export type ProgramVersionDetail = z.infer<typeof ProgramVersionDetailSchema>;
export type StudentPlannedCourse = z.infer<typeof StudentPlannedCourseSchema>;
export type StudentRequirementDecision = z.infer<
  typeof StudentRequirementDecisionSchema
>;
export type PetitionCourseLink = z.infer<typeof PetitionCourseLinkSchema>;
export type Petition = z.infer<typeof PetitionSchema>;
export type ProgramApproval = z.infer<typeof ProgramApprovalSchema>;
export type ProgramSheetView = z.infer<typeof ProgramSheetViewSchema>;
export type ProgramSheetHeader = z.infer<typeof ProgramSheetHeaderSchema>;
export type ProgramSheetStudentFields = z.infer<
  typeof ProgramSheetStudentFieldsSchema
>;
export type ProgramSheetCourseRow = z.infer<typeof ProgramSheetCourseRowSchema>;
export type ProgramSheetBlock = z.infer<typeof ProgramSheetBlockSchema>;
export type ProgramSheetPage = z.infer<typeof ProgramSheetPageSchema>;
export type ProgramSheetFootnote = z.infer<typeof ProgramSheetFootnoteSchema>;
export type StudentProgramPlan = z.infer<typeof StudentProgramPlanSchema>;
export type CreateProgramRequest = z.infer<typeof CreateProgramRequestSchema>;
export type CreateProgramVersionRequest = z.infer<
  typeof CreateProgramVersionRequestSchema
>;
export type CreateCatalogCourseRequest = z.infer<
  typeof CreateCatalogCourseRequestSchema
>;
export type CreateRequirementGroupRequest = z.infer<
  typeof CreateRequirementGroupRequestSchema
>;
export type UpdateRequirementGroupRequest = z.infer<
  typeof UpdateRequirementGroupRequestSchema
>;
export type CreateTrackRequest = z.infer<typeof CreateTrackRequestSchema>;
export type UpdateTrackRequest = z.infer<typeof UpdateTrackRequestSchema>;
export type SelectTrackRequest = z.infer<typeof SelectTrackRequestSchema>;
export type UpdateStudentPlanRequest = z.infer<
  typeof UpdateStudentPlanRequestSchema
>;
export type TrackRecommendation = z.infer<typeof TrackRecommendationSchema>;
export type TrackRecommendationResponse = z.infer<
  typeof TrackRecommendationResponseSchema
>;
export type CreatePetitionRequest = z.infer<typeof CreatePetitionRequestSchema>;
export type UpdatePetitionRequest = z.infer<typeof UpdatePetitionRequestSchema>;
export type ProgramApprovalRequest = z.infer<
  typeof ProgramApprovalRequestSchema
>;
export type CatalogCourseCompletion = z.infer<
  typeof CatalogCourseCompletionSchema
>;
export type PlanValidationIssue = z.infer<typeof PlanValidationIssueSchema>;
export type RequirementProgress = z.infer<typeof RequirementProgressSchema>;
export type PlanValidationResult = z.infer<typeof PlanValidationResultSchema>;
export type PrerequisiteGraph = z.infer<typeof PrerequisiteGraphSchema>;
export type PrerequisiteGraphNode = z.infer<typeof PrerequisiteGraphNodeSchema>;
export type PrerequisiteGraphEdge = z.infer<typeof PrerequisiteGraphEdgeSchema>;
export type RecommendedPlan = z.infer<typeof RecommendedPlanSchema>;
export type TrackPreview = z.infer<typeof TrackPreviewSchema>;
export type StudentProgramSummary = z.infer<typeof StudentProgramSummarySchema>;
export type SubmitForAdvisorRequest = z.infer<
  typeof SubmitForAdvisorRequestSchema
>;
export type SetCatalogPrerequisitesRequest = z.infer<
  typeof SetCatalogPrerequisitesRequestSchema
>;
