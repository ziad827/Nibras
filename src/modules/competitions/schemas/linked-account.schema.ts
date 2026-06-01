import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import {
  AccountVerificationStatus,
  CompPlatform,
} from '../enums/competition.enums';

export type LinkedAccountDocument = HydratedDocument<LinkedAccount>;

@Schema({ timestamps: true, collection: 'linked_accounts' })
export class LinkedAccount {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, enum: CompPlatform, type: String })
  platform!: CompPlatform;

  @Prop({ required: true, trim: true })
  handle!: string;

  @Prop({
    type: String,
    enum: AccountVerificationStatus,
    default: AccountVerificationStatus.Pending,
  })
  verificationStatus!: AccountVerificationStatus;

  @Prop()
  verificationProblem?: string;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  platformRating?: number;

  @Prop()
  platformMaxRating?: number;

  @Prop()
  lastSyncAt?: Date;

  @Prop({ type: MongooseSchema.Types.Mixed })
  platformMetadata?: Record<string, unknown>;
}

export const LinkedAccountSchema = SchemaFactory.createForClass(LinkedAccount);
LinkedAccountSchema.index({ userId: 1, platform: 1 }, { unique: true });
LinkedAccountSchema.index({ platform: 1, handle: 1 }, { unique: true });
LinkedAccountSchema.index({ userId: 1 });
