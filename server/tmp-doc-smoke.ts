import { writeFileSync } from 'fs';
import { uploadSecure } from './src/services/cloudinaryService.ts';
import { query } from './src/config/db.ts';

const filePath = './tmp-smoke/doc-smoke.txt';
const result = await uploadSecure(filePath, 'funeral-ms-smoke-test');
const tableCheck = await query("select to_regclass('public.documents') as table_name");
console.log(JSON.stringify({ upload: { public_id: result.public_id, secure_url: result.secure_url }, documentsTable: tableCheck.rows[0] }, null, 2));
