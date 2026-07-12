import helmet from 'helmet'; import cors from 'cors'; import rateLimit from 'express-rate-limit'; import { env } from '../config/env.js';
export const security=[helmet(), cors({origin:env.CORS_ORIGIN==='*'?true:env.CORS_ORIGIN.split(','), credentials:true}), rateLimit({windowMs:15*60*1000, max:500})];
