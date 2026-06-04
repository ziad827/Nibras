import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EnrollmentRequestStatus } from '../enums/course.enums';

export type CourseEnrollmentRequestDocument =
  HydratedDocument<CourseEnrollmentRequest>;

@Schema({ timestamps: true, collection: 'course_enrollment_requests' })
export class CourseEnrollmentRequest {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: EnrollmentRequestStatus,
    default: EnrollmentRequestStatus.Pending,
  })
  status!: EnrollmentRequestStatus;

  @Prop({ maxlength: 500 })
  message?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop()
  reviewedAt?: Date;
}

export const CourseEnrollmentRequestSchema = SchemaFactory.createForClass(
  CourseEnrollmentRequest,
);
CourseEnrollmentRequestSchema.index(
  { courseId: 1, userId: 1 },
  { unique: true },
);
CourseEnrollmentRequestSchema.index({ courseId: 1, status: 1 });
