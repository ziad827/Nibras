import {
  buildSharedPage1,
  SHARED_PAGE1_FOOTNOTES,
  STANFORD_PAGE1_NOTES,
  STANFORD_SHEET_DISCLAIMER,
} from './shared-page1';
import { STANFORD_TRACK_TEMPLATES } from './tracks';
import type { SheetTemplateBundle, SheetTrackTemplate } from './types';

export type {
  SheetTemplateRow,
  SheetTrackTemplate,
  SheetTemplateBundle,
} from './types';

export function getStanfordTrackTemplate(
  trackSlug: string | null | undefined,
): SheetTrackTemplate | null {
  if (!trackSlug) return null;
  return STANFORD_TRACK_TEMPLATES[trackSlug] ?? null;
}

export function buildStanfordSheetTemplateBundle(
  trackSlug: string | null,
): SheetTemplateBundle {
  return {
    academicYear: '2025-2026',
    disclaimer: STANFORD_SHEET_DISCLAIMER,
    page1: buildSharedPage1(),
    page1Notes: STANFORD_PAGE1_NOTES,
  };
}

export function getStanfordFootnotes(
  trackSlug: string | null,
): Array<{ number: string; text: string }> {
  const shared = SHARED_PAGE1_FOOTNOTES;
  if (!trackSlug) return shared;
  const track = STANFORD_TRACK_TEMPLATES[trackSlug];
  if (!track) return shared;
  return [...shared, ...track.footnotes];
}
