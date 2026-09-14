import { Module } from '@nestjs/common';
import { ChangePasswordModule } from './change-password/change-password.module';
import { DisableTotpModule } from './disable-totp/disable-totp.module';
import { EnableTotpModule } from './enable-totp/enable-totp.module';
import { ForgotPasswordModule } from './forgot-password/forgot-password.module';
import { ListSessionsModule } from './list-sessions/list-sessions.module';
import { LoginModule } from './login/login.module';
import { LogoutModule } from './logout/logout.module';
import { MeModule } from './me/me.module';
import { RefreshTokenModule } from './refresh-token/refresh-token.module';
import { RegenerateRecoveryCodesModule } from './regenerate-recovery-codes/regenerate-recovery-codes.module';
import { RegisterModule } from './register/register.module';
import { ResendVerificationModule } from './resend-verification/resend-verification.module';
import { ResetPasswordModule } from './reset-password/reset-password.module';
import { RevokeOtherSessionsModule } from './revoke-other-sessions/revoke-other-sessions.module';
import { RevokeSessionModule } from './revoke-session/revoke-session.module';
import { SetupTotpModule } from './setup-totp/setup-totp.module';
import { VerifyEmailModule } from './verify-email/verify-email.module';
import { VerifyTwoFactorModule } from './verify-two-factor/verify-two-factor.module';

/** Every authentication flow is its own feature; this module only groups them. */
@Module({
  imports: [
    ChangePasswordModule,
    DisableTotpModule,
    EnableTotpModule,
    ForgotPasswordModule,
    ListSessionsModule,
    LoginModule,
    LogoutModule,
    MeModule,
    RefreshTokenModule,
    RegenerateRecoveryCodesModule,
    RegisterModule,
    ResendVerificationModule,
    ResetPasswordModule,
    RevokeOtherSessionsModule,
    RevokeSessionModule,
    SetupTotpModule,
    VerifyEmailModule,
    VerifyTwoFactorModule,
  ],
})
export class AuthModule {}
