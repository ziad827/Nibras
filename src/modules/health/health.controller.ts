import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RedisHealthIndicator } from './health.service';

@ApiTags('health')
@Controller('ping')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongo: MongooseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Service liveness + dependency health',
    description:
      'Returns 200 with status "ok" when MongoDB and Redis are reachable. Returns 503 otherwise.',
  })
  check() {
    return this.health.check([
      () => this.mongo.pingCheck('mongo'),
      () => this.redis.ping('redis'),
    ]);
  }
}
