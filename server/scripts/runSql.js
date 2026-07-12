import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  const sqlFile = process.env.SQL_FILE;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  if (!sqlFile) {
    console.error('SQL_FILE is not set.');
    process.exit(1);
  }

  const sqlPath = path.resolve(process.cwd(), sqlFile);
  if (!fs.existsSync(sqlPath)) {
    console.error('SQL file not found:', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to database. Running SQL file...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('SQL applied successfully.');
  } catch (err) {
    console.error('SQL execution failed:', err.message || err);
    try { await client.query('ROLLBACK'); } catch (e) { console.error('Rollback failed:', e.message || e); }
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
