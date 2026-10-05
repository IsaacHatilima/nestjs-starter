import { Inject, Injectable } from '@nestjs/common';
import { VerificationTokenRepository } from '@/auth/shared/repositories/VerificationToken.repository';
import { toUser } from '@/auth/shared/types/User.mapper';
import type { User } from '@/auth/shared/types/User.types';
import { emailAlreadyRegistered } from '@/common/errors/auth-errors';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { isUniqueViolation } from '@/database/pg-errors';
import { users } from '@/database/schema';
import { ProfileRepository } from '@/profile/shared/repositories/Profile.repository';
import { toProfile } from '@/profile/shared/types/Profile.mapper';
import { MailOutboxRepository } from '@/mail/shared/repositories/MailOutbox.repository';

export interface NewUser {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export interface RegistrationEmail {
  tokenHash: string;
  expiresAt: Date;
  encryptedPayload: string;
}

@Injectable()
export class RegisterRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tokenRepository: VerificationTokenRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly outbox: MailOutboxRepository,
  ) {}

  /** The account, profile, token and queued mail either all commit or all roll back. */
  async createUser(input: NewUser, email: RegistrationEmail): Promise<User> {
    const { firstName, lastName, ...credentials } = input;
    try {
      return await this.db.transaction(async (tx) => {
        const [row] = await tx.insert(users).values(credentials).returning();
        const profile = await this.profileRepository.create({ userId: row.id, firstName, lastName }, tx);
        await this.tokenRepository.replace(
          { userId: row.id, tokenHash: email.tokenHash, expiresAt: email.expiresAt, purpose: 'email_verification' },
          tx,
        );
        await this.outbox.enqueue({ tokenHash: email.tokenHash, encryptedPayload: email.encryptedPayload }, tx);
        return toUser(row, toProfile(profile));
      });
    } catch (error) {
      // Two concurrent registrations can both pass the service's existence check; the unique index decides.
      if (isUniqueViolation(error)) throw emailAlreadyRegistered();
      throw error;
    }
  }
}
