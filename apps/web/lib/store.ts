'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Pool, Asset } from '@nexora/shared';

export interface LpPosition {
  id: string;
  poolId: string;
  token0Symbol: string;
  token1Symbol: string;
  amount0: number;
  amount1: number;
  depositedUsd: number;
  currentValueUsd: number;
  earnedFeesUsd: number;
  apr: number;
  sharePercent: number;
  createdAt: string;
}

export interface UserTx {
  id: string;
  hash: string;
  type: 'SWAP' | 'ADD_LIQUIDITY' | 'REMOVE_LIQUIDITY' | 'CREATE_POOL';
  description: string;
  timestamp: string;
  status: 'confirmed' | 'pending';
}

const DEFAULT_BALANCES: Record<string, number> = {
  USDC: 10000.0,
  nNVDA: 15.0,
  nSPY: 8.0,
  nQQQ: 6.0,
  nAMZN: 10.0,
  nTSLA: 12.0,
  WETH: 2.5,
};

const DEFAULT_LP_POSITIONS: LpPosition[] = [
  {
    id: 'lp-nvda-spy',
    poolId: 'nNVDA-nSPY',
    token0Symbol: 'nNVDA',
    token1Symbol: 'nSPY',
    amount0: 1.42,
    amount1: 2.31,
    depositedUsd: 2500,
    currentValueUsd: 2584.20,
    earnedFeesUsd: 42.15,
    apr: 24.2,
    sharePercent: 0.08,
    createdAt: '2024-03-01T10:00:00.000Z',
  },
  {
    id: 'lp-qqq-spy',
    poolId: 'nQQQ-nSPY',
    token0Symbol: 'nQQQ',
    token1Symbol: 'nSPY',
    amount0: 3.12,
    amount1: 2.77,
    depositedUsd: 3000,
    currentValueUsd: 3051.40,
    earnedFeesUsd: 31.80,
    apr: 18.7,
    sharePercent: 0.05,
    createdAt: '2024-03-02T14:30:00.000Z',
  },
];

// In-memory subscribers for immediate reactivity across components
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(l => l());
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function useHaydenStore() {
  const [balances, setBalances] = useState<Record<string, number>>(() =>
    loadFromStorage('hayden_balances', DEFAULT_BALANCES)
  );
  const [lpPositions, setLpPositions] = useState<LpPosition[]>(() =>
    loadFromStorage('hayden_lp_positions', DEFAULT_LP_POSITIONS)
  );
  const [customPools, setCustomPools] = useState<Pool[]>(() =>
    loadFromStorage('hayden_custom_pools', [])
  );
  const [transactions, setTransactions] = useState<UserTx[]>(() =>
    loadFromStorage('hayden_txs', [
      {
        id: 'tx-seed-1',
        hash: '0x3f7a8b1c4e9d02847a9e1c3b5f7d2a4e6c8b0d1e3f5a7c9b1d3e5f7a9b1c3d5',
        type: 'SWAP',
        description: 'Swapped 1,000 USDC → 1.14 nNVDA',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'confirmed',
      },
    ])
  );

  // Sync state when other components update
  useEffect(() => {
    const handleUpdate = () => {
      setBalances(loadFromStorage('hayden_balances', DEFAULT_BALANCES));
      setLpPositions(loadFromStorage('hayden_lp_positions', DEFAULT_LP_POSITIONS));
      setCustomPools(loadFromStorage('hayden_custom_pools', []));
      setTransactions(loadFromStorage('hayden_txs', []));
    };

    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const getBalance = useCallback(
    (symbol: string): number => {
      return balances[symbol] ?? 0;
    },
    [balances]
  );

  const executeSwap = useCallback(
    (tokenIn: string, amountIn: number, tokenOut: string, amountOut: number, txHash?: string) => {
      const current = loadFromStorage('hayden_balances', DEFAULT_BALANCES);
      const newBalances = { ...current };

      newBalances[tokenIn] = Math.max(0, (newBalances[tokenIn] ?? 0) - amountIn);
      newBalances[tokenOut] = (newBalances[tokenOut] ?? 0) + amountOut;

      saveToStorage('hayden_balances', newBalances);

      const hash = txHash || '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const newTx: UserTx = {
        id: 'tx-' + Date.now(),
        hash,
        type: 'SWAP',
        description: `Swapped ${amountIn.toFixed(4)} ${tokenIn} → ${amountOut.toFixed(4)} ${tokenOut}`,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
      };

      const currentTxs = loadFromStorage<UserTx[]>('hayden_txs', []);
      const updatedTxs = [newTx, ...currentTxs].slice(0, 30);
      saveToStorage('hayden_txs', updatedTxs);

      notify();
      return hash;
    },
    []
  );

  const addLiquidity = useCallback(
    (poolId: string, sym0: string, amt0: number, sym1: string, amt1: number, apr: number, totalUsd: number) => {
      const current = loadFromStorage('hayden_balances', DEFAULT_BALANCES);
      const newBalances = { ...current };

      newBalances[sym0] = Math.max(0, (newBalances[sym0] ?? 0) - amt0);
      newBalances[sym1] = Math.max(0, (newBalances[sym1] ?? 0) - amt1);

      saveToStorage('hayden_balances', newBalances);

      const currentPositions = loadFromStorage<LpPosition[]>('hayden_lp_positions', DEFAULT_LP_POSITIONS);
      const existing = currentPositions.find(p => p.poolId === poolId);

      let updatedPositions: LpPosition[];
      if (existing) {
        updatedPositions = currentPositions.map(p =>
          p.poolId === poolId
            ? {
                ...p,
                amount0: p.amount0 + amt0,
                amount1: p.amount1 + amt1,
                depositedUsd: p.depositedUsd + totalUsd,
                currentValueUsd: p.currentValueUsd + totalUsd,
              }
            : p
        );
      } else {
        const newPos: LpPosition = {
          id: 'lp-' + Date.now(),
          poolId,
          token0Symbol: sym0,
          token1Symbol: sym1,
          amount0: amt0,
          amount1: amt1,
          depositedUsd: totalUsd,
          currentValueUsd: totalUsd,
          earnedFeesUsd: 0,
          apr,
          sharePercent: 0.04,
          createdAt: new Date().toISOString(),
        };
        updatedPositions = [newPos, ...currentPositions];
      }

      saveToStorage('hayden_lp_positions', updatedPositions);

      const hash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const newTx: UserTx = {
        id: 'tx-' + Date.now(),
        hash,
        type: 'ADD_LIQUIDITY',
        description: `Added liquidity to ${sym0}/${sym1} ($${totalUsd.toFixed(2)})`,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
      };

      const currentTxs = loadFromStorage<UserTx[]>('hayden_txs', []);
      saveToStorage('hayden_txs', [newTx, ...currentTxs].slice(0, 30));

      notify();
      return hash;
    },
    []
  );

  const createPool = useCallback(
    (pool: Pool, depositAmt0: number, depositAmt1: number, totalUsd: number) => {
      // Deduct deposit amounts
      const current = loadFromStorage('hayden_balances', DEFAULT_BALANCES);
      const newBalances = { ...current };
      newBalances[pool.token0.symbol] = Math.max(0, (newBalances[pool.token0.symbol] ?? 0) - depositAmt0);
      newBalances[pool.token1.symbol] = Math.max(0, (newBalances[pool.token1.symbol] ?? 0) - depositAmt1);
      saveToStorage('hayden_balances', newBalances);

      // Save custom pool
      const currentPools = loadFromStorage<Pool[]>('hayden_custom_pools', []);
      const updatedPools = [pool, ...currentPools];
      saveToStorage('hayden_custom_pools', updatedPools);

      // Add LP position for creator
      const currentPositions = loadFromStorage<LpPosition[]>('hayden_lp_positions', DEFAULT_LP_POSITIONS);
      const newPos: LpPosition = {
        id: 'lp-creator-' + Date.now(),
        poolId: pool.id,
        token0Symbol: pool.token0.symbol,
        token1Symbol: pool.token1.symbol,
        amount0: depositAmt0,
        amount1: depositAmt1,
        depositedUsd: totalUsd,
        currentValueUsd: totalUsd,
        earnedFeesUsd: 0,
        apr: pool.apr,
        sharePercent: 100.0,
        createdAt: new Date().toISOString(),
      };
      saveToStorage('hayden_lp_positions', [newPos, ...currentPositions]);

      const hash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const newTx: UserTx = {
        id: 'tx-' + Date.now(),
        hash,
        type: 'CREATE_POOL',
        description: `Created pool ${pool.token0.symbol}/${pool.token1.symbol} ($${totalUsd.toFixed(2)})`,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
      };

      const currentTxs = loadFromStorage<UserTx[]>('hayden_txs', []);
      saveToStorage('hayden_txs', [newTx, ...currentTxs].slice(0, 30));

      notify();
      return hash;
    },
    []
  );

  const resetBalances = useCallback(() => {
    saveToStorage('hayden_balances', DEFAULT_BALANCES);
    saveToStorage('hayden_lp_positions', DEFAULT_LP_POSITIONS);
    saveToStorage('hayden_custom_pools', []);
    notify();
  }, []);

  return {
    balances,
    lpPositions,
    customPools,
    transactions,
    getBalance,
    executeSwap,
    addLiquidity,
    createPool,
    resetBalances,
  };
}
