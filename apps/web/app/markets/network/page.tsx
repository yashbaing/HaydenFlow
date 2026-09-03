'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Pool, Asset } from '@nexora/shared';
import { getMarkets, buildAssets } from '@nexora/sdk';
import { getAssetTypeColor, getPoolTypeColor, formatUSD } from '@/lib/utils';
import { PoolTypeBadge, CorrelationBadge, AssetTypeBadge } from '@/components/ui/Badges';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { findRoutes, selectBestRoute } from '@nexora/sdk';
import { X } from 'lucide-react';

interface NodeDatum extends d3.SimulationNodeDatum {
  id: string;
  symbol: string;
  name: string;
  assetType: string;
  tvl: number;
  asset: Asset;
  color: string;
}

interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
  pool: Pool;
  sourceId: string;
  targetId: string;
}

interface PanelInfo {
  asset: Asset;
  pools: Pool[];
  bestRouteToUSDC: string;
}

export default function NetworkPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedPanel, setSelectedPanel] = useState<PanelInfo | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    Promise.all([getMarkets(), Promise.resolve(buildAssets())]).then(([m, a]) => {
      setPools(m);
      setAssets(a);
    });
  }, []);

  useEffect(() => {
    if (!pools.length || !assets.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const W = svgRef.current.clientWidth;
    const H = svgRef.current.clientHeight;

    // Build graph data
    const assetMap = new Map(assets.map(a => [a.symbol, a]));
    const tvlPerAsset = new Map<string, number>();
    for (const pool of pools) {
      tvlPerAsset.set(pool.token0.symbol, (tvlPerAsset.get(pool.token0.symbol) ?? 0) + pool.tvl / 2);
      tvlPerAsset.set(pool.token1.symbol, (tvlPerAsset.get(pool.token1.symbol) ?? 0) + pool.tvl / 2);
    }

    const symbolsInPools = new Set(pools.flatMap(p => [p.token0.symbol, p.token1.symbol]));
    const nodes: NodeDatum[] = [...symbolsInPools].map(sym => {
      const asset = assetMap.get(sym)!;
      return {
        id: sym,
        symbol: sym,
        name: asset.name,
        assetType: asset.assetType,
        tvl: tvlPerAsset.get(sym) ?? 0,
        asset,
        color: asset.logoColor ?? getAssetTypeColor(asset.assetType),
      };
    });

    const links: LinkDatum[] = pools.map(pool => ({
      source: pool.token0.symbol,
      target: pool.token1.symbol,
      pool,
      sourceId: pool.token0.symbol,
      targetId: pool.token1.symbol,
    }));

    // Node size scale based on TVL
    const maxTvl = Math.max(...nodes.map(n => n.tvl));
    const rScale = d3.scaleSqrt().domain([0, maxTvl]).range([10, 36]);

    // Link width scale based on volume
    const maxVol = Math.max(...pools.map(p => p.volume24h));
    const widthScale = d3.scaleLinear().domain([0, maxVol]).range([1, 5]);

    const simulation = d3.forceSimulation<NodeDatum>(nodes)
      .force('link', d3.forceLink<NodeDatum, LinkDatum>(links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide<NodeDatum>(d => rScale(d.tvl) + 20));

    // Zoom
    const g = svg.append('g');
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on('zoom', e => g.attr('transform', e.transform))
    );

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', d => widthScale(d.pool.volume24h))
      .attr('stroke', d => {
        if (d.pool.poolType === 'CORRELATED') return '#4F8EF760';
        if (d.pool.poolType === 'BRIDGE') return '#00D4AA60';
        return '#F5A62360';
      })
      .attr('stroke-linecap', 'round');

    // Draw node groups
    const node = g.append('g')
      .selectAll<SVGGElement, NodeDatum>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, NodeDatum>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    // Node glow
    node.append('circle')
      .attr('r', d => rScale(d.tvl) * 1.8)
      .attr('fill', d => d.color + '15')
      .attr('stroke', 'none');

    // Node circle
    node.append('circle')
      .attr('r', d => rScale(d.tvl))
      .attr('fill', d => d.color + '20')
      .attr('stroke', d => d.color + '90')
      .attr('stroke-width', 1.5);

    // Node label
    node.append('text')
      .text(d => d.symbol)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', d => Math.max(8, rScale(d.tvl) * 0.45))
      .attr('font-weight', '700')
      .attr('fill', d => d.color)
      .style('pointer-events', 'none');

    // Click handler
    node.on('click', (_, d) => {
      const connectedPools = pools.filter(
        p => p.token0.symbol === d.symbol || p.token1.symbol === d.symbol
      );
      const allAssets = buildAssets();
      const assetObj = allAssets.find(a => a.symbol === d.symbol)!;
      const usdcAsset = allAssets.find(a => a.symbol === 'USDC')!;

      let bestRouteStr = `${d.symbol} → USDC`;
      if (d.symbol !== 'USDC') {
        const routes = findRoutes(assetObj, usdcAsset, BigInt(1e18), pools);
        if (routes[0]) {
          bestRouteStr = routes[0].path.map(a => a.symbol).join(' → ');
        }
      }

      setSelectedPanel({ asset: assetObj, pools: connectedPools, bestRouteToUSDC: bestRouteStr });
    });

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as NodeDatum).x!)
        .attr('y1', d => (d.source as NodeDatum).y!)
        .attr('x2', d => (d.target as NodeDatum).x!)
        .attr('y2', d => (d.target as NodeDatum).y!);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [pools, assets]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--nexora-bg)' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--nexora-border)' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--nexora-text)' }}>Liquidity Network</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--nexora-text-muted)' }}>
            Node size = TVL · Edge width = Volume · Click any node for details
          </p>
        </div>
        {/* Legend */}
        <div className="hidden md:flex items-center gap-5 text-xs" style={{ color: 'var(--nexora-text-muted)' }}>
          {[
            { label: 'Correlated', color: '#4F8EF7' },
            { label: 'Bridge', color: '#00D4AA' },
            { label: 'Stable', color: '#F5A623' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-8 h-1 rounded-full" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Graph */}
        <div className="flex-1 relative">
          <svg ref={svgRef} className="w-full h-full" style={{ minHeight: 'calc(100vh - 130px)' }} />
        </div>

        {/* Side panel */}
        {selectedPanel && (
          <div
            className="w-full sm:w-80 absolute sm:relative bottom-0 right-0 sm:bottom-auto max-h-[60vh] sm:max-h-none overflow-y-auto shrink-0 z-30 border-t sm:border-t-0 sm:border-l shadow-2xl"
            style={{ borderColor: 'var(--nexora-border)', backgroundColor: 'var(--nexora-surface)' }}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <AssetIcon asset={selectedPanel.asset} size={36} />
                  <div>
                    <div className="font-bold" style={{ color: 'var(--nexora-text)' }}>
                      {selectedPanel.asset.symbol}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--nexora-text-muted)' }}>
                      {selectedPanel.asset.name}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedPanel(null)}>
                  <X size={16} style={{ color: 'var(--nexora-text-muted)' }} />
                </button>
              </div>

              <AssetTypeBadge type={selectedPanel.asset.assetType} />

              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-sm py-2 border-b" style={{ borderColor: 'var(--nexora-border)' }}>
                  <span style={{ color: 'var(--nexora-text-muted)' }}>Price</span>
                  <span className="font-mono" style={{ color: 'var(--nexora-text)' }}>
                    ${selectedPanel.asset.currentPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b" style={{ borderColor: 'var(--nexora-border)' }}>
                  <span style={{ color: 'var(--nexora-text-muted)' }}>24h Change</span>
                  <span
                    className="font-mono"
                    style={{ color: selectedPanel.asset.priceChange24h >= 0 ? 'var(--nexora-green)' : 'var(--nexora-red)' }}
                  >
                    {selectedPanel.asset.priceChange24h >= 0 ? '+' : ''}{selectedPanel.asset.priceChange24h.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Best route to USDC */}
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--nexora-surface-2)' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--nexora-text-muted)' }}>
                  Best route to dollar liquidity
                </div>
                <div className="font-mono text-sm" style={{ color: 'var(--nexora-blue)' }}>
                  {selectedPanel.bestRouteToUSDC}
                </div>
              </div>

              {/* Connected pools */}
              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--nexora-text-subtle)' }}>
                  Connected Markets ({selectedPanel.pools.length})
                </div>
                <div className="space-y-2">
                  {selectedPanel.pools.map(pool => {
                    const other = pool.token0.symbol === selectedPanel.asset.symbol ? pool.token1 : pool.token0;
                    return (
                      <div
                        key={pool.id}
                        className="rounded-lg p-3"
                        style={{ backgroundColor: 'var(--nexora-surface-2)' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AssetIcon asset={other} size={20} />
                            <span className="font-mono font-semibold text-sm" style={{ color: 'var(--nexora-text)' }}>
                              {other.symbol}
                            </span>
                          </div>
                          <PoolTypeBadge type={pool.poolType} />
                        </div>
                        {pool.correlation != null && (
                          <div className="flex items-center justify-between text-xs">
                            <span style={{ color: 'var(--nexora-text-muted)' }}>Correlation</span>
                            <CorrelationBadge
                              classification={pool.correlationClassification!}
                              value={pool.correlation}
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span style={{ color: 'var(--nexora-text-muted)' }}>TVL</span>
                          <span className="font-mono" style={{ color: 'var(--nexora-text)' }}>
                            {formatUSD(pool.tvl, true)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span style={{ color: 'var(--nexora-text-muted)' }}>APR</span>
                          <span className="font-mono font-semibold" style={{ color: 'var(--nexora-green)' }}>
                            {pool.apr.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
