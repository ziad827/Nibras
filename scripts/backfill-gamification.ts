import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../src/app.module';
import { UserActivity } from '../src/modules/gamification/schemas/user-activity.schema';
import { Question } from '../src/modules/community/schemas/question.schema';
import { Answer } from '../src/modules/community/schemas/answer.schema';
import { UserContestParticipation } from '../src/modules/competitions/schemas/user-contest-participation.schema';
import {
  ActivityType,
  ActivitySource,
} from '../src/modules/gamification/enums/gamification.enums';
import { EVENT_POINTS } from '../src/modules/gamification/constants/scoring.constants';

const BATCH_SIZE = 500;
const DRY_RUN = process.argv.includes('--dry-run');

interface DedupeEntry {
  dedupeKey: string;
  userId: string;
  activityType: string;
  source: string;
  points: number;
  resourceId?: string;
  resourceType?: string;
  courseId?: string | null;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const dryRun = DRY_RUN;
  const totals: Record<string, number> = {};

  try {
    const activityModel = app.get<Model<UserActivity>>(
      getModelToken(UserActivity.name),
    );
    const questionModel = app.get<Model<Question>>(
      getModelToken(Question.name),
    );
    const answerModel = app.get<Model<Answer>>(getModelToken(Answer.name));
    const participationModel = app.get<Model<UserContestParticipation>>(
      getModelToken(UserContestParticipation.name),
    );

    const batchInsert = async (
      entries: DedupeEntry[],
      label: string,
    ): Promise<number> => {
      if (entries.length === 0) return 0;
      totals[label] = (totals[label] || 0) + entries.length;

      if (dryRun) {
        console.log(
          `  [DRY-RUN] Would insert ${entries.length} ${label} entries`,
        );
        return entries.length;
      }

      let inserted = 0;
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const docs = batch.map((e) => ({
          userId: e.userId,
          activityType: e.activityType,
          source: e.source,
          resourceId: e.resourceId,
          resourceType: e.resourceType,
          points: e.points,
          metadata: e.metadata || {},
          dedupeKey: e.dedupeKey,
          occurredAt: e.occurredAt,
          courseId: e.courseId,
        }));

        try {
          await activityModel.insertMany(docs, { ordered: false });
          inserted += docs.length;
        } catch (err) {
          if (
            err &&
            typeof err === 'object' &&
            'code' in err &&
            (err as Record<string, unknown>).code === 11000
          ) {
            const mongoErr = err as { writeErrors?: unknown[] };
            const succeeded = docs.length - (mongoErr.writeErrors?.length ?? 0);
            inserted += succeeded;
          } else {
            const msg =
              err instanceof Error
                ? err.message
                : 'Unknown error during insert';
            console.error(`  Error inserting ${label} batch: ${msg}`);
          }
        }
      }
      console.log(`  Inserted ${inserted}/${entries.length} ${label} entries`);
      return inserted;
    };

    // 1. Backfill Questions → question_created
    console.log('\n--- Backfilling Questions ---');
    const questions = await questionModel
      .find({ isDeleted: { $ne: true } })
      .select('_id author course createdAt')
      .lean<Array<Question & { _id: Types.ObjectId; createdAt: Date }>>();
    const questionEntries: DedupeEntry[] = questions
      .filter((q) => q.author)
      .map((q) => ({
        dedupeKey: `question_created:${String(q._id)}`,
        userId: String(q.author),
        activityType: ActivityType.QuestionCreated,
        source: ActivitySource.Community,
        points: EVENT_POINTS.question_created,
        resourceId: String(q._id),
        resourceType: 'Question',
        courseId: q.course != null ? String(q.course) : null,
        occurredAt: q.createdAt ?? new Date(),
      }));
    await batchInsert(questionEntries, 'questions');

    // 2. Backfill Answers → answer_created
    console.log('\n--- Backfilling Answers ---');
    interface PopulatedQuestion {
      _id: Types.ObjectId;
      course?: Types.ObjectId;
    }
    interface AnswerWithTimestamps {
      _id: Types.ObjectId;
      author: Types.ObjectId;
      question: Types.ObjectId | PopulatedQuestion;
      isAccepted?: boolean;
      createdAt: Date;
    }
    const answers = await answerModel
      .find({})
      .select('_id author question isAccepted createdAt')
      .populate('question', 'course')
      .lean<AnswerWithTimestamps[]>();

    const answerEntries: DedupeEntry[] = answers
      .filter((a) => a.author)
      .map((a) => {
        const questionDoc =
          a.question && typeof a.question === 'object' && '_id' in a.question
            ? (a.question as PopulatedQuestion)
            : null;
        return {
          dedupeKey: `answer_created:${String(a._id)}`,
          userId: String(a.author),
          activityType: ActivityType.AnswerCreated,
          source: ActivitySource.Community,
          points: EVENT_POINTS.answer_created,
          resourceId: String(a._id),
          resourceType: 'Answer',
          courseId:
            questionDoc?.course != null ? String(questionDoc.course) : null,
          occurredAt: a.createdAt ?? new Date(),
        };
      });
    await batchInsert(answerEntries, 'answers');

    // 3. Backfill Accepted Answers → accepted_answer
    console.log('\n--- Backfilling Accepted Answers ---');
    const acceptedAnswers = answers.filter((a) => a.isAccepted && a.author);
    const acceptedEntries: DedupeEntry[] = acceptedAnswers.map((a) => {
      const questionDoc =
        a.question && typeof a.question === 'object' && '_id' in a.question
          ? (a.question as PopulatedQuestion)
          : null;
      return {
        dedupeKey: `accepted_answer:${String(a._id)}`,
        userId: String(a.author),
        activityType: ActivityType.AcceptedAnswer,
        source: ActivitySource.Community,
        points: EVENT_POINTS.accepted_answer,
        resourceId: String(a._id),
        resourceType: 'Answer',
        courseId:
          questionDoc?.course != null ? String(questionDoc.course) : null,
        occurredAt: a.createdAt ?? new Date(),
      };
    });
    await batchInsert(acceptedEntries, 'accepted_answers');

    // 4. Backfill Contest Participations → contest_joined + placements
    console.log('\n--- Backfilling Contest Participations ---');
    interface ParticipationWithTimestamps {
      _id: Types.ObjectId;
      userId: Types.ObjectId;
      contestId: Types.ObjectId | { _id: Types.ObjectId };
      rank?: number;
      participants?: number;
      delta?: number;
      ratingBefore?: number;
      ratingAfter?: number;
      createdAt: Date;
    }
    const participations = await participationModel
      .find({})
      .select(
        'userId contestId rank participants ratingAfter ratingBefore delta createdAt',
      )
      .populate<{
        contestId: { _id: Types.ObjectId };
      }>('contestId', 'participants')
      .lean<ParticipationWithTimestamps[]>();

    const contestJoinedEntries: DedupeEntry[] = [];
    const contestTop10Entries: DedupeEntry[] = [];
    const contestTop25Entries: DedupeEntry[] = [];
    const contestRatingGainEntries: DedupeEntry[] = [];

    for (const p of participations) {
      const uid = String(p.userId);
      const isPopulated =
        p.contestId != null &&
        typeof p.contestId === 'object' &&
        '_id' in p.contestId;
      const rawId: Types.ObjectId | null = isPopulated
        ? (p.contestId as { _id: Types.ObjectId })._id
        : (p.contestId as Types.ObjectId | null);
      const contestId = rawId ? String(rawId) : null;
      if (!uid || !contestId) continue;

      contestJoinedEntries.push({
        dedupeKey: `contest_joined:${uid}:${contestId}`,
        userId: uid,
        activityType: ActivityType.ContestJoined,
        source: ActivitySource.Contests,
        points: EVENT_POINTS.contest_joined,
        resourceId: contestId,
        resourceType: 'Contest',
        occurredAt: p.createdAt ?? new Date(),
      });

      const rank = p.rank;
      const participants = p.participants;
      if (rank != null && participants != null && participants > 0) {
        const percentile = rank / participants;
        if (percentile <= 0.1) {
          contestTop10Entries.push({
            dedupeKey: `contest_top_10:${uid}:${contestId}`,
            userId: uid,
            activityType: ActivityType.ContestTop10,
            source: ActivitySource.Contests,
            points: EVENT_POINTS.contest_top_10,
            resourceId: contestId,
            resourceType: 'Contest',
            occurredAt: p.createdAt ?? new Date(),
          });
        } else if (percentile <= 0.25) {
          contestTop25Entries.push({
            dedupeKey: `contest_top_25:${uid}:${contestId}`,
            userId: uid,
            activityType: ActivityType.ContestTop25,
            source: ActivitySource.Contests,
            points: EVENT_POINTS.contest_top_25,
            resourceId: contestId,
            resourceType: 'Contest',
            occurredAt: p.createdAt ?? new Date(),
          });
        }
      }

      const delta = p.delta;
      if (delta != null && delta > 0) {
        const ratingPoints = Math.min(Math.floor(delta / 10), 30);
        if (ratingPoints > 0) {
          contestRatingGainEntries.push({
            dedupeKey: `contest_rating_gain:${uid}:${contestId}`,
            userId: uid,
            activityType: ActivityType.ContestRatingGain,
            source: ActivitySource.Contests,
            points: ratingPoints,
            resourceId: contestId,
            resourceType: 'Contest',
            occurredAt: p.createdAt ?? new Date(),
            metadata: { ratingChange: delta },
          });
        }
      }
    }

    if (!dryRun) {
      await batchInsert(contestJoinedEntries, 'contest_joined');
      await batchInsert(contestTop10Entries, 'contest_top_10');
      await batchInsert(contestTop25Entries, 'contest_top_25');
      await batchInsert(contestRatingGainEntries, 'contest_rating_gain');
    } else {
      console.log(
        `  [DRY-RUN] Would insert ${contestJoinedEntries.length} contest_joined entries`,
      );
      console.log(
        `  [DRY-RUN] Would insert ${contestTop10Entries.length} contest_top_10 entries`,
      );
      console.log(
        `  [DRY-RUN] Would insert ${contestTop25Entries.length} contest_top_25 entries`,
      );
      console.log(
        `  [DRY-RUN] Would insert ${contestRatingGainEntries.length} contest_rating_gain entries`,
      );
      totals.contest_joined = contestJoinedEntries.length;
      totals.contest_top_10 = contestTop10Entries.length;
      totals.contest_top_25 = contestTop25Entries.length;
      totals.contest_rating_gain = contestRatingGainEntries.length;
    }

    // Summary
    console.log('\n========================================');
    console.log('        BACKFILL SUMMARY');
    console.log('========================================');
    if (dryRun) console.log('  ** DRY RUN - no data was modified **\n');
    for (const [label, count] of Object.entries(totals)) {
      console.log(`  ${label}: ${count}`);
    }
    const total = Object.values(totals).reduce((sum, c) => sum + c, 0);
    console.log(`  -------------------------`);
    console.log(`  TOTAL: ${total} entries`);

    if (!dryRun && total > 0) {
      console.log('\n--- Syncing reputation scores for all affected users ---');
      const allUserIds = new Set<string>();
      for (const entries of [
        questionEntries,
        answerEntries,
        acceptedEntries,
        contestJoinedEntries,
        contestTop10Entries,
        contestTop25Entries,
        contestRatingGainEntries,
      ]) {
        for (const e of entries) {
          allUserIds.add(e.userId);
        }
      }
      console.log(`  Found ${allUserIds.size} unique users to sync`);
      console.log(
        '  (Run reputation sync separately via the API or wait for next activity)',
      );
    }
  } finally {
    await app.close();
  }
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
