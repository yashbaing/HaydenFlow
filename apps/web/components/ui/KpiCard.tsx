'use client';

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  subtitle?: string;
  tooltip?: string;
  loading?: boolean;
}

export function KpiCard({ title, value, change, isPositive, subtitle, tooltip, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="nx-card p-5">
        <div className="skeleton h-3 w-24 mb-3 rounded" />
        <div className="skeleton h-7 w-32 mb-2 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
      </div>
    );
  }

  return (
    <div className="nx-card p-5 transition-all hover:border-nexora-2">
      <div className="flex items-start justify-between mb-2">
        <span
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: 'var(--nexora-text-subtle)' }}
        >
          {title}
        </span>
        {tooltip && (
          <span
            className="nx-tooltip text-xs"
            data-tooltip={tooltip}
            style={{ color: 'var(--nexora-text-subtle)', cursor: 'help' }}
          >
            ⓘ
          </span>
        )}
      </div>
      <div className="stat-value mt-1">{value}</div>
      {change != null && (
        <div
          className="text-xs mt-1 font-mono"
          style={{ color: isPositive ? 'var(--nexora-green)' : 'var(--nexora-red)' }}
        >
          {isPositive ? '▲' : '▼'} {change}
        </div>
      )}
      {subtitle && (
        <div className="text-xs mt-1" style={{ color: 'var(--nexora-text-muted)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

interface KpiRowProps {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}

export function KpiRow({ label, value, muted }: KpiRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-nexora last:border-0">
      <span className="text-sm" style={{ color: muted ? 'var(--nexora-text-subtle)' : 'var(--nexora-text-muted)' }}>
        {label}
      </span>
      <span className="text-sm font-mono font-medium" style={{ color: 'var(--nexora-text)' }}>
        {value}
      </span>
    </div>
  );
}
