import { createZodDto } from 'nestjs-zod';
import { ResendVerificationSchema } from '@/auth/resend-verification/schemas/ResendVerification.schema';

/**
 * Request DTO built from ResendVerificationSchema; the global ZodValidationPipe validates with it and Swagger documents
 * it.
 */
export class ResendVerificationDto extends createZodDto(ResendVerificationSchema) {}
