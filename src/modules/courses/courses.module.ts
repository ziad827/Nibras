import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '@modules/auth/auth.module';
import { User, UserSchema } from '@modules/auth/schemas/user.schema';
import {
  Course,
  CourseSchema,
  CourseEnrollmentRequest,
  CourseEnrollmentRequestSchema,
  CourseMembership,
  CourseMembershipSchema,
} from './schemas';
import { CoursesController } from './controllers/courses.controller';
import { CoursesService } from './services/courses.service';
import { CourseAccessService } from './services/course-access.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: CourseMembership.name, schema: CourseMembershipSchema },
      {
        name: CourseEnrollmentRequest.name,
        schema: CourseEnrollmentRequestSchema,
      },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CoursesController],
  providers: [CoursesService, CourseAccessService],
  exports: [CoursesService, CourseAccessService, MongooseModule],
})
export class CoursesModule {}
