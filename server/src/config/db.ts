import pg from 'pg';
import type { QueryResultRow } from 'pg';
import { env } from './env.js';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function query<T extends QueryResultRow = any>(text: string, params: any[] = []) {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  if (env.NODE_ENV === 'development') {
    console.log('SQL', { text: text.slice(0, 80), ms: Date.now() - start, rows: res.rowCount });
  }
  return res;
}
