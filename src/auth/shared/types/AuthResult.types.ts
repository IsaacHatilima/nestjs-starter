import type { User } from './User.types';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedResult extends TokenPair {
  status: 'authenticated';
  user: User;
}

export interface TwoFactorRequiredResult {
  status: 'two_factor_required';
  challengeToken: string;
}

export type LoginResult = AuthenticatedResult | TwoFactorRequiredResult;

export interface SessionInput {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
}
