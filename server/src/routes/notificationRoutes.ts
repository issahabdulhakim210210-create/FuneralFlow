import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { savePushToken } from '../services/notificationService.js';
import { query } from '../config/db.js';

const r = Router();
r.use(authenticate);
r.post('/push-token', async (req, res, next) => {
  try {
    const { token, platform } = req.body;
    await savePushToken(req.user!.id, token, platform);
    res.json({ message: 'Push token saved' });
  } catch (e) { next(e); }
});
r.get('/', async (req, res, next) => {
  try {
    const { rows } = await query('select * from notifications where user_id=$1 order by created_at desc limit 100', [req.user!.id]);
    res.json(rows);
  } catch (e) { next(e); }
});
export default r;
