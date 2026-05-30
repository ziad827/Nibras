import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup(): Promise<void> {
  const instance = await MongoMemoryServer.create();
  process.env.MONGODB_URI = instance.getUri();
}
