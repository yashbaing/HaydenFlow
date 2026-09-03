import { NextRequest, NextResponse } from 'next/server';
import { getQuote } from '@nexora/sdk';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenIn = searchParams.get('tokenIn');
    const tokenOut = searchParams.get('tokenOut');
    const amountIn = searchParams.get('amountIn');
    const slippage = searchParams.get('slippage') ?? '50';

    if (!tokenIn || !tokenOut || !amountIn) {
      return NextResponse.json(
        { error: 'tokenIn, tokenOut, and amountIn are required' },
        { status: 400 }
      );
    }

    const amountInBigInt = BigInt(amountIn);
    const quote = await getQuote(
      tokenIn,
      tokenOut,
      amountInBigInt,
      parseInt(slippage)
    );

    if (!quote) {
      return NextResponse.json(
        { error: `No available route found from ${tokenIn} to ${tokenOut}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
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
    console.error('[API/quote]', error);
    return NextResponse.json(
      { error: error?.message ?? 'Quote calculation failed' },
      { status: 500 }
    );
  }
}
