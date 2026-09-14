import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';
import { MailerService } from '@/mail/mailer.service';
import { TokenService } from '@/security/token.service';
import { ForgotPasswordRepository } from '@/auth/forgot-password/repositories/ForgotPassword.repository';
import type { ForgotPassword } from '@/auth/forgot-password/schemas/ForgotPassword.schema';

const MINUTE_MS = 60 * 1000;

/** Always resolves, so callers cannot learn whether an email is registered. */
@Injectable()
export class ForgotPasswordService {
  constructor(
    private readonly repository: ForgotPasswordRepository,
    private readonly tokens: TokenService,
    private readonly mailer: MailerService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async handle(data: ForgotPassword): Promise<void> {
    const user = await this.repository.findByEmail(data.email);
    // Silent for unknown emails: no account enumeration.
    if (!user) return;

    const { token, hash } = this.tokens.createOpaqueToken();
    await this.repository.replaceResetToken({
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + this.env.PASSWORD_RESET_TTL_MINUTES * MINUTE_MS),
    });
    await this.mailer.sendPasswordReset(data.email, token);
  }
}
