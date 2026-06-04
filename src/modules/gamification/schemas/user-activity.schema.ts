import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ActivityType, ActivitySource } from '../enums/gamification.enums';

export type UserActivityDocument = HydratedDocument<UserActivity>;

@Schema({ timestamps: true, collection: 'user_activities' })
export class UserActivity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: ActivityType, required: true, index: true })
  activityType!: string;

  @Prop({ type: String, enum: ActivitySource, required: true })
  source!: string;

  @Prop({ type: Types.ObjectId })
  resourceId?: Types.ObjectId;

  @Prop({ type: String })
  resourceType?: string;

  @Prop({ required: true, default: 0 })
  points!: number;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ required: true, unique: true })
  dedupeKey!: string;

  @Prop({ required: true, index: true })
  occurredAt!: Date;

  @Prop({ type: Types.ObjectId, default: null })
  courseId?: Types.ObjectId | null;
}

export const UserActivitySchema = SchemaFactory.createForClass(UserActivity);

UserActivitySchema.index({ userId: 1, occurredAt: -1 });
UserActivitySchema.index({ courseId: 1, occurredAt: -1 });
UserActivitySchema.index({ activityType: 1, occurredAt: -1 });
