const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('instructor projects uses tracking API instead of demo data', () => {
  const js = fs.readFileSync(
    path.join(__dirname, '../Frontend/client/Projects/instructor-projects.js'),
    'utf8',
  );
  assert.match(js, /trackingProjectService\.listByCourse/);
  assert.match(js, /trackingProjectService\.getReviewQueue/);
  assert.match(js, /trackingProjectService\.submitReview/);
  assert.match(js, /trackingProjectService\.createProject/);
  assert.doesNotMatch(js, /demoProjects/);
  assert.doesNotMatch(js, /generateDemoGrade/);
  assert.doesNotMatch(js, /projectService/);
  assert.doesNotMatch(js, /Templates page coming soon/);
});

test('tracking project service exposes instructor review helpers', () => {
  const apiJs = fs.readFileSync(
    path.join(__dirname, '../Frontend/client/services/api.js'),
    'utf8',
  );
  assert.match(apiJs, /getReviewQueue/);
  assert.match(apiJs, /listCourseTemplates/);
  assert.match(apiJs, /generateTeamFormation/);
});
