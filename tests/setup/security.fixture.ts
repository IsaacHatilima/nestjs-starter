import { JwtService } from '@nestjs/jwt';
import { type Env, validateEnv } from '@/config/env.schema';
import { MailerService } from '@/mail/mailer.service';
import { MemoryMailTransport } from '@/mail/transports/memory.transport';
import { PasswordHasher } from '@/security/password-hasher.service';
import { RecoveryCodeService } from '@/security/recovery-code.service';
import { SecretCipher } from '@/security/secret-cipher.service';
import { TokenService } from '@/security/token.service';
import { TotpService } from '@/security/totp.service';
import { TwoFactorVerifier } from '@/security/two-factor-verifier.service';

export const testEnv: Env = validateEnv({
  DATABASE_URL: 'postgres://postgres@127.0.0.1:5432/zitd_api_test',
  JWT_SECRET: 'j'.repeat(32),
  TWO_FACTOR_ENCRYPTION_KEY: 'ab'.repeat(32),
  APP_URL: 'http://localhost:3001',
  MAIL_DRIVER: 'memory',
});

export function securityServices(env: Env = testEnv) {
  const tokens = new TokenService(new JwtService({ secret: env.JWT_SECRET }), env);
  const hasher = new PasswordHasher();
  const cipher = new SecretCipher(env);
  const totp = new TotpService(env);
  const recovery = new RecoveryCodeService();
  const verifier = new TwoFactorVerifier(cipher, totp, recovery);
  return { env, tokens, hasher, cipher, totp, recovery, verifier };
}

export function memoryMailer(env: Env = testEnv) {
  const transport = new MemoryMailTransport();
  return { transport, mailer: new MailerService(transport, env) };
}
