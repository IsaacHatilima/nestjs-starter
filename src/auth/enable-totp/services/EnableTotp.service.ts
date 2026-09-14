import { Injectable } from '@nestjs/common';
import {
  invalidTwoFactorCode,
  notFound,
  twoFactorAlreadyEnabled,
  twoFactorNotSetup,
} from '@/common/errors/auth-errors';
import type { AuthPrincipal } from '@/security/auth-principal';
import { RecoveryCodeService } from '@/security/recovery-code.service';
import { SecretCipher } from '@/security/secret-cipher.service';
import { TotpService } from '@/security/totp.service';
import { EnableTotpRepository } from '@/auth/enable-totp/repositories/EnableTotp.repository';
import type { EnableTotp } from '@/auth/enable-totp/schemas/EnableTotp.schema';
import type { TwoFactorRecoveryCodes } from '@/auth/shared/types/TwoFactorRecoveryCodes.types';

/** Confirms enrolment with a first valid code, then hands out recovery codes once. */
@Injectable()
export class EnableTotpService {
  constructor(
    private readonly repository: EnableTotpRepository,
    private readonly totp: TotpService,
    private readonly cipher: SecretCipher,
    private readonly recovery: RecoveryCodeService,
  ) {}

  async handle(auth: AuthPrincipal, data: EnableTotp): Promise<TwoFactorRecoveryCodes> {
    const user = await this.repository.findById(auth.userId);
    if (!user) throw notFound('User');
    if (user.twoFactorEnabled) throw twoFactorAlreadyEnabled();
    if (!user.twoFactorPendingSecret) throw twoFactorNotSetup();

    // No replay floor here: this is the first code ever accepted for this secret.
    const secret = this.cipher.decrypt(user.twoFactorPendingSecret);
    const result = await this.totp.verify(secret, data.code, null);
    if (!result.valid) throw invalidTwoFactorCode();

    // Recovery codes are returned once; only their hashes are stored.
    const { codes, hashes } = this.recovery.generate();
    await this.repository.enable(auth.userId, {
      secret: user.twoFactorPendingSecret,
      lastUsedStep: result.timeStep,
      recoveryCodeHashes: hashes,
    });
    return { recoveryCodes: codes };
  }
}
