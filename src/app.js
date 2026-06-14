import 'dotenv/config';

// ─── BigInt JSON Serialization Fix ───────────────────────────────────────────
// Prisma returns BigInt for storageQuota, storageUsed, and file size fields.
// JSON.stringify throws "TypeError: Do not know how to serialize a BigInt"
// without this. Serializes BigInt as a numeric string (safe for JS clients).
// eslint-disable-next-line no-extend-native
BigInt.prototype.toJSON = function () { return this.toString(); };

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';

import router from './routes/index.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import { apiLimiter } from './middlewares/rate-limiter.middleware.js';
import { logger } from './utils/logger.js';

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Static Files ─────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
fs.mkdirSync(path.join(UPLOADS_DIR, 'avatars'), { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', router);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// ─── Centralized Error Handler ────────────────────────────────────────────────
app.use(errorHandler);

// ─── Unhandled Rejection Guard ────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: String(reason) });
});

export default app;
