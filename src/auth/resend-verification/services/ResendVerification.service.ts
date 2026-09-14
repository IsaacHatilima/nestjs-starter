import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';
import { MailerService } from '@/mail/mailer.service';
import { TokenService } from '@/security/token.service';
import { ResendVerificationRepository } from '@/auth/resend-verification/repositories/ResendVerification.repository';
import type { ResendVerification } from '@/auth/resend-verification/schemas/ResendVerification.schema';

const HOUR_MS = 60 * 60 * 1000;

/** Always resolves, so callers cannot learn whether an email is registered. */
@Injectable()
export class ResendVerificationService {
  constructor(
    private readonly repository: ResendVerificationRepository,
    private readonly tokens: TokenService,
    private readonly mailer: MailerService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async handle(data: ResendVerification): Promise<void> {
    const user = await this.repository.findByEmail(data.email);
    // Silent for unknown or already verified emails: no account enumeration.
    if (!user || user.emailVerifiedAt !== null) return;

    const { token, hash } = this.tokens.createOpaqueToken();
    await this.repository.replaceVerificationToken({
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + this.env.EMAIL_VERIFICATION_TTL_HOURS * HOUR_MS),
    });
    await this.mailer.sendEmailVerification(data.email, token);
  }
}
