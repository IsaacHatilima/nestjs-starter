import { Module } from '@nestjs/common';
import { SharedModule } from '@/auth/shared/shared.module';
import { ProfileSharedModule } from '@/profile/shared/shared.module';
import { LoginController } from './controllers/Login.controller';
import { LoginRepository } from './repositories/Login.repository';
import { LoginService } from './services/Login.service';

/** Wires the login flow: controller, service, repository. */
@Module({
  imports: [SharedModule, ProfileSharedModule],
  controllers: [LoginController],
  providers: [LoginService, LoginRepository],
})
export class LoginModule {}
