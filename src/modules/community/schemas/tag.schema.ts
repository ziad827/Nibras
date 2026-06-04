import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Tag {
  @Prop({ required: true, unique: true, trim: true, maxlength: 50 })
  name!: string;

  @Prop({ default: '', maxlength: 200 })
  description!: string;

  @Prop({ default: 0 })
  usageCount!: number;

  @Prop({ enum: ['course', 'topic', 'subtopic'], default: 'topic' })
  category!: string;

  @Prop({ type: [String], default: [] })
  synonyms!: string[];
}

export const TagSchema = SchemaFactory.createForClass(Tag);
TagSchema.index({ usageCount: -1 });
TagSchema.index(
  { name: 'text', description: 'text' },
  { weights: { name: 10, description: 5 } },
);
