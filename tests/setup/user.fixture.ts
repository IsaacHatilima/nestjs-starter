import type { UserCredentials } from '@/auth/shared/types/UserCredentials.types';
import type { User } from '@/auth/shared/types/User.types';
import type { Profile } from '@/profile/shared/types/Profile.types';

export const NOW = new Date('2026-09-12T10:00:00.000Z');
export const USER_ID = '11111111-1111-4111-8111-111111111111';
export const SESSION_ID = '22222222-2222-4222-8222-222222222222';
export const OTHER_SESSION_ID = '33333333-3333-4333-8333-333333333333';
export const META = { ip: '127.0.0.1', userAgent: 'jest' };

export function credentials(overrides: Partial<UserCredentials> = {}): UserCredentials {
  return {
    id: USER_ID,
    email: 'ada@example.com',
    passwordHash: '$argon2id$placeholder',
    emailVerifiedAt: NOW,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorPendingSecret: null,
    twoFactorLastUsedStep: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    avatarUrl: null,
    ...overrides,
  };
}

export function publicUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    email: 'ada@example.com',
    emailVerified: true,
    twoFactorEnabled: false,
    profile: profile(),
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}
