'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Asset } from '@nexora/shared';
import { parseTokenAmount } from '@/lib/utils';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { TokenSelectModal } from '@/components/ui/TokenSelectModal';

interface SwapInputProps {
  label: 'Pay' | 'Receive';
  assets: Asset[];
  selectedAsset?: Asset;
  onAssetChange: (asset: Asset) => void;
  value: string;
  onValueChange?: (value: string) => void;
  readOnly?: boolean;
  usdValue?: number;
  walletBalance?: bigint;
  excludeSymbol?: string;
}

export function SwapInput({
  label,
  assets,
  selectedAsset,
  onAssetChange,
  value,
  onValueChange,
  readOnly = false,
  usdValue,
  walletBalance,
  excludeSymbol,
}: SwapInputProps) {
  const handleMax = () => {
    if (!walletBalance || !selectedAsset || !onValueChange) return;
    const formatted = Number(walletBalance) / (10 ** selectedAsset.decimals);
    onValueChange(formatted.toFixed(6));
  };

  const balanceFormatted = walletBalance && selectedAsset
    ? (Number(walletBalance) / (10 ** selectedAsset.decimals)).toFixed(4)
    : null;

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        backgroundColor: 'var(--nexora-surface-2)',
        border: '1px solid var(--nexora-border)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--nexora-text-subtle)' }}>
          {label}
        </span>
        {balanceFormatted != null && (
          <button
            onClick={handleMax}
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: 'var(--nexora-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--nexora-blue)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--nexora-text-muted)')}
          >
            Balance: <span className="font-mono">{balanceFormatted}</span>
            {!readOnly && <span className="ml-1 text-nexora-blue font-semibold">MAX</span>}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <TokenSelectModal
          assets={assets}
          selected={selectedAsset}
          onSelect={onAssetChange}
          excludeSymbol={excludeSymbol}
          label="Select token"
        />

        <div className="flex-1 relative">
          <input
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={value}
            onChange={e => onValueChange?.(e.target.value)}
            readOnly={readOnly}
            className="w-full text-right text-2xl font-mono font-bold bg-transparent focus:outline-none"
            style={{
              color: value ? 'var(--nexora-text)' : 'var(--nexora-text-subtle)',
              caretColor: 'var(--nexora-blue)',
            }}
          />
        </div>
      </div>

      {usdValue != null && usdValue > 0 && (
        <div className="flex justify-end mt-2">
          <span className="text-xs font-mono" style={{ color: 'var(--nexora-text-muted)' }}>
            ≈ ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}
