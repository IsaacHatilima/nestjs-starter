import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { VerificationTokenRepository } from '@/auth/shared/repositories/VerificationToken.repository';
import { toUser } from '@/auth/shared/types/User.mapper';
import type { User } from '@/auth/shared/types/User.types';
import { emailAlreadyRegistered } from '@/common/errors/auth-errors';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { isUniqueViolation } from '@/database/pg-errors';
import { users } from '@/database/schema';
import { ProfileRepository } from '@/profile/shared/repositories/Profile.repository';
import { toProfile } from '@/profile/shared/types/Profile.mapper';

export interface NewUser {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export interface NewEmailVerificationToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class RegisterRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: VerificationTokenRepository,
    private readonly profileRepository: ProfileRepository,
  ) {}

  async findByEmail(email: string): Promise<{ id: string } | null> {
    const row = await this.userRepository.findByEmail(email);
    return row ? { id: row.id } : null;
  }

  /** Account and profile are written in one transaction, so a user can never exist without a profile. */
  async createUser(input: NewUser): Promise<User> {
    const { firstName, lastName, ...credentials } = input;
    try {
      return await this.db.transaction(async (tx) => {
        const [row] = await tx.insert(users).values(credentials).returning();
        const profile = await this.profileRepository.create({ userId: row.id, firstName, lastName }, tx);
        return toUser(row, toProfile(profile));
      });
    } catch (error) {
      // Two concurrent registrations can both pass the service's existence check; the unique index decides.
      if (isUniqueViolation(error)) throw emailAlreadyRegistered();
      throw error;
    }
  }

  createVerificationToken(input: NewEmailVerificationToken): Promise<void> {
    return this.tokenRepository.replace({ ...input, purpose: 'email_verification' });
  }
}
