import { Module } from '@nestjs/common';
import { UpdateProfileModule } from './update-profile/update-profile.module';

/** Every profile flow is its own feature; this module only groups them. */
@Module({
  imports: [UpdateProfileModule],
})
export class ProfileModule {}
