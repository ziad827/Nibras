import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserBadgeDocument = HydratedDocument<UserBadge>;

@Schema({ timestamps: true, collection: 'user_badges' })
export class UserBadge {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Badge', required: true })
  badgeId!: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  earnedAt!: Date;
}

export const UserBadgeSchema = SchemaFactory.createForClass(UserBadge);

UserBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
UserBadgeSchema.index({ badgeId: 1 });
