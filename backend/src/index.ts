import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { documentsRouter } from './routes/documents.js';
import { chatRouter } from './routes/chat.js';
import { healthRouter } from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ensureUploadDir } from './utils/fileUtils.js';
import { config } from './config.js';

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);

// Global error handler (must be last)
app.use(errorHandler);

async function bootstrap() {
  await ensureUploadDir(config.uploadDir);
  app.listen(config.port, () => {
    console.log(`✅ StudyRAG backend running on http://localhost:${config.port}`);
    console.log(`   Ollama: ${config.ollama.baseUrl}`);
    console.log(`   DB: ${config.db.host}:${config.db.port}/${config.db.name}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

export default app;
