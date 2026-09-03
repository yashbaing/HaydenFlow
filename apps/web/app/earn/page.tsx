'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Pool, Asset } from '@nexora/shared';
import { getMarkets, buildAssets } from '@nexora/sdk';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { PoolTypeBadge, CorrelationBadge, RiskBadge } from '@/components/ui/Badges';
import { KpiRow } from '@/components/ui/KpiCard';
import { formatUSD } from '@/lib/utils';
import { useAccount } from 'wagmi';
import { WalletButton } from '@/components/layout/WalletButton';
import { TrendingUp, Shield, Wallet } from 'lucide-react';

interface PoolOpportunity {
  pool: Pool;
  reason: string;
  estimatedApr: number;
  correlationScore?: number;
  relevantAssets: string[];
}

const MOCK_BALANCES: Record<string, number> = {
  nNVDA: 5.0,
  nSPY: 3.0,
  nQQQ: 2.0,
  WETH: 1.0,
  USDC: 5000,
};

export default function EarnPage() {
  const { address, isConnected } = useAccount();
  const [pools, setPools] = useState<Pool[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [opportunities, setOpportunities] = useState<PoolOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [addLiquidityPool, setAddLiquidityPool] = useState<Pool | null>(null);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');

  useEffect(() => {
    Promise.all([getMarkets(), Promise.resolve(buildAssets())]).then(([m, a]) => {
      setPools(m);
      setAssets(a);

      const heldSymbols = new Set(Object.keys(MOCK_BALANCES));
      const opps: PoolOpportunity[] = [];

      for (const pool of m) {
        const sym0 = pool.token0.symbol;
        const sym1 = pool.token1.symbol;
        const holds0 = heldSymbols.has(sym0);
        const holds1 = heldSymbols.has(sym1);
        if (!holds0 && !holds1) continue;

        opps.push({
          pool,
          reason: holds0 && holds1
            ? `You hold both ${sym0} and ${sym1}. Their historical correlation reduces relative inventory volatility, making this an efficient LP position.`
            : `You hold ${holds0 ? sym0 : sym1} and can pair it with the correlated ${holds0 ? sym1 : sym0} for lower impermanent loss risk.`,
          estimatedApr: pool.apr,
          correlationScore: pool.correlation,
          relevantAssets: [sym0, sym1].filter(s => heldSymbols.has(s)),
        });
      }

      setOpportunities(opps.sort((a, b) => b.estimatedApr - a.estimatedApr));
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--nexora-text)' }}>Earn</h1>
            <p className="text-sm" style={{ color: 'var(--nexora-text-muted)' }}>
              Provide correlated-pair liquidity and earn market-making fees.
            </p>
          </div>
          {!isConnected && <WalletButton />}
        </div>

        {/* Holdings summary (mock) */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8"
          >
            {Object.entries(MOCK_BALANCES).map(([sym, bal]) => {
              const asset = assets.find(a => a.symbol === sym);
              if (!asset) return null;
              return (
                <div
                  key={sym}
                  className="rounded-lg p-3 text-sm"
                  style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AssetIcon asset={asset} size={18} />
                    <span className="font-mono font-semibold" style={{ color: 'var(--nexora-text)' }}>{sym}</span>
                  </div>
                  <div className="font-mono text-xs" style={{ color: 'var(--nexora-text-muted)' }}>
                    {bal.toFixed(4)}
                  </div>
                  <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--nexora-green)' }}>
                    {formatUSD(bal * asset.currentPrice, true)}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Opportunities */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} style={{ color: 'var(--nexora-blue)' }} />
              <h2 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--nexora-text-muted)' }}>
                {isConnected ? 'Liquidity Opportunities From Your Holdings' : 'All Liquidity Pools'}
              </h2>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {(isConnected ? opportunities : pools.map(p => ({
                  pool: p,
                  reason: 'Supply liquidity to this pool and earn fees.',
                  estimatedApr: p.apr,
                  correlationScore: p.correlation,
                  relevantAssets: [p.token0.symbol, p.token1.symbol],
                }))).map(({ pool, reason, estimatedApr, correlationScore }) => (
                  <motion.div
                    key={pool.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden"
                    style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            <AssetIcon asset={pool.token0} size={32} />
                            <AssetIcon asset={pool.token1} size={32} />
                          </div>
                          <div>
                            <div className="font-mono font-bold" style={{ color: 'var(--nexora-text)' }}>
                              {pool.token0.symbol}/{pool.token1.symbol}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <PoolTypeBadge type={pool.poolType} />
                              {correlationScore != null && pool.correlationClassification && (
                                <CorrelationBadge
                                  classification={pool.correlationClassification}
                                  value={correlationScore}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold font-mono" style={{ color: 'var(--nexora-green)' }}>
                            {estimatedApr.toFixed(1)}%
                          </div>
                          <div className="text-xs" style={{ color: 'var(--nexora-text-muted)' }}>Est. APR</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-y" style={{ borderColor: 'var(--nexora-border)' }}>
                        <div className="text-center">
                          <div className="text-xs mb-1" style={{ color: 'var(--nexora-text-subtle)' }}>TVL</div>
                          <div className="font-mono font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                            {formatUSD(pool.tvl, true)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs mb-1" style={{ color: 'var(--nexora-text-subtle)' }}>24h Vol</div>
                          <div className="font-mono font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                            {formatUSD(pool.volume24h, true)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs mb-1" style={{ color: 'var(--nexora-text-subtle)' }}>Risk</div>
                          <RiskBadge risk={pool.riskLevel} />
                        </div>
                      </div>

                      <div
                        className="flex items-start gap-2 p-3 rounded-lg text-xs mb-4"
                        style={{ backgroundColor: 'var(--nexora-surface-2)' }}
                      >
                        <Shield size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--nexora-blue)' }} />
                        <span style={{ color: 'var(--nexora-text-muted)' }}>{reason}</span>
                      </div>

                      <button
                        onClick={() => { setAddLiquidityPool(pool); setAmount0(''); setAmount1(''); }}
                        className="btn-primary w-full py-3 text-sm"
                      >
                        Add Liquidity
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Add liquidity panel */}
          <div className="lg:col-span-1">
            {addLiquidityPool ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-xl sticky top-20"
                style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
              >
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--nexora-border)' }}>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                    Add Liquidity
                  </h3>
                  <button
                    onClick={() => setAddLiquidityPool(null)}
                    className="text-xs" style={{ color: 'var(--nexora-text-muted)' }}
                  >
                    ✕
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AssetIcon asset={addLiquidityPool.token0} size={24} />
                    <AssetIcon asset={addLiquidityPool.token1} size={24} />
                    <span className="font-mono font-bold text-sm" style={{ color: 'var(--nexora-text)' }}>
                      {addLiquidityPool.token0.symbol}/{addLiquidityPool.token1.symbol}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--nexora-text-muted)' }}>
                      {addLiquidityPool.token0.symbol} Amount
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount0}
                      onChange={e => {
                        setAmount0(e.target.value);
                        // Auto-calculate ratio
                        const p0 = addLiquidityPool.token0.currentPrice;
                        const p1 = addLiquidityPool.token1.currentPrice;
                        if (e.target.value && p1 > 0) {
                          setAmount1(((parseFloat(e.target.value) * p0) / p1).toFixed(6));
                        }
                      }}
                      className="nx-input w-full px-3 py-2.5 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--nexora-text-muted)' }}>
                      {addLiquidityPool.token1.symbol} Amount
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount1}
                      onChange={e => setAmount1(e.target.value)}
                      className="nx-input w-full px-3 py-2.5 text-sm font-mono"
                    />
                  </div>

                  {amount0 && amount1 && (
                    <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: 'var(--nexora-surface-2)' }}>
                      <KpiRow
                        label="Est. LP Tokens"
                        value={<span className="font-mono">{(Math.sqrt(parseFloat(amount0) * parseFloat(amount1))).toFixed(6)}</span>}
                      />
                      <KpiRow
                        label="Pool Share"
                        value={<span className="font-mono">~0.04%</span>}
                      />
                      <KpiRow
                        label="Estimated APR"
                        value={<span className="font-mono" style={{ color: 'var(--nexora-green)' }}>{addLiquidityPool.apr.toFixed(1)}%</span>}
                      />
                    </div>
                  )}

                  {isConnected ? (
                    <button className="btn-primary w-full py-3 text-sm">
                      Confirm & Add Liquidity
                    </button>
                  ) : (
                    <WalletButton />
                  )}
                </div>
              </motion.div>
            ) : (
              <div
                className="rounded-xl p-6 text-center"
                style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
              >
                <Wallet size={32} className="mx-auto mb-3" style={{ color: 'var(--nexora-text-subtle)' }} />
                <p className="text-sm" style={{ color: 'var(--nexora-text-muted)' }}>
                  Select a pool to add liquidity
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
