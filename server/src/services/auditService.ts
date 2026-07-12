import { query } from '../config/db.js';
export async function audit(userId:string|null, action:string, entity:string, entityId:string|null, metadata:any={}){ await query('insert into audit_logs(user_id,action,entity,entity_id,metadata) values($1,$2,$3,$4,$5)',[userId,action,entity,entityId,metadata]); }
