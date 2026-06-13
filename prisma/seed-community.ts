/**
 * CLI entry: npm run seed:community
 * Seeds discussions and questions from each course's syllabus, assignments, and sections.
 */
import { PrismaClient } from '@prisma/client';
import { seedCommunityContent } from '../apps/api/src/lib/community-seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding community discussions and questions...\n');
  await seedCommunityContent(prisma, { log: console.log });
  console.log('\n🎉 Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
