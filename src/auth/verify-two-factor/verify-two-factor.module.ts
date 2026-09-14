import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { ProfileSharedModule } from '@/profile/shared/shared.module';
import { VerifyTwoFactorController } from './controllers/VerifyTwoFactor.controller';
import { VerifyTwoFactorRepository } from './repositories/VerifyTwoFactor.repository';
import { VerifyTwoFactorService } from './services/VerifyTwoFactor.service';

/** Wires the verify-two-factor flow: controller, service, repository. */
@Module({
  imports: [SharedModule, ProfileSharedModule],
  controllers: [VerifyTwoFactorController],
  providers: [VerifyTwoFactorService, VerifyTwoFactorRepository],
})
export class VerifyTwoFactorModule {}
