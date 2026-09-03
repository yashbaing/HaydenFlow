import { NextRequest, NextResponse } from 'next/server';
import { getPoolStats } from '@nexora/sdk';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pool = await getPoolStats(id);
    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
    }
    return NextResponse.json({
      ...pool,
      reserve0: pool.reserve0.toString(),
      reserve1: pool.reserve1.toString(),
      totalLpTokens: pool.totalLpTokens.toString(),
    });
  } catch (error) {
    console.error('[API/pools]', error);
    return NextResponse.json({ error: 'Failed to fetch pool' }, { status: 500 });
  }
}
