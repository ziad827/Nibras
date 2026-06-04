import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { IUser } from '../interfaces/external-services.interface';

type UserLike = IUser | AuthenticatedUser;

@Injectable()
export class CourseService {
  isEnrolled(user: UserLike | undefined | null, courseId: string): boolean {
    if (!user) return false;
    const roleName = this.getRoleName(user);
    if (['admin', 'super admin', 'instructor'].includes(roleName)) return true;
    const enrolledCourses = (user as IUser).enrolledCourses ?? [];
    return enrolledCourses.some((e) => String(e.course) === String(courseId));
  }

  private getRoleName(user: UserLike): string {
    if ('role' in user) {
      const role = (user as IUser).role;
      if (typeof role === 'object' && role?.name) {
        return String(role.name).toLowerCase();
      }
      if (typeof role === 'string') {
        return role.toLowerCase();
      }
    }
    return '';
  }
}
