const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('catalog page loads templates from tracking API client', () => {
  const catalogJs = fs.readFileSync(
    path.join(__dirname, '../Frontend/client/Projects/catalog.js'),
    'utf8',
  );
  assert.match(catalogJs, /\.getCatalog\(/);
  assert.match(catalogJs, /submitApplication/);
  assert.match(catalogJs, /expressInterest/);
  assert.doesNotMatch(catalogJs, /alert\('Application submitted!'\)/);
});

test('catalog HTML uses dynamic grid container', () => {
  const html = fs.readFileSync(
    path.join(__dirname, '../Frontend/client/Projects/catalog.html'),
    'utf8',
  );
  assert.match(html, /id="projects-grid"/);
  assert.doesNotMatch(html, /Mini Unix Shell/);
});
