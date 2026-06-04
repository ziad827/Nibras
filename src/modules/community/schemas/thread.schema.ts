import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Thread {
  @Prop({ required: true, trim: true, maxlength: 300 })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author!: Types.ObjectId;

  @Prop({ default: false })
  isPinned!: boolean;

  @Prop({ enum: ['open', 'closed'], default: 'open' })
  status!: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }], default: [] })
  tags!: Types.ObjectId[];

  @Prop({ default: 0 })
  postsCount!: number;

  @Prop({ default: 0 })
  votesCount!: number;
}

export const ThreadSchema = SchemaFactory.createForClass(Thread);
ThreadSchema.index({ course: 1, createdAt: -1 });
ThreadSchema.index({ course: 1, isPinned: -1, createdAt: -1 });
ThreadSchema.index({ author: 1 });
ThreadSchema.index({ tags: 1 });
ThreadSchema.index(
  { title: 'text', body: 'text' },
  { weights: { title: 10, body: 5 } },
);
