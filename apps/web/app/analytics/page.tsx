'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import type { Pool } from '@nexora/shared';
import { getMarkets } from '@nexora/sdk';
import { KpiCard } from '@/components/ui/KpiCard';
import { PoolTypeBadge } from '@/components/ui/Badges';
import { formatUSD } from '@/lib/utils';

const generateDailyData = (baseVol: number, baseTvl: number, days: number) =>
  Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      volume: baseVol * (0.6 + Math.random() * 0.8),
      tvl: baseTvl * (0.9 + i * 0.003 + (Math.random() - 0.5) * 0.05),
      correlated: baseVol * 0.38 * (0.7 + Math.random() * 0.6),
      bridge: baseVol * 0.62 * (0.7 + Math.random() * 0.6),
      fees: baseVol * 0.003 * (0.6 + Math.random() * 0.8),
    };
  });

const ROUTING_DATA = [
  { name: 'USDC → nSPY → Asset', value: 38.2, count: 41200, color: '#4F8EF7' },
  { name: 'Direct Bridge', value: 26.8, count: 28900, color: '#00D4AA' },
  { name: 'USDC → nQQQ → Asset', value: 19.8, count: 21400, color: '#9B6DFF' },
  { name: 'Multi-hop Correlated', value: 15.1, count: 16300, color: '#F5A623' },
];

const ChartTooltipStyle = {
  backgroundColor: 'var(--nexora-surface)',
  border: '1px solid var(--nexora-border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--nexora-text)',
};

export default function AnalyticsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData] = useState(() => generateDailyData(4_500_000, 12_400_000, 30));

  useEffect(() => {
    getMarkets().then(m => { setPools(m); setLoading(false); });
  }, []);

  const totalTvl = pools.reduce((s, p) => s + p.tvl, 0);
  const volume24h = pools.reduce((s, p) => s + p.volume24h, 0);
  const fees24h = pools.reduce((s, p) => s + p.fees24h, 0);
  const correlatedCount = pools.filter(p => p.poolType === 'CORRELATED').length;
  const correlatedVol = pools.filter(p => p.poolType === 'CORRELATED').reduce((s, p) => s + p.volume24h, 0);

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--nexora-text)' }}>Analytics</h1>
          <p className="text-sm" style={{ color: 'var(--nexora-text-muted)' }}>Protocol-wide metrics and market intelligence.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard
            title="Total TVL"
            value={formatUSD(totalTvl, true)}
            change="12.4%"
            isPositive
            subtitle="vs last week"
            loading={loading}
          />
          <KpiCard
            title="24H Volume"
            value={formatUSD(volume24h, true)}
            change="8.1%"
            isPositive
            subtitle="vs yesterday"
            loading={loading}
          />
          <KpiCard
            title="24H Fees"
            value={formatUSD(fees24h, true)}
            change="8.1%"
            isPositive
            loading={loading}
          />
          <KpiCard
            title="Markets"
            value={String(pools.length)}
            subtitle={`${correlatedCount} correlated`}
            loading={loading}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <KpiCard
            title="Active LPs"
            value="287"
            change="5.2%"
            isPositive
            loading={loading}
          />
          <KpiCard
            title="Correlated Volume %"
            value={volume24h > 0 ? `${((correlatedVol / volume24h) * 100).toFixed(1)}%` : '--'}
            subtitle="of total 24h volume"
            tooltip="Percentage of volume routed through correlated-pair pools"
            loading={loading}
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          {/* TVL chart */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--nexora-text)' }}>TVL Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--nexora-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--nexora-text-subtle)' }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--nexora-text-subtle)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1e6).toFixed(1)}M`} />
                <Tooltip contentStyle={ChartTooltipStyle} formatter={(v: any) => [`$${((Number(v) || 0) / 1e6).toFixed(2)}M`, 'TVL']} />
                <Area type="monotone" dataKey="tvl" stroke="#4F8EF7" strokeWidth={2} fill="url(#tvlGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Volume chart */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--nexora-text)' }}>Daily Volume</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--nexora-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--nexora-text-subtle)' }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--nexora-text-subtle)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1e6).toFixed(1)}M`} />
                <Tooltip contentStyle={ChartTooltipStyle} formatter={(v: any) => [`$${((Number(v) || 0) / 1e6).toFixed(2)}M`, 'Volume']} />
                <Bar dataKey="correlated" fill="#4F8EF780" stackId="vol" name="Correlated" radius={[0,0,0,0]} />
                <Bar dataKey="bridge" fill="#00D4AA80" stackId="vol" name="Bridge" radius={[3,3,0,0]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--nexora-text-muted)' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Routing distribution */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--nexora-text)' }}>Routing Distribution</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <ResponsiveContainer width={120} height={120}>
                <RePieChart>
                  <Pie data={ROUTING_DATA} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                    {ROUTING_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {ROUTING_DATA.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span style={{ color: 'var(--nexora-text-muted)' }}>{d.name}</span>
                    </div>
                    <span className="font-mono font-semibold" style={{ color: 'var(--nexora-text)' }}>
                      {d.value.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top pools */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--nexora-surface)', border: '1px solid var(--nexora-border)' }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--nexora-text)' }}>Top Pools by TVL</h3>
            {loading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-10 rounded" />)}</div>
            ) : (
              <div className="space-y-3">
                {[...pools].sort((a, b) => b.tvl - a.tvl).slice(0, 5).map((pool, i) => {
                  const maxTvl = Math.max(...pools.map(p => p.tvl));
                  return (
                    <div key={pool.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold" style={{ color: 'var(--nexora-text)' }}>
                            {pool.token0.symbol}/{pool.token1.symbol}
                          </span>
                          <PoolTypeBadge type={pool.poolType} />
                        </div>
                        <span className="font-mono" style={{ color: 'var(--nexora-text-muted)' }}>
                          {formatUSD(pool.tvl, true)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--nexora-surface-2)' }}>
                        <motion.div
                          className="h-1.5 rounded-full"
                          style={{ backgroundColor: pool.poolType === 'CORRELATED' ? '#4F8EF7' : '#00D4AA' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(pool.tvl / maxTvl) * 100}%` }}
                          transition={{ duration: 0.6, delay: i * 0.08 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
