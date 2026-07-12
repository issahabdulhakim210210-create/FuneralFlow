import fs from 'fs';
import { Client } from 'pg';

const sqlFile = new URL('../database/migrations/2026-06-21-add-donation-collectors.sql', import.meta.url);
const sql = fs.readFileSync(sqlFile, 'utf8');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'funeral_management',
  user: 'postgres',
  password: 'Kaborehakim@1',
  ssl: false,
});

try {
  await client.connect();
  await client.query(sql);
  const res = await client.query(
    "select column_name, data_type from information_schema.columns where table_name='donations' and column_name in ('collector_name','collector_identifier') order by column_name"
  );
  console.log('Migration applied. Columns:', res.rows);
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
