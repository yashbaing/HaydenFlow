import { Router } from 'express';
import { dbService } from '../services/dbService';

export const assetsRouter = Router();

assetsRouter.get('/assets', async (req, res) => {
  try {
    const assets = await dbService.getAllAssets();
    res.json({
      total: assets.length,
      assets,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] /assets error:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

assetsRouter.get('/assets/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const allAssets = await dbService.getAllAssets();
    const matched = allAssets.find(a => a.symbol.toLowerCase() === symbol.toLowerCase());

    if (!matched) {
      return res.status(404).json({ error: `Asset ${symbol} not found` });
    }

    const asset = await dbService.getAssetBySymbol(matched.symbol);

    res.json({
      asset,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] /assets/:symbol error:', error);
    res.status(500).json({ error: 'Failed to fetch asset details' });
  }
});
