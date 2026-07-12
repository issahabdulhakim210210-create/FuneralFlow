import express from 'express';
import { security } from './middleware/security.js';
import authRoutes from './routes/authRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import coreRoutes from './routes/coreRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { env } from './config/env.js';

const app = express();
app.set('trust proxy', 1);
app.use(security);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_, res) => res.json({ ok: true, name: 'Funeral Management System API' }));
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', coreRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((err: any, req: any, res: any, next: any) => {
	console.error(err);
	res.status(err.status || 500).json({ message: err.message || 'Internal server error', code: err.code || 'SERVER_ERROR' });
});

// Start server with guarded error handling for EADDRINUSE
function startServer(port: number) {
	const server = app.listen(port, () => console.log(`API running on :${port}`));

	server.on('error', (err: any) => {
		if (err && err.code === 'EADDRINUSE') {
			console.error(`Port ${port} already in use.`);
			const next = port + 1;
			console.log(`Attempting to listen on port ${next} instead...`);
			// Delay to allow any existing socket to close
			setTimeout(() => startServer(next), 200);
		} else {
			console.error('Server error', err);
			process.exit(1);
		}
	});
}

startServer(env.PORT);
