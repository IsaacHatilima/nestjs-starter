import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { ForgotPasswordController } from './controllers/ForgotPassword.controller';
import { ForgotPasswordRepository } from './repositories/ForgotPassword.repository';
import { ForgotPasswordService } from './services/ForgotPassword.service';

/** Wires the forgot-password flow: controller, service, repository. */
@Module({
  imports: [SharedModule],
  controllers: [ForgotPasswordController],
  providers: [ForgotPasswordService, ForgotPasswordRepository],
})
export class ForgotPasswordModule {}
