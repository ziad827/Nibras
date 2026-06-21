const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const { buildProxyServer } = require('../apps/proxy/dist/server');

async function startServer(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    server,
    origin: `http://127.0.0.1:${address.port}`,
  };
}

async function fetchText(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    text: await response.text(),
  };
}

test('dev proxy sends /v1 requests to Fastify, /api to NestJS, and static files locally', async () => {
  const fastify = await startServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        service: 'fastify',
        path: request.url,
      }),
    );
  });
  const nestjs = await startServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        service: 'nestjs',
        path: request.url,
      }),
    );
  });

  const staticRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'nibras-proxy-static-'),
  );
  fs.writeFileSync(path.join(staticRoot, 'index.html'), 'static-home');

  const proxy = buildProxyServer({
    host: '127.0.0.1',
    port: 0,
    fastifyOrigin: fastify.origin,
    nestjsOrigin: nestjs.origin,
    staticRoot,
  });

  await new Promise((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  const proxyAddress = proxy.address();
  const proxyOrigin = `http://127.0.0.1:${proxyAddress.port}`;

  try {
    const health = await fetchText(`${proxyOrigin}/v1/health`);
    const ping = await fetchText(`${proxyOrigin}/api/ping`);
    const home = await fetchText(`${proxyOrigin}/`);
    const approve = await fetchText(
      `${proxyOrigin}/dev/approve?user_code=test`,
    );
    const login = await fetchText(`${proxyOrigin}/api/auth/login`);

    assert.equal(health.status, 200);
    assert.match(health.text, /"service":"fastify"/);
    assert.match(health.text, /"path":"\/v1\/health"/);

    assert.equal(ping.status, 200);
    assert.match(ping.text, /"service":"nestjs"/);
    assert.match(ping.text, /"path":"\/api\/ping"/);

    assert.equal(home.status, 200);
    assert.equal(home.text, 'static-home');

    assert.equal(approve.status, 200);
    assert.match(approve.text, /"path":"\/dev\/approve\?user_code=test"/);

    assert.equal(login.status, 200);
    assert.match(login.text, /"service":"fastify"/);

    const community = await fetchText(
      `${proxyOrigin}/community/questions?page=1&limit=5`,
    );
    const contests = await fetchText(`${proxyOrigin}/contests?page=1&limit=5`);

    assert.equal(community.status, 200);
    assert.match(community.text, /"service":"fastify"/);
    assert.match(community.text, /\/v1\/community\/questions/);

    assert.equal(contests.status, 200);
    assert.match(contests.text, /"service":"fastify"/);
    assert.match(contests.text, /\/v1\/contests/);

    const adminUsers = await fetchText(`${proxyOrigin}/api/admin/users?page=1`);
    const gamification = await fetchText(
      `${proxyOrigin}/api/gamification/all-badges`,
    );

    assert.equal(adminUsers.status, 200);
    assert.match(adminUsers.text, /"service":"fastify"/);
    assert.match(adminUsers.text, /\/v1\/admin\/users/);

    assert.equal(gamification.status, 200);
    assert.match(gamification.text, /"service":"fastify"/);
    assert.match(gamification.text, /\/v1\/gamification\/all-badges/);
  } finally {
    await Promise.all([
      new Promise((resolve, reject) =>
        proxy.close((error) => (error ? reject(error) : resolve())),
      ),
      new Promise((resolve, reject) =>
        fastify.server.close((error) => (error ? reject(error) : resolve())),
      ),
      new Promise((resolve, reject) =>
        nestjs.server.close((error) => (error ? reject(error) : resolve())),
      ),
    ]);
    fs.rmSync(staticRoot, { recursive: true, force: true });
  }
});
