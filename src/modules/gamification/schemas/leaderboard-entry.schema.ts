import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import {
  LeaderboardPeriod,
  LeaderboardScopeType,
} from '../enums/gamification.enums';

export type LeaderboardEntryDocument = HydratedDocument<LeaderboardEntry>;

const breakdownFields = {
  problem_solved: { type: Number, default: 0 },
  contest_joined: { type: Number, default: 0 },
  contest_top_25: { type: Number, default: 0 },
  contest_top_10: { type: Number, default: 0 },
  contest_rating_gain: { type: Number, default: 0 },
  question_created: { type: Number, default: 0 },
  answer_created: { type: Number, default: 0 },
  accepted_answer: { type: Number, default: 0 },
  question_upvote_received: { type: Number, default: 0 },
  answer_upvote_received: { type: Number, default: 0 },
  thread_created: { type: Number, default: 0 },
  badge_awarded: { type: Number, default: 0 },
  lesson_completed: { type: Number, default: 0 },
  section_completed: { type: Number, default: 0 },
  course_completed: { type: Number, default: 0 },
  assignment_submitted: { type: Number, default: 0 },
  assignment_approved: { type: Number, default: 0 },
  high_grade: { type: Number, default: 0 },
  daily_learning_activity: { type: Number, default: 0 },
  learning_streak: { type: Number, default: 0 },
  course_progress_bonus: { type: Number, default: 0 },
};

@Schema({ timestamps: true, collection: 'leaderboard_entries' })
export class LeaderboardEntry {
  @Prop({ type: String, enum: LeaderboardPeriod, required: true })
  period!: string;

  @Prop({ required: true })
  windowStart!: Date;

  @Prop({ required: true })
  windowEnd!: Date;

  @Prop({ type: String, enum: LeaderboardScopeType, required: true })
  scopeType!: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', default: null })
  scopeId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  score!: number;

  @Prop({ required: true, default: 0 })
  rank!: number;

  @Prop({ required: true, default: 0 })
  scoreChange!: number;

  @Prop({ required: true, default: 0 })
  activeDays!: number;

  @Prop({
    type: new MongooseSchema(breakdownFields, { _id: false }),
    default: () => ({}),
  })
  breakdown!: Record<string, number>;

  @Prop({
    type: new MongooseSchema({
      total: { type: Number, default: 0 },
      breakdown: {
        type: new MongooseSchema(
          {
            problem: { type: Number, default: 0 },
            community: { type: Number, default: 0 },
            contest: { type: Number, default: 0 },
            course: { type: Number, default: 0 },
          },
          { _id: false },
        ),
        default: () => ({}),
      },
    }),
    default: () => ({}),
  })
  reputation!: {
    total: number;
    breakdown: {
      problem: number;
      community: number;
      contest: number;
      course: number;
    };
  };

  @Prop({ required: true, default: Date.now })
  generatedAt!: Date;
}

export const LeaderboardEntrySchema =
  SchemaFactory.createForClass(LeaderboardEntry);

LeaderboardEntrySchema.index(
  { period: 1, windowStart: 1, scopeType: 1, scopeId: 1, userId: 1 },
  { unique: true },
);
LeaderboardEntrySchema.index({
  period: 1,
  windowStart: 1,
  scopeType: 1,
  scopeId: 1,
  rank: 1,
});
LeaderboardEntrySchema.index({
  userId: 1,
  period: 1,
  scopeType: 1,
  scopeId: 1,
  windowStart: -1,
});
