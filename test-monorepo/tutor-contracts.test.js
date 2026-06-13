const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TUTOR_DEFAULT_MATCH_THRESHOLD,
  TutorConfigSchema,
  TutorCitationSchema,
} = require('../packages/contracts/dist/chatbot.js');

test('TUTOR_DEFAULT_MATCH_THRESHOLD is between 0 and 1', () => {
  assert.ok(
    TUTOR_DEFAULT_MATCH_THRESHOLD > 0 && TUTOR_DEFAULT_MATCH_THRESHOLD < 1,
  );
});

test('TutorConfigSchema accepts matchThreshold', () => {
  const parsed = TutorConfigSchema.parse({ matchThreshold: 0.55 });
  assert.equal(parsed.matchThreshold, 0.55);
});

test('TutorCitationSchema validates citation shape', () => {
  const parsed = TutorCitationSchema.parse({
    title: 'Similar Q&A',
    url: '/community/q/abc',
  });
  assert.equal(parsed.title, 'Similar Q&A');
});
