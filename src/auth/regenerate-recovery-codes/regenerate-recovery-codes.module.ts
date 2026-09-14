import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { RegenerateRecoveryCodesController } from './controllers/RegenerateRecoveryCodes.controller';
import { RegenerateRecoveryCodesRepository } from './repositories/RegenerateRecoveryCodes.repository';
import { RegenerateRecoveryCodesService } from './services/RegenerateRecoveryCodes.service';

/** Wires the regenerate-recovery-codes flow: controller, service, repository. */
@Module({
  imports: [SharedModule],
  controllers: [RegenerateRecoveryCodesController],
  providers: [RegenerateRecoveryCodesService, RegenerateRecoveryCodesRepository],
})
export class RegenerateRecoveryCodesModule {}
