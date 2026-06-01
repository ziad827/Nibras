import { MongoMemoryServer } from 'mongodb-memory-server';
import { RedisMemoryServer } from 'redis-memory-server';

let mongoServer: MongoMemoryServer | undefined;
let redisServer: RedisMemoryServer | undefined;

export async function startTestServers(): Promise<void> {
  process.env.NODE_ENV = 'test';

  if (!process.env.MONGO_URI) {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();
  }

  if (!process.env.REDIS_HOST) {
    redisServer = new RedisMemoryServer();
    process.env.REDIS_HOST = await redisServer.getHost();
    process.env.REDIS_PORT = String(await redisServer.getPort());
  }
}

export async function stopTestServers(): Promise<void> {
  await redisServer?.stop();
  redisServer = undefined;

  await mongoServer?.stop();
  mongoServer = undefined;
}
