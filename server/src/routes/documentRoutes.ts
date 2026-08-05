import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';
import { uploadSecure } from '../services/cloudinaryService.js';
import { query } from '../config/db.js';
import { env } from '../config/env.js';

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (_, file, cb) => {
      const safeName = String(file.originalname || 'receipt').replace(/\s+/g, '_');
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const r = Router();

r.get('/:id/public-download', async (req, res, next) => {
  try {
    const token = String(req.query.token || '');
    if (!token) return res.status(401).json({ message: 'Missing download token' });

    let payload: any;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
      console.log('PUBLIC_DOWNLOAD_TOKEN_VERIFY_OK', { documentId: req.params.id, payload });
    } catch (err: any) {
      console.warn('PUBLIC_DOWNLOAD_TOKEN_VERIFY_FAILED', {
        documentId: req.params.id,
        tokenInQuery: Boolean(req.query.token),
        error: err?.message,
        tokenPreview: token.slice(0, 40),
      });
      return res.status(401).json({ message: 'Invalid or expired download token' });
    }

    if (payload?.type !== 'document_download' || payload?.documentId !== req.params.id) {
      console.warn('PUBLIC_DOWNLOAD_TOKEN_MISMATCH', { documentId: req.params.id, payload });
      return res.status(403).json({ message: 'Download token does not match document' });
    }

    const { rows } = await query('select session_id, cloudinary_public_id, secure_url, mime_type, document_type, uploader_user_id from documents where id=$1', [req.params.id]);
    const document = rows[0];
    if (!document) return res.status(404).json({ message: 'Document not found' });

    const downloadMode = String(req.query.download || '').toLowerCase() === '1' || String(req.query.download || '').toLowerCase() === 'true';
    const dispositionType = downloadMode ? 'attachment' : 'inline';

    const fileName = path.basename(String(document.cloudinary_public_id || 'receipt'));
    const filePath = fileName ? path.resolve('uploads', fileName) : '';
    const contentType = document.mime_type || (path.extname(fileName).toLowerCase() === '.txt' ? 'text/plain' : 'application/octet-stream');

    if (filePath && fs.existsSync(filePath)) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `${dispositionType}; filename="${fileName}"`);
      return res.sendFile(filePath);
    }

    const secureUrl = String(document.secure_url || '');
    if (!secureUrl) {
      return res.status(404).json({ message: 'Receipt file missing' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${fileName}"`);

    if (secureUrl.toLowerCase().includes('cloudinary.com')) {
      try {
        const proxyResponse = await axios.get(secureUrl, { responseType: 'stream' });
        proxyResponse.data.pipe(res);
        return;
      } catch (err: any) {
        console.warn('PUBLIC_DOWNLOAD_CLOUDINARY_PROXY_FAILED', { documentId: req.params.id, secureUrl, error: err?.message });
        return res.redirect(secureUrl);
      }
    }

    try {
      const proxyResponse = await axios.get(secureUrl, { responseType: 'stream' });
      proxyResponse.data.pipe(res);
    } catch (err: any) {
      console.warn('PUBLIC_DOWNLOAD_PROXY_FAILED', { documentId: req.params.id, secureUrl, error: err?.message });
      return res.status(502).json({ message: 'Unable to proxy receipt file' });
    }
  } catch (e) {
    next(e);
  }
});

r.use(authenticate);

async function resolveSessionIdentifier(sessionIdentifier: string) {
  if (!sessionIdentifier) return null;
  if (/^[0-9a-fA-F-]{36}$/.test(sessionIdentifier)) return sessionIdentifier;
  const { rows } = await query('select id from funeral_sessions where session_code=$1 limit 1', [sessionIdentifier]);
  return rows[0]?.id || null;
}

async function getSessionAccessInfo(sessionIdentifier: string) {
  const sessionId = await resolveSessionIdentifier(String(sessionIdentifier));
  if (!sessionId) return null;
  const { rows } = await query(
    `
    select fs.id, fs.organizer_id, fs.family_member_id, fs.status, fr.family_member_id as request_family_member_id, fr.submitted_in_person
    from funeral_sessions fs
    left join funeral_requests fr on fr.id = fs.request_id
    where fs.id = $1
    limit 1
    `,
    [sessionId]
  );
  return rows[0] || null;
}

async function assertDocumentAccess(req: any, sessionIdentifier: string) {
  const user = req.user;
  const session = await getSessionAccessInfo(sessionIdentifier);
  if (!session) throw { status: 404, message: 'Session not found' };

  if (user?.role === 'SUPER_ADMIN') return session.id;

  if (user?.role === 'FAMILY_MEMBER') {
    const familyMember = (await query('select id from family_members where user_id=$1 limit 1', [user.id])).rows[0];
    if (!familyMember) throw { status: 403, message: 'Family member profile not found' };
    if (!(session.family_member_id === familyMember.id || session.request_family_member_id === familyMember.id)) {
      throw { status: 403, message: 'Not authorized for this session' };
    }
    return session.id;
  }

  if (user?.role === 'ORGANIZER') {
    const organizer = (await query('select id from organizers where user_id=$1', [user.id])).rows[0];
    if (!organizer) throw { status: 403, message: 'Organizer profile not found' };
    if (organizer.id !== session.organizer_id) throw { status: 403, message: 'Not authorized for this session' };
    return session.id;
  }

  throw { status: 403, message: 'Not authorized' };
}

r.post('/', upload.single('file'), async (req: any, res, next) => {
  try {
    const { documentType, collectorName, collectorIdentifier } = req.body;
    const sessionId = await assertDocumentAccess(req, String(req.body.sessionId || ''));
    const session = await getSessionAccessInfo(String(req.body.sessionId || ''));
    if (!session) throw { status: 404, message: 'Session not found' };
    if (String(documentType || '').trim().toUpperCase() === 'RECEIPT') {
      throw { status: 400, message: 'Receipts are generated automatically and are managed in the Receipt Vault only.' };
    }
    if (req.user?.role === 'ORGANIZER' && session.status === 'COMPLETED' && !session.submitted_in_person) {
      throw { status: 403, message: 'Organizers may not upload documents to completed sessions unless the session was created from a walk-in request.' };
    }
    const result = await uploadSecure(req.file.path, `funeral-sessions/${sessionId}`);
    const { rows } = await query(
      'insert into documents(session_id,uploader_user_id,document_type,cloudinary_public_id,secure_url,mime_type,size_bytes,collector_name,collector_identifier) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',
      [
        sessionId,
        req.user.id,
        documentType,
        result.public_id,
        result.secure_url,
        req.file.mimetype,
        req.file.size,
        collectorName ? String(collectorName).trim() : null,
        collectorIdentifier ? String(collectorIdentifier).trim() : null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

r.get('/', async (req, res, next) => {
  try {
    const sessionIdParam = String(req.query.sessionId || '');
    const documentType = String(req.query.documentType || '').trim();
    await assertDocumentAccess(req, sessionIdParam);
    const session = await getSessionAccessInfo(sessionIdParam);
    const params: any[] = [session.id];
    let sql = 'select d.*, u.full_name as uploader_name from documents d left join users u on u.id = d.uploader_user_id where d.session_id=$1';
    const isPlanningFamily = req.user?.role === 'FAMILY_MEMBER' && session.status !== 'COMPLETED' && session.status !== 'ARCHIVED';
    if (isPlanningFamily) {
      params.push('RECEIPT');
      sql += ` and d.document_type=$${params.length}`;
      if (req.user?.id) {
        params.push(req.user.id);
        sql += ` and d.uploader_user_id=$${params.length}`;
      }
    } else if (documentType) {
      params.push(documentType);
      sql += ` and d.document_type=$${params.length}`;
    } else {
      sql += ` and d.document_type != 'RECEIPT'`;
    }
    sql += ' order by d.created_at desc';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

r.get('/:id/signed-url', async (req, res, next) => {
  try {
    const { rows } = await query('select id, session_id, cloudinary_public_id, secure_url, document_type, uploader_user_id from documents where id=$1', [req.params.id]);
    const document = rows[0];
    if (!document) return res.status(404).json({ message: 'Document not found' });
    await assertDocumentAccess(req, String(document.session_id));
    const session = await getSessionAccessInfo(String(document.session_id));
    const isPlanningFamily = req.user?.role === 'FAMILY_MEMBER' && session.status !== 'COMPLETED' && session.status !== 'ARCHIVED';
    if (isPlanningFamily) {
      if (document.document_type !== 'RECEIPT' || document.uploader_user_id !== req.user?.id) {
        throw { status: 403, message: 'Family members may only access their own planning-stage receipts.' };
      }
    }

    const requestBaseUrl = `${req.protocol}://${req.get('host')}`;
    const urlHost = requestBaseUrl && !requestBaseUrl.includes('localhost') ? requestBaseUrl : env.APP_URL;
    const token = jwt.sign({ documentId: String(document.id), type: 'document_download' }, env.JWT_SECRET, { expiresIn: '5m' });
    const publicUrl = `${urlHost}/api/documents/${document.id}/public-download?token=${encodeURIComponent(token)}`;

    const secureUrl = String(document.secure_url || '');
    if (secureUrl && secureUrl.toLowerCase().includes('cloudinary.com')) {
      return res.json({ url: publicUrl });
    }

    const fileName = path.basename(String(document.cloudinary_public_id || ''));
    if (fileName) {
      const localUrl = `${urlHost}/uploads/${encodeURIComponent(fileName)}`;
      if (fs.existsSync(path.resolve('uploads', fileName))) {
        return res.json({ url: localUrl });
      }
    }

    if (secureUrl) {
      return res.json({ url: secureUrl });
    }

    res.json({ url: publicUrl });
  } catch (e) {
    next(e);
  }
});

r.get('/:id/download', async (req, res, next) => {
  try {
    const { rows } = await query('select session_id, cloudinary_public_id, document_type, uploader_user_id from documents where id=$1', [req.params.id]);
    const document = rows[0];
    if (!document) return res.status(404).json({ message: 'Document not found' });
    await assertDocumentAccess(req, String(document.session_id));
    const session = await getSessionAccessInfo(String(document.session_id));
    const isPlanningFamily = req.user?.role === 'FAMILY_MEMBER' && session.status !== 'COMPLETED' && session.status !== 'ARCHIVED';
    if (isPlanningFamily) {
      if (document.document_type !== 'RECEIPT' || document.uploader_user_id !== req.user?.id) {
        throw { status: 403, message: 'Family members may only access their own planning-stage receipts.' };
      }
    }

    const fileName = String(document.cloudinary_public_id || '').trim();
    if (!fileName) {
      return res.status(404).json({ message: 'Receipt file missing' });
    }

    const filePath = path.resolve('uploads', fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Receipt file missing' });
    }

    const contentType = document.mime_type || (path.extname(fileName).toLowerCase() === '.txt' ? 'text/plain' : 'application/octet-stream');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(filePath);
  } catch (e) {
    next(e);
  }
});

export default r;

