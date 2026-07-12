const { Client } = require('pg');

(async () => {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const colsRes = await client.query("select column_name from information_schema.columns where table_schema='public' and table_name='funeral_sessions' order by ordinal_position");
    const cols = colsRes.rows.map(r => r.column_name);
    const countRes = await client.query('select count(*) as c from checklists');
    const count = countRes.rows[0].c;
    console.log('columns=' + cols.join(','));
    console.log('checklist_count=' + count);
    await client.end();
  } catch (e) {
    console.error('Verification failed:', e.message || e);
    process.exit(1);
  }
})();
