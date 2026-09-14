import { createZodDto } from 'nestjs-zod';
import { RegisterSchema } from '@/auth/register/schemas/Register.schema';

/** Request DTO built from RegisterSchema; the global ZodValidationPipe validates with it and Swagger documents it. */
export class RegisterDto extends createZodDto(RegisterSchema) {}
