import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { ChangePasswordController } from './controllers/ChangePassword.controller';
import { ChangePasswordRepository } from './repositories/ChangePassword.repository';
import { ChangePasswordService } from './services/ChangePassword.service';

/** Wires the change-password flow: controller, service, repository. */
@Module({
  imports: [SharedModule],
  controllers: [ChangePasswordController],
  providers: [ChangePasswordService, ChangePasswordRepository],
})
export class ChangePasswordModule {}
