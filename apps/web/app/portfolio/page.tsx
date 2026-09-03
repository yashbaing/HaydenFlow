'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Pool, Asset } from '@nexora/shared';
import { getMarkets, buildAssets, getPortfolio } from '@nexora/sdk';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { AssetTypeBadge, RiskBadge, PoolTypeBadge, CorrelationBadge } from '@/components/ui/Badges';
import { KpiCard } from '@/components/ui/KpiCard';
import { formatUSD, formatPercent, getPriceChangeColor } from '@/lib/utils';
import { useAccount } from 'wagmi';
import { WalletButton } from '@/components/layout/WalletButton';
import { Wallet, TrendingUp } from 'lucide-react';
import Link from 'next/link';

const MOCK_PORTFOLIO = {
  totalValueUsd: 18_725.40,
  tokenBalances: [
    { symbol: 'USDC',  balance: 5000,   price: 1.00,    change: 0.01,   assetType: 'STABLECOIN', color: '#2775CA' },
    { symbol: 'nNVDA', balance: 5,       price: 875.40,  change: 2.14,   assetType: 'STOCK',      color: '#76B900' },
    { symbol: 'nSPY',  balance: 3,       price: 540.25,  change: 0.73,   assetType: 'ETF',        color: '#F5A623' },
    { symbol: 'nQQQ',  balance: 2,       price: 480.75,  change: 0.88,   assetType: 'ETF',        color: '#7B68EE' },
    { symbol: 'WETH',  balance: 1,       price: 3250.00, change: 1.44,   assetType: 'CRYPTO',     color: '#627EEA' },
  ],
};

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarkets().then(m => { setPools(m); setLoading(false); });
  }, []);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Wallet size={48} className="mx-auto mb-4" style={{ color: 'var(--nexora-text-subtle)' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--nexora-text)' }}>Connect your wallet</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--nexora-text-muted)' }}>
            Connect your wallet to view your portfolio and liquidity positions.
          </p>
          <WalletButton />
        </div>
      </div>
    );
  }

  // Calculate asset exposure
  const totalValue = MOCK_PORTFOLIO.tokenBalances.reduce((s, b) => s + b.balance * b.price, 0);
  const assetTypeMap = new Map<string, number>();
  for (const b of MOCK_PORTFOLIO.tokenBalances) {
    const val = b.balance * b.price;
    assetTypeMap.set(b.assetType, (assetTypeMap.get(b.assetType) ?? 0) + val);
  }

  // Opportunities
  const heldSymbols = new Set(MOCK_PORTFOLIO.tokenBalances.map(b => b.symbol));
  const opportunities = pools.filter(p => heldSymbols.has(p.token0.symbol) || heldSymbols.has(p.token1.symbol));

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--nexora-text)' }}>Portfolio</h1>
          <p className="text-xs font-mono" style={{ color: 'var(--nexora-text-subtle)' }}>
            {address?.slice(0, 10)}...{address?.slice(-6)}
          </p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard title="Wallet Value" value={formatUSD(totalValue, false)} loading={loading} />
          <KpiCard title="Holdings" value={`${MOCK_PORTFOLIO.tokenBalances.length} assets`} loading={loading} />
          <KpiCard title="LP Positions" value="0" loading={loading} />
          <KpiCard title="Fees Earned" value="$0.00" loading={loading} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Token balances */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: 'var(--nexora-text-muted)' }}>
              Token Balances
            </h2>
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
            >
              <table className="nx-table w-full">
                <thead>
                  <tr>
                    {['Asset', 'Balance', 'Price', '24h', 'Value', 'Type'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexora-text-subtle)', backgroundColor: 'var(--nexora-surface)', borderBottom: '1px solid var(--nexora-border)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: 'var(--nexora-surface)' }}>
                  {MOCK_PORTFOLIO.tokenBalances.map((tok, i) => (
                    <motion.tr
                      key={tok.symbol}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                            style={{ backgroundColor: tok.color + '22', color: tok.color, border: `1.5px solid ${tok.color}55`, fontFamily: 'var(--font-mono)' }}
                          >
                            {tok.symbol.replace('n', '').slice(0, 2)}
                          </div>
                          <span className="font-mono font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                            {tok.symbol}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm" style={{ color: 'var(--nexora-text)' }}>
                          {tok.balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm" style={{ color: 'var(--nexora-text)' }}>
                          ${tok.price.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs" style={{ color: getPriceChangeColor(tok.change) }}>
                          {formatPercent(tok.change)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold" style={{ color: 'var(--nexora-text)' }}>
                          {formatUSD(tok.balance * tok.price, true)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <AssetTypeBadge type={tok.assetType} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Opportunities */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} style={{ color: 'var(--nexora-blue)' }} />
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--nexora-text-muted)' }}>
                  Liquidity Opportunities From Your Holdings
                </h2>
              </div>
              <div className="space-y-3">
                {loading
                  ? [1, 2].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)
                  : opportunities.slice(0, 4).map(pool => {
                    const holds0 = heldSymbols.has(pool.token0.symbol);
                    const holds1 = heldSymbols.has(pool.token1.symbol);
                    return (
                      <div
                        key={pool.id}
                        className="rounded-xl p-4 flex items-center justify-between"
                        style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono border-2"
                              style={{ backgroundColor: pool.token0.logoColor + '22', color: pool.token0.logoColor, borderColor: 'var(--nexora-surface)' }}
                            >
                              {pool.token0.symbol.replace('n', '').slice(0, 2)}
                            </div>
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono border-2"
                              style={{ backgroundColor: pool.token1.logoColor + '22', color: pool.token1.logoColor, borderColor: 'var(--nexora-surface)' }}
                            >
                              {pool.token1.symbol.replace('n', '').slice(0, 2)}
                            </div>
                          </div>
                          <div>
                            <div className="font-mono font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                              {pool.token0.symbol}/{pool.token1.symbol}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--nexora-text-muted)' }}>
                              {holds0 && holds1
                                ? 'You hold both assets'
                                : `You hold ${holds0 ? pool.token0.symbol : pool.token1.symbol}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {pool.correlation != null && pool.correlationClassification && (
                            <CorrelationBadge classification={pool.correlationClassification} value={pool.correlation} />
                          )}
                          <div className="text-right">
                            <div className="font-mono font-bold text-sm" style={{ color: 'var(--nexora-green)' }}>
                              {pool.apr.toFixed(1)}%
                            </div>
                            <div className="text-xs" style={{ color: 'var(--nexora-text-subtle)' }}>APR</div>
                          </div>
                          <Link href="/earn" className="btn-ghost text-xs px-3 py-1.5">
                            Add →
                          </Link>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>

          {/* Asset exposure */}
          <div>
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: 'var(--nexora-text-muted)' }}>
              Asset Exposure
            </h2>
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
            >
              <div className="space-y-3">
                {Array.from(assetTypeMap.entries()).map(([type, value]) => {
                  const pct = (value / totalValue) * 100;
                  const typeColors: Record<string, string> = {
                    STOCK: '#4F8EF7',
                    ETF: '#00D4AA',
                    CRYPTO: '#F5A623',
                    STABLECOIN: '#9B6DFF',
                    COMMODITY: '#FFD700',
                  };
                  const color = typeColors[type] ?? '#8892a4';
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span style={{ color: 'var(--nexora-text-muted)' }}>{type}</span>
                        <span className="font-mono" style={{ color: 'var(--nexora-text)' }}>
                          {pct.toFixed(1)}% · {formatUSD(value, true)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--nexora-surface-2)' }}>
                        <motion.div
                          className="h-1.5 rounded-full"
                          style={{ backgroundColor: color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
