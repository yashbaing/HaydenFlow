import { Router } from 'express';
import { getQuote } from '@nexora/sdk';

export const swapRouter = Router();

swapRouter.post('/swap/simulate', async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, slippage, userAddress } = req.body;

    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({ error: 'tokenIn, tokenOut, and amountIn are required in body' });
    }

    const slippageBps = slippage ? Number(slippage) : 50;
    const amountInBigInt = BigInt(amountIn);

    const quote = await getQuote(tokenIn, tokenOut, amountInBigInt, slippageBps);

    const txHash = `0xsim_${Buffer.from(`${userAddress || '0x'}-${Date.now()}`).toString('hex').slice(0, 40)}`;

    res.json({
      simulation: {
        success: true,
        txHash,
        status: 'CONFIRMED',
        blockNumber: 19482710,
        tokenIn,
        tokenOut,
        amountIn: amountIn.toString(),
        amountOut: quote.expectedOutput.toString(),
        minimumReceived: quote.minimumReceived.toString(),
        priceImpact: quote.priceImpact,
        hopsCount: quote.bestRoute.hops.length,
        path: quote.bestRoute.path.map(p => p.symbol).join(' → '),
        gasUsed: '142850',
        effectiveFeePercent: (quote.bestRoute.hops.reduce((acc, h) => acc + h.pool.feeBps, 0) / 100).toFixed(2),
        simulatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[API] /swap/simulate error:', error);
    res.status(500).json({ error: error.message || 'Simulation failed' });
  }
});
