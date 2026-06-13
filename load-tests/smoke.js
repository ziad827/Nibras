import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.9'],
  },
};

const BASE_URL = __ENV.NIBRAS_GATEWAY_URL || 'http://127.0.0.1:8080';

export default function () {
  const ping = http.get(`${BASE_URL}/api/ping`);
  check(ping, { 'nestjs ping ok': (r) => r.status === 200 });

  const health = http.get(`${BASE_URL}/v1/health`);
  check(health, { 'fastify health ok': (r) => r.status === 200 });

  sleep(1);
}
