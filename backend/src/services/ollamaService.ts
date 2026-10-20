import { config } from '../config.js';

export interface OllamaEmbedResponse {
  embedding: number[];
}

export interface OllamaChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaChatResponse {
  message: OllamaChatMessage;
  done: boolean;
}

export class OllamaService {
  private baseUrl: string;
  private embedModel: string;
  private chatModel: string;

  constructor() {
    this.baseUrl = config.ollama.baseUrl;
    this.embedModel = config.ollama.embedModel;
    this.chatModel = config.ollama.chatModel;
  }

  /**
   * Generate an embedding vector for the given text.
   */
  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.embedModel, prompt: text }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama embed error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as OllamaEmbedResponse;
    if (!data.embedding || data.embedding.length === 0) {
      throw new Error('Ollama returned empty embedding');
    }
    return data.embedding;
  }

  /**
   * Generate a chat completion with streaming support.
   */
  async chat(
    messages: OllamaChatMessage[],
    onToken?: (token: string) => void
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.chatModel,
        messages,
        stream: !!onToken,
        options: {
          temperature: 0.3,
          num_predict: 1024,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama chat error (${response.status}): ${error}`);
    }

    if (onToken && response.body) {
      // Streaming mode
      let fullText = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as OllamaChatResponse;
            if (parsed.message?.content) {
              onToken(parsed.message.content);
              fullText += parsed.message.content;
            }
          } catch {
            // Ignore JSON parse errors in stream
          }
        }
      }
      return fullText;
    } else {
      // Non-streaming
      const data = (await response.json()) as OllamaChatResponse;
      return data.message?.content ?? '';
    }
  }

  /**
   * Check if Ollama is reachable and models are available.
   */
  async healthCheck(): Promise<{ ok: boolean; models: string[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return { ok: false, models: [], error: `HTTP ${response.status}` };
      }
      const data = (await response.json()) as { models: Array<{ name: string }> };
      const models = data.models?.map((m) => m.name) ?? [];
      return { ok: true, models };
    } catch (err) {
      return {
        ok: false,
        models: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}

export const ollamaService = new OllamaService();
