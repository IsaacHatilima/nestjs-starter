import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { ProfileSharedModule } from '@/profile/shared/shared.module';
import { RegisterController } from './controllers/Register.controller';
import { RegisterRepository } from './repositories/Register.repository';
import { RegisterService } from './services/Register.service';

/** Wires the register flow: controller, service, repository. */
@Module({
  imports: [SharedModule, ProfileSharedModule],
  controllers: [RegisterController],
  providers: [RegisterService, RegisterRepository],
})
export class RegisterModule {}
