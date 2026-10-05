import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { RevokeOtherSessionsController } from './controllers/RevokeOtherSessions.controller';
import { RevokeOtherSessionsService } from './services/RevokeOtherSessions.service';

/** Wires the flow service to the shared session repository. */
@Module({
  imports: [SharedModule],
  controllers: [RevokeOtherSessionsController],
  providers: [RevokeOtherSessionsService],
})
export class RevokeOtherSessionsModule {}
