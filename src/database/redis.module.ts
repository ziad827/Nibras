import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import type { RedisConfig } from '@config/configuration';

const buildRedisUrl = (cfg: RedisConfig): string => {
  const auth = cfg.password ? `:${encodeURIComponent(cfg.password)}@` : '';
  return `redis://${auth}${cfg.host}:${cfg.port}`;
};

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redis = config.getOrThrow<RedisConfig>('redis');
        return {
          ttl: redis.ttlSeconds * 1000,
          stores: [new KeyvRedis(buildRedisUrl(redis))],
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisModule {}
