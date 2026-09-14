import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { ResetPasswordController } from './controllers/ResetPassword.controller';
import { ResetPasswordRepository } from './repositories/ResetPassword.repository';
import { ResetPasswordService } from './services/ResetPassword.service';

/** Wires the reset-password flow: controller, service, repository. */
@Module({
  imports: [SharedModule],
  controllers: [ResetPasswordController],
  providers: [ResetPasswordService, ResetPasswordRepository],
})
export class ResetPasswordModule {}
