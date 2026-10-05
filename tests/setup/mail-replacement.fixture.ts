import { ForgotPasswordRepository } from '@/auth/forgot-password/repositories/ForgotPassword.repository';
import type { NewPasswordResetToken } from '@/auth/forgot-password/repositories/ForgotPassword.repository';
import { ResendVerificationRepository } from '@/auth/resend-verification/repositories/ResendVerification.repository';
import { type TokenPurpose, users } from '@/database/schema';
import { MailerService } from '@/mail/mailer.service';
import { SecretCipher } from '@/security/secret-cipher.service';
import { TokenService } from '@/security/token.service';
import type { TestApp } from './test-app';
import { credentials, USER_ID } from './user.fixture';

/** Seed the token owner directly so testing replacements does not flush their outbox through HTTP. */
export async function mailReplacement(t: TestApp, purpose: TokenPurpose) {
  const user = credentials({ emailVerifiedAt: null });
  await t.db.insert(users).values(user);
  const mailer = t.app.get(MailerService);
  const cipher = t.app.get(SecretCipher);
  const tokens = t.app.get(TokenService);
  return {
    userId: USER_ID,
    replace(input: NewPasswordResetToken): Promise<void> {
      return purpose === 'password_reset'
        ? t.app.get(ForgotPasswordRepository).replaceResetToken(input)
        : t.app.get(ResendVerificationRepository).replaceVerificationToken(input);
    },
    input(token: string): NewPasswordResetToken {
      const message =
        purpose === 'password_reset'
          ? mailer.passwordResetMessage(user.email, token)
          : mailer.emailVerificationMessage(user.email, token);
      return {
        userId: USER_ID,
        tokenHash: tokens.hashOpaqueToken(token),
        expiresAt: new Date(Date.now() + 60_000),
        encryptedPayload: cipher.encrypt(JSON.stringify(message)),
      };
    },
  };
}
