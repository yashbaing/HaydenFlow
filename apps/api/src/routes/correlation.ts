import { Router } from 'express';
import { dbService } from '../services/dbService';
import { getCorrelation as calculateCorrelation } from '@nexora/sdk';

export const correlationRouter = Router();

correlationRouter.get('/correlation', async (req, res) => {
  try {
    const { assetA, assetB } = req.query;

    if (!assetA || !assetB || typeof assetA !== 'string' || typeof assetB !== 'string') {
      return res.status(400).json({ error: 'assetA and assetB query params are required' });
    }

    const allAssets = await dbService.getAllAssets();
    const matchA = allAssets.find(a => a.symbol.toLowerCase() === assetA.toLowerCase());
    const matchB = allAssets.find(a => a.symbol.toLowerCase() === assetB.toLowerCase());

    const symA = matchA ? matchA.symbol : assetA;
    const symB = matchB ? matchB.symbol : assetB;

    // First check DB
    const cached = await dbService.getCorrelation(symA, symB);

    if (cached) {
      return res.json({
        assetA: symA,
        assetB: symB,
        correlation: cached.correlation,
        classification: cached.classification,
        dataPoints: cached.dataPoints,
        periodDays: cached.periodDays,
        calculatedAt: cached.calculatedAt,
        source: 'database_cache',
      });
    }

    // Fallback to real-time calculation
    const calculated = await calculateCorrelation(symA, symB);
    res.json({
      ...calculated,
      source: 'live_engine',
    });
  } catch (error: any) {
    console.error('[API] /correlation error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate correlation' });
  }
});

correlationRouter.get('/correlation/matrix', async (req, res) => {
  try {
    const correlations = await dbService.getAllCorrelations();
    const assets = await dbService.getAllAssets();

    const symbols = assets.map(a => a.symbol);
    const matrix: Record<string, Record<string, number>> = {};

    for (const sym1 of symbols) {
      matrix[sym1] = {};
      for (const sym2 of symbols) {
        if (sym1 === sym2) {
          matrix[sym1][sym2] = 1.0;
        } else {
          const match = correlations.find(
            c => (c.assetA.symbol === sym1 && c.assetB.symbol === sym2) ||
                 (c.assetA.symbol === sym2 && c.assetB.symbol === sym1)
          );
          matrix[sym1][sym2] = match ? match.correlation : 0.0;
        }
      }
    }

    res.json({
      symbols,
      matrix,
      totalPairs: correlations.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] /correlation/matrix error:', error);
    res.status(500).json({ error: 'Failed to build correlation matrix' });
  }
});
