'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletButton } from './WalletButton';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart2, Layers, PieChart, Network, Plus } from 'lucide-react';

const NAV_LINKS = [
  { href: '/trade',        label: 'Trade',    icon: TrendingUp },
  { href: '/markets',     label: 'Markets',  icon: BarChart2 },
  { href: '/earn',        label: 'Earn',     icon: Layers },
  { href: '/portfolio',   label: 'Portfolio', icon: PieChart },
  { href: '/analytics',   label: 'Analytics', icon: BarChart2 },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        backgroundColor: 'rgba(8, 9, 14, 0.92)',
        backdropFilter: 'blur(16px)',
        borderColor: 'var(--nexora-border)',
      }}
    >
      <nav className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #4F8EF7, #00D4AA)' }}
          >
            N
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: 'var(--nexora-text)' }}>
            NEXORA
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className="relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{ color: isActive ? 'var(--nexora-text)' : 'var(--nexora-text-muted)' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-md"
                    style={{ backgroundColor: 'var(--nexora-surface-2)', border: '1px solid var(--nexora-border-2)' }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/markets/network"
            className="relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
            style={{ color: pathname === '/markets/network' ? 'var(--nexora-blue)' : 'var(--nexora-text-muted)' }}
          >
            <Network size={14} />
            <span>Network</span>
          </Link>
          <Link
            href="/create-pool"
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium"
            style={{ color: 'var(--nexora-green)', backgroundColor: 'rgba(0, 212, 170, 0.08)', border: '1px solid rgba(0, 212, 170, 0.2)' }}
          >
            <Plus size={13} />
            Create Pool
          </Link>
        </div>

        {/* Wallet */}
        <WalletButton />
      </nav>
    </header>
  );
}
