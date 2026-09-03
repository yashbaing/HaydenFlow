import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { healthRouter } from './routes/health';
import { assetsRouter } from './routes/assets';
import { marketsRouter } from './routes/markets';
import { correlationRouter } from './routes/correlation';
import { quotesRouter } from './routes/quotes';
import { routesRouter } from './routes/routes';
import { swapRouter } from './routes/swap';
import { portfolioRouter } from './routes/portfolio';
import { analyticsRouter } from './routes/analytics';

export function createApp() {
  const app = express();

  // Middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());

  // Request logger
  app.use((req, _res, next) => {
    if (req.path !== '/health') {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Routes
  app.use(healthRouter);
  app.use('/api', assetsRouter);
  app.use('/api', marketsRouter);
  app.use('/api', correlationRouter);
  app.use('/api', quotesRouter);
  app.use('/api', routesRouter);
  app.use('/api', swapRouter);
  app.use('/api', portfolioRouter);
  app.use('/api', analyticsRouter);

  // 404 Handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Global error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API Error]:', err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  });

  return app;
}
