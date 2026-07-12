import { Router } from 'express'; import multer from 'multer'; import { authenticate } from '../middleware/auth.js'; import { uploadSecure, signedUrl } from '../services/cloudinaryService.js'; import { query } from '../config/db.js';
const upload=multer({dest:'uploads/', limits:{fileSize:10*1024*1024}}); const r=Router(); r.use(authenticate);

async function resolveSessionIdentifier(sessionIdentifier:string) {
  if (!sessionIdentifier) return null;
  if (/^[0-9a-fA-F-]{36}$/.test(sessionIdentifier)) return sessionIdentifier;
  const { rows } = await query('select id from funeral_sessions where session_code=$1 limit 1', [sessionIdentifier]);
  return rows[0]?.id || null;
}

r.post('/',upload.single('file'),async(req:any,res,next)=>{try{ let {sessionId,documentType}=req.body; sessionId = await resolveSessionIdentifier(String(sessionId)); if(!sessionId) return res.status(422).json({message:'Session ID required'}); const result=await uploadSecure(req.file.path,`funeral-sessions/${sessionId}`); const {rows}=await query('insert into documents(session_id,uploader_user_id,document_type,cloudinary_public_id,secure_url,mime_type,size_bytes) values($1,$2,$3,$4,$5,$6,$7) returning *',[sessionId,req.user.id,documentType,result.public_id,result.secure_url,req.file.mimetype,req.file.size]); res.status(201).json(rows[0]); }catch(e){next(e)}});

r.get('/',async(req,res,next)=>{try{ const sessionIdParam=req.query.sessionId as string; if(!sessionIdParam) return res.status(400).json({message:'sessionId query param required'}); const sessionId = await resolveSessionIdentifier(String(sessionIdParam)); if(!sessionId) return res.status(404).json({message:'Session not found'}); const {rows}=await query('select * from documents where session_id=$1 order by created_at desc',[sessionId]); res.json(rows);}catch(e){next(e)}});

r.get('/:id/signed-url',async(req,res,next)=>{try{ const d=(await query('select cloudinary_public_id from documents where id=$1',[req.params.id])).rows[0]; res.json({url:signedUrl(d.cloudinary_public_id)});}catch(e){next(e)}}); export default r;
