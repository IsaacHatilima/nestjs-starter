import { createZodDto } from 'nestjs-zod';
import { RefreshTokenSchema } from '@/auth/refresh-token/schemas/RefreshToken.schema';

/**
 * Request DTO built from RefreshTokenSchema; the global ZodValidationPipe validates with it and Swagger documents it.
 */
export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}
