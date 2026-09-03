'use client';

import { useEffect, useState, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useHaydenStore } from '@/lib/store';
import { Wallet, ChevronDown, Check, LogOut, Sparkles } from 'lucide-react';

export function WalletButton() {
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isConnected, address } = useAccount();
  const { isDemoConnected, connectDemoWallet, disconnectDemoWallet } = useHaydenStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div
        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold"
        style={{
          backgroundColor: 'var(--nexora-surface-2)',
          border: '1px solid var(--nexora-border)',
          color: 'var(--nexora-text-muted)',
        }}
      >
        Connect Wallet
      </div>
    );
  }

  // Case 1: Real Web3 wallet is connected via Wagmi / RainbowKit
  if (isConnected) {
    return (
      <ConnectButton
        accountStatus="address"
        chainStatus="icon"
        showBalance={false}
      />
    );
  }

  // Case 2: Demo Wallet is active
  if (isDemoConnected) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all"
          style={{
            backgroundColor: 'rgba(0, 212, 170, 0.1)',
            border: '1px solid rgba(0, 212, 170, 0.3)',
            color: 'var(--nexora-green)',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>0x742d...44e8 (Demo)</span>
          <ChevronDown size={12} />
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 mt-2 w-56 rounded-xl p-3 shadow-2xl z-50 text-xs"
            style={{
              backgroundColor: 'var(--nexora-surface)',
              border: '1px solid var(--nexora-border)',
            }}
          >
            <div className="pb-2 border-b mb-2" style={{ borderColor: 'var(--nexora-border)' }}>
              <div className="font-semibold text-xs" style={{ color: 'var(--nexora-text)' }}>
                Demo Research Wallet
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--nexora-text-muted)' }}>
                Full sandbox trading with preloaded testnet balances
              </div>
            </div>

            <button
              onClick={() => {
                disconnectDemoWallet();
                setDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-nexora-surface-2 transition-colors text-left"
              style={{ color: 'var(--nexora-red)' }}
            >
              <span>Disconnect Demo Wallet</span>
              <LogOut size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Case 3: Not connected - RainbowKit ConnectButton with custom styling & Demo option
  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={openConnectModal}
            className="btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold"
          >
            <Wallet size={13} />
            <span>Connect Wallet</span>
          </button>

          <button
            onClick={connectDemoWallet}
            title="Use preloaded demo sandbox wallet without MetaMask"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: 'rgba(79, 142, 247, 0.08)',
              color: 'var(--nexora-blue)',
              border: '1px solid rgba(79, 142, 247, 0.25)',
            }}
          >
            <Sparkles size={11} />
            <span>Demo Mode</span>
          </button>
        </div>
      )}
    </ConnectButton.Custom>
  );
}
