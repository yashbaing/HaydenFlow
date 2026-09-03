'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, TrendingUp, Zap, PieChart, Network, ChevronRight } from 'lucide-react';

// Animated liquidity network background
function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const nodes = [
      { id: 'USDC',  x: 0.5,  y: 0.5,  r: 18, color: '#2775CA', label: 'USDC' },
      { id: 'nSPY',  x: 0.3,  y: 0.3,  r: 14, color: '#F5A623', label: 'nSPY' },
      { id: 'nQQQ',  x: 0.7,  y: 0.3,  r: 12, color: '#7B68EE', label: 'nQQQ' },
      { id: 'nNVDA', x: 0.18, y: 0.18, r: 10, color: '#76B900', label: 'nNVDA' },
      { id: 'nTSLA', x: 0.22, y: 0.45, r: 9,  color: '#CC0000', label: 'nTSLA' },
      { id: 'nAMZN', x: 0.8,  y: 0.2,  r: 9,  color: '#FF9900', label: 'nAMZN' },
      { id: 'nCOST', x: 0.12, y: 0.35, r: 8,  color: '#005DAA', label: 'nCOST' },
      { id: 'WETH',  x: 0.65, y: 0.65, r: 11, color: '#627EEA', label: 'WETH' },
      { id: 'WBTC',  x: 0.8,  y: 0.7,  r: 10, color: '#F7931A', label: 'WBTC' },
      { id: 'nGOLD', x: 0.35, y: 0.75, r: 8,  color: '#FFD700', label: 'nGOLD' },
    ];

    const edges = [
      { from: 'nNVDA', to: 'nSPY',  color: '#4F8EF780', width: 2 },
      { from: 'nTSLA', to: 'nSPY',  color: '#4F8EF750', width: 1.5 },
      { from: 'nAMZN', to: 'nQQQ',  color: '#4F8EF780', width: 2 },
      { from: 'nCOST', to: 'nSPY',  color: '#4F8EF750', width: 1.5 },
      { from: 'nQQQ',  to: 'nSPY',  color: '#4F8EF799', width: 2.5 },
      { from: 'nSPY',  to: 'USDC',  color: '#00D4AA80', width: 3 },
      { from: 'WETH',  to: 'USDC',  color: '#00D4AA80', width: 3 },
      { from: 'WBTC',  to: 'USDC',  color: '#00D4AA80', width: 2.5 },
    ];

    let animFrame: number;
    let t = 0;

    const draw = () => {
      if (!canvas) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      t += 0.008;

      const posNodes = nodes.map(n => ({
        ...n,
        px: n.x * W + Math.sin(t + n.x * 4) * 8,
        py: n.y * H + Math.cos(t + n.y * 3) * 8,
      }));
      const nodeMap = new Map(posNodes.map(n => [n.id, n]));

      // Draw edges
      for (const edge of edges) {
        const from = nodeMap.get(edge.from)!;
        const to = nodeMap.get(edge.to)!;

        // Animated particle along edge
        const particlePos = (t * 0.5) % 1;
        const px = from.px + (to.px - from.px) * particlePos;
        const py = from.py + (to.py - from.py) * particlePos;

        ctx.beginPath();
        ctx.moveTo(from.px, from.py);
        ctx.lineTo(to.px, to.py);
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = edge.width;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff80';
        ctx.fill();
      }

      // Draw nodes
      for (const node of posNodes) {
        // Glow
        const gradient = ctx.createRadialGradient(node.px, node.py, 0, node.px, node.py, node.r * 2.5);
        gradient.addColorStop(0, node.color + '40');
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(node.px, node.py, node.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(node.px, node.py, node.r, 0, Math.PI * 2);
        ctx.fillStyle = node.color + '22';
        ctx.fill();
        ctx.strokeStyle = node.color + '99';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.font = `bold ${Math.max(9, node.r * 0.7)}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = node.color;
        ctx.fillText(node.label, node.px, node.py);
      }

      animFrame = requestAnimationFrame(draw);
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-40"
      style={{ pointerEvents: 'none' }}
    />
  );
}

const TRADITIONAL_PAIRS = ['NVDA / USD', 'TSLA / USD', 'AMZN / USD', 'QQQ / USD'];
const HAYDENFLOW_PAIRS = ['nNVDA / nSPY', 'nTSLA / nSPY', 'nAMZN / nQQQ', 'nQQQ / nSPY'];

const FEATURES = [
  {
    icon: <Network size={22} className="text-nexora-blue" />,
    title: 'Correlated Markets',
    description:
      'Pair assets with their natural benchmarks. NVDA vs SPY. AMZN vs QQQ. Trade what actually moves together.',
    color: 'var(--nexora-blue)',
  },
  {
    icon: <Zap size={22} className="text-nexora-green" />,
    title: 'Smart Routing',
    description:
      'Enter and exit through USDC while HaydenFlow automatically finds the most capital-efficient path across the liquidity graph.',
    color: 'var(--nexora-green)',
  },
  {
    icon: <PieChart size={22} className="text-nexora-amber" />,
    title: 'Portfolio-Native Liquidity',
    description:
      'Provide liquidity using assets you already want to hold. Earn market-making fees while maintaining your investment thesis.',
    color: 'var(--nexora-amber)',
  },
];

// Protocol live stats (mock)
const STATS = [
  { label: 'Total TVL',    value: '$12.4M' },
  { label: '24H Volume',  value: '$4.5M'  },
  { label: 'Markets',     value: '8'      },
  { label: 'Active LPs',  value: '287'    },
];

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--nexora-bg)' }}>
      {/* Hero */}
      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
        <NetworkBackground />

        {/* Radial gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(79,142,247,0.06) 0%, transparent 70%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 text-center max-w-4xl mx-auto flex flex-col items-center"
        >
          {/* Tagline pill */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6 sm:mb-8"
            style={{
              backgroundColor: 'rgba(79,142,247,0.1)',
              border: '1px solid rgba(79,142,247,0.25)',
              color: 'var(--nexora-blue)',
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--nexora-green)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--nexora-green)' }} />
            </span>
            Testnet Research Application
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-tight sm:leading-none mb-4">
            <span style={{ color: 'var(--nexora-text)' }}>HAYDENFLOW</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl font-light mb-3" style={{ color: 'var(--nexora-text-muted)' }}>
            Programmable Liquidity{' '}
            <span className="gradient-text font-semibold">for Tokenized Markets</span>
          </p>
          <p className="text-sm sm:text-base mb-8 sm:mb-10 max-w-xl mx-auto px-2" style={{ color: 'var(--nexora-text-muted)' }}>
            Trade assets against what they actually move with.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto mb-10 sm:mb-12">
            <Link href="/trade" className="btn-primary flex items-center justify-center gap-2 text-base px-8 py-3 w-full sm:w-auto">
              Launch App <ArrowRight size={16} />
            </Link>
            <Link href="/markets/network" className="btn-ghost flex items-center justify-center gap-2 text-base px-6 py-3 w-full sm:w-auto">
              Explore Network <Network size={16} />
            </Link>
          </div>

          {/* Stats ticker - cleanly centered in hero flow */}
          <div
            className="grid grid-cols-2 sm:flex items-center gap-6 sm:gap-10 px-6 sm:px-10 py-4 sm:py-3.5 rounded-2xl sm:rounded-full w-full max-w-sm sm:max-w-none mx-auto shadow-lg"
            style={{
              backgroundColor: 'rgba(15,17,24,0.92)',
              border: '1px solid var(--nexora-border)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {STATS.map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="font-mono font-bold text-base sm:text-lg" style={{ color: 'var(--nexora-text)' }}>
                  {stat.value}
                </span>
                <span className="text-[11px] sm:text-xs tracking-wider uppercase mt-0.5" style={{ color: 'var(--nexora-text-subtle)' }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Traditional vs Nexora */}
      <section className="py-24 px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--nexora-text)' }}>
              A New Market Structure
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--nexora-text-muted)' }}>
              Traditional AMMs route every asset through USD. HaydenFlow enables direct correlated-pair markets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Traditional */}
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--nexora-text-subtle)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexora-text-subtle)' }}>
                  Traditional AMMs
                </span>
              </div>
              <div className="space-y-2">
                {TRADITIONAL_PAIRS.map(pair => (
                  <div
                    key={pair}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg font-mono text-sm"
                    style={{ backgroundColor: 'var(--nexora-surface-2)', color: 'var(--nexora-text-muted)' }}
                  >
                    <span>{pair}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-4" style={{ color: 'var(--nexora-text-subtle)' }}>
                All assets quoted against USD, ignoring natural correlations.
              </p>
            </div>

            {/* HaydenFlow */}
            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: 'var(--nexora-surface)',
                border: '1px solid rgba(79,142,247,0.3)',
                boxShadow: '0 0 30px rgba(79,142,247,0.06)',
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--nexora-blue)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nexora-blue)' }}>
                  HaydenFlow Correlated Markets
                </span>
              </div>
              <div className="space-y-2">
                {HAYDENFLOW_PAIRS.map((pair, i) => (
                  <div
                    key={pair}
                    className="flex items-center justify-between px-4 py-2.5 rounded-lg font-mono text-sm"
                    style={{ backgroundColor: 'rgba(79,142,247,0.08)', color: 'var(--nexora-text)' }}
                  >
                    <span>{pair}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: 'rgba(79,142,247,0.15)', color: 'var(--nexora-blue)' }}
                    >
                      {['87%', '78%', '91%', '94%'][i]}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-4" style={{ color: 'var(--nexora-text-muted)' }}>
                Correlated pairs with lower relative volatility for LP efficiency.
              </p>
            </div>
          </div>

          {/* Bridge explanation */}
          <div
            className="mt-6 p-4 rounded-xl flex items-start gap-3 text-sm"
            style={{ backgroundColor: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)' }}
          >
            <Zap size={16} style={{ color: 'var(--nexora-green)', marginTop: 2 }} />
            <div>
              <span className="font-semibold" style={{ color: 'var(--nexora-green)' }}>Smart Bridge: </span>
              <span style={{ color: 'var(--nexora-text-muted)' }}>
                Users can still trade USDC ↔ any asset. The Smart Router automatically discovers paths like{' '}
                <span className="font-mono" style={{ color: 'var(--nexora-text)' }}>USDC → nSPY → nNVDA</span>{' '}
                using bridge markets (nSPY/USDC, WETH/USDC) as entry/exit points.
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--nexora-text)' }}>
              Built for Capital Efficiency
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="nx-card p-6 hover:border-nexora-2 transition-all"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${f.color}15` }}
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--nexora-text)' }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--nexora-text-muted)' }}>
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--nexora-text)' }}>
            Start Exploring
          </h2>
          <p className="text-base mb-8" style={{ color: 'var(--nexora-text-muted)' }}>
            View the live liquidity network, try a swap, or provide liquidity to a correlated pool.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/trade" className="btn-primary flex items-center gap-2">
              Trade Now <ArrowRight size={16} />
            </Link>
            <Link href="/markets" className="btn-ghost flex items-center gap-2">
              View Markets <ChevronRight size={16} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer
        className="py-8 px-4 text-center text-xs"
        style={{ borderTop: '1px solid var(--nexora-border)', color: 'var(--nexora-text-subtle)' }}
      >
        <p>
          HAYDENFLOW is a research/demonstration application. All tokenized assets are simulated and do not
          represent ownership in real securities. Not financial advice.
        </p>
        <p className="mt-2">© 2024 HaydenFlow Research</p>
      </footer>
    </div>
  );
}
