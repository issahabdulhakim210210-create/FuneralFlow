import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRequestSubmissionContext } from '../src/services/requestSubmission.js';

test('uses the family-member profile for authenticated family members', () => {
  const result = resolveRequestSubmissionContext({
    user: { id: 'user-1', role: 'FAMILY_MEMBER' },
    familyMemberRow: { id: 'family-1' },
  });

  assert.equal(result.familyMemberId, 'family-1');
  assert.equal(result.submittedInPerson, false);
});

test('allows organizers to create a walk-in request without a family-member profile', () => {
  const result = resolveRequestSubmissionContext({
    user: { id: 'staff-1', role: 'ORGANIZER' },
    familyMemberRow: null,
    contactName: 'Ama Boateng',
    contactPhone: '+233501234567',
  });

  assert.equal(result.familyMemberId, null);
  assert.equal(result.submittedInPerson, true);
  assert.equal(result.contactName, 'Ama Boateng');
  assert.equal(result.contactPhone, '+233501234567');
});

test('requires contact details for walk-in submissions', () => {
  assert.throws(() => resolveRequestSubmissionContext({
    user: { id: 'staff-1', role: 'ORGANIZER' },
    familyMemberRow: null,
    contactName: '',
    contactPhone: '',
  }), /contact/i);
});
