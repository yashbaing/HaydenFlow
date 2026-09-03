import { Router } from 'express';
import { findRoutes, buildAssets, getMarkets } from '@nexora/sdk';

export const routesRouter = Router();

routesRouter.get('/routes', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, maxHops, slippage } = req.query;

    if (!tokenIn || !tokenOut || !amountIn || typeof tokenIn !== 'string' || typeof tokenOut !== 'string' || typeof amountIn !== 'string') {
      return res.status(400).json({ error: 'tokenIn, tokenOut, and amountIn query parameters are required' });
    }

    const assets = buildAssets();
    const inAsset = assets.find(a => a.symbol.toLowerCase() === tokenIn.toLowerCase());
    const outAsset = assets.find(a => a.symbol.toLowerCase() === tokenOut.toLowerCase());

    if (!inAsset || !outAsset) {
      return res.status(404).json({ error: `Token not found: ${tokenIn} or ${tokenOut}` });
    }

    const pools = await getMarkets();
    const amountInBigInt = BigInt(amountIn);

    const routes = findRoutes(inAsset, outAsset, amountInBigInt, pools, {
      maxHops: maxHops ? parseInt(maxHops as string, 10) : 3,
      slippageBps: slippage ? parseInt(slippage as string, 10) : 50,
    });

    res.json({
      tokenIn: inAsset.symbol,
      tokenOut: outAsset.symbol,
      amountIn,
      routeCount: routes.length,
      routes: routes.map(r => ({
        ...r,
        amountIn: r.amountIn.toString(),
        amountOut: r.amountOut.toString(),
        gasEstimate: r.gasEstimate.toString(),
        hops: r.hops.map(h => ({
          ...h,
          amountIn: h.amountIn.toString(),
          amountOut: h.amountOut.toString(),
          pool: {
            ...h.pool,
            reserve0: h.pool.reserve0.toString(),
            reserve1: h.pool.reserve1.toString(),
            totalLpTokens: h.pool.totalLpTokens.toString(),
          },
        })),
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] /routes error:', error);
    res.status(500).json({ error: error.message || 'Route discovery failed' });
  }
});
