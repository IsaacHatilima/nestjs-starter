import { createZodDto } from 'nestjs-zod';
import { VerifyTwoFactorSchema } from '@/auth/verify-two-factor/schemas/VerifyTwoFactor.schema';

/**
 * Request DTO built from VerifyTwoFactorSchema; the global ZodValidationPipe validates with it and Swagger documents
 * it.
 */
export class VerifyTwoFactorDto extends createZodDto(VerifyTwoFactorSchema) {}
