'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  slugify,
} = require('../apps/api/dist/features/competitions/practice/cp-roadmap/cp-roadmap-admin');

test('slugify normalizes titles', () => {
  assert.equal(slugify('Two Sum Problem'), 'two_sum_problem');
});
