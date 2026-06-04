import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type QuestionBookmarkDocument = HydratedDocument<QuestionBookmark>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'question_bookmarks',
})
export class QuestionBookmark {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId!: Types.ObjectId;
}

export const QuestionBookmarkSchema =
  SchemaFactory.createForClass(QuestionBookmark);
QuestionBookmarkSchema.index({ userId: 1, questionId: 1 }, { unique: true });
QuestionBookmarkSchema.index({ userId: 1 });
