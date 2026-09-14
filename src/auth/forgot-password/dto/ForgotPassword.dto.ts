import { createZodDto } from 'nestjs-zod';
import { ForgotPasswordSchema } from '@/auth/forgot-password/schemas/ForgotPassword.schema';

/**
 * Request DTO built from ForgotPasswordSchema; the global ZodValidationPipe validates with it and Swagger documents it.
 */
export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}
