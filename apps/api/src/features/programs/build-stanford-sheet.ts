import type {
  CatalogCourseRecord,
  ProgramSheetBlockRecord,
  ProgramSheetCourseRowRecord,
  ProgramSheetFootnoteRecord,
  ProgramSheetHeaderRecord,
  ProgramSheetPageRecord,
  ProgramSheetSectionRecord,
  ProgramSheetStudentFieldsRecord,
  ProgramSheetViewRecord,
  RequirementGroupRecord,
  TrackRecord,
  UserRecord,
} from '../../store';
import {
  buildStanfordSheetTemplateBundle,
  getStanfordFootnotes,
  getStanfordTrackTemplate,
} from './stanford-sheet-templates';
import type {
  SheetTemplateBlock,
  SheetTemplateRow,
} from './stanford-sheet-templates/types';
import { STANFORD_SHEET_DISCLAIMER } from './stanford-sheet-templates/shared-page1';

type MatchedCourse = ProgramSheetSectionRecord['matchedCourses'][number];

function catalogKey(course: CatalogCourseRecord): string {
  return `${course.subjectCode.toUpperCase()}|${course.catalogNumber.toUpperCase()}`;
}

function matchesCatalog(
  course: CatalogCourseRecord,
  patterns: Array<{ subjectCode: string; catalogNumber: string }>,
): boolean {
  const key = catalogKey(course);
  return patterns.some(
    (pattern) =>
      key ===
      `${pattern.subjectCode.toUpperCase()}|${pattern.catalogNumber.toUpperCase()}`,
  );
}

function buildMatchIndex(
  sections: ProgramSheetSectionRecord[],
  catalogCourses: CatalogCourseRecord[],
  requirementGroups: RequirementGroupRecord[],
): {
  byCatalogId: Map<string, MatchedCourse[]>;
  byGroupTitle: Map<string, MatchedCourse[]>;
  groupRules: Map<string, RequirementGroupRecord>;
} {
  const courseById = new Map(catalogCourses.map((c) => [c.id, c]));
  const byCatalogId = new Map<string, MatchedCourse[]>();
  const byGroupTitle = new Map<string, MatchedCourse[]>();
  const groupRules = new Map(requirementGroups.map((g) => [g.title, g]));

  for (const section of sections) {
    const groupTitle = section.title;
    for (const matched of section.matchedCourses) {
      const list = byCatalogId.get(matched.catalogCourseId) ?? [];
      list.push(matched);
      byCatalogId.set(matched.catalogCourseId, list);
      const groupList = byGroupTitle.get(groupTitle) ?? [];
      groupList.push(matched);
      byGroupTitle.set(groupTitle, groupList);
    }
  }

  return { byCatalogId, byGroupTitle, groupRules };
}

function takeUnused(
  pool: MatchedCourse[],
  used: Set<string>,
): MatchedCourse | null {
  const match = pool.find((entry) => !used.has(entry.plannedCourseId));
  if (!match) return null;
  used.add(match.plannedCourseId);
  return match;
}

function resolveRowMatch(
  row: SheetTemplateRow,
  catalogCourses: CatalogCourseRecord[],
  index: ReturnType<typeof buildMatchIndex>,
  usedPlannedIds: Set<string>,
): ProgramSheetCourseRowRecord['matched'] {
  if (row.isPlaceholder && row.groupTitle) {
    const pool = index.byGroupTitle.get(row.groupTitle) ?? [];
    const filtered =
      row.matchCatalog && row.matchCatalog.length > 0
        ? pool.filter((m) => {
            const course = catalogCourses.find(
              (c) => c.id === m.catalogCourseId,
            );
            return course && matchesCatalog(course, row.matchCatalog!);
          })
        : pool;
    const match = takeUnused(filtered, usedPlannedIds);
    if (match) return toMatchedRow(match);
    return null;
  }

  if (row.matchCatalog && row.matchCatalog.length > 0) {
    for (const course of catalogCourses) {
      if (!matchesCatalog(course, row.matchCatalog)) continue;
      const pool = index.byCatalogId.get(course.id) ?? [];
      const match = takeUnused(pool, usedPlannedIds);
      if (match) return toMatchedRow(match);
    }
  }

  if (row.groupTitle) {
    const pool = index.byGroupTitle.get(row.groupTitle) ?? [];
    const match = takeUnused(pool, usedPlannedIds);
    if (match) return toMatchedRow(match);
  }

  return null;
}

function toMatchedRow(
  match: MatchedCourse,
): ProgramSheetCourseRowRecord['matched'] {
  return {
    plannedCourseId: match.plannedCourseId,
    catalogCourseId: match.catalogCourseId,
    units: match.units,
    grade: null,
    transferApproved: match.sourceType === 'transfer',
  };
}

function renderTemplateRow(
  row: SheetTemplateRow,
  catalogCourses: CatalogCourseRecord[],
  index: ReturnType<typeof buildMatchIndex>,
  usedPlannedIds: Set<string>,
): ProgramSheetCourseRowRecord {
  return {
    dept: row.dept,
    course: row.course,
    title: row.title,
    noteRef: row.noteRef ?? null,
    isPlaceholder: row.isPlaceholder ?? false,
    slotId: row.slotId ?? null,
    matched: resolveRowMatch(row, catalogCourses, index, usedPlannedIds),
  };
}

function renderBlocks(
  blocks: SheetTemplateBlock[],
  catalogCourses: CatalogCourseRecord[],
  index: ReturnType<typeof buildMatchIndex>,
  usedPlannedIds: Set<string>,
): ProgramSheetBlockRecord[] {
  return blocks.map((block) => {
    if (block.type === 'section_header') {
      return {
        type: 'section_header',
        text: block.text,
        subtitle: block.subtitle ?? null,
      };
    }
    if (block.type === 'course_table') {
      return {
        type: 'course_table',
        showHeader: block.showHeader ?? true,
        rows: block.rows.map((row) =>
          renderTemplateRow(row, catalogCourses, index, usedPlannedIds),
        ),
      };
    }
    if (block.type === 'notes') {
      return {
        type: 'notes',
        title: block.title ?? 'NOTES',
        items: block.items,
      };
    }
    if (block.type === 'approvals') {
      return { type: 'approvals' };
    }
    return { type: 'spacer' };
  });
}

function renderFootnotes(
  items: Array<{ number: string; text: string }>,
): ProgramSheetFootnoteRecord[] {
  return items.map((item) => ({ number: item.number, text: item.text }));
}

export function enrichSheetWithStanfordLayout(args: {
  sheet: ProgramSheetViewRecord;
  user: UserRecord;
  catalogCourses: CatalogCourseRecord[];
  requirementGroups: RequirementGroupRecord[];
  displayName?: string | null;
}): ProgramSheetViewRecord {
  const trackSlug = args.sheet.selectedTrack?.slug ?? null;
  const trackTemplate = getStanfordTrackTemplate(trackSlug);
  const bundle = buildStanfordSheetTemplateBundle(trackSlug);
  const matchIndex = buildMatchIndex(
    args.sheet.sections,
    args.catalogCourses,
    args.requirementGroups,
  );
  const usedPlannedIds = new Set<string>();

  const header: ProgramSheetHeaderRecord = {
    schoolLine: "Stanford University's School of Engineering",
    programLine: 'Computer Science',
    trackLine: trackTemplate?.trackSheetTitle ?? 'Program Sheet',
    academicYear: bundle.academicYear,
    disclaimer: STANFORD_SHEET_DISCLAIMER,
  };

  const today = new Date().toISOString().slice(0, 10);
  const studentFields: ProgramSheetStudentFieldsRecord = {
    fullName: args.displayName?.trim() || args.user.username,
    suid: args.sheet.studentFields?.suid ?? null,
    email: args.user.email,
    todayDate: today,
    expectedGraduationQuarter:
      args.sheet.studentFields?.expectedGraduationQuarter ?? null,
  };

  const page1: ProgramSheetPageRecord = {
    title: null,
    blocks: renderBlocks(
      bundle.page1.blocks,
      args.catalogCourses,
      matchIndex,
      usedPlannedIds,
    ),
  };

  const page2Blocks: SheetTemplateBlock[] = trackTemplate
    ? [
        ...trackTemplate.page2Blocks,
        {
          type: 'notes',
          title: '',
          items: trackTemplate.footnotes.map((f) => `(${f.number}) ${f.text}`),
        },
      ]
    : [
        {
          type: 'section_header',
          text: 'Select a specialization track to view Core, Depth, and Senior Project requirements.',
        },
      ];

  const page2: ProgramSheetPageRecord = {
    title: trackTemplate?.continuedTitle ?? null,
    blocks: renderBlocks(
      page2Blocks,
      args.catalogCourses,
      matchIndex,
      usedPlannedIds,
    ),
  };

  const footnotes = renderFootnotes(getStanfordFootnotes(trackSlug));

  return {
    ...args.sheet,
    sheetLayout: 'stanford_2026',
    header,
    studentFields,
    pages: [page1, page2],
    footnotes,
  };
}

export function isStanfordCsProgram(
  versionLabel: string,
  programCode: string,
): boolean {
  return programCode === 'CS' && versionLabel.includes('2025-2026');
}
