import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const twoFactorRecoveryCodes = pgTable(
  'two_factor_recovery_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** sha256 of the normalised code; usedAt marks it spent. */
    codeHash: text('code_hash').notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('two_factor_recovery_codes_user_id_idx').on(table.userId)],
);

export type TwoFactorRecoveryCodeRow = typeof twoFactorRecoveryCodes.$inferSelect;
