import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/auth/schemas/user.schema';
import { Role } from '../src/modules/rbac/schemas/role.schema';
import { SessionService } from '../src/modules/auth/services/session.service';

const DEV_EMAIL = 'dev-student@local.nibras';
const DEV_USERNAME = 'dev_student';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const roleModel = app.get<Model<Role>>(getModelToken(Role.name));
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    const sessionService = app.get(SessionService);

    const studentRole = await roleModel.findOne({ name: 'student' }).exec();
    if (!studentRole) {
      throw new Error(
        'Student role not seeded. Start the API once so roles seed runs.',
      );
    }

    let user = await userModel.findOne({ email: DEV_EMAIL }).exec();
    if (!user) {
      user = await userModel.create({
        email: DEV_EMAIL,
        username: DEV_USERNAME,
        displayName: 'Dev Student',
        role: studentRole._id,
        emailVerified: true,
        githubLinked: false,
        reputationScore: 0,
        preferences: {},
      });
      console.log(`Created user ${DEV_EMAIL}`);
    } else {
      console.log(`Reusing user ${DEV_EMAIL}`);
    }

    const token = await sessionService.createSession(user._id.toString());
    const base =
      process.env.API_BASE_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`;

    console.log('\n--- Session token (use as Bearer) ---\n');
    console.log(token);
    console.log('\n--- Quick checks ---\n');
    console.log(`export TOKEN="${token}"`);
    console.log(`export BASE="${base}"`);
    console.log(`curl -s "$BASE/api/ping" | jq .`);
    console.log(`curl -s "$BASE/api/contests" | jq .`);
    console.log(
      `curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/integrations/accounts" | jq .`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
