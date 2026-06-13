export function parseCfPlatformProblemId(id: string): {
  contestId?: number;
  index: string;
} {
  const match = id.match(/^(\d+)([A-Z]\d*)$/);
  if (match) {
    return { contestId: parseInt(match[1], 10), index: match[2] };
  }
  return { index: id };
}

export function contestIdFromPlatformProblemId(id: string): number | undefined {
  const match = id.match(/^(\d+)/);
  if (!match) return undefined;
  return parseInt(match[1], 10);
}
