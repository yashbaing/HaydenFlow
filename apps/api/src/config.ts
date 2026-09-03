import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const defaultDbPath = path.resolve(__dirname, '../../../packages/database/prisma/dev.db');

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || `file:${defaultDbPath}`,
  wsHeartbeatIntervalMs: 30000,
  priceSimulationIntervalMs: 5000,
};
