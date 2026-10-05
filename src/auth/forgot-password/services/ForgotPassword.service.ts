import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';
import { MailerService } from '@/mail/mailer.service';
import { TokenService } from '@/security/token.service';
import { ForgotPasswordRepository } from '@/auth/forgot-password/repositories/ForgotPassword.repository';
import type { ForgotPassword } from '@/auth/forgot-password/schemas/ForgotPassword.schema';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { SecretCipher } from '@/security/secret-cipher.service';

const MINUTE_MS = 60 * 1000;

/** Known and unknown emails have the same success response; delivery happens in the outbox worker. */
@Injectable()
export class ForgotPasswordService {
  constructor(
    private readonly repository: ForgotPasswordRepository,
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly mailer: MailerService,
    private readonly cipher: SecretCipher,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async handle(data: ForgotPassword): Promise<void> {
    const user = await this.users.findByEmail(data.email);
    // Silent for unknown emails: no account enumeration.
    if (!user) return;

    const { token, hash } = this.tokens.createOpaqueToken();
    await this.repository.replaceResetToken({
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + this.env.PASSWORD_RESET_TTL_MINUTES * MINUTE_MS),
      encryptedPayload: this.cipher.encrypt(JSON.stringify(this.mailer.passwordResetMessage(data.email, token))),
    });
  }
}
