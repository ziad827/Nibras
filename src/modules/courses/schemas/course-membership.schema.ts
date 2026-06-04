import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CourseRole } from '../enums/course.enums';

export type CourseMembershipDocument = HydratedDocument<CourseMembership>;

@Schema({ timestamps: true, collection: 'course_memberships' })
export class CourseMembership {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: CourseRole, required: true })
  role!: CourseRole;

  @Prop({ default: 1 })
  level!: number;
}

export const CourseMembershipSchema =
  SchemaFactory.createForClass(CourseMembership);
CourseMembershipSchema.index({ courseId: 1, userId: 1 }, { unique: true });
CourseMembershipSchema.index({ userId: 1 });
