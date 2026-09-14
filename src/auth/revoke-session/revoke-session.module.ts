import { Module } from '@nestjs/common';
import { RevokeSessionController } from './controllers/RevokeSession.controller';
import { RevokeSessionRepository } from './repositories/RevokeSession.repository';
import { RevokeSessionService } from './services/RevokeSession.service';

/** Wires the revoke-session flow: controller, service, repository. */
@Module({
  controllers: [RevokeSessionController],
  providers: [RevokeSessionService, RevokeSessionRepository],
})
export class RevokeSessionModule {}
