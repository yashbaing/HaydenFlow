import { NextRequest, NextResponse } from 'next/server';
import { getMarkets } from '@nexora/sdk';
import type { Pool } from '@nexora/shared';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const poolType = searchParams.get('type');
    const assetType = searchParams.get('assetType');

    const markets = await getMarkets();

    let filtered = markets;
    if (poolType) {
      filtered = filtered.filter(p => p.poolType === poolType.toUpperCase());
    }
    if (assetType) {
      filtered = filtered.filter(p =>
        p.token0.assetType === assetType.toUpperCase() ||
        p.token1.assetType === assetType.toUpperCase()
      );
    }

    return NextResponse.json({
      markets: filtered.map(p => ({
        ...p,
        reserve0: p.reserve0.toString(),
        reserve1: p.reserve1.toString(),
        totalLpTokens: p.totalLpTokens.toString(),
      })),
      total: filtered.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API/markets]', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
