import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { DisableTotpController } from './controllers/DisableTotp.controller';
import { DisableTotpRepository } from './repositories/DisableTotp.repository';
import { DisableTotpService } from './services/DisableTotp.service';

/** Wires the disable-totp flow: controller, service, repository. */
@Module({
  imports: [SharedModule],
  controllers: [DisableTotpController],
  providers: [DisableTotpService, DisableTotpRepository],
})
export class DisableTotpModule {}
