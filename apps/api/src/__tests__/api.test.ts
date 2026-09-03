import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../app';
import { wsServer } from '../websocket/server';

describe('HaydenFlow Backend API Integration Tests', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    server = http.createServer(app);
    wsServer.init(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 3001;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    wsServer.close();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /health returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.service).toBe('haydenflow-backend');
    expect(data.status).toBe('healthy');
  });

  it('GET /api/assets returns list of tokenized assets', async () => {
    const res = await fetch(`${baseUrl}/api/assets`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBeGreaterThanOrEqual(8);
    expect(Array.isArray(data.assets)).toBe(true);
    const symbols = data.assets.map((a: any) => a.symbol);
    expect(symbols).toContain('nNVDA');
    expect(symbols).toContain('nSPY');
    expect(symbols).toContain('USDC');
  });

  it('GET /api/assets/nNVDA returns single asset with price history', async () => {
    const res = await fetch(`${baseUrl}/api/assets/nNVDA`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.asset.symbol).toBe('nNVDA');
    expect(data.asset.priceHistory.length).toBeGreaterThan(0);
  });

  it('GET /api/markets returns liquidity pools', async () => {
    const res = await fetch(`${baseUrl}/api/markets`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBeGreaterThanOrEqual(8);
  });

  it('GET /api/correlation returns calculated or cached correlation', async () => {
    const res = await fetch(`${baseUrl}/api/correlation?assetA=nNVDA&assetB=nSPY`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.assetA).toBe('nNVDA');
    expect(data.assetB).toBe('nSPY');
    expect(typeof data.correlation).toBe('number');
    expect(['EXTREME', 'HIGH', 'MODERATE', 'LOW']).toContain(data.classification);
  });

  it('GET /api/correlation/matrix returns NxN correlation matrix', async () => {
    const res = await fetch(`${baseUrl}/api/correlation/matrix`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.symbols.length).toBeGreaterThanOrEqual(8);
    expect(data.matrix.nNVDA.nNVDA).toBe(1.0);
  });

  it('GET /api/routes finds multi-hop route for USDC -> nNVDA', async () => {
    const res = await fetch(`${baseUrl}/api/routes?tokenIn=USDC&tokenOut=nNVDA&amountIn=1000000000`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.routeCount).toBeGreaterThan(0);
    expect(data.routes[0].path[1].symbol).toBe('nSPY');
  });

  it('GET /api/quote computes swap quote with execution price', async () => {
    const res = await fetch(`${baseUrl}/api/quote?tokenIn=USDC&tokenOut=nNVDA&amountIn=1000000000`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tokenIn).toBe('USDC');
    expect(data.tokenOut).toBe('nNVDA');
    expect(BigInt(data.expectedOutput)).toBeGreaterThan(0n);
  });

  it('POST /api/swap/simulate simulates transaction execution', async () => {
    const res = await fetch(`${baseUrl}/api/swap/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenIn: 'USDC',
        tokenOut: 'nNVDA',
        amountIn: '1000000000',
        slippage: 50,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.simulation.success).toBe(true);
    expect(data.simulation.status).toBe('CONFIRMED');
    expect(data.simulation.txHash).toMatch(/^0xsim_/);
  });

  it('GET /api/analytics returns protocol metrics and snapshots', async () => {
    const res = await fetch(`${baseUrl}/api/analytics`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stats.totalTvl).toBeGreaterThan(0);
    expect(data.topPools.length).toBeGreaterThan(0);
  });
});
