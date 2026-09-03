import { Router } from 'express';
import { getPortfolio } from '@nexora/sdk';
import { dbService } from '../services/dbService';

export const portfolioRouter = Router();

portfolioRouter.get('/portfolio/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Valid Ethereum address required' });
    }

    const portfolio = await getPortfolio(address);
    const dbPositions = await dbService.getPortfolio(address);

    res.json({
      ...portfolio,
      tokenBalances: portfolio.tokenBalances.map(b => ({
        ...b,
        balance: b.balance.toString(),
      })),
      lpPositions: (portfolio.lpPositions as any[]).map(p => ({
        ...p,
        lpTokens: p.lpTokens?.toString() ?? '0',
        feesEarned0: p.feesEarned0?.toString() ?? '0',
        feesEarned1: p.feesEarned1?.toString() ?? '0',
      })),
      persistedDbPositions: dbPositions.lpPositions,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] /portfolio error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch portfolio' });
  }
});
