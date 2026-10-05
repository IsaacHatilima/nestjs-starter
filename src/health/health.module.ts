import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ReadinessModule } from './readiness/readiness.module';

@Module({ imports: [ReadinessModule], controllers: [HealthController] })
export class HealthModule {}
