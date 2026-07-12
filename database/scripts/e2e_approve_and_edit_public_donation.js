const { Client } = require('pg');
// use global fetch available in recent Node versions

(async () => {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('DATABASE_URL not set');
    process.exit(2);
  }
  const donationId = process.env.TEST_DONATION_ID || '7b5cdb48-fb04-48b9-a89b-e5edb203095d';
  const requestId = process.env.TEST_REQUEST_ID || 'dc391187-6e29-4776-9536-ae25aa603215';
  const organizerIdentifier = process.env.TEST_ORG || 'ORG-BD057757';
  const collectorName = process.env.TEST_COLLECTOR || 'Kwame';
  const newAmount = process.env.TEST_NEW_AMOUNT || 500;
  const apiBase = process.env.API_BASE || 'http://localhost:4000/api';

  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    console.log('Approving request in DB...');
    const up = await client.query('update donation_edit_requests set status=$1, approved_at=now() where id=$2 and donation_id=$3 returning *', ['APPROVED', requestId, donationId]);
    console.log('Update result:', up.rows[0]);

    console.log('Attempting public donation edit via API...');
    const patchUrl = `${apiBase}/public/donations/${donationId}?organizerIdentifier=${encodeURIComponent(organizerIdentifier)}&collectorName=${encodeURIComponent(collectorName)}`;
    console.log('PATCH', patchUrl, 'body { amount:', newAmount, '}');
    const resp = await fetch(patchUrl, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Number(newAmount) }) });
    if (!resp.ok) throw new Error(`PATCH failed: ${resp.status} ${await resp.text()}`);
    const respData = await resp.json();
    console.log('PATCH response:', respData);

    console.log('Fetching donation to verify...');
    const getUrl = `${apiBase}/public/donations/${donationId}?organizerIdentifier=${encodeURIComponent(organizerIdentifier)}&collectorName=${encodeURIComponent(collectorName)}`;
    const getResp = await fetch(getUrl);
    if (!getResp.ok) throw new Error(`GET failed: ${getResp.status} ${await getResp.text()}`);
    const getData = await getResp.json();
    console.log('GET donation:', getData);

  } catch (err) {
    console.error('Error:', err.response?.data || err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
