import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Permission } from './schemas/permission.schema';
import { Role } from './schemas/role.schema';

const DEFAULT_PERMISSIONS = [
  { resource: 'users', action: 'read', description: 'Read user profiles' },
  { resource: 'users', action: 'write', description: 'Update user profiles' },
  { resource: 'users', action: 'admin', description: 'Admin user management' },
  { resource: 'courses', action: 'read', description: 'View courses' },
  { resource: 'courses', action: 'write', description: 'Manage courses' },
  {
    resource: 'courses',
    action: 'admin',
    description: 'Admin course management',
  },
  {
    resource: 'contests',
    action: 'read',
    description: 'View contests and rankings',
  },
  {
    resource: 'contests',
    action: 'write',
    description: 'Create and manage internal contests',
  },
];

const DEFAULT_ROLES: Array<{
  name: string;
  description: string;
  permissions: string[];
}> = [
  {
    name: 'super-admin',
    description: 'Full platform access',
    permissions: DEFAULT_PERMISSIONS.map((p) => `${p.resource}:${p.action}`),
  },
  {
    name: 'admin',
    description: 'Institution administrator',
    permissions: [
      'users:read',
      'users:write',
      'users:admin',
      'courses:read',
      'courses:write',
      'courses:admin',
      'contests:read',
      'contests:write',
    ],
  },
  {
    name: 'instructor',
    description: 'Course instructor',
    permissions: [
      'users:read',
      'courses:read',
      'courses:write',
      'contests:read',
      'contests:write',
    ],
  },
  {
    name: 'ta',
    description: 'Teaching assistant',
    permissions: [
      'users:read',
      'courses:read',
      'courses:write',
      'contests:read',
    ],
  },
  {
    name: 'student',
    description: 'Student',
    permissions: ['users:read', 'courses:read', 'contests:read'],
  },
];

@Injectable()
export class RolesSeedService implements OnModuleInit {
  private readonly logger = new Logger(RolesSeedService.name);

  constructor(
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<Permission>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    const permissionDocs = new Map<string, string>();

    for (const perm of DEFAULT_PERMISSIONS) {
      const doc = await this.permissionModel.findOneAndUpdate(
        { resource: perm.resource, action: perm.action },
        { $set: perm },
        { upsert: true, returnDocument: 'after' },
      );
      permissionDocs.set(`${perm.resource}:${perm.action}`, doc._id.toString());
    }

    for (const roleDef of DEFAULT_ROLES) {
      const permissionIds = roleDef.permissions
        .map((key) => permissionDocs.get(key))
        .filter((id): id is string => Boolean(id))
        .map((id) => new Types.ObjectId(id));

      await this.roleModel.findOneAndUpdate(
        { name: roleDef.name },
        {
          $set: {
            name: roleDef.name,
            description: roleDef.description,
            permissions: permissionIds,
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
    }

    this.logger.log('Default roles and permissions seeded');
  }

  async getRoleIdByName(name: string): Promise<string | null> {
    const role = await this.roleModel.findOne({ name }).exec();
    return role ? role._id.toString() : null;
  }
}
