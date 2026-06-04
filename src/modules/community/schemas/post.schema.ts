import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  body!: string;

  @Prop({ type: Types.ObjectId, ref: 'Thread', required: true })
  thread!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author!: Types.ObjectId;

  @Prop({ default: 0 })
  votesCount!: number;

  @Prop({ default: false })
  isAccepted!: boolean;

  @Prop({ default: false })
  isPinned!: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.index({ thread: 1, createdAt: -1 });
PostSchema.index({ thread: 1, votesCount: -1 });
PostSchema.index({ author: 1 });
