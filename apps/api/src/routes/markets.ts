import { Router } from 'express';
import { dbService } from '../services/dbService';

export const marketsRouter = Router();

marketsRouter.get('/markets', async (req, res) => {
  try {
    const { type, assetType } = req.query;
    let pools = await dbService.getAllPools();

    if (type && typeof type === 'string') {
      pools = pools.filter(p => p.poolType.toLowerCase() === type.toLowerCase());
    }

    res.json({
      total: pools.length,
      markets: pools,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] /markets error:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

marketsRouter.get('/markets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await dbService.getPoolById(id);

    if (!pool) {
      return res.status(404).json({ error: `Market/pool ${id} not found` });
    }

    res.json({
      pool,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] /markets/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch market details' });
  }
});

marketsRouter.post('/markets', async (req, res) => {
  try {
    const {
      token0Symbol,
      token1Symbol,
      poolType,
      feeBps,
      initialAmount0,
      initialAmount1,
      correlation,
    } = req.body;

    if (!token0Symbol || !token1Symbol || !feeBps) {
      return res.status(400).json({
        error: 'token0Symbol, token1Symbol, and feeBps are required',
      });
    }

    const poolId = `0x${Buffer.from(`${token0Symbol}-${token1Symbol}-${Date.now()}`).toString('hex').slice(0, 64)}`;

    const newPool = await dbService.createPool({
      poolId,
      token0Symbol,
      token1Symbol,
      poolType: poolType || 'CORRELATED',
      feeBps: Number(feeBps),
      correlation: correlation ? Number(correlation) : undefined,
      correlationClassification: correlation
        ? (Number(correlation) >= 0.85 ? 'EXTREME' : Number(correlation) >= 0.7 ? 'HIGH' : 'MODERATE')
        : undefined,
      tvl: 500000,
      reserve0: String(initialAmount0 || '100000000000000000000'),
      reserve1: String(initialAmount1 || '100000000000000000000'),
    });

    res.status(201).json({
      success: true,
      pool: newPool,
      message: 'Pool created successfully',
    });
  } catch (error: any) {
    console.error('[API] POST /markets error:', error);
    res.status(500).json({ error: error.message || 'Failed to create pool' });
  }
});
