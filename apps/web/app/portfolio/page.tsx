'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Pool, Asset } from '@nexora/shared';
import { getMarkets, buildAssets } from '@nexora/sdk';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { AssetTypeBadge, RiskBadge, PoolTypeBadge, CorrelationBadge } from '@/components/ui/Badges';
import { KpiCard } from '@/components/ui/KpiCard';
import { formatUSD, formatPercent } from '@/lib/utils';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { WalletButton } from '@/components/layout/WalletButton';
import { Wallet, TrendingUp, Layers, History, ExternalLink, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useHaydenStore } from '@/lib/store';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const {
    balances,
    lpPositions,
    transactions,
    isDemoConnected,
    connectDemoWallet,
  } = useHaydenStore();

  const [pools, setPools] = useState<Pool[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMarkets(), Promise.resolve(buildAssets())]).then(([m, a]) => {
      setPools(m);
      setAssets(a);
      setLoading(false);
    });
  }, []);

  const isWalletActive = isConnected || isDemoConnected;

  if (!isWalletActive) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div
          className="max-w-md w-full rounded-2xl p-8 text-center shadow-2xl"
          style={{
            backgroundColor: 'var(--nexora-surface)',
            border: '1px solid var(--nexora-border)',
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              backgroundColor: 'rgba(79, 142, 247, 0.1)',
              border: '1px solid rgba(79, 142, 247, 0.25)',
              color: 'var(--nexora-blue)',
            }}
          >
            <Wallet size={32} />
          </div>

          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--nexora-text)' }}>
            Connect Your Wallet
          </h2>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--nexora-text-muted)' }}>
            Connect your Web3 wallet to manage token balances, track active LP positions, and monitor earned yield on HaydenFlow.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => openConnectModal?.()}
              className="btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] transition-transform"
            >
              <Wallet size={16} />
              Connect Web3 Wallet
            </button>

            <button
              onClick={connectDemoWallet}
              className="btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              <Sparkles size={14} style={{ color: 'var(--nexora-blue)' }} />
              <span>Explore Demo Trader Sandbox</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const effectiveAddress = isConnected
    ? address!
    : '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

  // Build live holdings from store balances and asset prices
  const holdings = assets
    .map(asset => {
      const balance = balances[asset.symbol] ?? 0;
      const valueUsd = balance * asset.currentPrice;
      return {
        asset,
        balance,
        valueUsd,
      };
    })
    .filter(h => h.balance > 0);

  const totalWalletValue = holdings.reduce((s, h) => s + h.valueUsd, 0);
  const totalLpValue = lpPositions.reduce((s, p) => s + p.currentValueUsd, 0);
  const totalEarnedFees = lpPositions.reduce((s, p) => s + p.earnedFeesUsd, 0);
  const totalPortfolioValue = totalWalletValue + totalLpValue;

  // Correlated LP opportunities based on assets currently held
  const heldSymbols = new Set(holdings.map(h => h.asset.symbol));
  const opportunities = pools.filter(
    p => heldSymbols.has(p.token0.symbol) || heldSymbols.has(p.token1.symbol)
  );

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--nexora-text)' }}>Portfolio</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: 'var(--nexora-text-subtle)' }}>
                {effectiveAddress.slice(0, 10)}...{effectiveAddress.slice(-6)}
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded font-mono font-medium"
                style={{
                  backgroundColor: isConnected ? 'rgba(0,212,170,0.1)' : 'rgba(79,142,247,0.1)',
                  color: isConnected ? 'var(--nexora-green)' : 'var(--nexora-blue)',
                }}
              >
                {isConnected ? 'Live Web3 Wallet' : 'Demo Research Account'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isConnected && (
              <div className="text-xs mr-2" style={{ color: 'var(--nexora-text-muted)' }}>
                Connect wallet for personal account:
              </div>
            )}
            <WalletButton />
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard title="Total Portfolio" value={formatUSD(totalPortfolioValue, false)} loading={loading} />
          <KpiCard title="Liquid Balance" value={formatUSD(totalWalletValue, false)} loading={loading} />
          <KpiCard title="Active LP Value" value={formatUSD(totalLpValue, false)} subtitle={`${lpPositions.length} positions`} loading={loading} />
          <KpiCard title="Fees Earned" value={formatUSD(totalEarnedFees, false)} subtitle="Accrued yield" loading={loading} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Holdings and LP positions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Token balances */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--nexora-text-muted)' }}>
                  Liquid Token Balances
                </h2>
                <Link href="/trade" className="text-xs flex items-center gap-1 font-medium" style={{ color: 'var(--nexora-blue)' }}>
                  Swap Tokens <ArrowRight size={12} />
                </Link>
              </div>

              <div
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
              >
                <div className="overflow-x-auto">
                  <table className="nx-table w-full">
                    <thead>
                      <tr>
                        {['Asset', 'Balance', 'Price', 'Value', 'Type', 'Action'].map(h => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                            style={{
                              color: 'var(--nexora-text-subtle)',
                              backgroundColor: 'var(--nexora-surface)',
                              borderBottom: '1px solid var(--nexora-border)',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody style={{ backgroundColor: 'var(--nexora-surface)' }}>
                      {holdings.map((h, i) => (
                        <motion.tr
                          key={h.asset.symbol}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <AssetIcon asset={h.asset} size={24} />
                              <div>
                                <span className="font-mono font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                                  {h.asset.symbol}
                                </span>
                                <div className="text-[11px]" style={{ color: 'var(--nexora-text-muted)' }}>
                                  {h.asset.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm" style={{ color: 'var(--nexora-text)' }}>
                              {h.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm" style={{ color: 'var(--nexora-text-muted)' }}>
                              ${h.asset.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--nexora-text)' }}>
                              {formatUSD(h.valueUsd, true)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <AssetTypeBadge type={h.asset.assetType} />
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/trade?in=${h.asset.symbol}&out=USDC`}
                              className="text-xs px-2.5 py-1 rounded font-medium transition-colors"
                              style={{
                                backgroundColor: 'rgba(79,142,247,0.1)',
                                color: 'var(--nexora-blue)',
                              }}
                            >
                              Trade
                            </Link>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Active LP Positions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--nexora-text-muted)' }}>
                  Active LP Positions ({lpPositions.length})
                </h2>
                <Link href="/earn" className="text-xs flex items-center gap-1 font-medium" style={{ color: 'var(--nexora-green)' }}>
                  Add Liquidity <ArrowRight size={12} />
                </Link>
              </div>

              {lpPositions.length === 0 ? (
                <div
                  className="rounded-xl p-8 text-center"
                  style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
                >
                  <Layers size={32} className="mx-auto mb-3" style={{ color: 'var(--nexora-text-subtle)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--nexora-text)' }}>
                    No active LP positions yet
                  </p>
                  <p className="text-xs mt-1 mb-4" style={{ color: 'var(--nexora-text-muted)' }}>
                    Provide liquidity in correlated pools to start earning fees.
                  </p>
                  <Link href="/earn" className="btn-primary text-xs px-4 py-2">
                    Explore Earn Pools
                  </Link>
                </div>
              ) : (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
                >
                  <div className="overflow-x-auto">
                    <table className="nx-table w-full">
                      <thead>
                        <tr>
                          {['Pool Pair', 'Deposited Assets', 'Current Value', 'APR', 'Fees Earned', 'Action'].map(h => (
                            <th
                              key={h}
                              className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                              style={{
                                color: 'var(--nexora-text-subtle)',
                                backgroundColor: 'var(--nexora-surface)',
                                borderBottom: '1px solid var(--nexora-border)',
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody style={{ backgroundColor: 'var(--nexora-surface)' }}>
                        {lpPositions.map(pos => (
                          <tr key={pos.id}>
                            <td className="px-4 py-3">
                              <div className="font-mono font-bold text-sm" style={{ color: 'var(--nexora-text)' }}>
                                {pos.token0Symbol} / {pos.token1Symbol}
                              </div>
                              <div className="text-[11px]" style={{ color: 'var(--nexora-text-muted)' }}>
                                Pool Share: {pos.sharePercent.toFixed(2)}%
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-mono text-xs" style={{ color: 'var(--nexora-text)' }}>
                                {pos.amount0.toFixed(2)} {pos.token0Symbol} + {pos.amount1.toFixed(2)} {pos.token1Symbol}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm font-semibold" style={{ color: 'var(--nexora-text)' }}>
                                {formatUSD(pos.currentValueUsd)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm font-semibold" style={{ color: 'var(--nexora-green)' }}>
                                {pos.apr.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm font-semibold" style={{ color: 'var(--nexora-green)' }}>
                                +{formatUSD(pos.earnedFeesUsd)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/earn?pool=${pos.poolId}`}
                                className="text-xs px-2.5 py-1 rounded font-medium transition-colors"
                                style={{
                                  backgroundColor: 'rgba(0,212,170,0.1)',
                                  color: 'var(--nexora-green)',
                                }}
                              >
                                Manage
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Transaction History & Recommended Pools */}
          <div className="space-y-6">
            {/* Recent Transactions */}
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <History size={16} style={{ color: 'var(--nexora-blue)' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                  Recent Transactions
                </h3>
              </div>

              {transactions.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'var(--nexora-text-muted)' }}>
                  No transactions yet. Execute swaps or LP deposits to see them here.
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map(tx => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-lg text-xs"
                      style={{ backgroundColor: 'var(--nexora-surface-2)' }}
                    >
                      <div className="flex items-center justify-between font-semibold mb-1" style={{ color: 'var(--nexora-text)' }}>
                        <span>{tx.type.replace('_', ' ')}</span>
                        <span className="font-mono text-[10px] opacity-75" style={{ color: 'var(--nexora-green)' }}>
                          ✓ Confirmed
                        </span>
                      </div>
                      <div className="text-[11px] mb-1.5" style={{ color: 'var(--nexora-text-muted)' }}>
                        {tx.description}
                      </div>
                      <a
                        href={`https://sepolia.arbiscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[10px]"
                        style={{ color: 'var(--nexora-blue)' }}
                      >
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)} <ExternalLink size={9} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Opportunities */}
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} style={{ color: 'var(--nexora-green)' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                  Yield Opportunities for You
                </h3>
              </div>

              <div className="space-y-3">
                {opportunities.slice(0, 3).map(pool => (
                  <div
                    key={pool.id}
                    className="rounded-lg p-3"
                    style={{ backgroundColor: 'var(--nexora-surface-2)' }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <AssetIcon asset={pool.token0} size={18} />
                        <AssetIcon asset={pool.token1} size={18} />
                        <span className="font-mono font-semibold text-xs" style={{ color: 'var(--nexora-text)' }}>
                          {pool.token0.symbol}/{pool.token1.symbol}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-xs" style={{ color: 'var(--nexora-green)' }}>
                        {pool.apr.toFixed(1)}% APR
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <PoolTypeBadge type={pool.poolType} />
                      <Link
                        href={`/earn?pool=${pool.id}`}
                        className="btn-primary text-[11px] px-2.5 py-1"
                      >
                        Deposit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
