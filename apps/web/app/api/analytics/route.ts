import { NextRequest, NextResponse } from 'next/server';
import { getAnalytics } from '@nexora/sdk';

export async function GET() {
  try {
    const analytics = await getAnalytics();

    // Generate time-series data
    const now = Date.now();
    const tvlHistory = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(now - (29 - i) * 86400000).toISOString(),
      value: analytics.stats.totalTvl * (0.88 + i * 0.004 + (Math.random() - 0.5) * 0.05),
    }));

    const volumeHistory = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(now - (29 - i) * 86400000).toISOString(),
      value: analytics.stats.volume24h * (0.6 + Math.random() * 0.8),
    }));

    const correlatedVsBridge = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(now - (29 - i) * 86400000).toISOString(),
      correlated: analytics.stats.volume24h * 0.35 * (0.8 + Math.random() * 0.4),
      bridge: analytics.stats.volume24h * 0.65 * (0.8 + Math.random() * 0.4),
    }));

    const routingDistribution = [
      { label: 'USDC → nSPY → Asset', value: 41200, percentage: 38.2 },
      { label: 'Direct Bridge', value: 28900, percentage: 26.8 },
      { label: 'USDC → nQQQ → Asset', value: 21400, percentage: 19.8 },
      { label: 'Multi-hop Correlated', value: 16300, percentage: 15.1 },
    ];

    return NextResponse.json({
      stats: analytics.stats,
      tvlHistory,
      volumeHistory,
      correlatedVsBridge,
      topPools: analytics.pools
        .sort((a, b) => b.tvl - a.tvl)
        .slice(0, 5)
        .map(p => ({
          ...p,
          reserve0: p.reserve0.toString(),
          reserve1: p.reserve1.toString(),
          totalLpTokens: p.totalLpTokens.toString(),
        })),
      routingDistribution,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API/analytics]', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
