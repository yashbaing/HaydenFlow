import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface LivePriceTick {
  symbol: string;
  price: number;
  change24h: number;
  timestamp: string;
}

export class WsServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private interval: NodeJS.Timeout | null = null;

  init(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      // Send initial welcome & snapshot
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        message: 'Connected to HaydenFlow Real-Time Liquidity Stream',
        timestamp: new Date().toISOString(),
      }));

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          }
        } catch {
          // ignore
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });

    // Start background live price simulation
    this.startPriceSimulation();
  }

  broadcast(data: any) {
    const payload = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  private startPriceSimulation() {
    const mockPrices: Record<string, number> = {
      nNVDA: 875.40,
      nSPY: 540.25,
      nQQQ: 480.75,
      nTSLA: 178.50,
      nAMZN: 185.20,
      nCOST: 845.00,
      nGOLD: 2350.00,
      WETH: 3250.00,
      WBTC: 68000.00,
      USDC: 1.00,
    };

    const symbols = Object.keys(mockPrices);

    this.interval = setInterval(() => {
      // Pick random asset to update
      const sym = symbols[Math.floor(Math.random() * symbols.length)]!;
      if (sym === 'USDC') return;

      const drift = (Math.random() - 0.495) * 0.004; // small realistic drift
      mockPrices[sym] = Number((mockPrices[sym]! * (1 + drift)).toFixed(2));
      const change24h = Number(((Math.random() - 0.45) * 3).toFixed(2));

      this.broadcast({
        type: 'PRICE_UPDATE',
        data: {
          symbol: sym,
          price: mockPrices[sym],
          change24h,
          timestamp: new Date().toISOString(),
        },
      });
    }, 3000);
  }

  close() {
    if (this.interval) clearInterval(this.interval);
    this.wss?.close();
  }
}

export const wsServer = new WsServer();
