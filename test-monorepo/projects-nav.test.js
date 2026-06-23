const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('course sidebar includes projects link to global projects page', () => {
  const js = fs.readFileSync(
    path.join(__dirname, '../Frontend/client/Courses/course-sidebar.js'),
    'utf8',
  );
  assert.match(js, /projects:\s*'\.\.\/\.\.\/Projects\/projects\.html'/);
  assert.match(js, /key:\s*'projects'/);
});

test('course projects page redirects to global projects hub', () => {
  const html = fs.readFileSync(
    path.join(__dirname, '../Frontend/client/Courses/Projects/Projects.html'),
    'utf8',
  );
  assert.match(html, /Projects\/projects\.html/);
  assert.match(html, /location\.replace/);
});

test('global projects page loads shared core modules', () => {
  const html = fs.readFileSync(
    path.join(__dirname, '../Frontend/client/Projects/projects.html'),
    'utf8',
  );
  assert.match(html, /shared\/projects-core\.js/);
  assert.match(html, /shared\/projects-cache\.js/);
  assert.match(html, /id="projectListTabs"/);
});
