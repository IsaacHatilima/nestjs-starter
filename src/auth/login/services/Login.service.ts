import { Inject, Injectable } from '@nestjs/common';
import { emailNotVerified, invalidCredentials, notFound } from '@/common/errors/auth-errors';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';
import { PasswordHasher } from '@/security/password-hasher.service';
import type { RequestMeta } from '@/security/request-meta';
import { TokenService } from '@/security/token.service';
import { LoginRepository } from '@/auth/login/repositories/Login.repository';
import type { Login } from '@/auth/login/schemas/Login.schema';
import type { LoginResult } from '@/auth/shared/types/AuthResult.types';
import { toUser } from '@/auth/shared/types/User.mapper';
import type { UserCredentials } from '@/auth/shared/types/UserCredentials.types';
import { issueSession } from '@/auth/shared/services/issue-session';

/**
 * A real argon2id hash of a random string. Verified against when the email is
 * unknown so that unknown and known emails take the same time to reject.
 */
const NO_USER_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$b0iUH92yyzcDTayv5hyz5g$qrYfVsVTj4Ib4YU2zGoJMNF8hTEMXaEx2ei8Emln/7w';

@Injectable()
export class LoginService {
  constructor(
    private readonly repository: LoginRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async handle(data: Login, meta: RequestMeta): Promise<LoginResult> {
    // Password first, then policy checks, so a wrong password never reveals verification or 2FA state.
    const user = await this.authenticate(data);

    if (this.env.REQUIRE_EMAIL_VERIFICATION && user.emailVerifiedAt === null) {
      throw emailNotVerified();
    }
    // A challenge token only proves the password step; it grants no access by itself.
    if (user.twoFactorEnabled) {
      const challengeToken = await this.tokens.signTwoFactorChallenge(user.id);
      return { status: 'two_factor_required', challengeToken };
    }

    // Read the profile before the session exists, so a failure here cannot leave a session behind.
    const profile = await this.repository.findProfile(user.id);
    if (!profile) throw notFound('Profile');

    const pair = await issueSession(this.tokens, this.repository, user.id, meta);
    return { status: 'authenticated', ...pair, user: toUser(user, profile) };
  }

  private async authenticate(data: Login): Promise<UserCredentials> {
    const user = await this.repository.findCredentialsByEmail(data.email);
    // Verify even for unknown emails so response time does not reveal which emails exist.
    const matches = await this.hasher.verify(user?.passwordHash ?? NO_USER_HASH, data.password);
    if (!user || !matches) throw invalidCredentials();
    return user;
  }
}
