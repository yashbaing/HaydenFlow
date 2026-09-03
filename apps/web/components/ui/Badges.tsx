'use client';

import type { PoolType, CorrelationClassification, RiskLevel } from '@nexora/shared';
import { getPoolTypeColor, getCorrelationColor, getRiskColor } from '@/lib/utils';

interface PoolTypeBadgeProps {
  type: PoolType;
}

export function PoolTypeBadge({ type }: PoolTypeBadgeProps) {
  const color = getPoolTypeColor(type);
  const labels: Record<PoolType, string> = {
    CORRELATED: 'CORRELATED',
    BRIDGE: 'BRIDGE',
    STABLE: 'STABLE',
  };
  return (
    <span
      className="badge"
      style={{
        backgroundColor: `${color}18`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {labels[type]}
    </span>
  );
}

interface CorrelationBadgeProps {
  classification: CorrelationClassification;
  value?: number;
}

export function CorrelationBadge({ classification, value }: CorrelationBadgeProps) {
  const color = getCorrelationColor(classification);
  return (
    <span
      className="badge"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {value != null ? `${(value * 100).toFixed(0)}%` : classification}
    </span>
  );
}

interface RiskBadgeProps {
  risk: RiskLevel;
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  const color = getRiskColor(risk);
  const labels: Record<RiskLevel, string> = {
    VERY_LOW: 'Very Low',
    LOW: 'Low',
    MODERATE: 'Moderate',
    HIGH: 'High',
    VERY_HIGH: 'Very High',
  };
  return (
    <span
      className="badge"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {labels[risk]}
    </span>
  );
}

interface AssetTypeBadgeProps {
  type: string;
}

export function AssetTypeBadge({ type }: AssetTypeBadgeProps) {
  const colors: Record<string, string> = {
    STOCK: '#4F8EF7',
    ETF: '#00D4AA',
    CRYPTO: '#F5A623',
    COMMODITY: '#FFD700',
    STABLECOIN: '#9B6DFF',
  };
  const color = colors[type] ?? '#8892a4';
  return (
    <span
      className="badge"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {type}
    </span>
  );
}
