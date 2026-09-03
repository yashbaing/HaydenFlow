import { Router } from 'express';
import { getDb } from '../services/dbService';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const startTime = Date.now();
  let dbStatus = 'disconnected';

  try {
    const db = getDb();
    await db.$queryRaw`SELECT 1`;
    dbStatus = 'healthy';
  } catch (error: any) {
    dbStatus = `unhealthy: ${error.message}`;
  }

  const memory = process.memoryUsage();

  res.json({
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    service: 'nexora-backend',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startTime,
    database: {
      status: dbStatus,
    },
    memory: {
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      rssMb: Math.round(memory.rss / 1024 / 1024),
    },
  });
});
