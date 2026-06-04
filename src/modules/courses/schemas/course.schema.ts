import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CourseDocument = HydratedDocument<Course>;

@Schema({ timestamps: true, collection: 'courses' })
export class Course {
  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  termLabel!: string;

  @Prop({ required: true })
  courseCode!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: false })
  isPublic!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
CourseSchema.index({ isPublic: 1, isActive: 1, deletedAt: 1 });
