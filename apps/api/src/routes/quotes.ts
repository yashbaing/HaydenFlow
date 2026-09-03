import { Router } from 'express';
import { getQuote } from '@nexora/sdk';

export const quotesRouter = Router();

quotesRouter.get('/quote', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, slippage } = req.query;

    if (!tokenIn || !tokenOut || !amountIn || typeof tokenIn !== 'string' || typeof tokenOut !== 'string' || typeof amountIn !== 'string') {
      return res.status(400).json({ error: 'tokenIn, tokenOut, and amountIn query parameters are required' });
    }

    const slippageBps = slippage ? parseInt(slippage as string, 10) : 50;
    const amountInBigInt = BigInt(amountIn);

    const quote = await getQuote(tokenIn, tokenOut, amountInBigInt, slippageBps);

    res.json({
      tokenIn: quote.tokenIn.symbol,
      tokenOut: quote.tokenOut.symbol,
      amountIn: quote.amountIn.toString(),
      expectedOutput: quote.expectedOutput.toString(),
      minimumReceived: quote.minimumReceived.toString(),
      executionPrice: quote.executionPrice,
      midPrice: quote.midPrice,
      priceImpact: quote.priceImpact,
      gasEstimate: quote.gasEstimate.toString(),
      liquidityUsed: quote.liquidityUsed,
      estimatedSavings: quote.estimatedSavings,
      bestRoute: {
        ...quote.bestRoute,
        amountIn: quote.bestRoute.amountIn.toString(),
        amountOut: quote.bestRoute.amountOut.toString(),
        gasEstimate: quote.bestRoute.gasEstimate.toString(),
        hops: quote.bestRoute.hops.map(h => ({
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
      },
      alternativeRoutes: quote.alternativeRoutes.map(r => ({
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
    console.error('[API] /quote error:', error);
    res.status(500).json({ error: error.message || 'Quote calculation failed' });
  }
});
