import { Injectable } from '@nestjs/common';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { VerificationTokenRepository } from '@/auth/shared/repositories/VerificationToken.repository';

export interface NewPasswordResetToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class ForgotPasswordRepository {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: VerificationTokenRepository,
  ) {}

  async findByEmail(email: string): Promise<{ id: string } | null> {
    const row = await this.userRepository.findByEmail(email);
    return row ? { id: row.id } : null;
  }

  replaceResetToken(input: NewPasswordResetToken): Promise<void> {
    return this.tokenRepository.replace({ ...input, purpose: 'password_reset' });
  }
}
