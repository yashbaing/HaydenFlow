import { PrismaClient } from '@prisma/client';
import { config } from '../config';

let prismaInstance: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: config.databaseUrl,
        },
      },
    });
  }
  return prismaInstance;
}

export class DbService {
  private db = getDb();

  async getAllAssets() {
    return this.db.asset.findMany({
      where: { active: true },
      orderBy: { symbol: 'asc' },
    });
  }

  async getAssetBySymbol(symbol: string) {
    return this.db.asset.findUnique({
      where: { symbol },
      include: {
        priceHistory: {
          orderBy: { timestamp: 'desc' },
          take: 90,
        },
      },
    });
  }

  async getAllPools() {
    return this.db.pool.findMany({
      where: { active: true },
      orderBy: { tvl: 'desc' },
    });
  }

  async getPoolById(id: string) {
    return this.db.pool.findFirst({
      where: {
        OR: [{ id }, { poolId: id }],
      },
      include: {
        volumeHistory: {
          orderBy: { timestamp: 'desc' },
          take: 30,
        },
      },
    });
  }

  async getCorrelation(symbolA: string, symbolB: string) {
    const assetA = await this.db.asset.findUnique({ where: { symbol: symbolA } });
    const assetB = await this.db.asset.findUnique({ where: { symbol: symbolB } });

    if (!assetA || !assetB) return null;

    const correlation = await this.db.correlation.findFirst({
      where: {
        OR: [
          { assetAId: assetA.id, assetBId: assetB.id },
          { assetAId: assetB.id, assetBId: assetA.id },
        ],
      },
    });

    return correlation;
  }

  async getAllCorrelations() {
    return this.db.correlation.findMany({
      include: {
        assetA: true,
        assetB: true,
      },
    });
  }

  async getProtocolStats() {
    const pools = await this.getAllPools();
    const totalTvl = pools.reduce((acc, p) => acc + p.tvl, 0);
    const volume24h = pools.reduce((acc, p) => acc + p.volume24h, 0);
    const fees24h = pools.reduce((acc, p) => acc + p.fees24h, 0);
    const correlatedCount = pools.filter(p => p.poolType === 'CORRELATED').length;

    const snapshots = await this.db.protocolSnapshot.findMany({
      orderBy: { date: 'desc' },
      take: 30,
    });

    return {
      stats: {
        totalTvl,
        volume24h,
        totalVolume: volume24h * 120,
        fees24h,
        totalFees: fees24h * 120,
        marketCount: pools.length,
        correlatedMarketCount: correlatedCount,
        activeLPs: 287,
      },
      snapshots,
    };
  }

  async getPortfolio(address: string) {
    const lpPositions = await this.db.lPPosition.findMany({
      where: { ownerAddress: address, closed: false },
      include: { pool: true },
    });

    return {
      address,
      lpPositions,
    };
  }

  async createPool(data: {
    poolId: string;
    token0Symbol: string;
    token1Symbol: string;
    poolType: string;
    correlation?: number;
    correlationClassification?: string;
    feeBps: number;
    tvl: number;
    reserve0: string;
    reserve1: string;
  }) {
    return this.db.pool.create({
      data: {
        ...data,
        volume24h: 0,
        volume7d: 0,
        fees24h: 0,
        apr: data.poolType === 'CORRELATED' ? 14.5 : 9.2,
        riskLevel: data.poolType === 'CORRELATED' ? 'LOW' : 'MODERATE',
        totalLpTokens: data.reserve0,
        active: true,
      },
    });
  }
}

export const dbService = new DbService();
