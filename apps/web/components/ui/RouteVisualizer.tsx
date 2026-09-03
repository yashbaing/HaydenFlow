'use client';

import { motion } from 'framer-motion';
import { ArrowDown, Info } from 'lucide-react';
import type { Route, Asset } from '@nexora/shared';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { PoolTypeBadge } from '@/components/ui/Badges';
import { formatUSD, formatBps, getPriceImpactColor } from '@/lib/utils';

interface RouteVisualizerProps {
  route: Route;
  isSelected?: boolean;
  showDetails?: boolean;
}

export function RouteVisualizer({ route, isSelected = false, showDetails = true }: RouteVisualizerProps) {
  return (
    <div
      className="rounded-lg p-4 transition-all"
      style={{
        background: isSelected ? 'rgba(79, 142, 247, 0.05)' : 'var(--nexora-surface)',
        border: `1px solid ${isSelected ? 'rgba(79,142,247,0.4)' : 'var(--nexora-border)'}`,
      }}
    >
      {/* Path visualization */}
      <div className="flex items-center gap-2 flex-wrap">
        {route.path.map((asset, idx) => (
          <div key={asset.symbol} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <AssetIcon asset={asset} size={24} />
              <span className="font-mono text-sm font-medium" style={{ color: 'var(--nexora-text)' }}>
                {asset.symbol}
              </span>
            </div>
            {idx < route.path.length - 1 && (
              <div className="flex items-center gap-1">
                <div className="w-6 h-px" style={{ backgroundColor: 'var(--nexora-border-2)' }} />
                <div className="flex flex-col items-center">
                  <ArrowDown size={10} style={{ color: 'var(--nexora-text-subtle)', transform: 'rotate(-90deg)' }} />
                </div>
                <div className="w-6 h-px" style={{ backgroundColor: 'var(--nexora-border-2)' }} />
              </div>
            )}
          </div>
        ))}
        {isSelected && (
          <span
            className="ml-auto px-2 py-0.5 rounded text-xs font-semibold"
            style={{ backgroundColor: 'rgba(79,142,247,0.15)', color: 'var(--nexora-blue)' }}
          >
            BEST
          </span>
        )}
      </div>

      {/* Hop details */}
      {showDetails && route.hops.length > 0 && (
        <div className="mt-3 space-y-2">
          {route.hops.map((hop, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between text-xs px-3 py-2 rounded"
              style={{ backgroundColor: 'var(--nexora-surface-2)' }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--nexora-text-muted)' }}>
                  {hop.tokenIn.symbol} → {hop.tokenOut.symbol}
                </span>
                <PoolTypeBadge type={hop.pool.poolType} />
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span style={{ color: 'var(--nexora-text-subtle)' }}>
                  Fee: {formatBps(hop.pool.feeBps)}
                </span>
                <span style={{ color: getPriceImpactColor(hop.priceImpact) }}>
                  Impact: {(hop.priceImpact / 100).toFixed(3)}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Score + explanation */}
      {showDetails && (
        <div className="mt-3 flex items-start gap-2 text-xs" style={{ color: 'var(--nexora-text-muted)' }}>
          <Info size={12} className="mt-0.5 shrink-0" />
          <span>{route.explanation}</span>
        </div>
      )}
    </div>
  );
}

interface RoutePathDisplayProps {
  path: Asset[];
  compact?: boolean;
}

export function RoutePathDisplay({ path, compact = false }: RoutePathDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      {path.map((asset, idx) => (
        <div key={asset.symbol} className="flex flex-col items-center">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm font-semibold`}
            style={{
              backgroundColor: 'var(--nexora-surface-2)',
              border: '1px solid var(--nexora-border)',
              color: 'var(--nexora-text)',
            }}
          >
            <AssetIcon asset={asset} size={compact ? 18 : 22} />
            {asset.symbol}
          </div>
          {idx < path.length - 1 && (
            <div className="flex flex-col items-center my-1">
              <div className="w-px h-3" style={{ backgroundColor: 'var(--nexora-border-2)' }} />
              <ArrowDown size={12} style={{ color: 'var(--nexora-text-subtle)' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
