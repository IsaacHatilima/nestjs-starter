import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { ApiResponseSchemaHost } from '@nestjs/swagger';
import { z } from 'zod';
import { ErrorCode } from '@/common/errors/error-codes';
import { errorEnvelopeSchema, successEnvelopeSchema } from './envelope.schema';

interface EnvelopeResponseOptions {
  data: z.ZodType;
  status?: number;
  description?: string;
  errors?: readonly ErrorCode[];
  bearer?: boolean;
  validation?: boolean;
}

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  PASSWORD_COMPROMISED: 400,
  TWO_FACTOR_NOT_ENABLED: 400,
  TWO_FACTOR_NOT_SETUP: 400,
  BAD_REQUEST: 400,
  INVALID_CREDENTIALS: 401,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  SESSION_REVOKED: 401,
  INVALID_TWO_FACTOR_CODE: 401,
  UNAUTHORIZED: 401,
  EMAIL_NOT_VERIFIED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_ALREADY_REGISTERED: 409,
  TWO_FACTOR_ALREADY_ENABLED: 409,
  RATE_LIMITED: 429,
  HTTP_ERROR: 500,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

function openApiSchema(schema: z.ZodType): ApiResponseSchemaHost['schema'] {
  return z.toJSONSchema(schema, { target: 'openapi-3.0' }) as ApiResponseSchemaHost['schema'];
}

/** Documents the interceptor/filter contract without adding a second runtime serialization layer. */
export function ApiEnvelopeResponse(options: EnvelopeResponseOptions): MethodDecorator {
  const codes = new Set<ErrorCode>([ErrorCode.RATE_LIMITED, ErrorCode.INTERNAL_ERROR, ...(options.errors ?? [])]);
  if (options.validation) {
    codes.add(ErrorCode.BAD_REQUEST);
    codes.add(ErrorCode.VALIDATION_ERROR);
  }
  if (options.bearer) {
    codes.add(ErrorCode.INVALID_TOKEN);
    codes.add(ErrorCode.TOKEN_EXPIRED);
    codes.add(ErrorCode.SESSION_REVOKED);
  }
  const byStatus = new Map<number, [ErrorCode, ...ErrorCode[]]>();
  for (const code of codes) {
    const status = STATUS_BY_CODE[code];
    const group = byStatus.get(status);
    if (group) group.push(code);
    else byStatus.set(status, [code]);
  }
  return applyDecorators(
    ApiResponse({
      status: options.status ?? 200,
      description: options.description ?? 'Success envelope',
      schema: openApiSchema(successEnvelopeSchema(options.data)),
    }),
    ...Array.from(byStatus, ([status, errors]) =>
      ApiResponse({ status, description: errors.join(', '), schema: openApiSchema(errorEnvelopeSchema(errors)) }),
    ),
  );
}
