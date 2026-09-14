import { createZodDto } from 'nestjs-zod';
import { LogoutSchema } from '@/auth/logout/schemas/Logout.schema';

/** Request DTO built from LogoutSchema; the global ZodValidationPipe validates with it and Swagger documents it. */
export class LogoutDto extends createZodDto(LogoutSchema) {}
