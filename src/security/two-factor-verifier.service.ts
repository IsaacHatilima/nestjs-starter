import { Injectable } from '@nestjs/common';
import { RecoveryCodeService } from './recovery-code.service';
import { SecretCipher } from './secret-cipher.service';
import { TotpService } from './totp.service';

const TOTP_CODE = /^\d{6}$/;

/** The parts of a user that a second-factor check needs. */
export interface TwoFactorSubject {
  id: string;
  twoFactorSecret: string | null;
  twoFactorLastUsedStep: number | null;
}

/** The shared user repository claims TOTP steps without exposing database details here. */
export interface TotpStepRecorder {
  /** Claims the step; false when it was already used (including by a concurrent request). */
  recordTotpStep(userId: string, step: number): Promise<boolean>;
}

/** Recovery-code persistence remains separate from user persistence. */
export interface RecoveryCodeConsumer {
  consume(userId: string, codeHash: string): Promise<boolean>;
}

/**
 * Checks a submitted code against the user's TOTP secret, or against their
 * recovery codes when it is not a 6-digit code. Accepted TOTP steps are
 * recorded so the same code cannot be replayed; recovery codes are single use.
 */
@Injectable()
export class TwoFactorVerifier {
  constructor(
    private readonly cipher: SecretCipher,
    private readonly totp: TotpService,
    private readonly recovery: RecoveryCodeService,
  ) {}

  async verify(
    subject: TwoFactorSubject,
    code: string,
    users: TotpStepRecorder,
    recoveryCodes: RecoveryCodeConsumer,
  ): Promise<boolean> {
    if (!subject.twoFactorSecret) return false;
    const compact = code.replace(/\s+/g, '');
    // Six digits can only be an authenticator code; anything else is treated as a recovery code.
    if (TOTP_CODE.test(compact)) {
      return this.verifyTotp(subject, subject.twoFactorSecret, compact, users);
    }
    return recoveryCodes.consume(subject.id, this.recovery.hash(compact));
  }

  private async verifyTotp(
    subject: TwoFactorSubject,
    encryptedSecret: string,
    code: string,
    users: TotpStepRecorder,
  ): Promise<boolean> {
    const secret = this.cipher.decrypt(encryptedSecret);
    const result = await this.totp.verify(secret, code, subject.twoFactorLastUsedStep);
    if (!result.valid) return false;
    return users.recordTotpStep(subject.id, result.timeStep);
  }
}
