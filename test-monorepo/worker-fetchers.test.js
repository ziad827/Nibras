'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('worker fetchers registry', () => {
  it('includes ctftime for contest sync', async () => {
    const { fetchers } = require('../apps/worker/dist/fetchers/index');
    assert.ok(fetchers.codeforces);
    assert.ok(fetchers.leetcode);
    assert.ok(fetchers.atcoder);
    assert.ok(fetchers.codechef);
    assert.ok(
      fetchers.ctftime,
      'ctftime fetcher must be registered for contest-sync',
    );
    assert.equal(typeof fetchers.ctftime.fetchContests, 'function');
  });
});
