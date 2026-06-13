/**
 * CLI entry: npm run seed:screenshot
 * Populates demo@nibras.dev with screenshot-ready showcase data.
 */
import { PrismaClient } from '@prisma/client';
import { seedDemoShowcaseData } from '../apps/api/src/lib/demo-showcase-seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🎬 Seeding demo showcase data for screenshots…\n');
  const result = await seedDemoShowcaseData(prisma, { log: console.log });
  if (result.skipped) {
    console.log(`\n⏭ Skipped: ${result.reason ?? 'unknown reason'}`);
    process.exitCode = 1;
    return;
  }
  console.log('\n🎉 Demo showcase seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
