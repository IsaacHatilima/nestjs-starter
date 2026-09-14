import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const tokenPurpose = pgEnum('token_purpose', ['email_verification', 'password_reset']);

export type TokenPurpose = (typeof tokenPurpose.enumValues)[number];

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: tokenPurpose('purpose').notNull(),
    /** sha256 of the emailed token; the plain token is never stored. */
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('verification_tokens_user_id_idx').on(table.userId)],
);

export type VerificationTokenRow = typeof verificationTokens.$inferSelect;
