'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Filter } from 'lucide-react';
import type { Pool, PoolType } from '@nexora/shared';
import { getMarkets } from '@nexora/sdk';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { PoolTypeBadge, CorrelationBadge, RiskBadge } from '@/components/ui/Badges';
import { formatUSD, formatPercent } from '@/lib/utils';
import Link from 'next/link';

type SortKey = 'tvl' | 'volume24h' | 'apr' | 'fees24h' | 'correlation';
type SortDir = 'asc' | 'desc';

const FILTER_TABS = [
  { key: 'ALL',        label: 'All' },
  { key: 'STOCK',      label: 'Stocks' },
  { key: 'ETF',        label: 'ETFs' },
  { key: 'CRYPTO',     label: 'Crypto' },
  { key: 'CORRELATED', label: 'Correlated' },
  { key: 'BRIDGE',     label: 'Bridge' },
];

function PoolRow({ pool }: { pool: Pool }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group cursor-pointer"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <AssetIcon asset={pool.token0} size={28} />
            <AssetIcon asset={pool.token1} size={28} />
          </div>
          <div>
            <div className="font-mono font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
              {pool.token0.symbol}/{pool.token1.symbol}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--nexora-text-muted)' }}>
              {pool.feeBps / 100}% fee
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><PoolTypeBadge type={pool.poolType} /></td>
      <td className="px-4 py-3">
        {pool.correlation != null && pool.correlationClassification ? (
          <div className="flex items-center gap-2">
            <CorrelationBadge classification={pool.correlationClassification} value={pool.correlation} />
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--nexora-text-subtle)' }}>—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm" style={{ color: 'var(--nexora-text)' }}>
          {formatUSD(pool.tvl, true)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm" style={{ color: 'var(--nexora-text)' }}>
          {formatUSD(pool.volume24h, true)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm" style={{ color: 'var(--nexora-text)' }}>
          {formatUSD(pool.fees24h, true)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm font-semibold" style={{ color: 'var(--nexora-green)' }}>
          {pool.apr.toFixed(1)}%
        </span>
      </td>
      <td className="px-4 py-3"><RiskBadge risk={pool.riskLevel} /></td>
    </motion.tr>
  );
}

export default function MarketsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('tvl');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    getMarkets().then(m => { setPools(m); setLoading(false); });
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = pools.filter(p => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'CORRELATED') return p.poolType === 'CORRELATED';
    if (activeFilter === 'BRIDGE') return p.poolType === 'BRIDGE';
    return p.token0.assetType === activeFilter || p.token1.assetType === activeFilter;
  });

  const sorted = [...filtered].sort((a, b) => {
    const mult = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'correlation') {
      return ((a.correlation ?? -1) - (b.correlation ?? -1)) * mult;
    }
    return ((a[sortKey] as number) - (b[sortKey] as number)) * mult;
  });

  const SortHeader = ({ label, sKey }: { label: string; sKey: SortKey }) => (
    <th className="nx-table th" onClick={() => handleSort(sKey)} style={{ cursor: 'pointer' }}>
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sKey && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
      </div>
    </th>
  );

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--nexora-text)' }}>Markets</h1>
            <p className="text-sm" style={{ color: 'var(--nexora-text-muted)' }}>
              {pools.length} liquidity pools · {pools.filter(p => p.poolType === 'CORRELATED').length} correlated
            </p>
          </div>
          <Link href="/markets/network" className="btn-ghost flex items-center gap-2 text-sm">
            Network Graph →
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`tab-btn shrink-0 ${activeFilter === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--nexora-border)' }}
        >
          <div className="overflow-x-auto">
            <table className="nx-table w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexora-text-subtle)', backgroundColor: 'var(--nexora-surface)', borderBottom: '1px solid var(--nexora-border)' }}>
                    Pair
                  </th>
                  {[
                    { l: 'Type', k: null },
                    { l: 'Correlation', k: 'correlation' as SortKey },
                    { l: 'TVL', k: 'tvl' as SortKey },
                    { l: '24H Volume', k: 'volume24h' as SortKey },
                    { l: '24H Fees', k: 'fees24h' as SortKey },
                    { l: 'APR', k: 'apr' as SortKey },
                    { l: 'Risk', k: null },
                  ].map(({ l, k }) => (
                    <th
                      key={l}
                      onClick={k ? () => handleSort(k) : undefined}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{
                        color: sortKey === k ? 'var(--nexora-blue)' : 'var(--nexora-text-subtle)',
                        backgroundColor: 'var(--nexora-surface)',
                        borderBottom: '1px solid var(--nexora-border)',
                        cursor: k ? 'pointer' : 'default',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {l}
                        {k && sortKey === k && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: 'var(--nexora-surface)' }}>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="skeleton h-4 rounded" style={{ width: j === 0 ? 120 : 60 }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : sorted.map(pool => <PoolRow key={pool.id} pool={pool} />)
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary row */}
        {!loading && (
          <div
            className="mt-4 px-4 py-3 rounded-lg text-xs flex items-center gap-6 font-mono"
            style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)', color: 'var(--nexora-text-muted)' }}
          >
            <span>Total TVL: <span style={{ color: 'var(--nexora-text)' }}>{formatUSD(sorted.reduce((s, p) => s + p.tvl, 0), true)}</span></span>
            <span>24h Vol: <span style={{ color: 'var(--nexora-text)' }}>{formatUSD(sorted.reduce((s, p) => s + p.volume24h, 0), true)}</span></span>
            <span>Showing: <span style={{ color: 'var(--nexora-text)' }}>{sorted.length} pools</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
