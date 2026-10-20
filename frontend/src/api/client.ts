import type {
  Document,
  DocumentsResponse,
  HealthStatus,
  Message,
  Conversation,
  SSEEvent,
  Source,
} from '../types/index.js';

const BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error || body.message || msg;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ── Health ─────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthStatus> {
  const res = await fetch(`${BASE}/health`);
  return handleResponse<HealthStatus>(res);
}

// ── Documents ──────────────────────────────────────────────────────────────

export async function listDocuments(params?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<DocumentsResponse> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));

  const res = await fetch(`${BASE}/documents?${qs}`);
  return handleResponse<DocumentsResponse>(res);
}

export async function getDocument(id: string): Promise<Document> {
  const res = await fetch(`${BASE}/documents/${id}`);
  return handleResponse<Document>(res);
}

export async function uploadDocument(
  file: File,
  title?: string,
  onProgress?: (pct: number) => void
): Promise<Document> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/documents`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as Document);
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(body.error || `Upload failed: ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${BASE}/documents/${id}`, { method: 'DELETE' });
  await handleResponse<{ message: string }>(res);
}

// ── Chat ───────────────────────────────────────────────────────────────────

export function sendChatMessage(
  params: {
    message: string;
    conversationId?: string;
    documentIds?: string[];
    topK?: number;
  },
  callbacks: {
    onMeta?: (conversationId: string, sources: Source[]) => void;
    onToken?: (token: string) => void;
    onDone?: () => void;
    onError?: (err: string) => void;
  }
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = `Chat error: ${res.status}`;
        try {
          const body = await res.json();
          msg = body.error || msg;
        } catch { /* */ }
        callbacks.onError?.(msg);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as SSEEvent;
            if (event.type === 'meta') {
              callbacks.onMeta?.(event.conversationId, event.sources);
            } else if (event.type === 'token') {
              callbacks.onToken?.(event.content);
            } else if (event.type === 'done') {
              callbacks.onDone?.();
            } else if (event.type === 'error') {
              callbacks.onError?.(event.error);
            }
          } catch { /* ignore malformed SSE */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError?.(err instanceof Error ? err.message : 'Connection failed');
      }
    }
  })();

  return () => controller.abort();
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await fetch(`${BASE}/chat/conversations`);
  const data = await handleResponse<{ conversations: Conversation[] }>(res);
  return data.conversations;
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const res = await fetch(`${BASE}/chat/conversations/${conversationId}/messages`);
  const data = await handleResponse<{ messages: Message[] }>(res);
  return data.messages;
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${BASE}/chat/conversations/${id}`, { method: 'DELETE' });
  await handleResponse<{ message: string }>(res);
}
