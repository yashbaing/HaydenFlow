import { PrismaClient } from '@prisma/client';
import path from 'path';

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const dbPath = path.resolve(__dirname, '../prisma/dev.db');
    const envUrl = process.env.DATABASE_URL;
    const dbUrl = envUrl && (envUrl.startsWith('postgresql://') || envUrl.startsWith('postgres://') || (envUrl.startsWith('file:') && path.isAbsolute(envUrl.replace('file:', ''))))
      ? envUrl
      : `file:${dbPath}`;

    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }
  return prismaInstance;
}

export const prisma = getPrismaClient();

export { PrismaClient };
export type {
  Asset as DbAsset,
  Pool as DbPool,
  PriceHistory as DbPriceHistory,
  Correlation as DbCorrelation,
  VolumeHistory as DbVolumeHistory,
  LPPosition as DbLPPosition,
  ProtocolSnapshot as DbProtocolSnapshot,
} from '@prisma/client';
