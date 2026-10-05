import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { z } from 'zod';
import { ErrorCode } from '@/common/errors/error-codes';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { Public } from '@/security/decorators/public.decorator';
import type { Readiness } from '@/health/readiness/types/Readiness.types';
import { ReadinessService } from '@/health/readiness/services/Readiness.service';

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class ReadinessController {
  constructor(private readonly service: ReadinessService) {}

  @Get('readiness')
  @ApiEnvelopeResponse({
    data: z.object({ status: z.literal('ok'), database: z.literal('up') }),
    errors: [ErrorCode.SERVICE_UNAVAILABLE],
    description: 'PostgreSQL readiness within a one-second deadline',
  })
  handle(): Promise<Readiness> {
    return this.service.handle();
  }
}
