import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { RevokeOtherSessionsController } from './controllers/RevokeOtherSessions.controller';
import { RevokeOtherSessionsRepository } from './repositories/RevokeOtherSessions.repository';
import { RevokeOtherSessionsService } from './services/RevokeOtherSessions.service';

/** Wires the revoke-other-sessions flow: controller, service, repository. */
@Module({
  imports: [SharedModule],
  controllers: [RevokeOtherSessionsController],
  providers: [RevokeOtherSessionsService, RevokeOtherSessionsRepository],
})
export class RevokeOtherSessionsModule {}
