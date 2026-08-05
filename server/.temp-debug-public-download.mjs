import { Pool } from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import axios from 'axios';

dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const docResult = await pool.query('select id from documents where document_type = $1 order by created_at desc limit 1', ['RECEIPT']);
  const docId = docResult.rows[0]?.id;
  console.log('DOC_ID', docId);
  const token = jwt.sign({ documentId: docId, type: 'document_download' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  console.log('TOKEN', token);

  const signedUrlRes = await axios.get(`http://localhost:4000/api/documents/${docId}/signed-url`, { headers: { Authorization: `Bearer ${token}` } });
  console.log('SIGNED_URL_RESPONSE', signedUrlRes.data);

  const publicUrl = signedUrlRes.data.url;
  const publicRes = await axios.get(publicUrl, { validateStatus: null });
  console.log('PUBLIC_STATUS', publicRes.status);
  console.log('PUBLIC_BODY', publicRes.data);
} catch (e) {
  console.error('ERROR', e.response ? e.response.data : e.message);
} finally {
  await pool.end();
}
