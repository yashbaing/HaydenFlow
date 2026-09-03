import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getMarkets, buildAssets } from '@nexora/sdk';
import { findRoutes } from '@nexora/sdk';

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

    const assets = buildAssets();
    const assetMap = new Map(assets.map(a => [a.symbol, a]));
    const pools = await getMarkets();

    const inAsset = assetMap.get(tokenIn);
    const outAsset = assetMap.get(tokenOut);

    if (!inAsset || !outAsset) {
      return NextResponse.json(
        { error: `Unknown token: ${tokenIn} or ${tokenOut}` },
        { status: 400 }
      );
    }

    const amountInBigInt = BigInt(amountIn);
    const routes = findRoutes(inAsset, outAsset, amountInBigInt, pools, {
      maxHops: 3,
      slippageBps: parseInt(slippage),
    });

    return NextResponse.json({
      tokenIn,
      tokenOut,
      amountIn,
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
      routeCount: routes.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API/routes]', error);
    return NextResponse.json(
      { error: error?.message ?? 'Route discovery failed' },
      { status: 500 }
    );
  }
}
