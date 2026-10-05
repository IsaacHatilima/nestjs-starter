import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { z } from 'zod';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { Public } from '@/security/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  @Public()
  @Get()
  @ApiEnvelopeResponse({ data: z.object({ status: z.literal('ok') }), description: 'Process liveness' })
  handle(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
