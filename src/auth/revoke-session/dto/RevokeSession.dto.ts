import { createZodDto } from 'nestjs-zod';
import { RevokeSessionSchema } from '@/auth/revoke-session/schemas/RevokeSession.schema';

/**
 * Request DTO built from RevokeSessionSchema; the global ZodValidationPipe validates with it and Swagger documents it.
 */
export class RevokeSessionDto extends createZodDto(RevokeSessionSchema) {}
