import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ErrorEnvelope, FieldIssue } from './envelope';
import { AppError } from './errors/app-error';
import { ErrorCode } from './errors/error-codes';

interface Rendered {
  status: number;
  body: ErrorEnvelope;
}

const SERVER_ERROR_FLOOR = 500;

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
};

function envelope(code: ErrorCode, message: string, details?: FieldIssue[]): ErrorEnvelope {
  return {
    success: false,
    data: null,
    error: details === undefined ? { code, message } : { code, message, details },
  };
}

function fieldIssues(zodError: unknown): FieldIssue[] {
  const issues = (zodError as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) return [];
  return issues.map((issue: { path?: unknown[]; message?: string }) => ({
    path: Array.isArray(issue.path) ? issue.path.map(String).join('.') : '',
    message: issue.message ?? 'Invalid value',
  }));
}

function messageOf(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') return response;
  const message = (response as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(String).join(', ');
  return typeof message === 'string' ? message : exception.message;
}

/**
 * Order matters: our own AppError first, then validation, throttling, any other
 * Nest HttpException, and finally anything unexpected, which is hidden as 500.
 */
function render(exception: unknown): Rendered {
  if (exception instanceof AppError) {
    return {
      status: exception.getStatus(),
      body: envelope(exception.code, exception.message, exception.details),
    };
  }
  if (exception instanceof ZodValidationException) {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: envelope(ErrorCode.VALIDATION_ERROR, 'Validation failed', fieldIssues(exception.getZodError())),
    };
  }
  if (exception instanceof ThrottlerException) {
    return {
      status: HttpStatus.TOO_MANY_REQUESTS,
      body: envelope(ErrorCode.RATE_LIMITED, 'Too many requests'),
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      status,
      body: envelope(CODE_BY_STATUS[status] ?? ErrorCode.HTTP_ERROR, messageOf(exception)),
    };
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: envelope(ErrorCode.INTERNAL_ERROR, 'Internal server error'),
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { status, body } = render(exception);

    // Only server errors are logged with their stack; client errors are expected traffic.
    if (status >= SERVER_ERROR_FLOOR) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${request.method} ${request.url} failed`, stack);
    }

    response.status(status).json(body);
  }
}
