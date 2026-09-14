import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { ResendVerificationController } from './controllers/ResendVerification.controller';
import { ResendVerificationRepository } from './repositories/ResendVerification.repository';
import { ResendVerificationService } from './services/ResendVerification.service';

/** Wires the resend-verification flow: controller, service, repository. */
@Module({
  imports: [SharedModule],
  controllers: [ResendVerificationController],
  providers: [ResendVerificationService, ResendVerificationRepository],
})
export class ResendVerificationModule {}
