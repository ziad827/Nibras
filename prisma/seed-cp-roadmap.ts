/**
 * CP Roadmap curriculum seed — imports static JSON/TS export into Postgres.
 * Run: npm run seed:cp-roadmap
 */
import { PrismaClient } from '@prisma/client';
import { seedCpRoadmapCurriculum } from '../apps/api/src/lib/cp-roadmap-seed';

const prisma = new PrismaClient();

async function main() {
  const result = await seedCpRoadmapCurriculum(prisma, { force: true });
  if (result.skipped) {
    console.log(
      'CP Roadmap seed skipped (already populated). Use force path via API seed module.',
    );
    return;
  }
  console.log(
    `CP Roadmap seed complete: ${result.categoryCount} categories, ${result.topicCount} topics, ${result.problemCount} problem upserts, ${result.linkCount} topic-problem links`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
