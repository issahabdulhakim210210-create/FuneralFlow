import twilio from 'twilio';
import { env } from '../config/env.js';

let twilioClient: any = null;

function getTwilioClient() {
  if (!twilioClient && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

export function resolveTwilioSenderNumber() {
  return (process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM || env.TWILIO_PHONE_NUMBER || env.TWILIO_FROM || '').trim();
}

export async function sendSms(to: string, message: string) {
  const senderNumber = resolveTwilioSenderNumber();
  const normalizedTo = to.trim();
  console.log(`[SMS] Sending to ${normalizedTo}: ${message}`);

  if (env.NODE_ENV === 'development' && (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !senderNumber)) {
    console.log('📱 [DEV SMS]', { to: normalizedTo, message, sender: senderNumber || 'not-configured' });
    return true;
  }

  const client = getTwilioClient();
  if (!client || !senderNumber) {
    console.warn('⚠️ SMS not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER/TWILIO_FROM in .env');
    return false;
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: senderNumber,
      to: normalizedTo,
    });
    console.log('✅ SMS sent:', { to: normalizedTo, messageId: result.sid });
    return true;
  } catch (error) {
    console.error('❌ SMS failed:', error);
    return false;
  }
}

