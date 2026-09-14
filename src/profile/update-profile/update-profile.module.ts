import { Module } from '@nestjs/common';
import { ProfileSharedModule } from '@/profile/shared/shared.module';
import { UpdateProfileController } from './controllers/UpdateProfile.controller';
import { UpdateProfileRepository } from './repositories/UpdateProfile.repository';
import { UpdateProfileService } from './services/UpdateProfile.service';

/** Wires the update-profile flow: controller, service, repository. */
@Module({
  imports: [ProfileSharedModule],
  controllers: [UpdateProfileController],
  providers: [UpdateProfileService, UpdateProfileRepository],
})
export class UpdateProfileModule {}
