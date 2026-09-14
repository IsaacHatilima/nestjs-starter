import { createZodDto } from 'nestjs-zod';
import { EnableTotpSchema } from '@/auth/enable-totp/schemas/EnableTotp.schema';

/** Request DTO built from EnableTotpSchema; the global ZodValidationPipe validates with it and Swagger documents it. */
export class EnableTotpDto extends createZodDto(EnableTotpSchema) {}
