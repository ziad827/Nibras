import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Tag } from '../src/modules/community/schemas/tag.schema';

const TAGS = [
  'algorithms',
  'data-structures',
  'computer-networks',
  'security',
  'operating-systems',
  'software-engineering',
  'math',
  'artificial-intelligence',
  'machine-learning',
  'oop',
  'linear-algebra',
  'visual-computing',
  'web-development',
  'mobile-development',
  'systems',
  'programming-languages',
  'theory-of-computation',
  'computer-architecture',
  'compiler-design',
  'data-science',
  'distributed-systems',
  'cloud-computing',
  'devops',
  'human-computer-interaction',
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const tagModel = app.get<Model<Tag>>(getModelToken(Tag.name));
    let created = 0;

    for (const name of TAGS) {
      const existing = await tagModel.findOne({ name }).exec();
      if (!existing) {
        await tagModel.create({ name, description: '' });
        console.log(`  + ${name}`);
        created++;
      } else {
        console.log(`  ~ ${name} (already exists)`);
      }
    }

    console.log(
      `\nDone. ${created} tags created, ${TAGS.length - created} already existed.`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
