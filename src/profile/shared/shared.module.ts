import { Module } from '@nestjs/common';
import { ProfileRepository } from './repositories/Profile.repository';

/**
 * Table access on `profiles` that more than one flow needs. Named for the area rather than called `SharedModule`,
 * because the auth flows that build a `User` import it alongside auth's own shared module.
 */
@Module({
  providers: [ProfileRepository],
  exports: [ProfileRepository],
})
export class ProfileSharedModule {}
