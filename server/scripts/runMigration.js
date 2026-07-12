import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const migrationPath = path.resolve(process.cwd(), 'database', 'migrations', '2026-06-18-add-pricing-fields.sql');
  if (!fs.existsSync(migrationPath)) {
    console.error('Migration file not found:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to database. Running migration...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      console.error('Rollback failed:', e.message || e);
    }
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
