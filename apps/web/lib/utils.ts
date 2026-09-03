import type { Asset, PoolType, CorrelationClassification, RiskLevel } from '@nexora/shared';

// ====== Formatting ======

export function formatUSD(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals = 4): string {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.0001) return value.toExponential(4);
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function formatCorrelation(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatTokenAmount(amount: bigint, decimals: number, displayDecimals = 4): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const frac = amount % divisor;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, displayDecimals);
  return `${whole}.${fracStr}`;
}

export function formatAddress(address: string, chars = 6): string {
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// ====== Color Helpers ======

export function getPoolTypeColor(type: PoolType): string {
  switch (type) {
    case 'CORRELATED': return 'var(--nexora-blue)';
    case 'BRIDGE': return 'var(--nexora-green)';
    case 'STABLE': return 'var(--nexora-amber)';
  }
}

export function getCorrelationColor(classification: CorrelationClassification): string {
  switch (classification) {
    case 'EXTREME': return '#7eb3ff';
    case 'HIGH': return 'var(--nexora-green)';
    case 'MODERATE': return 'var(--nexora-amber)';
    case 'LOW': return 'var(--nexora-red)';
  }
}

export function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case 'VERY_LOW': return 'var(--nexora-green)';
    case 'LOW': return '#7eb3ff';
    case 'MODERATE': return 'var(--nexora-amber)';
    case 'HIGH': return 'var(--nexora-red)';
    case 'VERY_HIGH': return '#cc2222';
  }
}

export function getAssetTypeColor(type: string): string {
  switch (type) {
    case 'STOCK': return '#4F8EF7';
    case 'ETF': return '#00D4AA';
    case 'CRYPTO': return '#F5A623';
    case 'COMMODITY': return '#FFD700';
    case 'STABLECOIN': return '#7B68EE';
    default: return '#8892a4';
  }
}

export function getPriceChangeColor(change: number): string {
  return change >= 0 ? 'var(--nexora-green)' : 'var(--nexora-red)';
}

// ====== Asset Helpers ======

export function getAssetInitials(symbol: string): string {
  return symbol.replace('n', '').slice(0, 2).toUpperCase();
}

// ====== Calculation Helpers ======

export function parseTokenAmount(value: string, decimals: number): bigint {
  if (!value || value === '0') return 0n;
  const [whole, frac = ''] = value.split('.');
  const fracPadded = frac.slice(0, decimals).padEnd(decimals, '0');
  return BigInt(whole ?? '0') * BigInt(10 ** decimals) + BigInt(fracPadded);
}

export function calcMinReceived(amount: bigint, slippageBps: number): bigint {
  return (amount * BigInt(10000 - slippageBps)) / 10000n;
}

export function calcPriceImpactSeverity(impactBps: number): 'low' | 'medium' | 'high' | 'critical' {
  if (impactBps < 50) return 'low';
  if (impactBps < 200) return 'medium';
  if (impactBps < 500) return 'high';
  return 'critical';
}

export function getPriceImpactColor(impactBps: number): string {
  const severity = calcPriceImpactSeverity(impactBps);
  switch (severity) {
    case 'low': return 'var(--nexora-green)';
    case 'medium': return 'var(--nexora-amber)';
    case 'high': return 'var(--nexora-red)';
    case 'critical': return '#cc0000';
  }
}
