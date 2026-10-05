import { Module } from '@nestjs/common';
import { ReadinessController } from './controllers/Readiness.controller';
import { ReadinessRepository } from './repositories/Readiness.repository';
import { ReadinessService } from './services/Readiness.service';

@Module({
  controllers: [ReadinessController],
  providers: [ReadinessService, ReadinessRepository],
})
export class ReadinessModule {}
