import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import axios from 'axios';

dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const userRes = await pool.query('select id, role, status from users where status = $1 limit 1', ['ACTIVE']);
  const user = userRes.rows[0];
  if (!user) throw new Error('No active user found');
  console.log('USER', user);
  const authToken = jwt.sign({ id: user.id, role: user.role, status: user.status }, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log('AUTH_TOKEN', authToken);

  const docRes = await pool.query('select id from documents where document_type = $1 order by created_at desc limit 1', ['RECEIPT']);
  const doc = docRes.rows[0];
  if (!doc) throw new Error('No receipt document found');
  console.log('DOCUMENT_ID', doc.id);

  const signedUrlResp = await axios.get(`http://localhost:4000/api/documents/${doc.id}/signed-url`, { headers: { Authorization: `Bearer ${authToken}` }, validateStatus: null });
  console.log('SIGNED_URL_STATUS', signedUrlResp.status);
  console.log('SIGNED_URL_DATA', signedUrlResp.data);
  if (signedUrlResp.status === 200) {
    const publicUrl = signedUrlResp.data.url;
    console.log('PUBLIC_URL', publicUrl);
    const publicResp = await axios.get(publicUrl, { validateStatus: null });
    console.log('PUBLIC_STATUS', publicResp.status);
    console.log('PUBLIC_HEADERS', publicResp.headers['content-type']);
    console.log('PUBLIC_BODY', typeof publicResp.data === 'string' ? publicResp.data.slice(0, 200) : publicResp.data);
  }
} catch (err) {
  console.error('ERROR', err.response ? err.response.data : err.message);
} finally {
  await pool.end();
}
