import { Injectable } from '@nestjs/common';
import { SessionRepository } from '@/auth/shared/repositories/Session.repository';

@Injectable()
export class RevokeOtherSessionsRepository {
  constructor(private readonly sessionRepository: SessionRepository) {}

  revokeAllExcept(userId: string, keepSessionId: string): Promise<void> {
    return this.sessionRepository.revokeOthers(userId, keepSessionId);
  }
}
