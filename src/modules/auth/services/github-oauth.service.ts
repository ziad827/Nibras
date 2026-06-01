import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthConfig } from '@config/configuration';
import { RolesSeedService } from '@modules/rbac/roles-seed.service';
import { GithubAccount } from '../schemas/github-account.schema';
import { User } from '../schemas/user.schema';
import {
  allocateUniqueUsername,
  deriveUsernameBase,
} from '../utils/username.helpers';
import {
  buildGitHubOAuthUrl,
  exchangeGitHubCode,
  fetchGitHubUserProfile,
} from '../utils/github-oauth.helpers';
import { createSignedState, verifySignedState } from '../utils/crypto.helpers';

const OAUTH_STATE_TTL_SECONDS = 600;

@Injectable()
export class GithubOAuthService {
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(GithubAccount.name)
    private readonly githubAccountModel: Model<GithubAccount>,
    private readonly rolesSeed: RolesSeedService,
  ) {
    this.authConfig = this.config.getOrThrow<AuthConfig>('auth');
  }

  isConfigured(): boolean {
    return Boolean(
      this.authConfig.githubClientId && this.authConfig.githubClientSecret,
    );
  }

  getRedirectUri(): string {
    return `${this.authConfig.apiBaseUrl.replace(/\/$/, '')}/api/auth/github/callback`;
  }

  buildAuthorizeUrl(nextPath?: string): string {
    const state = createSignedState(
      this.authConfig.secret,
      { next: nextPath ?? '/dashboard' },
      OAUTH_STATE_TTL_SECONDS,
    );
    return buildGitHubOAuthUrl(
      this.authConfig.githubClientId!,
      this.getRedirectUri(),
      state,
    );
  }

  verifyState(state: string): { next: string } | null {
    const parsed = verifySignedState<{ next?: string }>(
      this.authConfig.secret,
      state,
    );
    if (!parsed) return null;
    return { next: parsed.next ?? '/dashboard' };
  }

  async handleCallback(code: string): Promise<string> {
    const tokenData = await exchangeGitHubCode(
      code,
      this.authConfig.githubClientId!,
      this.authConfig.githubClientSecret!,
      this.getRedirectUri(),
    );
    const { profile, email } = await fetchGitHubUserProfile(
      tokenData.accessToken,
    );

    const githubUserId = String(profile.id);
    const accessTokenExpiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : undefined;

    const existingByGithub = await this.githubAccountModel
      .findOne({ githubUserId })
      .exec();

    let userId: string;

    if (existingByGithub) {
      userId = existingByGithub.userId.toString();
      await this.githubAccountModel.updateOne(
        { githubUserId },
        {
          $set: {
            login: profile.login,
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            accessTokenExpiresAt,
          },
        },
      );
      await this.userModel.updateOne(
        { _id: userId },
        {
          $set: {
            githubLinked: true,
            oauthProvider: 'github',
            oauthId: githubUserId,
            emailVerified: true,
            lastActive: new Date(),
          },
        },
      );
    } else {
      const existingByEmail = await this.userModel.findOne({ email }).exec();
      if (existingByEmail) {
        userId = existingByEmail._id.toString();
      } else {
        userId = await this.createUserFromGithub(profile, email, githubUserId);
      }

      await this.syncGithubAccount({
        userId,
        githubUserId,
        login: profile.login,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        accessTokenExpiresAt,
      });
    }

    return userId;
  }

  private async createUserFromGithub(
    profile: {
      login: string;
      name?: string | null;
      avatar_url?: string | null;
    },
    email: string,
    githubUserId: string,
  ): Promise<string> {
    const studentRoleId = await this.rolesSeed.getRoleIdByName('student');
    if (!studentRoleId) {
      throw new Error('Default student role is not seeded');
    }

    const base = deriveUsernameBase(profile.name ?? profile.login, email);
    const username = await allocateUniqueUsername(base, async (candidate) =>
      Boolean(await this.userModel.exists({ username: candidate })),
    );

    const user = await this.userModel.create({
      email,
      username,
      displayName: profile.name ?? profile.login,
      avatar: profile.avatar_url ?? undefined,
      role: new Types.ObjectId(studentRoleId),
      emailVerified: true,
      githubLinked: true,
      oauthProvider: 'github',
      oauthId: githubUserId,
      reputationScore: 0,
      preferences: {},
      lastActive: new Date(),
    });

    return user._id.toString();
  }

  private async syncGithubAccount(input: {
    userId: string;
    githubUserId: string;
    login: string;
    accessToken: string;
    refreshToken?: string;
    accessTokenExpiresAt?: Date;
  }): Promise<void> {
    await this.githubAccountModel.findOneAndUpdate(
      { githubUserId: input.githubUserId },
      {
        $set: {
          userId: new Types.ObjectId(input.userId),
          githubUserId: input.githubUserId,
          login: input.login,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
          accessTokenExpiresAt: input.accessTokenExpiresAt,
        },
      },
      { upsert: true, new: true },
    );

    await this.userModel.updateOne(
      { _id: input.userId },
      {
        $set: {
          githubLinked: true,
          oauthProvider: 'github',
          oauthId: input.githubUserId,
          emailVerified: true,
          lastActive: new Date(),
        },
      },
    );
  }
}
