import { PrismaClient } from '@prisma/client';

const MOCK_ASSETS_DATA = [
  { symbol: 'USDC',  name: 'USD Coin',              assetType: 'STABLECOIN', sector: 'Currency',              tokenAddress: '0x0000000000000000000000000000000000000001', decimals: 6,  isBridgeAsset: true,  logoColor: '#2775CA', currentPrice: 1.00,    priceChange24h: 0.01 },
  { symbol: 'nSPY',  name: 'Nexora S&P 500 ETF',    assetType: 'ETF',        sector: 'Broad Market',          tokenAddress: '0x0000000000000000000000000000000000000002', decimals: 18, isBridgeAsset: true,  logoColor: '#F5A623', currentPrice: 540.25,  priceChange24h: 0.73, benchmarkSymbol: 'USDC' },
  { symbol: 'nNVDA', name: 'Nexora NVIDIA',          assetType: 'STOCK',      sector: 'Technology',            tokenAddress: '0x0000000000000000000000000000000000000003', decimals: 18, isBridgeAsset: false, logoColor: '#76B900', currentPrice: 875.40,  priceChange24h: 2.14, benchmarkSymbol: 'nSPY' },
  { symbol: 'nTSLA', name: 'Nexora Tesla',           assetType: 'STOCK',      sector: 'Technology/Automotive', tokenAddress: '0x0000000000000000000000000000000000000004', decimals: 18, isBridgeAsset: false, logoColor: '#CC0000', currentPrice: 215.80,  priceChange24h: -1.32, benchmarkSymbol: 'nSPY' },
  { symbol: 'nAMZN', name: 'Nexora Amazon',          assetType: 'STOCK',      sector: 'Technology',            tokenAddress: '0x0000000000000000000000000000000000000005', decimals: 18, isBridgeAsset: false, logoColor: '#FF9900', currentPrice: 195.60,  priceChange24h: 0.95, benchmarkSymbol: 'nQQQ' },
  { symbol: 'nCOST', name: 'Nexora Costco',          assetType: 'STOCK',      sector: 'Consumer Staples',      tokenAddress: '0x0000000000000000000000000000000000000006', decimals: 18, isBridgeAsset: false, logoColor: '#005DAA', currentPrice: 900.10,  priceChange24h: 0.41, benchmarkSymbol: 'nSPY' },
  { symbol: 'nQQQ',  name: 'Nexora Nasdaq-100 ETF', assetType: 'ETF',        sector: 'Technology',            tokenAddress: '0x0000000000000000000000000000000000000007', decimals: 18, isBridgeAsset: true,  logoColor: '#7B68EE', currentPrice: 480.75,  priceChange24h: 0.88, benchmarkSymbol: 'nSPY' },
  { symbol: 'nGOLD', name: 'Nexora Gold',            assetType: 'COMMODITY',  sector: 'Commodities',           tokenAddress: '0x0000000000000000000000000000000000000008', decimals: 18, isBridgeAsset: false, logoColor: '#FFD700', currentPrice: 2350.00, priceChange24h: -0.22 },
  { symbol: 'WETH',  name: 'Wrapped Ether',          assetType: 'CRYPTO',     sector: 'Crypto',                tokenAddress: '0x0000000000000000000000000000000000000009', decimals: 18, isBridgeAsset: true,  logoColor: '#627EEA', currentPrice: 3250.00, priceChange24h: 1.44 },
  { symbol: 'WBTC',  name: 'Wrapped Bitcoin',        assetType: 'CRYPTO',     sector: 'Crypto',                tokenAddress: '0x000000000000000000000000000000000000000A', decimals: 8,  isBridgeAsset: true,  logoColor: '#F7931A', currentPrice: 68000.00, priceChange24h: -0.87 },
];

const POOL_DATA = [
  { poolId: '0xpool1', token0Symbol: 'nNVDA', token1Symbol: 'nSPY',  poolType: 'CORRELATED', feeBps: 20, correlation: 0.87, correlationClassification: 'HIGH',    tvl: 825000,   volume24h: 291000,  fees24h: 582,  apr: 8.4, riskLevel: 'LOW' },
  { poolId: '0xpool2', token0Symbol: 'nTSLA', token1Symbol: 'nSPY',  poolType: 'CORRELATED', feeBps: 20, correlation: 0.78, correlationClassification: 'HIGH',    tvl: 620000,   volume24h: 185000,  fees24h: 370,  apr: 7.2, riskLevel: 'MODERATE' },
  { poolId: '0xpool3', token0Symbol: 'nAMZN', token1Symbol: 'nQQQ',  poolType: 'CORRELATED', feeBps: 20, correlation: 0.91, correlationClassification: 'EXTREME', tvl: 540000,   volume24h: 142000,  fees24h: 284,  apr: 6.3, riskLevel: 'LOW' },
  { poolId: '0xpool4', token0Symbol: 'nCOST', token1Symbol: 'nSPY',  poolType: 'CORRELATED', feeBps: 20, correlation: 0.72, correlationClassification: 'MODERATE',tvl: 380000,   volume24h: 98000,   fees24h: 196,  apr: 6.1, riskLevel: 'MODERATE' },
  { poolId: '0xpool5', token0Symbol: 'nQQQ',  token1Symbol: 'nSPY',  poolType: 'CORRELATED', feeBps: 15, correlation: 0.94, correlationClassification: 'EXTREME', tvl: 1250000,  volume24h: 420000,  fees24h: 630,  apr: 5.8, riskLevel: 'VERY_LOW' },
  { poolId: '0xpool6', token0Symbol: 'nSPY',  token1Symbol: 'USDC',  poolType: 'BRIDGE',     feeBps: 30, correlation: null, correlationClassification: null,       tvl: 2100000,  volume24h: 890000,  fees24h: 2670, apr: 12.4, riskLevel: 'LOW' },
  { poolId: '0xpool7', token0Symbol: 'WETH',  token1Symbol: 'USDC',  poolType: 'BRIDGE',     feeBps: 30, correlation: null, correlationClassification: null,       tvl: 4200000,  volume24h: 1850000, fees24h: 5550, apr: 15.2, riskLevel: 'MODERATE' },
  { poolId: '0xpool8', token0Symbol: 'WBTC',  token1Symbol: 'USDC',  poolType: 'BRIDGE',     feeBps: 30, correlation: null, correlationClassification: null,       tvl: 3800000,  volume24h: 1420000, fees24h: 4260, apr: 13.8, riskLevel: 'MODERATE' },
];

// Correlation matrix between all pairs
const CORRELATION_PAIRS = [
  { assetA: 'nNVDA', assetB: 'nSPY',  correlation: 0.87, classification: 'HIGH' },
  { assetA: 'nNVDA', assetB: 'nQQQ',  correlation: 0.91, classification: 'EXTREME' },
  { assetA: 'nTSLA', assetB: 'nSPY',  correlation: 0.78, classification: 'HIGH' },
  { assetA: 'nTSLA', assetB: 'nQQQ',  correlation: 0.74, classification: 'MODERATE' },
  { assetA: 'nAMZN', assetB: 'nQQQ',  correlation: 0.91, classification: 'EXTREME' },
  { assetA: 'nAMZN', assetB: 'nSPY',  correlation: 0.83, classification: 'HIGH' },
  { assetA: 'nCOST', assetB: 'nSPY',  correlation: 0.72, classification: 'MODERATE' },
  { assetA: 'nQQQ',  assetB: 'nSPY',  correlation: 0.94, classification: 'EXTREME' },
  { assetA: 'nGOLD', assetB: 'nSPY',  correlation: -0.12, classification: 'LOW' },
  { assetA: 'WETH',  assetB: 'nSPY',  correlation: 0.42, classification: 'LOW' },
  { assetA: 'WBTC',  assetB: 'WETH',  correlation: 0.85, classification: 'HIGH' },
  { assetA: 'nNVDA', assetB: 'nAMZN', correlation: 0.79, classification: 'HIGH' },
  { assetA: 'nTSLA', assetB: 'nNVDA', correlation: 0.65, classification: 'MODERATE' },
];

// Generate 90 days of price history with realistic correlation
function generatePriceHistory(
  basePrice: number,
  volatility: number,
  correlatedWith?: { prices: number[]; beta: number }
): { close: number; open: number; high: number; low: number }[] {
  const days = 90;
  const prices = [];
  let price = basePrice;

  for (let i = 0; i < days; i++) {
    const marketNoise = (Math.random() - 0.5) * 2 * volatility;
    const correlatedReturn = correlatedWith
      ? correlatedWith.beta * (correlatedWith.prices[i]! / (correlatedWith.prices[i - 1] ?? correlatedWith.prices[0]!) - 1) * 0.7
      : 0;
    const drift = 0.0003; // slight upward trend
    const dailyReturn = drift + marketNoise + correlatedReturn;
    price = Math.max(price * (1 + dailyReturn), 1);
    const dayVol = price * volatility * 0.5;
    prices.push({
      open: price * (1 - Math.random() * 0.005),
      high: price + dayVol * Math.random(),
      low: Math.max(price - dayVol * Math.random(), 1),
      close: price,
    });
  }
  return prices;
}

async function main() {
  const prisma = new PrismaClient();

  console.log('🌱 Seeding NEXORA database...');

  // ====== Assets ======
  console.log('  → Seeding assets...');
  const createdAssets: Record<string, any> = {};

  for (const asset of MOCK_ASSETS_DATA) {
    const created = await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: { currentPrice: asset.currentPrice, priceChange24h: asset.priceChange24h },
      create: asset,
    });
    createdAssets[asset.symbol] = created;
  }

  // ====== Price History ======
  console.log('  → Seeding price history (90 days)...');
  const now = new Date();
  const spyPriceHistory = generatePriceHistory(540, 0.012);

  const priceHistoryMap: Record<string, { close: number; open: number; high: number; low: number }[]> = {
    nSPY:  spyPriceHistory,
    USDC:  Array(90).fill({ open: 1, high: 1.001, low: 0.999, close: 1 }),
    nNVDA: generatePriceHistory(875, 0.025, { prices: spyPriceHistory.map(p => p.close), beta: 1.8 }),
    nTSLA: generatePriceHistory(215, 0.035, { prices: spyPriceHistory.map(p => p.close), beta: 1.5 }),
    nAMZN: generatePriceHistory(195, 0.020, { prices: spyPriceHistory.map(p => p.close), beta: 1.4 }),
    nCOST: generatePriceHistory(900, 0.015, { prices: spyPriceHistory.map(p => p.close), beta: 1.1 }),
    nQQQ:  generatePriceHistory(480, 0.014, { prices: spyPriceHistory.map(p => p.close), beta: 1.2 }),
    nGOLD: generatePriceHistory(2350, 0.010),
    WETH:  generatePriceHistory(3250, 0.030),
    WBTC:  generatePriceHistory(68000, 0.028),
  };

  for (const [symbol, history] of Object.entries(priceHistoryMap)) {
    const asset = createdAssets[symbol];
    if (!asset) continue;

    const records = history.map((p, i) => {
      const ts = new Date(now);
      ts.setDate(ts.getDate() - (89 - i));
      ts.setHours(0, 0, 0, 0);
      return {
        assetId: asset.id,
        timestamp: ts,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        volume: Math.random() * 5_000_000 + 500_000,
      };
    });

    await prisma.priceHistory.deleteMany({ where: { assetId: asset.id } });
    await prisma.priceHistory.createMany({ data: records });
  }

  // ====== Pools ======
  console.log('  → Seeding pools...');
  const createdPools: Record<string, any> = {};

  for (const pool of POOL_DATA) {
    const created = await prisma.pool.upsert({
      where: { poolId: pool.poolId },
      update: { tvl: pool.tvl, volume24h: pool.volume24h, fees24h: pool.fees24h, apr: pool.apr },
      create: {
        ...pool,
        volume7d: pool.volume24h * 7 * (0.8 + Math.random() * 0.4),
        reserve0: '0',
        reserve1: '0',
        totalLpTokens: '0',
      },
    });
    createdPools[pool.poolId] = created;
  }

  // ====== Volume History (30 days) ======
  console.log('  → Seeding volume history...');
  for (const pool of Object.values(createdPools)) {
    const records = Array.from({ length: 30 }, (_, i) => {
      const ts = new Date(now);
      ts.setDate(ts.getDate() - (29 - i));
      ts.setHours(0, 0, 0, 0);
      const vol = (pool.volume24h as number) * (0.6 + Math.random() * 0.8);
      return {
        poolId: pool.id,
        timestamp: ts,
        volume: vol,
        tvl: (pool.tvl as number) * (0.9 + Math.random() * 0.2),
        fees: vol * (pool.feeBps as number) / 10000,
      };
    });
    await prisma.volumeHistory.deleteMany({ where: { poolId: pool.id } });
    await prisma.volumeHistory.createMany({ data: records });
  }

  // ====== Correlations ======
  console.log('  → Seeding correlations...');
  for (const pair of CORRELATION_PAIRS) {
    const assetA = createdAssets[pair.assetA];
    const assetB = createdAssets[pair.assetB];
    if (!assetA || !assetB) continue;
    await prisma.correlation.upsert({
      where: { assetAId_assetBId: { assetAId: assetA.id, assetBId: assetB.id } },
      update: { correlation: pair.correlation, classification: pair.classification },
      create: {
        assetAId: assetA.id,
        assetBId: assetB.id,
        correlation: pair.correlation,
        classification: pair.classification,
        dataPoints: 90,
        periodDays: 90,
      },
    });
    // Mirror
    await prisma.correlation.upsert({
      where: { assetAId_assetBId: { assetAId: assetB.id, assetBId: assetA.id } },
      update: { correlation: pair.correlation, classification: pair.classification },
      create: {
        assetAId: assetB.id,
        assetBId: assetA.id,
        correlation: pair.correlation,
        classification: pair.classification,
        dataPoints: 90,
        periodDays: 90,
      },
    });
  }

  // ====== Protocol Snapshots ======
  console.log('  → Seeding protocol snapshots...');
  for (let i = 29; i >= 0; i--) {
    const ts = new Date(now);
    ts.setDate(ts.getDate() - i);
    ts.setHours(0, 0, 0, 0);
    const growthFactor = 1 + (29 - i) * 0.01;
    await prisma.protocolSnapshot.upsert({
      where: { date: ts },
      update: {},
      create: {
        date: ts,
        totalTvl: 12_000_000 * growthFactor * (0.95 + Math.random() * 0.1),
        volume24h: 4_500_000 * (0.7 + Math.random() * 0.6),
        totalVolume: 150_000_000 * growthFactor,
        fees24h: 13_500 * (0.7 + Math.random() * 0.6),
        totalFees: 450_000 * growthFactor,
        marketCount: 8,
        correlatedMarketCount: 5,
        activeLPs: Math.floor(240 * growthFactor),
      },
    });
  }

  await prisma.$disconnect();
  console.log('✅ Database seeded successfully!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
