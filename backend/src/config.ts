import 'dotenv/config';

function requireEnv(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  db: {
    host: requireEnv('DB_HOST', 'localhost'),
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    name: requireEnv('DB_NAME', 'studyrag'),
    user: requireEnv('DB_USER', 'postgres'),
    password: requireEnv('DB_PASSWORD', 'postgres'),
  },

  ollama: {
    baseUrl: requireEnv('OLLAMA_BASE_URL', 'http://localhost:11434'),
    embedModel: requireEnv('OLLAMA_EMBED_MODEL', 'nomic-embed-text'),
    chatModel: requireEnv('OLLAMA_CHAT_MODEL', 'llama3.2:3b'),
  },

  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? '50', 10),
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',

  chunking: {
    chunkSize: parseInt(process.env.CHUNK_SIZE ?? '500', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP ?? '50', 10),
  },
} as const;
