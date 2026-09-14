import { createZodDto } from 'nestjs-zod';
import { ResetPasswordSchema } from '@/auth/reset-password/schemas/ResetPassword.schema';

/**
 * Request DTO built from ResetPasswordSchema; the global ZodValidationPipe validates with it and Swagger documents it.
 */
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
