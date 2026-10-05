import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { verificationTokens } from './verification-tokens';

/** Pending delivery is owned by mail; replacing a token also removes its obsolete email. */
export const mailOutbox = pgTable(
  'mail_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash')
      .notNull()
      .unique()
      .references(() => verificationTokens.tokenHash, { onDelete: 'cascade' }),
    /** AES-256-GCM encrypted MailMessage, including its verification/reset link. */
    encryptedPayload: text('encrypted_payload').notNull(),
    attempts: integer('attempts').notNull().default(0),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    leaseId: uuid('lease_id'),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('mail_outbox_available_at_idx').on(table.availableAt)],
);

export type MailOutboxRow = typeof mailOutbox.$inferSelect;
