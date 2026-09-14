import { createZodDto } from 'nestjs-zod';
import { UpdateProfileSchema } from '@/profile/update-profile/schemas/UpdateProfile.schema';

/**
 * Request DTO built from UpdateProfileSchema; the global ZodValidationPipe validates with it and Swagger documents it.
 */
export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}
