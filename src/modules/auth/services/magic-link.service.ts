import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthConfig } from '@config/configuration';
import { RolesSeedService } from '@modules/rbac/roles-seed.service';
import { MagicLinkVerification } from '../schemas/magic-link-verification.schema';
import { User } from '../schemas/user.schema';
import { EmailService } from './email.service';
import { generateToken, hashToken } from '../utils/crypto.helpers';
import {
  allocateUniqueUsername,
  deriveUsernameBase,
} from '../utils/username.helpers';

@Injectable()
export class MagicLinkService {
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(MagicLinkVerification.name)
    private readonly verificationModel: Model<MagicLinkVerification>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly emailService: EmailService,
    private readonly rolesSeed: RolesSeedService,
  ) {
    this.authConfig = this.config.getOrThrow<AuthConfig>('auth');
  }

  isConfigured(): boolean {
    return this.emailService.isConfigured();
  }

  async requestMagicLink(email: string, nextPath?: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required');
    }

    const token = generateToken();
    const tokenHash = hashToken(this.authConfig.secret, token);
    const expiresAt = new Date(
      Date.now() + this.authConfig.magicLinkTtlSeconds * 1000,
    );

    await this.verificationModel.deleteMany({ identifier: normalizedEmail });
    await this.verificationModel.create({
      identifier: normalizedEmail,
      tokenHash,
      expiresAt,
    });

    const verifyUrl = new URL(
      '/api/auth/magic-link/verify',
      this.authConfig.apiBaseUrl,
    );
    verifyUrl.searchParams.set('token', token);
    if (nextPath) {
      verifyUrl.searchParams.set('next', nextPath);
    }

    await this.emailService.sendMagicLinkEmail(
      normalizedEmail,
      verifyUrl.toString(),
    );
  }

  async verifyMagicLink(token: string): Promise<string> {
    const tokenHash = hashToken(this.authConfig.secret, token);
    const verification = await this.verificationModel
      .findOne({ tokenHash })
      .exec();

    if (!verification || verification.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('Magic link is invalid or expired');
    }

    const email = verification.identifier;
    await this.verificationModel.deleteOne({ _id: verification._id });

    let user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      user = await this.createUserFromEmail(email);
    } else {
      await this.userModel.updateOne(
        { _id: user._id },
        {
          $set: {
            emailVerified: true,
            lastActive: new Date(),
          },
        },
      );
    }

    return user._id.toString();
  }

  private async createUserFromEmail(email: string) {
    const studentRoleId = await this.rolesSeed.getRoleIdByName('student');
    if (!studentRoleId) {
      throw new Error('Default student role is not seeded');
    }

    const base = deriveUsernameBase(null, email);
    const username = await allocateUniqueUsername(base, async (candidate) =>
      Boolean(await this.userModel.exists({ username: candidate })),
    );

    return this.userModel.create({
      email,
      username,
      displayName: email.split('@')[0],
      role: new Types.ObjectId(studentRoleId),
      emailVerified: true,
      githubLinked: false,
      reputationScore: 0,
      preferences: {},
      lastActive: new Date(),
    });
  }
}
