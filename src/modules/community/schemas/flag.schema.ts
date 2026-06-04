import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Flag {
  @Prop({ type: Types.ObjectId, required: true })
  targetId!: Types.ObjectId;

  @Prop({ enum: ['question', 'answer', 'thread', 'post'], required: true })
  targetType!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  flaggedBy!: Types.ObjectId;

  @Prop({ required: true, maxlength: 500 })
  reason!: string;

  @Prop({ enum: ['pending', 'resolved', 'dismissed'], default: 'pending' })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop()
  reviewedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;
}

export const FlagSchema = SchemaFactory.createForClass(Flag);
FlagSchema.index({ status: 1, createdAt: -1 });
FlagSchema.index({ targetId: 1, targetType: 1 });
FlagSchema.index({ flaggedBy: 1 });
