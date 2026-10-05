import { Body, Controller, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { ErrorCode } from '@/common/errors/error-codes';
import { ProfileSchema } from '@/profile/shared/schemas/Profile.schema';
import type { AuthPrincipal } from '@/security/auth-principal';
import { CurrentAuth } from '@/security/decorators/current-auth.decorator';
import { UpdateProfileDto } from '@/profile/update-profile/dto/UpdateProfile.dto';
import { UpdateProfileService } from '@/profile/update-profile/services/UpdateProfile.service';
import type { Profile } from '@/profile/shared/types/Profile.types';

/**
 * PATCH /profile: change part of the signed-in user's profile. Validation and auth are declarative; the service does
 * the work. The route carries no flow slug because the area has a single resource.
 */
@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
export class UpdateProfileController {
  constructor(private readonly service: UpdateProfileService) {}

  @Patch()
  @ApiEnvelopeResponse({ data: ProfileSchema, bearer: true, validation: true, errors: [ErrorCode.NOT_FOUND] })
  handle(@CurrentAuth() auth: AuthPrincipal, @Body() body: UpdateProfileDto): Promise<Profile> {
    return this.service.handle(auth, body);
  }
}
