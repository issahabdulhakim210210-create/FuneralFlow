import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewSummary } from '../src/utils/reviewUtils.js';

test('buildReviewSummary calculates average and count from review rows', () => {
  const summary = buildReviewSummary([
    { rating: 5 },
    { rating: 4 },
    { rating: 4 },
  ]);

  assert.equal(summary.averageRating, 4.3);
  assert.equal(summary.reviewCount, 3);
});
