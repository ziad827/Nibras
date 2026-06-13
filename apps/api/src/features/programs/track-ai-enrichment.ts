type TrackRecommendationDraft = {
  trackId: string;
  trackTitle: string;
  matchScore: number;
  matchedUnits: number;
  totalTrackUnits: number;
  matchedCourseCount: number;
  reason: string;
};

export async function enrichTrackRecommendationReasons(args: {
  year1CourseLabels: string[];
  recommendations: TrackRecommendationDraft[];
}): Promise<TrackRecommendationDraft[]> {
  const apiKey = process.env.NIBRAS_AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey || args.recommendations.length === 0) {
    return args.recommendations;
  }

  const baseURL =
    process.env.NIBRAS_AI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://api.openai.com/v1';
  const model =
    process.env.NIBRAS_AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const prompt = `You are an academic advisor. A student placed these Year 1 courses: ${args.year1CourseLabels.join(', ') || 'none yet'}.

For each track below, write ONE short sentence (max 25 words) explaining why it fits. Return JSON:
{"reasons": ["...", "...", "..."]}

Tracks:
${args.recommendations
  .map(
    (rec, index) =>
      `${index + 1}. ${rec.trackTitle} (${rec.matchScore}% unit overlap, ${rec.matchedUnits}/${rec.totalTrackUnits} units)`,
  )
  .join('\n')}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return args.recommendations;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(text) as { reasons?: string[] };
    if (!Array.isArray(parsed.reasons)) return args.recommendations;
    return args.recommendations.map((rec, index) => ({
      ...rec,
      reason: parsed.reasons?.[index]?.trim() || rec.reason,
    }));
  } catch {
    return args.recommendations;
  } finally {
    clearTimeout(timer);
  }
}
