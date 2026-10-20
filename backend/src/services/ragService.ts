import { query, getClient } from '../db/pool.js';
import { ollamaService } from './ollamaService.js';
import { splitPagedText } from './chunkingService.js';
import { parseDocument } from './documentParser.js';
import type { DocumentRow } from '../models/document.js';

export interface ProcessResult {
  documentId: string;
  chunkCount: number;
  pageCount: number;
}

/**
 * Full RAG pipeline: parse → chunk → embed → store.
 * Runs asynchronously after the HTTP response is sent.
 */
export async function processDocument(
  documentId: string,
  filePath: string,
  fileType: 'pdf' | 'markdown' | 'txt'
): Promise<ProcessResult> {
  const client = await getClient();
  try {
    // 1. Parse document
    const parsed = await parseDocument(filePath, fileType);

    if (!parsed.fullText || parsed.fullText.trim().length < 10) {
      throw new Error('Document contains no extractable text');
    }

    // 2. Split into chunks
    const chunks = splitPagedText(parsed.pages);

    if (chunks.length === 0) {
      throw new Error('No text chunks could be generated from document');
    }

    // 3. Begin transaction
    await client.query('BEGIN');

    // Delete any existing chunks for this document (idempotent re-processing)
    await client.query('DELETE FROM chunks WHERE document_id = $1', [documentId]);

    // 4. Embed and store each chunk
    for (const chunk of chunks) {
      const embedding = await ollamaService.embed(chunk.content);

      // Format as PostgreSQL vector literal
      const vectorLiteral = `[${embedding.join(',')}]`;

      await client.query(
        `INSERT INTO chunks (document_id, chunk_index, content, page_number, token_count, embedding)
         VALUES ($1, $2, $3, $4, $5, $6::vector)`,
        [
          documentId,
          chunk.chunkIndex,
          chunk.content,
          chunk.pageNumber ?? null,
          chunk.tokenCount,
          vectorLiteral,
        ]
      );
    }

    // 5. Update document status
    await client.query(
      `UPDATE documents
       SET status = 'ready', page_count = $1, chunk_count = $2, updated_at = NOW()
       WHERE id = $3`,
      [parsed.pageCount, chunks.length, documentId]
    );

    await client.query('COMMIT');

    return {
      documentId,
      chunkCount: chunks.length,
      pageCount: parsed.pageCount,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});

    // Mark document as errored
    await query(
      `UPDATE documents SET status = 'error', error_msg = $1, updated_at = NOW() WHERE id = $2`,
      [err instanceof Error ? err.message : 'Unknown processing error', documentId]
    );

    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retrieve the most relevant chunks for a query using vector similarity.
 */
export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentFilename: string;
  content: string;
  pageNumber: number | null;
  chunkIndex: number;
  similarity: number;
}

export async function retrieveRelevantChunks(
  queryEmbedding: number[],
  topK: number = 5,
  documentIds?: string[]
): Promise<RetrievedChunk[]> {
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;

  let whereClause = "d.status = 'ready'";
  const params: unknown[] = [vectorLiteral, topK];

  if (documentIds && documentIds.length > 0) {
    params.push(documentIds);
    whereClause += ` AND c.document_id = ANY($${params.length})`;
  }

  const result = await query<{
    chunk_id: string;
    document_id: string;
    document_title: string;
    document_filename: string;
    content: string;
    page_number: number | null;
    chunk_index: number;
    similarity: number;
  }>(
    `SELECT
       c.id AS chunk_id,
       c.document_id,
       d.title AS document_title,
       d.filename AS document_filename,
       c.content,
       c.page_number,
       c.chunk_index,
       1 - (c.embedding <=> $1::vector) AS similarity
     FROM chunks c
     JOIN documents d ON d.id = c.document_id
     WHERE ${whereClause}
       AND c.embedding IS NOT NULL
     ORDER BY c.embedding <=> $1::vector
     LIMIT $2`,
    params
  );

  return result.rows.map((row) => ({
    chunkId: row.chunk_id,
    documentId: row.document_id,
    documentTitle: row.document_title,
    documentFilename: row.document_filename,
    content: row.content,
    pageNumber: row.page_number,
    chunkIndex: row.chunk_index,
    similarity: parseFloat(String(row.similarity)),
  }));
}
