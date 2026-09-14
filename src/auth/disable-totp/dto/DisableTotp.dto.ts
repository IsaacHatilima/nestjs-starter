import { createZodDto } from 'nestjs-zod';
import { DisableTotpSchema } from '@/auth/disable-totp/schemas/DisableTotp.schema';

/**
 * Request DTO built from DisableTotpSchema; the global ZodValidationPipe validates with it and Swagger documents it.
 */
export class DisableTotpDto extends createZodDto(DisableTotpSchema) {}
