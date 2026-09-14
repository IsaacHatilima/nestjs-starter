import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { EnableTotpController } from './controllers/EnableTotp.controller';
import { EnableTotpRepository } from './repositories/EnableTotp.repository';
import { EnableTotpService } from './services/EnableTotp.service';

/** Wires the enable-totp flow: controller, service, repository. */
@Module({
  imports: [SharedModule],
  controllers: [EnableTotpController],
  providers: [EnableTotpService, EnableTotpRepository],
})
export class EnableTotpModule {}
