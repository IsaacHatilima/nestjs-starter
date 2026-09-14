import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ActiveSessionRepository } from './active-session.repository';
import { PasswordBlocklist } from './password-blocklist.service';
import { PasswordHasher } from './password-hasher.service';
import { PwnedPasswordsClient } from './pwned-passwords.client';
import { RecoveryCodeService } from './recovery-code.service';
import { SecretCipher } from './secret-cipher.service';
import { TokenService } from './token.service';
import { TotpService } from './totp.service';
import { TwoFactorVerifier } from './two-factor-verifier.service';

const SERVICES = [
  PasswordHasher,
  PwnedPasswordsClient,
  PasswordBlocklist,
  SecretCipher,
  TokenService,
  TotpService,
  RecoveryCodeService,
  TwoFactorVerifier,
  ActiveSessionRepository,
];

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: SERVICES,
  exports: SERVICES,
})
export class SecurityModule {}
