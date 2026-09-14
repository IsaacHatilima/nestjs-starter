import { createZodDto } from 'nestjs-zod';
import { LoginSchema } from '@/auth/login/schemas/Login.schema';

/** Request DTO built from LoginSchema; the global ZodValidationPipe validates with it and Swagger documents it. */
export class LoginDto extends createZodDto(LoginSchema) {}
