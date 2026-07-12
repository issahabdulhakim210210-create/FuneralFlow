require('dotenv').config();
const jwt = require('jsonwebtoken');
const fetch = global.fetch || require('node-fetch');
const env = process.env;
const secret = env.JWT_SECRET;
const token = jwt.sign({ id: 'bd057757-177e-4ab5-acb3-5267d1743b21', role: 'ORGANIZER', status: 'ACTIVE' }, secret, { expiresIn: '1h' });
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const base = 'http://localhost:4000/api';
(async () => {
  try {
    console.log('TOKEN', token.slice(0, 20) + '...');
    let r = await fetch(`${base}/health`);
    console.log('HEALTH', r.status, await r.text());
    const sessionId = '14280729-87d8-431e-af47-21b44bba3e81';
    r = await fetch(`${base}/sessions/${sessionId}/overview`, { headers });
    console.log('OVERVIEW_PRE_STATUS', r.status);
    console.log(await r.text());
    r = await fetch(`${base}/sessions/${sessionId}/complete`, { method: 'POST', headers });
    console.log('COMPLETE_STATUS', r.status);
    console.log(await r.text());
    r = await fetch(`${base}/sessions/${sessionId}/overview`, { headers });
    console.log('OVERVIEW_POST_STATUS', r.status);
    console.log(await r.text());
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
