import { Injectable } from '@nestjs/common';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { VerificationTokenRepository } from '@/auth/shared/repositories/VerificationToken.repository';

export interface VerificationTarget {
  id: string;
  emailVerifiedAt: Date | null;
}

export interface NewEmailVerificationToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class ResendVerificationRepository {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: VerificationTokenRepository,
  ) {}

  async findByEmail(email: string): Promise<VerificationTarget | null> {
    const row = await this.userRepository.findByEmail(email);
    return row ? { id: row.id, emailVerifiedAt: row.emailVerifiedAt } : null;
  }

  replaceVerificationToken(input: NewEmailVerificationToken): Promise<void> {
    return this.tokenRepository.replace({ ...input, purpose: 'email_verification' });
  }
}
