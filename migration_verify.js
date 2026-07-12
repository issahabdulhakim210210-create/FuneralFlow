const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    await client.connect();
    const cols = (await client.query("select column_name from information_schema.columns where table_schema='public' and table_name='funeral_sessions' order by ordinal_position")).rows.map(r => r.column_name);
    const count = (await client.query("select count(*) as c from checklists")).rows[0].c;
    console.log('columns=' + cols.join(','));
    console.log('checklist_count=' + count);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
