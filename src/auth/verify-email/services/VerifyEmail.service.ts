import { Injectable } from '@nestjs/common';
import { invalidToken } from '@/common/errors/auth-errors';
import { TokenService } from '@/security/token.service';
import { VerifyEmailRepository } from '@/auth/verify-email/repositories/VerifyEmail.repository';
import type { VerifyEmail } from '@/auth/verify-email/schemas/VerifyEmail.schema';

@Injectable()
export class VerifyEmailService {
  constructor(
    private readonly repository: VerifyEmailRepository,
    private readonly tokens: TokenService,
  ) {}

  async handle(data: VerifyEmail): Promise<void> {
    const verified = await this.repository.verifyWithToken(this.tokens.hashOpaqueToken(data.token));
    // One generic error for unknown, used and expired tokens.
    if (!verified) throw invalidToken('Invalid or expired verification token');
  }
}
