import { Injectable } from '@nestjs/common';
import { RecoveryCodeRepository } from '@/auth/shared/repositories/RecoveryCode.repository';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { invalidCredentials, invalidTwoFactorCode, notFound, twoFactorNotEnabled } from '@/common/errors/auth-errors';
import type { AuthPrincipal } from '@/security/auth-principal';
import { PasswordHasher } from '@/security/password-hasher.service';
import { RecoveryCodeService } from '@/security/recovery-code.service';
import { TwoFactorVerifier } from '@/security/two-factor-verifier.service';
import { RegenerateRecoveryCodesRepository } from '@/auth/regenerate-recovery-codes/repositories/RegenerateRecoveryCodes.repository';
import type { RegenerateRecoveryCodes } from '@/auth/regenerate-recovery-codes/schemas/RegenerateRecoveryCodes.schema';
import type { TwoFactorRecoveryCodes } from '@/auth/shared/types/TwoFactorRecoveryCodes.types';

/** Replaces every recovery code after re-checking the password and a current code. */
@Injectable()
export class RegenerateRecoveryCodesService {
  constructor(
    private readonly repository: RegenerateRecoveryCodesRepository,
    private readonly userRepository: UserRepository,
    private readonly codeRepository: RecoveryCodeRepository,
    private readonly hasher: PasswordHasher,
    private readonly verifier: TwoFactorVerifier,
    private readonly recovery: RecoveryCodeService,
  ) {}

  async handle(auth: AuthPrincipal, data: RegenerateRecoveryCodes): Promise<TwoFactorRecoveryCodes> {
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

    const { codes, hashes } = this.recovery.generate();
    await this.repository.replaceRecoveryCodes(auth.userId, hashes);
    return { recoveryCodes: codes };
  }
}
