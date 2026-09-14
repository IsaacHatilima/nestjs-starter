/** Everything auth services need to check a user, including secrets. Stays server-side. */
export interface UserCredentials {
  id: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  twoFactorEnabled: boolean;
  /** Encrypted TOTP secret in use. */
  twoFactorSecret: string | null;
  /** Encrypted TOTP secret awaiting confirmation. */
  twoFactorPendingSecret: string | null;
  twoFactorLastUsedStep: number | null;
  createdAt: Date;
  updatedAt: Date;
}
