'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletButton } from './WalletButton';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, BarChart2, Layers, PieChart, Network, Plus, Menu, X, Activity } from 'lucide-react';

const NAV_LINKS = [
  { href: '/trade',        label: 'Trade',    icon: TrendingUp },
  { href: '/markets',     label: 'Markets',  icon: BarChart2 },
  { href: '/earn',        label: 'Earn',     icon: Layers },
  { href: '/portfolio',   label: 'Portfolio', icon: PieChart },
  { href: '/analytics',   label: 'Analytics', icon: Activity },
];

const BOTTOM_TABS = [
  { href: '/trade',            label: 'Trade',     icon: TrendingUp },
  { href: '/markets',         label: 'Markets',   icon: BarChart2 },
  { href: '/markets/network', label: 'Network',   icon: Network },
  { href: '/earn',            label: 'Earn',      icon: Layers },
  { href: '/portfolio',       label: 'Portfolio', icon: PieChart },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          backgroundColor: 'rgba(8, 9, 14, 0.94)',
          backdropFilter: 'blur(16px)',
          borderColor: 'var(--nexora-border)',
        }}
      >
        <nav className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #4F8EF7, #00D4AA)' }}
            >
              H
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight" style={{ color: 'var(--nexora-text)' }}>
              HaydenFlow
            </span>
          </Link>

          {/* Desktop Nav Links */}
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
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-transform hover:scale-105"
              style={{ color: 'var(--nexora-green)', backgroundColor: 'rgba(0, 212, 170, 0.08)', border: '1px solid rgba(0, 212, 170, 0.2)' }}
            >
              <Plus size={13} />
              Create Pool
            </Link>
          </div>

          {/* Right Actions: Wallet & Mobile Toggle */}
          <div className="flex items-center gap-2">
            <div className="scale-90 sm:scale-100 origin-right">
              <WalletButton />
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg md:hidden transition-colors"
              style={{
                backgroundColor: mobileMenuOpen ? 'var(--nexora-surface-2)' : 'transparent',
                color: 'var(--nexora-text)',
                border: '1px solid var(--nexora-border)',
              }}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden overflow-hidden border-b"
              style={{
                backgroundColor: 'rgba(15, 17, 24, 0.98)',
                backdropFilter: 'blur(20px)',
                borderColor: 'var(--nexora-border)',
              }}
            >
              <div className="px-4 py-4 space-y-1">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: isActive ? 'var(--nexora-surface-2)' : 'transparent',
                        color: isActive ? 'var(--nexora-text)' : 'var(--nexora-text-muted)',
                        border: isActive ? '1px solid var(--nexora-border-2)' : '1px solid transparent',
                      }}
                    >
                      <Icon size={16} style={{ color: isActive ? 'var(--nexora-blue)' : 'var(--nexora-text-muted)' }} />
                      <span>{label}</span>
                    </Link>
                  );
                })}

                <Link
                  href="/markets/network"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: pathname === '/markets/network' ? 'var(--nexora-surface-2)' : 'transparent',
                    color: pathname === '/markets/network' ? 'var(--nexora-blue)' : 'var(--nexora-text-muted)',
                    border: pathname === '/markets/network' ? '1px solid var(--nexora-border-2)' : '1px solid transparent',
                  }}
                >
                  <Network size={16} />
                  <span>Network Graph</span>
                </Link>

                <div className="pt-2">
                  <Link
                    href="/create-pool"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold"
                    style={{
                      color: 'var(--nexora-green)',
                      backgroundColor: 'rgba(0, 212, 170, 0.1)',
                      border: '1px solid rgba(0, 212, 170, 0.3)',
                    }}
                  >
                    <Plus size={15} />
                    <span>Create Liquidity Pool</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around py-2 px-2"
        style={{
          backgroundColor: 'rgba(8, 9, 14, 0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--nexora-border)',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        }}
      >
        {BOTTOM_TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors min-w-[56px]"
              style={{
                color: isActive ? 'var(--nexora-blue)' : 'var(--nexora-text-muted)',
              }}
            >
              <Icon size={18} />
              <span className="text-[10px] font-medium mt-1">{label}</span>
              {isActive && (
                <div
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ backgroundColor: 'var(--nexora-blue)' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
