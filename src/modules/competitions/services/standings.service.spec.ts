import { StandingsService } from './standings.service';

describe('StandingsService scoring', () => {
  const service = new StandingsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('icpcScore ranks more solves higher', () => {
    const a = service.icpcScore(3, 100);
    const b = service.icpcScore(2, 50);
    expect(a).toBeGreaterThan(b);
  });

  it('icpcScore breaks ties by lower penalty', () => {
    const a = service.icpcScore(2, 80);
    const b = service.icpcScore(2, 120);
    expect(a).toBeGreaterThan(b);
  });

  it('ioiScore uses total points', () => {
    expect(service.ioiScore(300)).toBe(300);
    expect(service.ioiScore(400)).toBeGreaterThan(service.ioiScore(300));
  });
});
