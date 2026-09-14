import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { VerifyEmailController } from './controllers/VerifyEmail.controller';
import { VerifyEmailRepository } from './repositories/VerifyEmail.repository';
import { VerifyEmailService } from './services/VerifyEmail.service';

/** Wires the verify-email flow: controller, service, repository. */
@Module({
  imports: [SharedModule],
  controllers: [VerifyEmailController],
  providers: [VerifyEmailService, VerifyEmailRepository],
})
export class VerifyEmailModule {}
