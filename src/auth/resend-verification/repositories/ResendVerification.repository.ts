import { Inject, Injectable } from '@nestjs/common';
import { VerificationTokenRepository } from '@/auth/shared/repositories/VerificationToken.repository';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { MailOutboxRepository } from '@/mail/shared/repositories/MailOutbox.repository';

export interface NewEmailVerificationToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  encryptedPayload: string;
}

@Injectable()
export class ResendVerificationRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tokenRepository: VerificationTokenRepository,
    private readonly outbox: MailOutboxRepository,
  ) {}

  async replaceVerificationToken(input: NewEmailVerificationToken): Promise<void> {
    const { encryptedPayload, ...token } = input;
    await this.db.transaction(async (tx) => {
      await this.tokenRepository.replace({ ...token, purpose: 'email_verification' }, tx);
      await this.outbox.enqueue({ tokenHash: token.tokenHash, encryptedPayload }, tx);
    });
  }
}
