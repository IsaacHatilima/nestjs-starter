import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { ProfileSharedModule } from '@/profile/shared/shared.module';
import { MeController } from './controllers/Me.controller';
import { MeRepository } from './repositories/Me.repository';
import { MeService } from './services/Me.service';

/** Wires the me flow: controller, service, repository. */
@Module({
  imports: [SharedModule, ProfileSharedModule],
  controllers: [MeController],
  providers: [MeService, MeRepository],
})
export class MeModule {}
