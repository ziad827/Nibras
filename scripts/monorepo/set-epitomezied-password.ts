/**
 * Ensure EpitomeZied dev account exists and set email/password credentials.
 * Local: npm run set:epitomezied-password
 * Production: DATABASE_URL='postgresql://...' npm run set:epitomezied-password
 */
import { PrismaClient } from '@prisma/client';
import {
  EPITOMEZIED_DEV_EMAIL,
  EPITOMEZIED_DEV_PASSWORD,
  ensureEpitomeZiedDevUser,
  seedCredentialPasswordForUser,
} from '../apps/api/src/lib/local-dev-credentials';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const user = await ensureEpitomeZiedDevUser(prisma);
    await seedCredentialPasswordForUser(
      prisma,
      user.id,
      EPITOMEZIED_DEV_PASSWORD,
    );
    console.log(`✅ ${EPITOMEZIED_DEV_EMAIL}`);
    console.log(`   password: ${EPITOMEZIED_DEV_PASSWORD}`);
    console.log(`   sign in: /sign-in (email + password)`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
