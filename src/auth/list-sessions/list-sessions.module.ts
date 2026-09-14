import { Module } from '@nestjs/common';
import { ListSessionsController } from './controllers/ListSessions.controller';
import { ListSessionsRepository } from './repositories/ListSessions.repository';
import { ListSessionsService } from './services/ListSessions.service';

/** Wires the list-sessions flow: controller, service, repository. */
@Module({
  controllers: [ListSessionsController],
  providers: [ListSessionsService, ListSessionsRepository],
})
export class ListSessionsModule {}
