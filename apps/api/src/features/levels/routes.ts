import { FastifyInstance } from 'fastify';
import { LevelProgressResponseSchema } from '@nibras/contracts';
import { requireUser } from '../../lib/auth';
import { requestBaseUrl } from '../../lib/request-base-url';
import { AppStore } from '../../store';

const LEVEL_NAMES = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
] as const;
const THRESHOLDS = [0, 25, 50, 75];
const YEAR_TO_STUDY: Record<number, (typeof LEVEL_NAMES)[number]> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
  4: 'Expert',
};

export function registerLevelRoutes(
  app: FastifyInstance,
  store: AppStore,
): void {
  app.get(
    '/v1/levels/progress',
    {
      schema: {
        tags: ['levels'],
        summary: 'Get study level unlock and completion progress',
      },
    },
    async (request, reply) => {
      const auth = await requireUser(request, reply, store);
      if (!auth) return;

      const apiBaseUrl = requestBaseUrl(request);
      const studentData = await store.getStudentHomeStudentData(
        apiBaseUrl,
        auth.user.id,
        { memberships: auth.memberships },
      );

      const yearLevel = auth.user.yearLevel ?? 1;
      const studyLevel = YEAR_TO_STUDY[yearLevel] ?? 'Beginner';
      const overall =
        studentData?.overallStats?.overallCompletionPercent ?? 0;
      const snapshots = studentData?.courseSnapshots ?? [];
      const completedCount = snapshots.filter(
        (snapshot) => (snapshot.completion ?? 0) >= 100,
      ).length;
      const totalCourses = Math.max(snapshots.length, 4);
      const perLevel = Math.max(1, Math.ceil(totalCourses / 4));

      const levels = LEVEL_NAMES.map((name, index) => {
        const levelStart = index * perLevel;
        const done = Math.min(
          perLevel,
          Math.max(0, completedCount - levelStart),
        );
        const total = perLevel;
        const levelCompleted = done >= total;
        const prevCompleted =
          index === 0
            ? true
            : (() => {
                const prevStart = (index - 1) * perLevel;
                const prevDone = Math.min(
                  perLevel,
                  Math.max(0, completedCount - prevStart),
                );
                return prevDone >= perLevel;
              })();
        const unlocked =
          index === 0 ||
          prevCompleted ||
          overall >= THRESHOLDS[index] ||
          yearLevel > index;

        return {
          name,
          unlocked,
          done,
          total,
          completed: levelCompleted,
        };
      });

      return LevelProgressResponseSchema.parse({
        studyLevel,
        yearLevel,
        overallCompletionPercent: overall,
        levels,
      });
    },
  );
}
