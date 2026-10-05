import { Injectable } from '@nestjs/common';
import { invalidToken, invalidTwoFactorCode, notFound, twoFactorNotEnabled } from '@/common/errors/auth-errors';
import type { RequestMeta } from '@/security/request-meta';
import { TokenService } from '@/security/token.service';
import { TwoFactorVerifier } from '@/security/two-factor-verifier.service';
import { VerifyTwoFactorRepository } from '@/auth/verify-two-factor/repositories/VerifyTwoFactor.repository';
import type { VerifyTwoFactor } from '@/auth/verify-two-factor/schemas/VerifyTwoFactor.schema';
import type { AuthenticatedResult } from '@/auth/shared/types/AuthResult.types';
import { toUser } from '@/auth/shared/types/User.mapper';
import { RecoveryCodeRepository } from '@/auth/shared/repositories/RecoveryCode.repository';
import { SessionRepository } from '@/auth/shared/repositories/Session.repository';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { issueSession } from '@/auth/shared/services/issue-session';

/** Second step of login: trade a challenge token plus a valid code for a session. */
@Injectable()
export class VerifyTwoFactorService {
  constructor(
    private readonly repository: VerifyTwoFactorRepository,
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly codeRepository: RecoveryCodeRepository,
    private readonly tokens: TokenService,
    private readonly verifier: TwoFactorVerifier,
  ) {}

  async handle(data: VerifyTwoFactor, meta: RequestMeta): Promise<AuthenticatedResult> {
    // The challenge token has typ 'two_factor'; an access token is rejected here.
    const { userId } = await this.tokens.verifyTwoFactorChallenge(data.challengeToken);
    const user = await this.userRepository.findById(userId);
    if (!user) throw invalidToken();
    if (!user.twoFactorEnabled) throw twoFactorNotEnabled();

    // Accepts a replay-protected TOTP code or a single-use recovery code.
    const accepted = await this.verifier.verify(user, data.code, this.userRepository, this.codeRepository);
    if (!accepted) throw invalidTwoFactorCode();

    // Read the profile before the session exists, so a failure here cannot leave a session behind.
    const profile = await this.repository.findProfile(userId);
    if (!profile) throw notFound('Profile');

    const pair = await issueSession(this.tokens, this.sessionRepository, userId, meta);
    return { status: 'authenticated', ...pair, user: toUser(user, profile) };
  }
}
