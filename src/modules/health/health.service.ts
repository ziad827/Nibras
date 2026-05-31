import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import type { Cache } from 'cache-manager';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly indicatorService: HealthIndicatorService,
  ) {}

  async ping(key = 'redis'): Promise<HealthIndicatorResult> {
    const indicator = this.indicatorService.check(key);
    const probeKey = '__health__:redis';
    const probeValue = Date.now().toString();

    try {
      await this.cache.set(probeKey, probeValue, 1000);
      const echoed = await this.cache.get<string>(probeKey);
      if (echoed !== probeValue) {
        return indicator.down({ reason: 'echo mismatch' });
      }
      return indicator.up();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      return indicator.down({ reason: message });
    }
  }
}
