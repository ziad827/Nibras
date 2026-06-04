import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Vote {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  targetId!: Types.ObjectId;

  @Prop({ enum: ['question', 'answer', 'thread', 'post'], required: true })
  targetType!: string;

  @Prop({ enum: [1, -1], required: true })
  value!: number;
}

export const VoteSchema = SchemaFactory.createForClass(Vote);
VoteSchema.index({ user: 1, targetId: 1, targetType: 1 }, { unique: true });
