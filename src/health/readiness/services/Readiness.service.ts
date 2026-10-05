import { Injectable } from '@nestjs/common';
import { serviceUnavailable } from '@/common/errors/auth-errors';
import type { Readiness } from '@/health/readiness/types/Readiness.types';
import { ReadinessRepository } from '@/health/readiness/repositories/Readiness.repository';

@Injectable()
export class ReadinessService {
  constructor(private readonly repository: ReadinessRepository) {}

  async handle(): Promise<Readiness> {
    if (!(await this.repository.handle())) throw serviceUnavailable();
    return { status: 'ok', database: 'up' };
  }
}
