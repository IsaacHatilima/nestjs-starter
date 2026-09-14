import { createZodDto } from 'nestjs-zod';
import { VerifyEmailSchema } from '@/auth/verify-email/schemas/VerifyEmail.schema';

/**
 * Request DTO built from VerifyEmailSchema; the global ZodValidationPipe validates with it and Swagger documents it.
 */
export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {}
