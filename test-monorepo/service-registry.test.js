const test = require('node:test');
const assert = require('node:assert/strict');

test('resolveServiceBaseUrl ignores external API host on loopback page origin', async () => {
  const prevPublic = process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL;
  process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL =
    'https://nibras-api.example.azurecontainerapps.io';

  const { getDefaultServiceBaseUrl } =
    await import('../apps/web/app/lib/api-clients/registry.ts');

  try {
    assert.equal(getDefaultServiceBaseUrl('tracking'), 'http://localhost:3000');
  } finally {
    if (prevPublic === undefined)
      delete process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL;
    else process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL = prevPublic;
  }
});

test('resolveServiceBaseUrl prefers configured API host on a public web origin', async () => {
  const prevWeb = process.env.NEXT_PUBLIC_NIBRAS_WEB_BASE_URL;
  const prevPublic = process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL;
  process.env.NEXT_PUBLIC_NIBRAS_WEB_BASE_URL = 'https://nibrasplatform.me';
  process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL =
    'https://nibras-api.example.azurecontainerapps.io';

  const { getDefaultServiceBaseUrl } =
    await import('../apps/web/app/lib/api-clients/registry.ts');

  try {
    assert.equal(
      getDefaultServiceBaseUrl('tracking'),
      'https://nibras-api.example.azurecontainerapps.io',
    );
  } finally {
    if (prevWeb === undefined)
      delete process.env.NEXT_PUBLIC_NIBRAS_WEB_BASE_URL;
    else process.env.NEXT_PUBLIC_NIBRAS_WEB_BASE_URL = prevWeb;
    if (prevPublic === undefined)
      delete process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL;
    else process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL = prevPublic;
  }
});

test('resolveServiceBaseUrl keeps page origin when no external API is configured', async () => {
  const prevPublic = process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL;
  delete process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL;

  const { getDefaultServiceBaseUrl } =
    await import('../apps/web/app/lib/api-clients/registry.ts');

  try {
    assert.equal(getDefaultServiceBaseUrl('tracking'), 'http://localhost:3000');
  } finally {
    if (prevPublic === undefined)
      delete process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL;
    else process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL = prevPublic;
  }
});

test('resolveServiceBaseUrl prefers same-origin proxy over loopback :4848 API env', async () => {
  const prevPublic = process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL;
  process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL = 'http://127.0.0.1:4848';

  const { getDefaultServiceBaseUrl } =
    await import('../apps/web/app/lib/api-clients/registry.ts');

  try {
    assert.equal(getDefaultServiceBaseUrl('admin'), 'http://localhost:3000');
  } finally {
    if (prevPublic === undefined)
      delete process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL;
    else process.env.NEXT_PUBLIC_NIBRAS_API_BASE_URL = prevPublic;
  }
});
