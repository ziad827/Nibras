import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Question {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course' })
  course?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }], default: [] })
  tags!: Types.ObjectId[];

  @Prop({ enum: ['open', 'closed'], default: 'open' })
  status!: string;

  @Prop({ default: 0 })
  votesCount!: number;

  @Prop({ default: 0 })
  answersCount!: number;

  @Prop({ default: false })
  isAnonymous!: boolean;

  @Prop({ default: 0 })
  viewCount!: number;

  @Prop({ default: false })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ course: 1 });
QuestionSchema.index({ author: 1 });
QuestionSchema.index({ createdAt: -1 });
QuestionSchema.index(
  { title: 'text', body: 'text' },
  { weights: { title: 10, body: 5 } },
);
