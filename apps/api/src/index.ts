import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { wsServer } from './websocket/server';

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize WebSocket server on same HTTP port
  wsServer.init(server);

  server.listen(config.port, () => {
    console.log(`
┌────────────────────────────────────────────────────────┐
│                                                        │
│   HAYDENFLOW BACKEND API & WEBSOCKET SERVER            │
│   Programmable Liquidity for Tokenized Markets         │
│                                                        │
│   HTTP API:    http://localhost:${config.port}                │
│   WebSocket:   ws://localhost:${config.port}/ws               │
│   Health Check: http://localhost:${config.port}/health          │
│   Database:    SQLite (Prisma)                         │
│   Environment: ${config.nodeEnv.padEnd(16)}                │
│                                                        │
└────────────────────────────────────────────────────────┘
    `);
  });

  const shutdown = () => {
    console.log('\nGracefully shutting down HaydenFlow API server...');
    wsServer.close();
    server.close(() => {
      console.log('Server closed. Goodbye.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start HaydenFlow API server:', err);
  process.exit(1);
});
