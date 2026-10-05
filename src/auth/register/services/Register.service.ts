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
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import type { Register } from '@/auth/register/schemas/Register.schema';
import type { User } from '@/auth/shared/types/User.types';
import { SecretCipher } from '@/security/secret-cipher.service';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class RegisterService {
  constructor(
    private readonly repository: RegisterRepository,
    private readonly userRepository: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly mailer: MailerService,
    private readonly blocklist: PasswordBlocklist,
    private readonly cipher: SecretCipher,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async handle(data: Register): Promise<User> {
    // Early rejection for a known email; the unique index still decides races (see repository).
    if (await this.userRepository.findByEmail(data.email)) throw emailAlreadyRegistered();
    // The address is an obvious guess for this account, so it goes in as blocklist context.
    await assertPasswordUsable(this.blocklist, data.password, [data.email]);

    const passwordHash = await this.hasher.hash(data.password);
    const { token, hash } = this.tokens.createOpaqueToken();
    const message = this.mailer.emailVerificationMessage(data.email, token);
    // SMTP runs in the worker; the transaction below persists everything delivery needs.
    return this.repository.createUser(
      { email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName },
      {
        tokenHash: hash,
        expiresAt: new Date(Date.now() + this.env.EMAIL_VERIFICATION_TTL_HOURS * HOUR_MS),
        encryptedPayload: this.cipher.encrypt(JSON.stringify(message)),
      },
    );
  }
}
