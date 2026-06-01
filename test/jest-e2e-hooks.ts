import { startTestServers, stopTestServers } from './test-servers';

beforeAll(async () => {
  await startTestServers();
}, 120_000);

afterAll(async () => {
  await stopTestServers();
}, 120_000);
