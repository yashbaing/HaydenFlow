'use client';

import type { Asset } from '@nexora/shared';
import { getAssetInitials, getAssetTypeColor } from '@/lib/utils';

interface AssetIconProps {
  asset: Asset;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AssetIcon({ asset, size = 32, className = '', style }: AssetIconProps) {
  const initials = getAssetInitials(asset.symbol);
  const bgColor = asset.logoColor ?? getAssetTypeColor(asset.assetType);

  return (
    <div
      className={`flex items-center justify-center font-bold shrink-0 rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        backgroundColor: bgColor + '22',
        border: `1.5px solid ${bgColor}55`,
        color: bgColor,
        fontFamily: 'var(--font-mono)',
        ...style,
      }}
      title={asset.name}
    >
      {initials}
    </div>
  );
}

interface AssetPairIconProps {
  token0: Asset;
  token1: Asset;
  size?: number;
}

export function AssetPairIcon({ token0, token1, size = 28 }: AssetPairIconProps) {
  return (
    <div className="relative flex items-center" style={{ width: size * 1.5, height: size }}>
      <AssetIcon asset={token0} size={size} />
      <AssetIcon
        asset={token1}
        size={size}
        className="absolute"
        style={{ left: size * 0.6 } as any}
      />
    </div>
  );
}

interface SymbolBadgeProps {
  symbol: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SymbolBadge({ symbol, size = 'md' }: SymbolBadgeProps) {
  const sizes = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  return (
    <span
      className={`${sizes[size]} rounded font-mono font-semibold`}
      style={{ backgroundColor: 'var(--nexora-surface-2)', color: 'var(--nexora-text)', border: '1px solid var(--nexora-border)' }}
    >
      {symbol}
    </span>
  );
}
