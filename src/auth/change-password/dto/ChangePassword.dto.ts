import { createZodDto } from 'nestjs-zod';
import { ChangePasswordSchema } from '@/auth/change-password/schemas/ChangePassword.schema';

/**
 * Request DTO built from ChangePasswordSchema; the global ZodValidationPipe validates with it and Swagger documents it.
 */
export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
