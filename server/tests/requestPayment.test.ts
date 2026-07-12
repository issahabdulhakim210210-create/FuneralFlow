import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWalkInPaymentRequestMessage } from '../src/services/requestPaymentService.js';

test('builds a concise in-person payment SMS for walk-in contacts', () => {
  const message = buildWalkInPaymentRequestMessage({
    contactName: 'Ada',
    deceasedFullName: 'John Doe',
    amount: 125.5,
    organizerName: 'Grace',
  });

  assert.match(message, /Ada/);
  assert.match(message, /John Doe/);
  assert.match(message, /GHS 125.50/);
  assert.match(message, /Grace/);
  assert.match(message, /in person/i);
});
