import dotenv from 'dotenv'; dotenv.config();

function normalizeDatabaseUrl(url = ''): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('jdbc:postgresql://')) {
    return trimmed.replace(/^jdbc:/, '');
  }
  return trimmed;
}

function buildDatabaseUrl(): string {
  const directUrl = normalizeDatabaseUrl(process.env.DATABASE_URL || '');
  if (directUrl) {
    return directUrl;
  }

  const springUrl = normalizeDatabaseUrl(process.env.SPRING_DATASOURCE_URL || '');
  if (!springUrl) {
    return '';
  }

  const username = process.env.SPRING_DATASOURCE_USERNAME?.trim();
  const password = process.env.SPRING_DATASOURCE_PASSWORD?.trim();

  if (!username || !password || springUrl.includes('@')) {
    return springUrl;
  }

  const normalized = springUrl.replace(/^postgresql:\/\//, '');
  return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${normalized}`;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  DATABASE_URL: buildDatabaseUrl(),
  SPRING_DATASOURCE_URL: process.env.SPRING_DATASOURCE_URL || '',
  SPRING_DATASOURCE_USERNAME: process.env.SPRING_DATASOURCE_USERNAME || '',
  SPRING_DATASOURCE_PASSWORD: process.env.SPRING_DATASOURCE_PASSWORD || '',
  SPRING_JPA_HIBERNATE_DDL_AUTO: process.env.SPRING_JPA_HIBERNATE_DDL_AUTO || '',
  SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT: process.env.SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || '',
  PAYSTACK_CALLBACK_URL: process.env.PAYSTACK_CALLBACK_URL || '',
  APP_URL: process.env.APP_URL || `http://localhost:${Number(process.env.PORT || 4000)}`,
  APP_DEEP_LINK_URL: process.env.APP_DEEP_LINK_URL || 'funeralms://payment-complete',
  HUBTEL_CLIENT_ID: process.env.HUBTEL_CLIENT_ID || '',
  HUBTEL_CLIENT_SECRET: process.env.HUBTEL_CLIENT_SECRET || '',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  APPLE_AUDIENCE: process.env.APPLE_AUDIENCE || '',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM || '',
  TWILIO_FROM: process.env.TWILIO_FROM || process.env.TWILIO_PHONE_NUMBER || '',
};
