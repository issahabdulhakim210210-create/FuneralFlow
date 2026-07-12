const { Client } = require('pg');

(async () => {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('DATABASE_URL not set');
    process.exit(2);
  }

  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT id, donation_id, requester_user_id, requester_collector_identifier, requester_collector_name, status, created_at
      FROM donation_edit_requests
      ORDER BY created_at DESC
      LIMIT 20
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Query error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
