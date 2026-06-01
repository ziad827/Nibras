import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { AuthConfig } from '@config/configuration';

@Injectable()
export class EmailService {
  private readonly authConfig: AuthConfig;
  private readonly resend: Resend | null;

  constructor(private readonly config: ConfigService) {
    this.authConfig = this.config.getOrThrow<AuthConfig>('auth');
    this.resend = this.authConfig.resendApiKey
      ? new Resend(this.authConfig.resendApiKey)
      : null;
  }

  isConfigured(): boolean {
    return Boolean(this.resend);
  }

  async sendMagicLinkEmail(email: string, url: string): Promise<void> {
    if (!this.resend) {
      throw new Error(
        'Email sign-in is not configured on this server. Ask an admin to set RESEND_API_KEY, or use GitHub sign-in.',
      );
    }

    const { error } = await this.resend.emails.send({
      from: this.authConfig.emailFrom,
      to: email,
      subject: 'Your Nibras sign-in link',
      html: `<p>Sign in to Nibras by clicking the link below. This link expires in a few minutes.</p><p><a href="${url}">Sign in to Nibras</a></p>`,
      text: `Sign in to Nibras: ${url}\n\nThis link expires in a few minutes.`,
    });

    if (error) {
      throw new Error(error.message || 'Failed to send sign-in email.');
    }
  }
}
