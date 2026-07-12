import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requestOtp, register, login, me, oauthRegister, requestPasswordReset, confirmPasswordReset } from '../controllers/authController.js';

const r = Router();

r.post('/request-otp', requestOtp);
r.post('/password-reset/request', requestPasswordReset);
r.post('/password-reset/confirm', confirmPasswordReset);
r.post('/register', register);
r.post('/login', login);
r.post('/oauth/google', oauthRegister);
r.post('/oauth/apple', oauthRegister);
r.get('/me', authenticate, me);

export default r;
