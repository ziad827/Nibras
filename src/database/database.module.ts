import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { MongoConfig } from '@config/configuration';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const mongo = config.getOrThrow<MongoConfig>('mongo');
        return {
          uri: mongo.uri,
          maxPoolSize: mongo.maxPoolSize,
          serverSelectionTimeoutMS: mongo.serverSelectionTimeoutMs,
          retryAttempts: mongo.retryAttempts,
          retryDelay: mongo.retryDelayMs,
          autoIndex: config.get<string>('app.nodeEnv') !== 'production',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
