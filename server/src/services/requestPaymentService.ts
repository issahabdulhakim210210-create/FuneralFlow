import { sendSms } from './smsService.js';

export type WalkInPaymentRequestInput = {
  contactName?: string | null;
  deceasedFullName?: string | null;
  amount?: number | null;
  organizerName?: string | null;
  contactPhone?: string | null;
};

export function buildWalkInPaymentRequestMessage(input: WalkInPaymentRequestInput) {
  const contactName = input.contactName?.trim() || 'family';
  const deceasedName = input.deceasedFullName?.trim() || 'your request';
  const organizerName = input.organizerName?.trim() || 'the organizer';
  const amount = Number(input.amount || 0);
  const formattedAmount = `GHS ${amount.toFixed(2)}`;

  return `${contactName}, payment of ${formattedAmount} is requested for ${deceasedName}. Please pay in person to ${organizerName} when you visit the office. Thank you.`;
}

export async function sendWalkInPaymentRequest(input: WalkInPaymentRequestInput) {
  const phone = input.contactPhone?.trim();
  if (!phone) {
    return { sent: false, reason: 'missing_phone' };
  }

  const message = buildWalkInPaymentRequestMessage(input);
  const sent = await sendSms(phone, message);

  return { sent, reason: sent ? 'sent' : 'sms_failed' };
}
