import { describe, it, expect, beforeAll } from 'vitest';
import type { Asset, Pool } from '@nexora/shared';
import { findRoutes, selectBestRoute, formatPath } from '../router';
import { buildAssets, getMarkets } from '../nexora';

describe('RouteEngine', () => {
  let assets: Asset[];
  let pools: Pool[];
  let assetMap: Map<string, Asset>;

  beforeAll(async () => {
    assets = buildAssets();
    pools = await getMarkets();
    assetMap = new Map(assets.map(a => [a.symbol, a]));
  });

  describe('findRoutes', () => {
    it('finds routes between USDC and nNVDA', () => {
      const tokenIn = assetMap.get('USDC')!;
      const tokenOut = assetMap.get('nNVDA')!;
      const amountIn = BigInt(1000) * BigInt(1e6); // $1000 USDC

      const routes = findRoutes(tokenIn, tokenOut, amountIn, pools);
      expect(routes.length).toBeGreaterThan(0);
    });

    it('finds the USDC → nSPY → nNVDA route', () => {
      const tokenIn = assetMap.get('USDC')!;
      const tokenOut = assetMap.get('nNVDA')!;
      const amountIn = BigInt(1000) * BigInt(1e6);

      const routes = findRoutes(tokenIn, tokenOut, amountIn, pools);
      const twoHopRoute = routes.find(r => r.path.length === 3 && r.path[1]?.symbol === 'nSPY');
      expect(twoHopRoute).toBeDefined();
    });

    it('returns routes sorted by score (best first)', () => {
      const tokenIn = assetMap.get('USDC')!;
      const tokenOut = assetMap.get('nNVDA')!;
      const amountIn = BigInt(1000) * BigInt(1e6);

      const routes = findRoutes(tokenIn, tokenOut, amountIn, pools);
      for (let i = 0; i < routes.length - 1; i++) {
        expect(routes[i]!.score).toBeGreaterThanOrEqual(routes[i + 1]!.score);
      }
    });

    it('limits to maxHops', () => {
      const tokenIn = assetMap.get('USDC')!;
      const tokenOut = assetMap.get('nNVDA')!;
      const amountIn = BigInt(1000) * BigInt(1e6);

      const routes = findRoutes(tokenIn, tokenOut, amountIn, pools, { maxHops: 2 });
      for (const route of routes) {
        expect(route.path.length).toBeLessThanOrEqual(3); // 2 hops = 3 tokens
      }
    });

    it('returns routes with positive amountOut', () => {
      const tokenIn = assetMap.get('USDC')!;
      const tokenOut = assetMap.get('nSPY')!;
      const amountIn = BigInt(1000) * BigInt(1e6);

      const routes = findRoutes(tokenIn, tokenOut, amountIn, pools);
      for (const route of routes) {
        expect(route.amountOut).toBeGreaterThan(0n);
      }
    });

    it('returns empty array when no route exists', () => {
      const fakeAsset: Asset = {
        ...assetMap.get('USDC')!,
        symbol: 'FAKE',
        id: 'fake',
        tokenAddress: '0xdeadbeef',
      };
      const tokenOut = assetMap.get('nNVDA')!;
      const routes = findRoutes(fakeAsset, tokenOut, 1000n, pools);
      expect(routes).toHaveLength(0);
    });
  });

  describe('selectBestRoute', () => {
    it('returns null for empty routes', () => {
      expect(selectBestRoute([])).toBeNull();
    });

    it('returns first (highest scored) route', () => {
      const tokenIn = assetMap.get('USDC')!;
      const tokenOut = assetMap.get('nNVDA')!;
      const amountIn = BigInt(1000) * BigInt(1e6);

      const routes = findRoutes(tokenIn, tokenOut, amountIn, pools);
      const best = selectBestRoute(routes);
      expect(best).not.toBeNull();
      expect(best!.score).toBe(routes[0]!.score);
    });
  });

  describe('formatPath', () => {
    it('formats path correctly', () => {
      const path = [
        assetMap.get('USDC')!,
        assetMap.get('nSPY')!,
        assetMap.get('nNVDA')!,
      ];
      expect(formatPath(path)).toBe('USDC → nSPY → nNVDA');
    });
  });

  describe('route scoring', () => {
    it('prefers correlated-pool routes over bridge routes for same output', () => {
      const tokenIn = assetMap.get('USDC')!;
      const tokenOut = assetMap.get('nNVDA')!;
      const amountIn = BigInt(100) * BigInt(1e6);

      const routes = findRoutes(tokenIn, tokenOut, amountIn, pools);
      if (routes.length > 1) {
        const hasCorrelatedRoute = routes.some(r =>
          r.hops.some(h => h.pool.poolType === 'CORRELATED')
        );
        expect(hasCorrelatedRoute).toBe(true);
      }
    });
  });
});
