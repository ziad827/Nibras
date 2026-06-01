import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn((indicators: Array<() => unknown>) =>
              Promise.all(indicators.map((fn) => fn())).then(() => ({
                status: 'ok',
                info: {
                  mongo: { status: 'up' },
                  redis: { status: 'up' },
                },
              })),
            ),
          },
        },
        {
          provide: MongooseHealthIndicator,
          useValue: { pingCheck: jest.fn(() => ({ mongo: { status: 'up' } })) },
        },
        {
          provide: RedisHealthIndicator,
          useValue: { ping: jest.fn(() => ({ redis: { status: 'up' } })) },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('delegates to Terminus health check', async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
  });
});
