'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import type { Asset } from '@nexora/shared';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { AssetTypeBadge } from '@/components/ui/Badges';
import { formatUSD, formatPercent, getPriceChangeColor } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TokenSelectModalProps {
  assets: Asset[];
  selected?: Asset;
  onSelect: (asset: Asset) => void;
  excludeSymbol?: string;
  label?: string;
}

export function TokenSelectModal({
  assets,
  selected,
  onSelect,
  excludeSymbol,
  label = 'Select token',
}: TokenSelectModalProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = assets.filter(a => {
    if (a.symbol === excludeSymbol) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
    else setQuery('');
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80"
        style={{
          backgroundColor: 'var(--nexora-surface-2)',
          border: '1px solid var(--nexora-border)',
        }}
      >
        {selected ? (
          <>
            <AssetIcon asset={selected} size={22} />
            <span className="font-mono font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
              {selected.symbol}
            </span>
          </>
        ) : (
          <span className="text-sm" style={{ color: 'var(--nexora-text-muted)' }}>
            {label}
          </span>
        )}
        <ChevronDown size={14} style={{ color: 'var(--nexora-text-subtle)' }} />
      </button>

      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--nexora-border)' }}>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                  Select Token
                </h3>
                <button onClick={() => setOpen(false)}>
                  <X size={16} style={{ color: 'var(--nexora-text-muted)' }} />
                </button>
              </div>

              {/* Search */}
              <div className="p-3 border-b" style={{ borderColor: 'var(--nexora-border)' }}>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--nexora-text-subtle)' }} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search tokens..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="nx-input w-full text-sm pl-8 pr-3 py-2"
                  />
                </div>
              </div>

              {/* Token list */}
              <div className="max-h-80 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="p-6 text-center text-sm" style={{ color: 'var(--nexora-text-muted)' }}>
                    No tokens found
                  </div>
                ) : (
                  filtered.map(asset => (
                    <button
                      key={asset.symbol}
                      onClick={() => { onSelect(asset); setOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                      style={{
                        backgroundColor: selected?.symbol === asset.symbol ? 'var(--nexora-surface-2)' : 'transparent',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--nexora-surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = selected?.symbol === asset.symbol ? 'var(--nexora-surface-2)' : 'transparent')}
                    >
                      <AssetIcon asset={asset} size={32} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                            {asset.symbol}
                          </span>
                          <AssetTypeBadge type={asset.assetType} />
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--nexora-text-muted)' }}>
                          {asset.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm" style={{ color: 'var(--nexora-text)' }}>
                          ${asset.currentPrice.toLocaleString()}
                        </div>
                        <div
                          className="text-xs font-mono"
                          style={{ color: getPriceChangeColor(asset.priceChange24h) }}
                        >
                          {formatPercent(asset.priceChange24h)}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
