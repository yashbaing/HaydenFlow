'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, ArrowUpDown, Info, ChevronDown, ChevronUp, Zap, RotateCcw } from 'lucide-react';
import type { Asset, Route, TxState } from '@nexora/shared';
import { buildAssets, getMarkets } from '@nexora/sdk';
import { findRoutes, selectBestRoute } from '@nexora/sdk';
import { SwapInput } from '@/components/ui/SwapInput';
import { RouteVisualizer } from '@/components/ui/RouteVisualizer';
import { TransactionStatus } from '@/components/ui/TransactionStatus';
import { KpiRow } from '@/components/ui/KpiCard';
import {
  formatUSD, formatBps, formatTokenAmount, getPriceImpactColor, calcMinReceived
} from '@/lib/utils';
import { SLIPPAGE_PRESETS } from '@nexora/shared';
import { useHaydenStore } from '@/lib/store';

const SLIPPAGE_OPTIONS = [0.1, 0.5, 1.0, 2.0];

function TradeContent() {
  const searchParams = useSearchParams();
  const { getBalance, executeSwap, resetBalances } = useHaydenStore();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [tokenIn, setTokenIn] = useState<Asset | undefined>();
  const [tokenOut, setTokenOut] = useState<Asset | undefined>();
  const [amountIn, setAmountIn] = useState('');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [bestRoute, setBestRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [slippageBps, setSlippageBps] = useState(50);
  const [showSlippage, setShowSlippage] = useState(false);
  const [showAltRoutes, setShowAltRoutes] = useState(false);
  const [txState, setTxState] = useState<TxState>({ status: 'idle' });

  useEffect(() => {
    const allAssets = buildAssets();
    setAssets(allAssets);

    const inParam = searchParams.get('in');
    const outParam = searchParams.get('out');

    const defaultIn = (inParam && allAssets.find(a => a.symbol.toLowerCase() === inParam.toLowerCase())) ||
      allAssets.find(a => a.symbol === 'USDC');
    const defaultOut = (outParam && allAssets.find(a => a.symbol.toLowerCase() === outParam.toLowerCase())) ||
      allAssets.find(a => a.symbol === 'nNVDA');

    setTokenIn(defaultIn);
    setTokenOut(defaultOut);
  }, [searchParams]);

  const discoverRoutes = useCallback(async () => {
    if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) === 0) {
      setRoutes([]);
      setBestRoute(null);
      return;
    }
    setLoading(true);
    try {
      const pools = await getMarkets();
      const amountBigInt = BigInt(Math.floor(parseFloat(amountIn) * 10 ** tokenIn.decimals));
      const discovered = findRoutes(tokenIn, tokenOut, amountBigInt, pools, { maxHops: 3, slippageBps });
      setRoutes(discovered);
      setBestRoute(selectBestRoute(discovered));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [tokenIn, tokenOut, amountIn, slippageBps]);

  useEffect(() => {
    const timeout = setTimeout(discoverRoutes, 300);
    return () => clearTimeout(timeout);
  }, [discoverRoutes]);

  const handleSwapAssets = () => {
    const prev = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(prev);
    setAmountIn('');
  };

  const currentBalance = tokenIn ? getBalance(tokenIn.symbol) : 0;
  const isInsufficientBalance = parseFloat(amountIn || '0') > currentBalance;

  const handleSwap = async () => {
    if (!bestRoute || !tokenIn || !tokenOut || isInsufficientBalance) return;

    setTxState({ status: 'awaiting_wallet' });

    try {
      // Execute via backend swap simulation API
      let txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      try {
        const res = await fetch('/api/swap/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenIn: tokenIn.symbol,
            tokenOut: tokenOut.symbol,
            amountIn: BigInt(Math.floor(parseFloat(amountIn) * 10 ** tokenIn.decimals)).toString(),
            slippageBps,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.txHash) txHash = data.txHash;
        }
      } catch {
        // Fallback to local cryptographic hash if offline
      }

      setTxState({ status: 'pending', hash: txHash });

      // Realistic transaction mining time
      setTimeout(() => {
        const outAmount = Number(bestRoute.amountOut) / 10 ** tokenOut.decimals;
        executeSwap(tokenIn.symbol, parseFloat(amountIn), tokenOut.symbol, outAmount, txHash);
        setTxState({ status: 'confirmed', hash: txHash });
        setAmountIn('');
      }, 1200);
    } catch (err: any) {
      setTxState({ status: 'failed', error: err.message || 'Swap failed' });
    }
  };

  const usdValueIn = tokenIn && amountIn ? parseFloat(amountIn) * tokenIn.currentPrice : 0;
  const expectedOutput = bestRoute ? Number(bestRoute.amountOut) / 10 ** (tokenOut?.decimals ?? 18) : 0;
  const minReceived = bestRoute
    ? Number(calcMinReceived(bestRoute.amountOut, slippageBps)) / 10 ** (tokenOut?.decimals ?? 18)
    : 0;
  const altRoutes = routes.slice(1, 4);

  const walletBalanceBigInt = tokenIn
    ? BigInt(Math.floor(currentBalance * 10 ** tokenIn.decimals))
    : undefined;

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--nexora-text)' }}>Swap</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--nexora-text-muted)' }}>
              Capital-efficient routing across correlated asset pools
            </p>
          </div>
          <button
            onClick={resetBalances}
            title="Reset test balances to default"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'var(--nexora-surface-2)',
              color: 'var(--nexora-text-muted)',
              border: '1px solid var(--nexora-border)',
            }}
          >
            <RotateCcw size={12} />
            <span>Reset Demo Balances</span>
          </button>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* === LEFT: Swap Panel === */}
          <div className="lg:col-span-2">
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--nexora-border)' }}>
                <h2 className="font-semibold text-base" style={{ color: 'var(--nexora-text)' }}>Trade Form</h2>
                <button onClick={() => setShowSlippage(!showSlippage)} className="p-2 rounded-lg transition-colors hover:bg-nexora-surface-2">
                  <Settings2 size={16} style={{ color: 'var(--nexora-text-muted)' }} />
                </button>
              </div>

              {/* Slippage Settings */}
              <AnimatePresence>
                {showSlippage && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--nexora-border)', backgroundColor: 'var(--nexora-surface-2)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium" style={{ color: 'var(--nexora-text-muted)' }}>Slippage Tolerance</span>
                        <span className="text-xs font-mono" style={{ color: 'var(--nexora-blue)' }}>{(slippageBps / 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex gap-2">
                        {SLIPPAGE_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setSlippageBps(opt * 100)}
                            className="flex-1 py-1 text-xs rounded font-mono transition-colors"
                            style={{
                              backgroundColor: slippageBps === opt * 100 ? 'var(--nexora-blue)' : 'var(--nexora-surface)',
                              color: slippageBps === opt * 100 ? 'white' : 'var(--nexora-text-muted)',
                              border: '1px solid var(--nexora-border)',
                            }}
                          >
                            {opt}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-5 space-y-3">
                {/* Pay */}
                <SwapInput
                  label="Pay"
                  assets={assets}
                  selectedAsset={tokenIn}
                  onAssetChange={setTokenIn}
                  value={amountIn}
                  onValueChange={setAmountIn}
                  usdValue={usdValueIn}
                  walletBalance={walletBalanceBigInt}
                  excludeSymbol={tokenOut?.symbol}
                />

                {/* Flip */}
                <div className="flex justify-center">
                  <button
                    onClick={handleSwapAssets}
                    className="p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95"
                    style={{ backgroundColor: 'var(--nexora-surface-2)', border: '1px solid var(--nexora-border)' }}
                  >
                    <ArrowUpDown size={16} style={{ color: 'var(--nexora-text-muted)' }} />
                  </button>
                </div>

                {/* Receive */}
                <SwapInput
                  label="Receive"
                  assets={assets}
                  selectedAsset={tokenOut}
                  onAssetChange={setTokenOut}
                  value={loading ? '' : expectedOutput > 0 ? expectedOutput.toFixed(6) : ''}
                  readOnly
                  usdValue={expectedOutput * (tokenOut?.currentPrice ?? 0)}
                  excludeSymbol={tokenIn?.symbol}
                />

                {/* Trade details */}
                {bestRoute && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-lg px-4 py-1"
                    style={{ backgroundColor: 'var(--nexora-surface-2)' }}
                  >
                    <KpiRow label="Price Impact" value={
                      <span style={{ color: getPriceImpactColor(bestRoute.priceImpact) }}>
                        {(bestRoute.priceImpact / 100).toFixed(3)}%
                      </span>
                    } />
                    <KpiRow label="Network Fee" value={
                      <span className="font-mono">${(Number(bestRoute.gasEstimate) / 1e14 * 3250).toFixed(2)}</span>
                    } />
                    <KpiRow label="Minimum Received" value={
                      <span className="font-mono">{minReceived.toFixed(6)} {tokenOut?.symbol}</span>
                    } />
                    <KpiRow label="Route" value={
                      <span className="text-nexora-blue font-mono">{bestRoute.path.map(a => a.symbol).join(' → ')}</span>
                    } />
                  </motion.div>
                )}

                {/* Swap button */}
                <button
                  onClick={handleSwap}
                  disabled={!bestRoute || loading || isInsufficientBalance}
                  className={`btn-primary w-full py-4 text-base ${isInsufficientBalance ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading
                    ? 'Finding best route...'
                    : !tokenIn || !tokenOut
                    ? 'Select tokens'
                    : !amountIn
                    ? 'Enter amount'
                    : isInsufficientBalance
                    ? `Insufficient ${tokenIn.symbol} balance`
                    : !bestRoute
                    ? 'No route found'
                    : `Swap ${tokenIn.symbol} → ${tokenOut?.symbol}`}
                </button>
              </div>
            </div>
          </div>

          {/* === RIGHT: Route Panel === */}
          <div className="lg:col-span-3 space-y-4">
            {/* Best route card */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--nexora-border)' }}>
                <div className="flex items-center gap-2">
                  <Zap size={16} style={{ color: 'var(--nexora-blue)' }} />
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>Smart Route</h3>
                </div>
                {bestRoute && (
                  <span
                    className="text-xs px-2 py-0.5 rounded font-mono"
                    style={{ backgroundColor: 'rgba(79,142,247,0.1)', color: 'var(--nexora-blue)' }}
                  >
                    Score: {bestRoute.score.toFixed(0)}/100
                  </span>
                )}
              </div>

              <div className="p-5">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => <div key={i} className="skeleton h-16 rounded-lg" />)}
                  </div>
                ) : bestRoute ? (
                  <RouteVisualizer route={bestRoute} isSelected showDetails />
                ) : (
                  <div className="py-10 text-center text-sm" style={{ color: 'var(--nexora-text-muted)' }}>
                    Enter an amount to discover the optimal correlated route
                  </div>
                )}
              </div>
            </div>

            {/* Why this route */}
            {bestRoute && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-5"
                style={{
                  backgroundColor: 'rgba(79,142,247,0.04)',
                  border: '1px solid rgba(79,142,247,0.2)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Info size={14} style={{ color: 'var(--nexora-blue)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexora-blue)' }}>
                    Why this route?
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--nexora-text-muted)' }}>
                  {bestRoute.explanation}
                </p>
              </motion.div>
            )}

            {/* Alternative routes */}
            {altRoutes.length > 0 && (
              <div
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
              >
                <button
                  onClick={() => setShowAltRoutes(!showAltRoutes)}
                  className="w-full flex items-center justify-between px-5 py-4"
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--nexora-text-muted)' }}>
                    {altRoutes.length} alternative route{altRoutes.length > 1 ? 's' : ''} found
                  </span>
                  {showAltRoutes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <AnimatePresence>
                  {showAltRoutes && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-3">
                        {altRoutes.map((route, i) => (
                          <RouteVisualizer key={i} route={route} showDetails={false} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      <TransactionStatus state={txState} onDismiss={() => setTxState({ status: 'idle' })} />
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="min-h-screen py-10 px-4 text-center text-sm text-nexora-muted">Loading trade terminal...</div>}>
      <TradeContent />
    </Suspense>
  );
}
