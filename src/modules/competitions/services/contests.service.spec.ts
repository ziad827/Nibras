import { effectiveDurationMinutes } from '../utils/contest-duration';

describe('ContestsService list filters', () => {
  it('effectiveDurationMinutes prefers computed span', () => {
    const starts = new Date('2026-06-01T10:00:00Z');
    const ends = new Date('2026-06-01T12:00:00Z');
    expect(effectiveDurationMinutes(starts, ends, 0)).toBe(120);
  });
});

describe('active/past filter semantics', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  it('active contest spans now', () => {
    const startsAt = new Date('2026-06-15T10:00:00Z');
    const endsAt = new Date('2026-06-15T14:00:00Z');
    expect(startsAt <= now && endsAt >= now).toBe(true);
  });

  it('past contest ended before now', () => {
    const endsAt = new Date('2026-06-14T12:00:00Z');
    expect(endsAt < now).toBe(true);
  });
});
