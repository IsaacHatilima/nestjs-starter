import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { SetupTotpController } from './controllers/SetupTotp.controller';
import { SetupTotpRepository } from './repositories/SetupTotp.repository';
import { SetupTotpService } from './services/SetupTotp.service';

/** Wires the setup-totp flow: controller, service, repository. */
@Module({
  imports: [SharedModule],
  controllers: [SetupTotpController],
  providers: [SetupTotpService, SetupTotpRepository],
})
export class SetupTotpModule {}
