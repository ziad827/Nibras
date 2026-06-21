export const RBAC_PERMISSION_CODES = [
  'course:create',
  'course:read',
  'course:update',
  'course:delete',
  'section:create',
  'section:enroll',
  'section:remove-student',
  'user:read',
  'user:update',
  'user:ban',
  'user:adjust-points',
  'user:bulk-create',
  'role:create',
  'role:read',
  'role:update',
  'role:assign',
  'audit-log:read',
  'config:read',
  'config:update',
  'content:moderate',
  'badge:manage',
  'flag:resolve',
] as const;

export type RbacPermissionCode = (typeof RBAC_PERMISSION_CODES)[number];

export const SYSTEM_ROLE_DEFINITIONS: Array<{
  name: string;
  description: string;
  permissions: RbacPermissionCode[] | '*';
}> = [
  {
    name: 'super-admin',
    description: 'Full platform access',
    permissions: '*',
  },
  {
    name: 'admin',
    description: 'Institution administrator',
    permissions: [
      'course:create',
      'course:read',
      'course:update',
      'course:delete',
      'section:create',
      'section:enroll',
      'section:remove-student',
      'user:read',
      'user:update',
      'user:ban',
      'user:adjust-points',
      'user:bulk-create',
      'role:read',
      'role:assign',
      'audit-log:read',
      'config:read',
      'config:update',
      'content:moderate',
      'badge:manage',
      'flag:resolve',
    ],
  },
  {
    name: 'instructor',
    description: 'Course instructor',
    permissions: [
      'course:read',
      'course:update',
      'section:create',
      'section:enroll',
      'user:read',
    ],
  },
  {
    name: 'student',
    description: 'Student',
    permissions: ['course:read', 'user:read'],
  },
];

export const DEFAULT_PLATFORM_CONFIG = {
  featureFlags: {
    enableGamification: true,
    enableCommunity: true,
    enableCompetitions: true,
    maintenanceMode: false,
    betaMode: false,
  },
  gamification: {
    dailyStreakBonus: 5,
    badgeAwardNotifications: true,
  },
  reputationThresholds: {
    beginner: 0,
    intermediate: 100,
    advanced: 500,
    expert: 1000,
  },
};

export type PlatformConfigShape = typeof DEFAULT_PLATFORM_CONFIG;

export const PLATFORM_CONFIG_FIELDS: Record<
  string,
  Record<string, { label: string; description: string }>
> = {
  featureFlags: {
    enableGamification: {
      label: 'Enable Gamification',
      description: 'Badges, streaks, and achievement notifications.',
    },
    enableCommunity: {
      label: 'Enable Community',
      description: 'Discussion forums, Q&A, and community moderation.',
    },
    enableCompetitions: {
      label: 'Enable Competitions',
      description: 'Contests, practice problems, and rankings.',
    },
    maintenanceMode: {
      label: 'Maintenance Mode',
      description: 'Show a maintenance overlay to all users.',
    },
    betaMode: {
      label: 'Beta Mode',
      description: 'Show a beta preview notice to all users.',
    },
  },
  gamification: {
    dailyStreakBonus: {
      label: 'Daily Streak Bonus',
      description: 'Extra points awarded for maintaining a daily streak.',
    },
    badgeAwardNotifications: {
      label: 'Badge Award Notifications',
      description: 'Notify users when they earn a new badge.',
    },
  },
  reputationThresholds: {
    beginner: {
      label: 'Beginner Threshold',
      description: 'Minimum reputation points for the beginner tier.',
    },
    intermediate: {
      label: 'Intermediate Threshold',
      description: 'Minimum reputation points for the intermediate tier.',
    },
    advanced: {
      label: 'Advanced Threshold',
      description: 'Minimum reputation points for the advanced tier.',
    },
    expert: {
      label: 'Expert Threshold',
      description: 'Minimum reputation points for the expert tier.',
    },
  },
};
