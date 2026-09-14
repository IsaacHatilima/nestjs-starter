import { Inject, Injectable } from '@nestjs/common';
import { emailAlreadyRegistered } from '@/common/errors/auth-errors';
import { assertPasswordUsable } from '@/auth/shared/services/assert-password-usable';
import { PasswordBlocklist } from '@/security/password-blocklist.service';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';
import { MailerService } from '@/mail/mailer.service';
import { PasswordHasher } from '@/security/password-hasher.service';
import { TokenService } from '@/security/token.service';
import { RegisterRepository } from '@/auth/register/repositories/Register.repository';
import type { Register } from '@/auth/register/schemas/Register.schema';
import type { User } from '@/auth/shared/types/User.types';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class RegisterService {
  constructor(
    private readonly repository: RegisterRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly mailer: MailerService,
    private readonly blocklist: PasswordBlocklist,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async handle(data: Register): Promise<User> {
    // Early rejection for a known email; the unique index still decides races (see repository).
    if (await this.repository.findByEmail(data.email)) throw emailAlreadyRegistered();
    // The address is an obvious guess for this account, so it goes in as blocklist context.
    await assertPasswordUsable(this.blocklist, data.password, [data.email]);

    const passwordHash = await this.hasher.hash(data.password);
    const user = await this.repository.createUser({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    // Always send the link, even when verification is optional, so the account can verify later.
    await this.sendVerification(user);
    return user;
  }

  private async sendVerification(user: User): Promise<void> {
    const { token, hash } = this.tokens.createOpaqueToken();
    await this.repository.createVerificationToken({
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + this.env.EMAIL_VERIFICATION_TTL_HOURS * HOUR_MS),
    });
    await this.mailer.sendEmailVerification(user.email, token);
  }
}
