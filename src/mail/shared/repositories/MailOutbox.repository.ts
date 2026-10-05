import { Inject, Injectable } from '@nestjs/common';
import { type Database, DRIZZLE, type Executor } from '@/database/database.tokens';
import { mailOutbox } from '@/database/schema';

export interface QueuedEmail {
  tokenHash: string;
  encryptedPayload: string;
}

@Injectable()
export class MailOutboxRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Call from the transaction that stores the token so delivery cannot outlive a rollback. */
  async enqueue(input: QueuedEmail, on: Executor = this.db): Promise<void> {
    await on.insert(mailOutbox).values(input);
  }
}
