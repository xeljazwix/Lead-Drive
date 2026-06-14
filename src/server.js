import 'dotenv/config';
import app from './app.js';
import { startTrashPurgeCron } from './services/trash.service.js';
import { logger } from './utils/logger.js';
import prisma from './utils/prisma.js';
import { initSocket } from './socket.js';
import { createServer } from 'node:http';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function bootstrap() {
  // Verify database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection established');
  } catch (err) {
    logger.error('Failed to connect to database', { err: err.message });
    process.exit(1);
  }

  // Start trash purge cron
  startTrashPurgeCron();

  // Start HTTP server
  const httpServer = createServer(app);
  
  // Initialize Socket.io
  initSocket(httpServer);

  const server = httpServer.listen(PORT, () => {
    logger.info(`Neumorphic Cloud Drive API running`, { port: PORT, env: process.env.NODE_ENV });
  });

  // ─── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server closed, process exiting');
      process.exit(0);
    });
    // Force exit after 10 seconds if graceful shutdown stalls
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap();
