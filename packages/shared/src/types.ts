// ==============================
// NEXORA Shared Types & Interfaces
// ==============================

export type AssetType = 'STOCK' | 'ETF' | 'CRYPTO' | 'COMMODITY' | 'STABLECOIN';
export type PoolType = 'CORRELATED' | 'BRIDGE' | 'STABLE';
export type RiskLevel = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type CorrelationClassification = 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';

// ====== Asset ======

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  sector: string;
  tokenAddress: string;
  decimals: number;
  benchmarkSymbol?: string;
  isBridgeAsset: boolean;
  logoColor: string; // hex color for icon fallback
  currentPrice: number; // USD
  priceChange24h: number; // percentage
  marketCap?: number;
}

// ====== Pool ======

export interface Pool {
  id: string;
  poolId: string; // bytes32 on-chain
  token0: Asset;
  token1: Asset;
  poolType: PoolType;
  correlation?: number; // 0-1
  correlationClassification?: CorrelationClassification;
  feeBps: number;
  tvl: number; // USD
  volume24h: number;
  volume7d: number;
  fees24h: number;
  apr: number; // percentage
  riskLevel: RiskLevel;
  reserve0: bigint;
  reserve1: bigint;
  totalLpTokens: bigint;
  active?: boolean;
  createdAt: Date;
}

// ====== Route ======

export interface RouteHop {
  tokenIn: Asset;
  tokenOut: Asset;
  pool: Pool;
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number; // basis points
}

export interface Route {
  path: Asset[];
  hops: RouteHop[];
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number; // total bps
  gasEstimate: bigint;
  score: number; // composite score 0-100
  explanation: string;
}

// ====== Quote ======

export interface Quote {
  tokenIn: Asset;
  tokenOut: Asset;
  amountIn: bigint;
  bestRoute: Route;
  alternativeRoutes: Route[];
  expectedOutput: bigint;
  priceImpact: number;
  gasEstimate: bigint;
  minimumReceived: bigint; // after slippage
  estimatedSavings?: number; // USD savings vs direct route
  liquidityUsed: number; // USD
  executionPrice: number;
  midPrice: number;
}

// ====== Correlation ======

export interface CorrelationResult {
  assetA: string;
  assetB: string;
  correlation: number;
  classification: CorrelationClassification;
  dataPoints: number;
  periodDays: number;
  calculatedAt: Date;
}

// ====== LP Position ======

export interface LPPosition {
  id: string;
  positionId: string; // bytes32 on-chain
  pool: Pool;
  owner: string;
  lpTokens: bigint;
  token0Amount: number; // current USD value
  token1Amount: number;
  totalValueUsd: number;
  feesEarned0: bigint;
  feesEarned1: bigint;
  feesEarnedUsd: number;
  unrealizedPnl: number;
  aprEstimate: number;
  createdAt: Date;
  lastUpdatedAt: Date;
}

// ====== Portfolio ======

export interface TokenBalance {
  asset: Asset;
  balance: bigint;
  balanceFormatted: number;
  valueUsd: number;
}

export interface Portfolio {
  address: string;
  totalValueUsd: number;
  tokenBalances: TokenBalance[];
  lpPositions: LPPosition[];
  totalFeesEarnedUsd: number;
  assetExposure: { assetType: AssetType; percentage: number }[];
  opportunities: PoolOpportunity[];
}

export interface PoolOpportunity {
  pool: Pool;
  reason: string;
  estimatedApr: number;
  riskLevel: RiskLevel;
  relevantAssets: Asset[];
  correlationScore?: number;
}

// ====== Analytics ======

export interface ProtocolStats {
  totalTvl: number;
  volume24h: number;
  totalVolume: number;
  fees24h: number;
  totalFees: number;
  marketCount: number;
  correlatedMarketCount: number;
  bridgeLiquidity: number;
  activeLPs: number;
  correlatedVolumePercentage: number;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface AnalyticsData {
  stats: ProtocolStats;
  tvlHistory: TimeSeriesPoint[];
  volumeHistory: TimeSeriesPoint[];
  correlatedVsBridgeVolume: TimeSeriesPoint[];
  topPools: Pool[];
  routingDistribution: { label: string; value: number; percentage: number }[];
}

// ====== Price History ======

export interface PricePoint {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// ====== Network Graph ======

export interface GraphNode {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  tvl: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  poolType: PoolType;
  correlation?: number;
  volume: number;
  tvl: number;
  poolId: string;
}

export interface LiquidityGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ====== Transaction ======

export type TxStatus = 'idle' | 'awaiting_wallet' | 'pending' | 'confirmed' | 'failed';

export interface TxState {
  status: TxStatus;
  hash?: string;
  error?: string;
  confirmations?: number;
}
