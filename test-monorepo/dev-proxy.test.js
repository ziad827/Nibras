const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

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

test('dev proxy sends /v1 requests to the API and other requests to the web app', async () => {
  const api = await startServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        service: 'api',
        path: request.url,
      }),
    );
  });
  const web = await startServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/plain' });
    response.end(`web:${request.url}`);
  });

  const proxy = buildProxyServer({
    host: '127.0.0.1',
    port: 0,
    apiOrigin: api.origin,
    webOrigin: web.origin,
  });

  await new Promise((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  const proxyAddress = proxy.address();
  const proxyOrigin = `http://127.0.0.1:${proxyAddress.port}`;

  try {
    const health = await fetchText(`${proxyOrigin}/v1/health`);
    const home = await fetchText(`${proxyOrigin}/`);
    const approve = await fetchText(
      `${proxyOrigin}/dev/approve?user_code=test`,
    );

    assert.equal(health.status, 200);
    assert.match(health.text, /"service":"api"/);
    assert.match(health.text, /"path":"\/v1\/health"/);

    assert.equal(home.status, 200);
    assert.equal(home.text, 'web:/');

    assert.equal(approve.status, 200);
    assert.match(approve.text, /"path":"\/dev\/approve\?user_code=test"/);
  } finally {
    await Promise.all([
      new Promise((resolve, reject) =>
        proxy.close((error) => (error ? reject(error) : resolve())),
      ),
      new Promise((resolve, reject) =>
        api.server.close((error) => (error ? reject(error) : resolve())),
      ),
      new Promise((resolve, reject) =>
        web.server.close((error) => (error ? reject(error) : resolve())),
      ),
    ]);
  }
});
