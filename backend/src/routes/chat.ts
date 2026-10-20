import { Router, type Response } from 'express';
import { query } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { ollamaService } from '../services/ollamaService.js';
import { retrieveRelevantChunks } from '../services/ragService.js';
import { chatMessageSchema, conversationIdSchema } from '../validation/schemas.js';
import { toMessageResponse, type MessageRow, type ConversationRow, type Source } from '../models/chat.js';

export const chatRouter = Router();

const SIMILARITY_THRESHOLD = 0.3; // Minimum cosine similarity to include a chunk

// ── POST /api/chat ──────────────────────────────────────────────────────────
chatRouter.post('/', async (req, res) => {
  const parsed = chatMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Invalid request', parsed.error.flatten());
  }

  const { message, conversationId, documentIds, topK } = parsed.data;

  // Get or create conversation
  let convId = conversationId;
  if (!convId) {
    const newConv = await query<ConversationRow>(
      `INSERT INTO conversations (title) VALUES ($1) RETURNING *`,
      [message.substring(0, 80)]
    );
    convId = newConv.rows[0].id;
  } else {
    const existing = await query('SELECT id FROM conversations WHERE id = $1', [convId]);
    if (existing.rows.length === 0) {
      throw new AppError(404, 'Conversation not found');
    }
  }

  // Fetch recent conversation history (last 10 messages)
  const historyResult = await query<MessageRow>(
    `SELECT * FROM messages WHERE conversation_id = $1
     ORDER BY created_at DESC LIMIT 10`,
    [convId]
  );
  const history = historyResult.rows.reverse();

  // Save user message
  await query(
    `INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2)`,
    [convId, message]
  );

  // 1. Embed the user query
  const queryEmbedding = await ollamaService.embed(message);

  // 2. Retrieve relevant chunks
  const retrievedChunks = await retrieveRelevantChunks(queryEmbedding, topK, documentIds);

  // Filter by similarity threshold
  const relevantChunks = retrievedChunks.filter(
    (c) => c.similarity >= SIMILARITY_THRESHOLD
  );

  // 3. Build context
  let contextBlock = '';
  let sources: Source[] = [];

  if (relevantChunks.length > 0) {
    sources = relevantChunks.map((chunk) => ({
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      documentTitle: chunk.documentTitle,
      documentFilename: chunk.documentFilename,
      content: chunk.content,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      similarity: chunk.similarity,
    }));

    contextBlock = relevantChunks
      .map((chunk, i) => {
        const pageRef = chunk.pageNumber ? ` (page ${chunk.pageNumber})` : '';
        return `[Source ${i + 1}: "${chunk.documentTitle}"${pageRef}]\n${chunk.content}`;
      })
      .join('\n\n---\n\n');
  }

  // 4. Build messages for LLM
  const systemPrompt = relevantChunks.length > 0
    ? `You are a helpful knowledge assistant. Answer the user's question using ONLY the provided context passages below. Be accurate and cite which source you are drawing from (e.g., "According to Source 1..."). If the context does not contain enough information to answer the question, say so clearly — do not fabricate information.

CONTEXT:
${contextBlock}`
    : `You are a helpful assistant. The user has asked a question but no relevant documents were found in their knowledge base. Let them know their uploaded documents don't contain relevant information for this query, and answer from general knowledge if appropriate. Be transparent about when you're using general knowledge vs. retrieved documents.`;

  const llmMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ];

  // 5. Set up SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send conversation ID and sources first
  res.write(`data: ${JSON.stringify({ type: 'meta', conversationId: convId, sources })}\n\n`);

  // 6. Stream the LLM response
  let fullResponse = '';
  try {
    await ollamaService.chat(llmMessages, (token) => {
      fullResponse += token;
      res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'LLM generation failed';
    res.write(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`);
    res.end();
    return;
  }

  // 7. Save assistant message with sources
  await query(
    `INSERT INTO messages (conversation_id, role, content, sources) VALUES ($1, 'assistant', $2, $3)`,
    [convId, fullResponse, sources.length > 0 ? JSON.stringify(sources) : null]
  );

  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
});

// ── GET /api/chat/conversations ─────────────────────────────────────────────
chatRouter.get('/conversations', async (_req, res) => {
  const result = await query<ConversationRow>(
    `SELECT c.*, COUNT(m.id)::int AS message_count
     FROM conversations c
     LEFT JOIN messages m ON m.conversation_id = c.id
     GROUP BY c.id
     ORDER BY c.updated_at DESC
     LIMIT 50`
  );
  res.json({ conversations: result.rows });
});

// ── GET /api/chat/conversations/:id/messages ────────────────────────────────
chatRouter.get('/conversations/:id/messages', async (req, res) => {
  const parsed = conversationIdSchema.safeParse({ conversationId: req.params.id });
  if (!parsed.success) {
    throw new AppError(400, 'Invalid conversation ID');
  }

  const { conversationId } = parsed.data;
  const existing = await query('SELECT id FROM conversations WHERE id = $1', [conversationId]);
  if (existing.rows.length === 0) {
    throw new AppError(404, 'Conversation not found');
  }

  const result = await query<MessageRow>(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  );

  res.json({ messages: result.rows.map(toMessageResponse) });
});

// ── DELETE /api/chat/conversations/:id ──────────────────────────────────────
chatRouter.delete('/conversations/:id', async (req, res) => {
  const parsed = conversationIdSchema.safeParse({ conversationId: req.params.id });
  if (!parsed.success) {
    throw new AppError(400, 'Invalid conversation ID');
  }

  const { conversationId } = parsed.data;
  const result = await query(
    'DELETE FROM conversations WHERE id = $1 RETURNING id',
    [conversationId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'Conversation not found');
  }

  res.json({ message: 'Conversation deleted', id: conversationId });
});
