import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Answer {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  question!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author!: Types.ObjectId;

  @Prop({ required: true })
  body!: string;

  @Prop({ default: false })
  isPinned!: boolean;

  @Prop({ default: false })
  isAccepted!: boolean;

  @Prop({ default: false })
  isFromAI!: boolean;

  @Prop({ default: 0 })
  votesCount!: number;
}

export const AnswerSchema = SchemaFactory.createForClass(Answer);
AnswerSchema.index({ question: 1, createdAt: -1 });
AnswerSchema.index({ question: 1, votesCount: -1 });
AnswerSchema.index({ question: 1, isAccepted: -1 });
AnswerSchema.index({ author: 1 });
