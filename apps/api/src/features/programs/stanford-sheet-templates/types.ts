export type SheetTemplateRow = {
  dept: string;
  course: string;
  title: string;
  noteRef?: string | null;
  isPlaceholder?: boolean;
  slotId?: string | null;
  /** Match catalog courses by subject+catalogNumber (case-insensitive) */
  matchCatalog?: Array<{ subjectCode: string; catalogNumber: string }>;
  /** Requirement group title prefix for elective pool fills */
  groupTitle?: string;
  ruleIndex?: number;
};

export type SheetTemplateBlock =
  | { type: 'section_header'; text: string; subtitle?: string | null }
  | { type: 'course_table'; showHeader?: boolean; rows: SheetTemplateRow[] }
  | { type: 'notes'; title?: string; items: string[] }
  | { type: 'approvals' }
  | { type: 'spacer' };

export type SheetTemplatePage = {
  title?: string | null;
  blocks: SheetTemplateBlock[];
};

export type SheetTrackTemplate = {
  trackSlug: string;
  trackSheetTitle: string;
  continuedTitle: string;
  depthSectionTitle: string;
  footnotes: Array<{ number: string; text: string }>;
  page2Blocks: SheetTemplateBlock[];
};

export type SheetTemplateBundle = {
  academicYear: string;
  disclaimer: string;
  page1: SheetTemplatePage;
  page1Notes: string[];
};
