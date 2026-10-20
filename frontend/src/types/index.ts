// ── Document types ─────────────────────────────────────────────────────────

export type FileType = 'pdf' | 'markdown' | 'txt';
export type DocumentStatus = 'processing' | 'ready' | 'error';

export interface Document {
  id: string;
  title: string;
  filename: string;
  fileType: FileType;
  fileSize: number;
  status: DocumentStatus;
  errorMsg: string | null;
  pageCount: number | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentsResponse {
  documents: Document[];
  total: number;
  limit: number;
  offset: number;
}

// ── Chat types ─────────────────────────────────────────────────────────────

export interface Source {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentFilename: string;
  content: string;
  pageNumber: number | null;
  chunkIndex: number;
  similarity: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[] | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

// Local message state (includes streaming state)
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[] | null;
  isStreaming?: boolean;
  createdAt: string;
}

// SSE event types
export type SSEEvent =
  | { type: 'meta'; conversationId: string; sources: Source[] }
  | { type: 'token'; content: string }
  | { type: 'done' }
  | { type: 'error'; error: string };

// ── Health types ───────────────────────────────────────────────────────────

export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: { ok: boolean; error?: string };
    ollama: { ok: boolean; models: string[]; error?: string };
  };
}
