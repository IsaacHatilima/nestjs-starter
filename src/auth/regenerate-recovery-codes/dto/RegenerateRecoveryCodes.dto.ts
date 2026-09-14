import { createZodDto } from 'nestjs-zod';
import { RegenerateRecoveryCodesSchema } from '@/auth/regenerate-recovery-codes/schemas/RegenerateRecoveryCodes.schema';

/**
 * Request DTO built from RegenerateRecoveryCodesSchema; the global ZodValidationPipe validates with it and Swagger
 * documents it.
 */
export class RegenerateRecoveryCodesDto extends createZodDto(RegenerateRecoveryCodesSchema) {}
