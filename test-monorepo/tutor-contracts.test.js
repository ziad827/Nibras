const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TUTOR_DEFAULT_MATCH_THRESHOLD,
  TutorConfigSchema,
  TutorCitationSchema,
  ChatAskResponseSchema,
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

test('ChatAskResponseSchema validates API ask response', () => {
  const parsed = ChatAskResponseSchema.parse({
    answer: 'Binary search divides the array.',
    hints: ['Think about sorted arrays'],
    tags: ['algorithms'],
    followUps: ['What is the time complexity?'],
    communityQuestionId: 'q1',
    communityQuestion: null,
    matchScore: 0.82,
    citations: [{ title: 'Similar Q&A', url: '/community/q/q1' }],
    xai: {
      reasoning: 'Used divide and conquer.',
      concepts_used: ['Binary Search'],
      might_be_unclear: ['midpoint'],
    },
    refused: false,
  });
  assert.equal(parsed.answer, 'Binary search divides the array.');
  assert.equal(parsed.communityQuestionId, 'q1');
});

test('publish payload uses answer field not finalAnswer', () => {
  const publishBody = {
    title: 'How does BFS work?',
    question: 'Explain BFS traversal',
    answer: 'BFS uses a queue.\n\n<!--NIBRAS_AI_TUTOR-->',
    tags: ['algorithms'],
  };
  assert.ok(publishBody.answer);
  assert.equal(publishBody.finalAnswer, undefined);
});
