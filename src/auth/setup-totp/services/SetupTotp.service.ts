import { Injectable } from '@nestjs/common';
import { notFound, twoFactorAlreadyEnabled } from '@/common/errors/auth-errors';
import type { AuthPrincipal } from '@/security/auth-principal';
import { SecretCipher } from '@/security/secret-cipher.service';
import { TotpService } from '@/security/totp.service';
import { SetupTotpRepository } from '@/auth/setup-totp/repositories/SetupTotp.repository';
import type { TwoFactorSetup } from '@/auth/setup-totp/types/TwoFactorSetup.types';

/** Starts enrolment: stores an encrypted pending secret and returns what the app needs to scan. */
@Injectable()
export class SetupTotpService {
  constructor(
    private readonly repository: SetupTotpRepository,
    private readonly totp: TotpService,
    private readonly cipher: SecretCipher,
  ) {}

  async handle(auth: AuthPrincipal): Promise<TwoFactorSetup> {
    const user = await this.repository.findById(auth.userId);
    if (!user) throw notFound('User');
    if (user.twoFactorEnabled) throw twoFactorAlreadyEnabled();

    // Stored encrypted as "pending" until a first code proves the authenticator app was set up.
    const secret = this.totp.generateSecret();
    await this.repository.savePendingSecret(auth.userId, this.cipher.encrypt(secret));

    const otpauthUrl = this.totp.buildOtpauthUri(user.email, secret);
    const qrCodeDataUrl = await this.totp.renderQrCodeDataUrl(otpauthUrl);
    return { secret, otpauthUrl, qrCodeDataUrl };
  }
}
