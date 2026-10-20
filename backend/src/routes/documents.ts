import { Router } from 'express';
import path from 'path';
import { upload } from '../middleware/upload.js';
import { AppError } from '../middleware/errorHandler.js';
import { query } from '../db/pool.js';
import { processDocument } from '../services/ragService.js';
import { detectFileType } from '../services/documentParser.js';
import { deleteFile } from '../utils/fileUtils.js';
import { listDocumentsSchema, uploadDocumentSchema } from '../validation/schemas.js';
import { toDocumentResponse, type DocumentRow } from '../models/document.js';
import { config } from '../config.js';

export const documentsRouter = Router();

// ── GET /api/documents ──────────────────────────────────────────────────────
documentsRouter.get('/', async (req, res) => {
  const parsed = listDocumentsSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, 'Invalid query parameters', parsed.error.flatten());
  }

  const { status, search, limit, offset } = parsed.data;

  let whereConditions: string[] = [];
  const params: unknown[] = [];

  if (status) {
    params.push(status);
    whereConditions.push(`status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    whereConditions.push(`(LOWER(title) LIKE $${params.length} OR LOWER(filename) LIKE $${params.length})`);
  }

  const where = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  params.push(limit);
  params.push(offset);

  const result = await query<DocumentRow>(
    `SELECT * FROM documents ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) FROM documents ${where}`,
    params.slice(0, params.length - 2)
  );

  res.json({
    documents: result.rows.map(toDocumentResponse),
    total: parseInt(countResult.rows[0]?.count ?? '0', 10),
    limit,
    offset,
  });
});

// ── GET /api/documents/:id ──────────────────────────────────────────────────
documentsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;

  const result = await query<DocumentRow>(
    'SELECT * FROM documents WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'Document not found');
  }

  res.json(toDocumentResponse(result.rows[0]));
});

// ── POST /api/documents ─────────────────────────────────────────────────────
documentsRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    throw new AppError(400, 'No file uploaded');
  }

  const { path: filePath, originalname, size } = req.file;

  // Validate metadata
  const metaParsed = uploadDocumentSchema.safeParse(req.body);
  if (!metaParsed.success) {
    await deleteFile(filePath);
    throw new AppError(400, 'Invalid request body', metaParsed.error.flatten());
  }

  const fileType = detectFileType(originalname);
  if (!fileType) {
    await deleteFile(filePath);
    throw new AppError(400, `Unsupported file type: ${path.extname(originalname)}`);
  }

  if (size === 0) {
    await deleteFile(filePath);
    throw new AppError(400, 'File is empty');
  }

  const title = metaParsed.data.title || path.basename(originalname, path.extname(originalname));

  // Insert document record
  const insertResult = await query<DocumentRow>(
    `INSERT INTO documents (title, filename, file_type, file_size, status)
     VALUES ($1, $2, $3, $4, 'processing')
     RETURNING *`,
    [title, originalname, fileType, size]
  );

  const doc = insertResult.rows[0];

  // Kick off async processing (don't await — respond immediately)
  setImmediate(async () => {
    try {
      const result = await processDocument(doc.id, filePath, fileType);
      console.log(`✅ Document processed: ${doc.id} (${result.chunkCount} chunks)`);
    } catch (err) {
      console.error(`❌ Document processing failed: ${doc.id}`, err);
    }
  });

  res.status(202).json({
    ...toDocumentResponse(doc),
    message: 'Document uploaded. Processing started.',
  });
});

// ── DELETE /api/documents/:id ────────────────────────────────────────────────
documentsRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const result = await query<DocumentRow>(
    'DELETE FROM documents WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, 'Document not found');
  }

  // Attempt to delete the uploaded file (best-effort)
  const doc = result.rows[0];
  const uploadPath = path.join(config.uploadDir, path.basename(doc.filename));
  await deleteFile(uploadPath);

  res.json({ message: 'Document deleted', id });
});

// ── GET /api/documents/:id/chunks ───────────────────────────────────────────
documentsRouter.get('/:id/chunks', async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100);
  const offset = parseInt(String(req.query.offset ?? '0'), 10);

  const docResult = await query<DocumentRow>(
    'SELECT * FROM documents WHERE id = $1',
    [id]
  );

  if (docResult.rows.length === 0) {
    throw new AppError(404, 'Document not found');
  }

  const chunkResult = await query<{
    id: string;
    chunk_index: number;
    content: string;
    page_number: number | null;
    token_count: number;
  }>(
    `SELECT id, chunk_index, content, page_number, token_count
     FROM chunks
     WHERE document_id = $1
     ORDER BY chunk_index
     LIMIT $2 OFFSET $3`,
    [id, limit, offset]
  );

  res.json({
    documentId: id,
    chunks: chunkResult.rows,
    total: docResult.rows[0].chunk_count,
  });
});
