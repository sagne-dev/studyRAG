import { Router } from 'express';
import { query } from '../db/pool.js';
import { ollamaService } from '../services/ollamaService.js';
import { testConnection } from '../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const [dbOk, ollamaStatus] = await Promise.all([
    testConnection(),
    ollamaService.healthCheck(),
  ]);

  const status = dbOk && ollamaStatus.ok ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: {
        ok: dbOk,
        error: dbOk ? undefined : 'Cannot connect to PostgreSQL',
      },
      ollama: {
        ok: ollamaStatus.ok,
        models: ollamaStatus.models,
        error: ollamaStatus.error,
      },
    },
  });
});
