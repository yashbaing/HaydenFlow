import type { Asset, Pool, Quote, ProtocolStats, CorrelationClassification } from '@nexora/shared';
import { MOCK_ASSETS, MOCK_PRICES, INITIAL_POOL_CONFIGS, CORRELATION_THRESHOLDS } from '@nexora/shared';
import { findRoutes, selectBestRoute } from './router';
import { computeCorrelation } from './correlation';

// ====== Utility: Build full Asset from constants ======

export function buildAssets(): Asset[] {
  return Object.entries(MOCK_ASSETS).map(([symbol, assetBase]) => ({
    ...assetBase,
    currentPrice: MOCK_PRICES[symbol]?.price ?? 0,
    priceChange24h: MOCK_PRICES[symbol]?.change24h ?? 0,
  }));
}

// ====== getMarkets ======

export async function getMarkets(): Promise<Pool[]> {
  const assets = buildAssets();
  const assetMap = new Map(assets.map(a => [a.symbol, a]));

  return INITIAL_POOL_CONFIGS.map((config, idx) => {
    const token0 = assetMap.get(config.token0Symbol)!;
    const token1 = assetMap.get(config.token1Symbol)!;

    // Simulate reserves based on TVL and price
    const price0 = token0.currentPrice || 1;
    const price1 = token1.currentPrice || 1;
    const tvlPerSide = (config.tvl / 2);
    const dec0 = BigInt(10 ** token0.decimals);
    const dec1 = BigInt(10 ** token1.decimals);
    const reserve0 = BigInt(Math.floor((tvlPerSide / price0) * 1e6)) * dec0 / BigInt(1e6);
    const reserve1 = BigInt(Math.floor((tvlPerSide / price1) * 1e6)) * dec1 / BigInt(1e6);

    const classification: CorrelationClassification | undefined = config.correlation != null
      ? (
          config.correlation >= CORRELATION_THRESHOLDS.EXTREME ? 'EXTREME' :
          config.correlation >= CORRELATION_THRESHOLDS.HIGH ? 'HIGH' :
          config.correlation >= CORRELATION_THRESHOLDS.MODERATE ? 'MODERATE' : 'LOW'
        )
      : undefined;

    return {
      id: `pool-${idx + 1}`,
      poolId: `0xpool${idx + 1}`,
      token0,
      token1,
      poolType: config.poolType,
      correlation: config.correlation ?? undefined,
      correlationClassification: classification,
      feeBps: config.feeBps,
      tvl: config.tvl,
      volume24h: config.volume24h,
      volume7d: config.volume24h * 6.8,
      fees24h: config.volume24h * config.feeBps / 10000,
      apr: config.apr,
      riskLevel: config.riskLevel,
      reserve0,
      reserve1,
      totalLpTokens: reserve0,
      active: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    } as Pool;
  });
}

// ====== getPoolStats ======

export async function getPoolStats(poolId: string): Promise<Pool | null> {
  const markets = await getMarkets();
  return markets.find(p => p.poolId === poolId || p.id === poolId) ?? null;
}

// ====== getCorrelation ======

export async function getCorrelation(symbolA: string, symbolB: string) {
  // Generate mock price series (in production: fetch from DB)
  const generatePrices = (base: number, vol: number, days = 90) => {
    const prices = [base];
    for (let i = 1; i < days; i++) {
      const ret = (Math.random() - 0.5) * 2 * vol + 0.0003;
      prices.push(Math.max(prices[i - 1]! * (1 + ret), 1));
    }
    return prices;
  };

  const prices: Record<string, number[]> = {
    USDC:  Array(90).fill(1),
    nSPY:  generatePrices(540, 0.012),
    nNVDA: generatePrices(875, 0.025),
    nTSLA: generatePrices(215, 0.035),
    nAMZN: generatePrices(195, 0.020),
    nCOST: generatePrices(900, 0.015),
    nQQQ:  generatePrices(480, 0.014),
    nGOLD: generatePrices(2350, 0.010),
    WETH:  generatePrices(3250, 0.030),
    WBTC:  generatePrices(68000, 0.028),
  };

  const pricesA = prices[symbolA];
  const pricesB = prices[symbolB];

  if (!pricesA || !pricesB) {
    throw new Error(`Unknown asset symbol: ${symbolA} or ${symbolB}`);
  }

  return computeCorrelation(symbolA, pricesA, symbolB, pricesB);
}

// ====== getQuote ======

export async function getQuote(
  tokenInSymbol: string,
  tokenOutSymbol: string,
  amountIn: bigint,
  slippageBps: number = 50
): Promise<Quote> {
  const assets = buildAssets();
  const assetMap = new Map(assets.map(a => [a.symbol, a]));
  const pools = await getMarkets();

  const tokenIn = assetMap.get(tokenInSymbol);
  const tokenOut = assetMap.get(tokenOutSymbol);

  if (!tokenIn || !tokenOut) throw new Error(`Unknown token: ${tokenInSymbol} or ${tokenOutSymbol}`);

  const routes = findRoutes(tokenIn, tokenOut, amountIn, pools, { maxHops: 3, slippageBps });
  const bestRoute = selectBestRoute(routes);

  if (!bestRoute) throw new Error(`No route found for ${tokenInSymbol} → ${tokenOutSymbol}`);

  const expectedOutput = bestRoute.amountOut;
  const minReceived = expectedOutput * BigInt(10000 - slippageBps) / 10000n;

  // Estimate execution price
  const inDecimals = BigInt(10 ** tokenIn.decimals);
  const outDecimals = BigInt(10 ** tokenOut.decimals);
  const executionPrice = tokenOut.currentPrice > 0 && tokenIn.currentPrice > 0
    ? Number(expectedOutput * inDecimals) / Number(amountIn * outDecimals) * tokenIn.currentPrice
    : 0;

  // Estimate savings vs direct USD route
  const directOutput = routes.find(r => r.path.length === 2)?.amountOut;
  const savings = directOutput != null && directOutput > 0n
    ? Number((expectedOutput - directOutput) * 10000n / directOutput) / 100
    : 0;

  const liquidityUsed = bestRoute.hops.reduce((sum, hop) => {
    return sum + hop.pool.tvl * Number(hop.amountIn) / Number(hop.pool.reserve0 || 1n);
  }, 0);

  return {
    tokenIn,
    tokenOut,
    amountIn,
    bestRoute,
    alternativeRoutes: routes.slice(1, 4),
    expectedOutput,
    priceImpact: bestRoute.priceImpact,
    gasEstimate: bestRoute.gasEstimate,
    minimumReceived: minReceived,
    estimatedSavings: savings > 0 ? savings : undefined,
    liquidityUsed: Math.min(liquidityUsed, bestRoute.hops[0]?.pool.tvl ?? 0),
    executionPrice,
    midPrice: tokenIn.currentPrice > 0 ? tokenOut.currentPrice / tokenIn.currentPrice : 0,
  };
}

// ====== getPortfolio ======

export async function getPortfolio(address: string) {
  const assets = buildAssets();
  const pools = await getMarkets();

  // Mock balances for demo
  const mockBalances: Record<string, bigint> = {
    USDC:  5000n * BigInt(1e6),
    nSPY:  3n * BigInt(1e18),
    nNVDA: 5n * BigInt(1e18),
    nQQQ:  2n * BigInt(1e18),
    WETH:  1n * BigInt(1e18),
  };

  const tokenBalances = assets
    .filter(a => mockBalances[a.symbol])
    .map(a => {
      const balance = mockBalances[a.symbol]!;
      const balanceFormatted = Number(balance) / (10 ** a.decimals);
      return {
        asset: a,
        balance,
        balanceFormatted,
        valueUsd: balanceFormatted * a.currentPrice,
      };
    });

  const totalValueUsd = tokenBalances.reduce((s, b) => s + b.valueUsd, 0);

  // Find relevant pool opportunities
  const heldSymbols = new Set(tokenBalances.map(b => b.asset.symbol));
  const opportunities = pools
    .filter(p => heldSymbols.has(p.token0.symbol) || heldSymbols.has(p.token1.symbol))
    .slice(0, 4)
    .map(p => ({
      pool: p,
      reason: heldSymbols.has(p.token0.symbol) && heldSymbols.has(p.token1.symbol)
        ? `You hold both ${p.token0.symbol} and ${p.token1.symbol}. Their historical correlation reduces relative inventory volatility.`
        : `You hold ${heldSymbols.has(p.token0.symbol) ? p.token0.symbol : p.token1.symbol} and can pair it with the correlated ${heldSymbols.has(p.token0.symbol) ? p.token1.symbol : p.token0.symbol}.`,
      estimatedApr: p.apr,
      riskLevel: p.riskLevel,
      relevantAssets: [p.token0, p.token1].filter(a => heldSymbols.has(a.symbol)),
      correlationScore: p.correlation,
    }));

  const assetTypeMap = new Map<string, number>();
  for (const b of tokenBalances) {
    const current = assetTypeMap.get(b.asset.assetType) ?? 0;
    assetTypeMap.set(b.asset.assetType, current + b.valueUsd);
  }
  const assetExposure = Array.from(assetTypeMap.entries()).map(([assetType, usd]) => ({
    assetType: assetType as any,
    percentage: totalValueUsd > 0 ? (usd / totalValueUsd) * 100 : 0,
  }));

  return {
    address,
    totalValueUsd,
    tokenBalances,
    lpPositions: [] as any[],
    totalFeesEarnedUsd: 0,
    assetExposure,
    opportunities,
  };
}

// ====== getAnalytics ======

export async function getAnalytics() {
  const pools = await getMarkets();

  const stats: ProtocolStats = {
    totalTvl: pools.reduce((s, p) => s + p.tvl, 0),
    volume24h: pools.reduce((s, p) => s + p.volume24h, 0),
    totalVolume: pools.reduce((s, p) => s + p.volume24h * 120, 0),
    fees24h: pools.reduce((s, p) => s + p.fees24h, 0),
    totalFees: pools.reduce((s, p) => s + p.fees24h * 120, 0),
    marketCount: pools.length,
    correlatedMarketCount: pools.filter(p => p.poolType === 'CORRELATED').length,
    bridgeLiquidity: pools.filter(p => p.poolType === 'BRIDGE').reduce((s, p) => s + p.tvl, 0),
    activeLPs: 287,
    correlatedVolumePercentage: 0,
  };

  const correlatedVol = pools.filter(p => p.poolType === 'CORRELATED').reduce((s, p) => s + p.volume24h, 0);
  stats.correlatedVolumePercentage = (correlatedVol / stats.volume24h) * 100;

  return { stats, pools };
}
