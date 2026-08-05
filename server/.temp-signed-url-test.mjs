import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const userRes = await pool.query('select id, role from users limit 1');
  const user = userRes.rows[0];
  console.log('user', user);
  const bearer = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  console.log('auth token', bearer);

  const documentId = '86ada31e-6e8e-4ee6-9d57-066054de1723';
  const signedRes = await fetch(`http://127.0.0.1:4000/api/documents/${documentId}/signed-url`, { headers: { Authorization: `Bearer ${bearer}` } });
  console.log('signed-url status', signedRes.status);
  const signedBody = await signedRes.text();
  console.log('signed-url body', signedBody);

  if (signedRes.ok) {
    const signedData = JSON.parse(signedBody);
    if (signedData.url) {
      const publicRes = await fetch(signedData.url, { redirect: 'manual' });
      console.log('public-download status', publicRes.status);
      console.log('public-download headers', Object.fromEntries(publicRes.headers.entries()));
      const text = await publicRes.text();
      console.log('public-download body snippet', text.slice(0, 200));
    }
  }
} catch (e) {
  console.error(e);
} finally {
  await pool.end();
}
