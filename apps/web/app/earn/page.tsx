'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Pool, Asset } from '@nexora/shared';
import { getMarkets, buildAssets } from '@nexora/sdk';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { PoolTypeBadge, CorrelationBadge, RiskBadge } from '@/components/ui/Badges';
import { KpiRow } from '@/components/ui/KpiCard';
import { formatUSD } from '@/lib/utils';
import { useAccount } from 'wagmi';
import { WalletButton } from '@/components/layout/WalletButton';
import { TransactionStatus } from '@/components/ui/TransactionStatus';
import { TrendingUp, Shield, Wallet, CheckCircle } from 'lucide-react';
import { useHaydenStore } from '@/lib/store';
import type { TxState } from '@nexora/shared';

interface PoolOpportunity {
  pool: Pool;
  reason: string;
  estimatedApr: number;
  correlationScore?: number;
  relevantAssets: string[];
}

function EarnContent() {
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const { getBalance, addLiquidity } = useHaydenStore();

  const [pools, setPools] = useState<Pool[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [opportunities, setOpportunities] = useState<PoolOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [addLiquidityPool, setAddLiquidityPool] = useState<Pool | null>(null);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [txState, setTxState] = useState<TxState>({ status: 'idle' });

  useEffect(() => {
    Promise.all([getMarkets(), Promise.resolve(buildAssets())]).then(([m, a]) => {
      setPools(m);
      setAssets(a);

      // Check pool search param
      const poolParam = searchParams.get('pool');
      if (poolParam) {
        const found = m.find(p => p.id === poolParam || `${p.token0.symbol}-${p.token1.symbol}`.toLowerCase() === poolParam.toLowerCase());
        if (found) setAddLiquidityPool(found);
      }

      const opps: PoolOpportunity[] = [];
      for (const pool of m) {
        const sym0 = pool.token0.symbol;
        const sym1 = pool.token1.symbol;
        const bal0 = getBalance(sym0);
        const bal1 = getBalance(sym1);

        if (bal0 > 0 || bal1 > 0 || pool.poolType === 'CORRELATED') {
          opps.push({
            pool,
            reason: bal0 > 0 && bal1 > 0
              ? `You hold both ${sym0} and ${sym1}. Natural correlation reduces relative volatility and impermanent loss.`
              : `Pair your ${bal0 > 0 ? sym0 : sym1} with ${bal0 > 0 ? sym1 : sym0} for consistent LP fee capture.`,
            estimatedApr: pool.apr,
            correlationScore: pool.correlation,
            relevantAssets: [sym0, sym1],
          });
        }
      }

      setOpportunities(opps.sort((a, b) => b.estimatedApr - a.estimatedApr));
      setLoading(false);
    });
  }, [searchParams, getBalance]);

  const bal0 = addLiquidityPool ? getBalance(addLiquidityPool.token0.symbol) : 0;
  const bal1 = addLiquidityPool ? getBalance(addLiquidityPool.token1.symbol) : 0;

  const totalValueUSD = addLiquidityPool
    ? (parseFloat(amount0 || '0') * addLiquidityPool.token0.currentPrice) +
      (parseFloat(amount1 || '0') * addLiquidityPool.token1.currentPrice)
    : 0;

  const isInsufficient =
    parseFloat(amount0 || '0') > bal0 || parseFloat(amount1 || '0') > bal1;

  const handleConfirmLiquidity = () => {
    if (!addLiquidityPool || !amount0 || !amount1 || isInsufficient) return;

    setTxState({ status: 'awaiting_wallet' });

    const hash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    setTimeout(() => {
      setTxState({ status: 'pending', hash });
    }, 800);

    setTimeout(() => {
      addLiquidity(
        addLiquidityPool.id,
        addLiquidityPool.token0.symbol,
        parseFloat(amount0),
        addLiquidityPool.token1.symbol,
        parseFloat(amount1),
        addLiquidityPool.apr,
        totalValueUSD
      );
      setTxState({ status: 'confirmed', hash });
      setAmount0('');
      setAmount1('');
      setAddLiquidityPool(null);
    }, 2200);
  };

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--nexora-text)' }}>Earn</h1>
          <p className="text-sm" style={{ color: 'var(--nexora-text-muted)' }}>
            Provide liquidity in correlated pools for lower impermanent loss risk and sustainable yield.
          </p>
        </div>

        {/* Why Correlated LPs Banner */}
        <div
          className="rounded-xl p-5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          style={{
            backgroundColor: 'rgba(79,142,247,0.06)',
            border: '1px solid rgba(79,142,247,0.2)',
          }}
        >
          <div className="flex items-center gap-3">
            <Shield size={24} style={{ color: 'var(--nexora-blue)' }} />
            <div>
              <div className="font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                Portfolio-Native Liquidity Provisioning
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--nexora-text-muted)' }}>
                Holding NVDA and SPY? Provide NVDA/SPY liquidity. Since both assets move in the same direction, relative price deviation is minimized, dramatically lowering impermanent loss.
              </div>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full font-semibold shrink-0" style={{ backgroundColor: 'rgba(0,212,170,0.1)', color: 'var(--nexora-green)' }}>
            Up to 80% Lower IL Risk
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Opportunities list */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--nexora-text-muted)' }}>
              Recommended Positions
            </h2>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
              </div>
            ) : (
              opportunities.map(opp => (
                <motion.div
                  key={opp.pool.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl p-5 transition-all hover:border-nexora-blue cursor-pointer"
                  style={{
                    backgroundColor: 'var(--nexora-surface)',
                    border: addLiquidityPool?.id === opp.pool.id
                      ? '1px solid var(--nexora-blue)'
                      : '1px solid var(--nexora-border)',
                  }}
                  onClick={() => setAddLiquidityPool(opp.pool)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center -space-x-2">
                        <AssetIcon asset={opp.pool.token0} size={28} />
                        <AssetIcon asset={opp.pool.token1} size={28} />
                      </div>
                      <div>
                        <div className="font-bold text-sm font-mono" style={{ color: 'var(--nexora-text)' }}>
                          {opp.pool.token0.symbol} / {opp.pool.token1.symbol}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--nexora-text-muted)' }}>
                          TVL: {formatUSD(opp.pool.tvl, true)} · Volume: {formatUSD(opp.pool.volume24h, true)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-base" style={{ color: 'var(--nexora-green)' }}>
                        {opp.estimatedApr.toFixed(1)}% APR
                      </div>
                      <div className="text-xs" style={{ color: 'var(--nexora-text-subtle)' }}>
                        estimated yield
                      </div>
                    </div>
                  </div>

                  <p className="text-xs mb-3" style={{ color: 'var(--nexora-text-muted)' }}>
                    {opp.reason}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--nexora-border)' }}>
                    <div className="flex items-center gap-2">
                      <PoolTypeBadge type={opp.pool.poolType} />
                      {opp.pool.correlation != null && opp.pool.correlationClassification && (
                        <CorrelationBadge classification={opp.pool.correlationClassification} value={opp.pool.correlation} />
                      )}
                      <RiskBadge risk={opp.pool.riskLevel} />
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setAddLiquidityPool(opp.pool);
                      }}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      Add Liquidity
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Add liquidity panel */}
          <div className="lg:col-span-1">
            {addLiquidityPool ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-xl fixed inset-x-4 bottom-16 sm:relative sm:inset-auto sm:top-20 z-40 sm:z-auto max-h-[80vh] overflow-y-auto shadow-2xl sm:shadow-none"
                style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
              >
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--nexora-border)' }}>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                    Add Liquidity
                  </h3>
                  <button
                    onClick={() => setAddLiquidityPool(null)}
                    className="text-xs p-1" style={{ color: 'var(--nexora-text-muted)' }}
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
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs" style={{ color: 'var(--nexora-text-muted)' }}>
                        {addLiquidityPool.token0.symbol} Amount
                      </label>
                      <button
                        onClick={() => {
                          setAmount0(bal0.toFixed(4));
                          const p0 = addLiquidityPool.token0.currentPrice;
                          const p1 = addLiquidityPool.token1.currentPrice;
                          if (p1 > 0) setAmount1(((bal0 * p0) / p1).toFixed(4));
                        }}
                        className="text-xs font-mono"
                        style={{ color: 'var(--nexora-blue)' }}
                      >
                        Bal: {bal0.toFixed(2)} (MAX)
                      </button>
                    </div>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount0}
                      onChange={e => {
                        setAmount0(e.target.value);
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
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs" style={{ color: 'var(--nexora-text-muted)' }}>
                        {addLiquidityPool.token1.symbol} Amount
                      </label>
                      <button
                        onClick={() => setAmount1(bal1.toFixed(4))}
                        className="text-xs font-mono"
                        style={{ color: 'var(--nexora-blue)' }}
                      >
                        Bal: {bal1.toFixed(2)} (MAX)
                      </button>
                    </div>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount1}
                      onChange={e => setAmount1(e.target.value)}
                      className="nx-input w-full px-3 py-2.5 text-sm font-mono"
                    />
                  </div>

                  {amount0 && amount1 && (
                    <div className="rounded-lg p-3 text-xs space-y-1.5" style={{ backgroundColor: 'var(--nexora-surface-2)' }}>
                      <KpiRow
                        label="Est. Deposit Value"
                        value={<span className="font-mono">{formatUSD(totalValueUSD)}</span>}
                      />
                      <KpiRow
                        label="Pool Share"
                        value={<span className="font-mono">~0.04%</span>}
                      />
                      <KpiRow
                        label="Estimated APR"
                        value={<span className="font-mono font-semibold" style={{ color: 'var(--nexora-green)' }}>{addLiquidityPool.apr.toFixed(1)}%</span>}
                      />
                    </div>
                  )}

                  <button
                    onClick={handleConfirmLiquidity}
                    disabled={!amount0 || !amount1 || parseFloat(amount0) <= 0 || isInsufficient}
                    className={`btn-primary w-full py-3 text-sm ${isInsufficient ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isInsufficient
                      ? 'Insufficient token balance'
                      : !amount0 || !amount1
                      ? 'Enter deposit amounts'
                      : 'Confirm & Add Liquidity'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div
                className="rounded-xl p-6 text-center"
                style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
              >
                <Wallet size={32} className="mx-auto mb-3" style={{ color: 'var(--nexora-text-subtle)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--nexora-text)' }}>
                  Select a Pool
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--nexora-text-muted)' }}>
                  Click any market opportunity to deposit paired liquidity and earn trading fees.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <TransactionStatus state={txState} onDismiss={() => setTxState({ status: 'idle' })} />
    </div>
  );
}

export default function EarnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen py-10 px-4 text-center text-sm text-nexora-muted">Loading earn opportunities...</div>}>
      <EarnContent />
    </Suspense>
  );
}
