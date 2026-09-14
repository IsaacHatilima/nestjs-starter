import { Module } from '@nestjs/common';
import { LogoutController } from './controllers/Logout.controller';
import { LogoutRepository } from './repositories/Logout.repository';
import { LogoutService } from './services/Logout.service';

/** Wires the logout flow: controller, service, repository. */
@Module({
  controllers: [LogoutController],
  providers: [LogoutService, LogoutRepository],
})
export class LogoutModule {}
