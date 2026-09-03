'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Pool, Asset, CorrelationResult } from '@nexora/shared';
import { getMarkets, buildAssets, getCorrelation } from '@nexora/sdk';
import { suggestFeeTier, estimateLpRisk } from '@nexora/sdk';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { PoolTypeBadge, CorrelationBadge, RiskBadge } from '@/components/ui/Badges';
import { TokenSelectModal } from '@/components/ui/TokenSelectModal';
import { KpiRow } from '@/components/ui/KpiCard';
import { formatUSD } from '@/lib/utils';
import { useAccount } from 'wagmi';
import { WalletButton } from '@/components/layout/WalletButton';
import { TrendingUp, AlertTriangle } from 'lucide-react';

export default function CreatePoolPage() {
  const { isConnected } = useAccount();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [asset0, setAsset0] = useState<Asset | undefined>();
  const [asset1, setAsset1] = useState<Asset | undefined>();
  const [correlation, setCorrelation] = useState<CorrelationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');

  useEffect(() => {
    const all = buildAssets();
    setAssets(all);
    setAsset0(all.find(a => a.symbol === 'nNVDA'));
    setAsset1(all.find(a => a.symbol === 'nSPY'));
  }, []);

  useEffect(() => {
    if (!asset0 || !asset1 || asset0.symbol === asset1.symbol) return;
    setLoading(true);
    getCorrelation(asset0.symbol, asset1.symbol)
      .then(setCorrelation)
      .catch(() => setCorrelation(null))
      .finally(() => setLoading(false));
  }, [asset0, asset1]);

  const feeTier = correlation ? suggestFeeTier(correlation.correlation) : null;
  const riskLevel = correlation ? estimateLpRisk(Math.abs(correlation.correlation)) : null;

  const poolType = correlation
    ? (Math.abs(correlation.correlation) >= 0.75 ? 'CORRELATED' : 'BRIDGE')
    : null;

  const totalValueUSD =
    (parseFloat(amount0 || '0') * (asset0?.currentPrice ?? 0)) +
    (parseFloat(amount1 || '0') * (asset1?.currentPrice ?? 0));

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--nexora-text)' }}>Create Pool</h1>
          <p className="text-sm" style={{ color: 'var(--nexora-text-muted)' }}>
            Create a new correlated-pair liquidity pool.
          </p>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
        >
          <div className="p-6 space-y-6">
            {/* Asset selection */}
            <div>
              <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--nexora-text-subtle)' }}>
                Select Asset Pair
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: 'var(--nexora-text-muted)' }}>Asset A</label>
                  <TokenSelectModal
                    assets={assets}
                    selected={asset0}
                    onSelect={setAsset0}
                    excludeSymbol={asset1?.symbol}
                  />
                </div>
                <div className="text-lg font-bold mt-5" style={{ color: 'var(--nexora-text-subtle)' }}>/</div>
                <div className="flex-1">
                  <label className="text-xs mb-1 block" style={{ color: 'var(--nexora-text-muted)' }}>Asset B</label>
                  <TokenSelectModal
                    assets={assets}
                    selected={asset1}
                    onSelect={setAsset1}
                    excludeSymbol={asset0?.symbol}
                  />
                </div>
              </div>
            </div>

            <div className="nx-divider" />

            {/* Correlation analysis */}
            {asset0 && asset1 && (
              <div>
                <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--nexora-text-subtle)' }}>
                  Correlation Analysis
                </h2>

                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-8 rounded" />)}
                  </div>
                ) : correlation ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* Big correlation number */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--nexora-surface-2)' }}>
                      <div>
                        <div
                          className="text-5xl font-bold font-mono"
                          style={{ color: Math.abs(correlation.correlation) >= 0.75 ? 'var(--nexora-green)' : Math.abs(correlation.correlation) >= 0.5 ? 'var(--nexora-amber)' : 'var(--nexora-red)' }}
                        >
                          {(Math.abs(correlation.correlation) * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--nexora-text-muted)' }}>
                          90-day correlation · {correlation.dataPoints} data points
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: 'var(--nexora-text-muted)' }}>Classification</span>
                          <CorrelationBadge classification={correlation.classification} />
                        </div>
                        {poolType && (
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: 'var(--nexora-text-muted)' }}>Pool Type</span>
                            <PoolTypeBadge type={poolType as any} />
                          </div>
                        )}
                        {feeTier && (
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: 'var(--nexora-text-muted)' }}>Suggested Fee</span>
                            <span className="font-mono font-semibold text-xs" style={{ color: 'var(--nexora-text)' }}>
                              {feeTier.label}
                            </span>
                          </div>
                        )}
                        {riskLevel && (
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: 'var(--nexora-text-muted)' }}>LP Risk</span>
                            <RiskBadge risk={riskLevel as any} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Correlation bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--nexora-text-subtle)' }}>
                        <span>-1.0 (Inverse)</span>
                        <span>0 (Uncorrelated)</span>
                        <span>+1.0 (Perfect)</span>
                      </div>
                      <div className="relative h-2 rounded-full" style={{ backgroundColor: 'var(--nexora-surface-2)' }}>
                        <div
                          className="absolute h-2 rounded-full transition-all"
                          style={{
                            left: '50%',
                            width: `${Math.abs(correlation.correlation) * 50}%`,
                            transform: correlation.correlation >= 0 ? 'none' : 'translateX(-100%)',
                            backgroundColor: Math.abs(correlation.correlation) >= 0.75 ? 'var(--nexora-green)' : Math.abs(correlation.correlation) >= 0.5 ? 'var(--nexora-amber)' : 'var(--nexora-red)',
                          }}
                        />
                        {/* Marker */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-all"
                          style={{
                            left: `${(correlation.correlation + 1) / 2 * 100}%`,
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: 'var(--nexora-text)',
                            borderColor: 'var(--nexora-bg)',
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-sm text-center py-4" style={{ color: 'var(--nexora-text-muted)' }}>
                    Calculating correlation...
                  </div>
                )}
              </div>
            )}

            {asset0 && asset1 && (
              <>
                <div className="nx-divider" />

                {/* Initial liquidity */}
                <div>
                  <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--nexora-text-subtle)' }}>
                    Initial Liquidity
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--nexora-text-muted)' }}>
                        {asset0.symbol} Amount
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount0}
                        onChange={e => {
                          setAmount0(e.target.value);
                          if (e.target.value && asset1.currentPrice > 0) {
                            setAmount1(((parseFloat(e.target.value) * asset0.currentPrice) / asset1.currentPrice).toFixed(6));
                          }
                        }}
                        className="nx-input w-full px-3 py-2.5 text-sm font-mono"
                      />
                      <div className="text-xs mt-1 text-right" style={{ color: 'var(--nexora-text-subtle)' }}>
                        ≈ ${(parseFloat(amount0 || '0') * asset0.currentPrice).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--nexora-text-muted)' }}>
                        {asset1.symbol} Amount
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount1}
                        onChange={e => setAmount1(e.target.value)}
                        className="nx-input w-full px-3 py-2.5 text-sm font-mono"
                      />
                      <div className="text-xs mt-1 text-right" style={{ color: 'var(--nexora-text-subtle)' }}>
                        ≈ ${(parseFloat(amount1 || '0') * asset1.currentPrice).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {totalValueUSD > 0 && (
                    <div className="mt-3 px-3 py-2 rounded-lg text-xs font-mono" style={{ backgroundColor: 'var(--nexora-surface-2)' }}>
                      <span style={{ color: 'var(--nexora-text-muted)' }}>Total deposit value: </span>
                      <span style={{ color: 'var(--nexora-text)' }}>{formatUSD(totalValueUSD)}</span>
                    </div>
                  )}
                </div>

                {/* Warning */}
                {correlation && Math.abs(correlation.correlation) < 0.5 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgba(242,87,87,0.08)', border: '1px solid rgba(242,87,87,0.25)' }}>
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--nexora-red)' }} />
                    <span style={{ color: 'var(--nexora-red)' }}>
                      Low correlation ({(Math.abs(correlation.correlation) * 100).toFixed(0)}%). This pair has high relative volatility and LP positions may experience significant impermanent loss.
                    </span>
                  </div>
                )}

                {isConnected ? (
                  <button
                    disabled={!amount0 || !amount1 || parseFloat(amount0) === 0}
                    className="btn-primary w-full py-4 text-sm"
                  >
                    Create Pool & Add Liquidity
                  </button>
                ) : (
                  <WalletButton />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
