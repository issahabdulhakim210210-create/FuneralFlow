const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node apply_sql.js <path-to-sql-file>');
    process.exit(2);
  }

  const sql = fs.readFileSync(file, 'utf8');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Please set DATABASE_URL environment variable (e.g. postgres://user:pass@host:5432/dbname)');
    process.exit(2);
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to database');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('SQL applied successfully');
  } catch (err) {
    console.error('Error applying SQL:', err.message || err);
    try { await client.query('ROLLBACK'); } catch(e){}
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
