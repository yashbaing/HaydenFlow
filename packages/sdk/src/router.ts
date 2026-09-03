import type { Asset, Pool, Route, RouteHop } from '@nexora/shared';
import { MAX_HOPS } from '@nexora/shared';

/**
 * NexoraRouter (TypeScript SDK layer)
 *
 * Discovers candidate routes between two assets across the liquidity graph.
 * Scores and selects the best route based on output, impact, gas, and liquidity.
 */

// ====== Route Discovery ======

/**
 * Build adjacency map from pools for graph traversal.
 */
function buildAdjacencyMap(pools: Pool[]): Map<string, { pool: Pool; neighbor: Asset }[]> {
  const adj = new Map<string, { pool: Pool; neighbor: Asset }[]>();

  for (const pool of pools) {
    if (pool.active === false) continue;

    const sym0 = pool.token0.symbol;
    const sym1 = pool.token1.symbol;

    if (!adj.has(sym0)) adj.set(sym0, []);
    if (!adj.has(sym1)) adj.set(sym1, []);

    adj.get(sym0)!.push({ pool, neighbor: pool.token1 });
    adj.get(sym1)!.push({ pool, neighbor: pool.token0 });
  }

  return adj;
}

/**
 * DFS-based route discovery. Finds all paths up to MAX_HOPS.
 */
function findAllRoutes(
  tokenIn: Asset,
  tokenOut: Asset,
  pools: Pool[],
  maxHops: number = MAX_HOPS
): Asset[][] {
  const adj = buildAdjacencyMap(pools);
  const routes: Asset[][] = [];
  const visited = new Set<string>();

  function dfs(current: Asset, path: Asset[]) {
    if (path.length > maxHops + 1) return;
    if (current.symbol === tokenOut.symbol) {
      routes.push([...path]);
      return;
    }
    visited.add(current.symbol);

    const neighbors = adj.get(current.symbol) ?? [];
    for (const { neighbor } of neighbors) {
      if (!visited.has(neighbor.symbol)) {
        path.push(neighbor);
        dfs(neighbor, path);
        path.pop();
      }
    }
    visited.delete(current.symbol);
  }

  dfs(tokenIn, [tokenIn]);
  return routes;
}

// ====== Output Estimation ======

/**
 * Constant-product AMM quote with fee.
 * amountOut = (amountIn * feeMul * reserveOut) / (reserveIn * 10000 + amountIn * feeMul)
 */
function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number
): bigint {
  if (reserveIn === 0n || reserveOut === 0n || amountIn === 0n) return 0n;
  const feeMul = BigInt(10000 - feeBps);
  const numerator = amountIn * feeMul * reserveOut;
  const denominator = reserveIn * 10000n + amountIn * feeMul;
  return numerator / denominator;
}

/**
 * Estimate output amount for a multi-hop path.
 */
export function estimateOutputForPath(
  path: Asset[],
  amountIn: bigint,
  poolMap: Map<string, Pool>
): bigint {
  let amount = amountIn;
  for (let i = 0; i < path.length - 1; i++) {
    const sym0 = path[i]!.symbol;
    const sym1 = path[i + 1]!.symbol;
    const key = [sym0, sym1].sort().join('/');
    const pool = poolMap.get(key);
    if (!pool) return 0n;

    const isToken0In = pool.token0.symbol === sym0;
    const reserveIn = isToken0In ? pool.reserve0 : pool.reserve1;
    const reserveOut = isToken0In ? pool.reserve1 : pool.reserve0;

    amount = getAmountOut(amount, reserveIn, reserveOut, pool.feeBps);
    if (amount === 0n) return 0n;
  }
  return amount;
}

/**
 * Estimate price impact for a path in basis points.
 */
export function estimatePriceImpact(
  path: Asset[],
  amountIn: bigint,
  poolMap: Map<string, Pool>
): number {
  let totalImpactBps = 0;
  let currentAmount = amountIn;

  for (let i = 0; i < path.length - 1; i++) {
    const sym0 = path[i]!.symbol;
    const sym1 = path[i + 1]!.symbol;
    const key = [sym0, sym1].sort().join('/');
    const pool = poolMap.get(key);
    if (!pool) continue;

    const isToken0In = pool.token0.symbol === sym0;
    const reserveIn = isToken0In ? pool.reserve0 : pool.reserve1;
    if (reserveIn > 0n) {
      const impactBps = Number((currentAmount * 10000n) / (reserveIn + currentAmount));
      totalImpactBps += impactBps;
    }
    currentAmount = getAmountOut(
      currentAmount,
      isToken0In ? pool.reserve0 : pool.reserve1,
      isToken0In ? pool.reserve1 : pool.reserve0,
      pool.feeBps
    );
  }
  return totalImpactBps;
}

// ====== Route Scoring ======

/**
 * Score a route 0-100. Higher = better.
 * Factors: output amount, price impact, number of hops, liquidity depth, correlation bonus.
 */
export function scoreRoute(
  path: Asset[],
  amountOut: bigint,
  priceImpact: number,
  pools: Pool[],
  poolMap: Map<string, Pool>
): number {
  if (amountOut === 0n) return 0;

  // Base score from output (normalized, higher = better)
  let score = 60;

  // Deduct for hops (each extra hop costs ~5 points)
  const hops = path.length - 1;
  score -= (hops - 1) * 5;

  // Deduct for price impact (1 bps = -0.01 points)
  score -= priceImpact * 0.01;

  // Bonus for correlated paths (using CORRELATED pools)
  for (let i = 0; i < path.length - 1; i++) {
    const sym0 = path[i]!.symbol;
    const sym1 = path[i + 1]!.symbol;
    const key = [sym0, sym1].sort().join('/');
    const pool = poolMap.get(key);
    if (pool?.poolType === 'CORRELATED') {
      score += 8;
    }
    if (pool?.poolType === 'BRIDGE' && hops === 1) {
      score += 3;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Build route explanation text.
 */
function buildRouteExplanation(path: Asset[], poolMap: Map<string, Pool>): string {
  const hops = path.length - 1;

  if (hops === 1) {
    const key = [path[0]!.symbol, path[1]!.symbol].sort().join('/');
    const pool = poolMap.get(key);
    if (pool?.poolType === 'BRIDGE') {
      return `Direct bridge route via ${pool.token0.symbol}/${pool.token1.symbol} pool.`;
    }
    return `Direct swap route with ${hops} hop.`;
  }

  const correlatedPools = [];
  for (let i = 0; i < path.length - 1; i++) {
    const key = [path[i]!.symbol, path[i + 1]!.symbol].sort().join('/');
    const pool = poolMap.get(key);
    if (pool?.poolType === 'CORRELATED') {
      correlatedPools.push(`${path[i]!.symbol}/${path[i + 1]!.symbol}`);
    }
  }

  if (correlatedPools.length > 0) {
    return `Routes through ${correlatedPools.join(' → ')} correlated pair(s). ` +
      `Correlated assets share price movement, reducing inventory risk for LPs ` +
      `and enabling tighter spreads than USD-direct routes.`;
  }

  return `Multi-hop route via ${path.map(a => a.symbol).join(' → ')} with ${hops} hops.`;
}

// ====== Main SDK Functions ======

/**
 * Build pool map for fast lookup.
 */
function buildPoolMap(pools: Pool[]): Map<string, Pool> {
  const map = new Map<string, Pool>();
  for (const pool of pools) {
    const key = [pool.token0.symbol, pool.token1.symbol].sort().join('/');
    map.set(key, pool);
  }
  return map;
}

/**
 * Find and score all candidate routes between tokenIn and tokenOut.
 */
export function findRoutes(
  tokenIn: Asset,
  tokenOut: Asset,
  amountIn: bigint,
  pools: Pool[],
  options: { maxHops?: number; slippageBps?: number } = {}
): Route[] {
  const { maxHops = 3, slippageBps = 50 } = options;
  const poolMap = buildPoolMap(pools);
  const allPaths = findAllRoutes(tokenIn, tokenOut, pools, maxHops);

  const routes: Route[] = [];
  const GAS_PER_HOP = 150_000n;

  for (const path of allPaths) {
    const amountOut = estimateOutputForPath(path, amountIn, poolMap);
    if (amountOut === 0n) continue;

    const priceImpact = estimatePriceImpact(path, amountIn, poolMap);
    const hops = path.length - 1;
    const gasEstimate = BigInt(hops) * GAS_PER_HOP;
    const score = scoreRoute(path, amountOut, priceImpact, pools, poolMap);

    // Build hops
    const routeHops: RouteHop[] = [];
    let hopAmountIn = amountIn;
    for (let i = 0; i < path.length - 1; i++) {
      const key = [path[i]!.symbol, path[i + 1]!.symbol].sort().join('/');
      const pool = poolMap.get(key)!;
      const isToken0In = pool.token0.symbol === path[i]!.symbol;
      const reserveIn = isToken0In ? pool.reserve0 : pool.reserve1;
      const reserveOut = isToken0In ? pool.reserve1 : pool.reserve0;
      const hopAmountOut = getAmountOut(hopAmountIn, reserveIn, reserveOut, pool.feeBps);
      const hopImpact = reserveIn > 0n
        ? Number((hopAmountIn * 10000n) / (reserveIn + hopAmountIn))
        : 0;

      routeHops.push({
        tokenIn: path[i]!,
        tokenOut: path[i + 1]!,
        pool,
        amountIn: hopAmountIn,
        amountOut: hopAmountOut,
        priceImpact: hopImpact,
      });
      hopAmountIn = hopAmountOut;
    }

    routes.push({
      path,
      hops: routeHops,
      amountIn,
      amountOut,
      priceImpact,
      gasEstimate,
      score,
      explanation: buildRouteExplanation(path, poolMap),
    });
  }

  return routes.sort((a, b) => b.score - a.score);
}

/**
 * Select the best route from candidates.
 */
export function selectBestRoute(routes: Route[]): Route | null {
  if (routes.length === 0) return null;
  return routes[0]!;
}

/**
 * Format path as display string: "USDC → nSPY → nNVDA"
 */
export function formatPath(path: Asset[]): string {
  return path.map(a => a.symbol).join(' → ');
}
