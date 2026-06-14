// ─── Prisma Singleton ────────────────────────────────────────────────────────
// Provides a single shared PrismaClient instance to avoid connection pool exhaustion.

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
});

// Graceful shutdown hook
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
});

export default prisma;
