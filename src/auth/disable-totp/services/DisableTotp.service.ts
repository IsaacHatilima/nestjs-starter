import { Injectable } from '@nestjs/common';
import { RecoveryCodeRepository } from '@/auth/shared/repositories/RecoveryCode.repository';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { invalidCredentials, invalidTwoFactorCode, notFound, twoFactorNotEnabled } from '@/common/errors/auth-errors';
import type { AuthPrincipal } from '@/security/auth-principal';
import { PasswordHasher } from '@/security/password-hasher.service';
import { TwoFactorVerifier } from '@/security/two-factor-verifier.service';
import { DisableTotpRepository } from '@/auth/disable-totp/repositories/DisableTotp.repository';
import type { DisableTotp } from '@/auth/disable-totp/schemas/DisableTotp.schema';

/** Turns two-factor off after re-checking the password and a current code. */
@Injectable()
export class DisableTotpService {
  constructor(
    private readonly repository: DisableTotpRepository,
    private readonly userRepository: UserRepository,
    private readonly codeRepository: RecoveryCodeRepository,
    private readonly hasher: PasswordHasher,
    private readonly verifier: TwoFactorVerifier,
  ) {}

  async handle(auth: AuthPrincipal, data: DisableTotp): Promise<void> {
    const user = await this.userRepository.findById(auth.userId);
    if (!user) throw notFound('User');
    // Cheapest check first, then the password, then the second factor.
    if (!user.twoFactorEnabled) throw twoFactorNotEnabled();
    if (!(await this.hasher.verify(user.passwordHash, data.password))) {
      throw invalidCredentials();
    }
    if (!(await this.verifier.verify(user, data.code, this.userRepository, this.codeRepository))) {
      throw invalidTwoFactorCode();
    }
    await this.repository.disable(auth.userId);
  }
}
