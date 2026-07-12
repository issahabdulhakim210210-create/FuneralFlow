import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTwilioSenderNumber } from '../src/services/smsService.js';

test('prefers TWILIO_PHONE_NUMBER and falls back to TWILIO_FROM', () => {
  process.env.TWILIO_PHONE_NUMBER = '+15551234567';
  process.env.TWILIO_FROM = '+15557654321';

  assert.equal(resolveTwilioSenderNumber(), '+15551234567');
});

test('falls back to TWILIO_FROM when phone number is not set', () => {
  process.env.TWILIO_PHONE_NUMBER = '';
  process.env.TWILIO_FROM = '+15557654321';

  assert.equal(resolveTwilioSenderNumber(), '+15557654321');
});
