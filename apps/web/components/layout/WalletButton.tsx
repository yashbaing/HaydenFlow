'use client';

import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="px-4 py-2 rounded-lg text-xs font-semibold"
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

  return (
    <ConnectButton
      accountStatus="avatar"
      chainStatus="icon"
      showBalance={false}
    />
  );
}
