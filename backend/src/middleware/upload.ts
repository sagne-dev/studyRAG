import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { AppError } from './errorHandler.js';
import type { Request } from 'express';

const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/octet-stream', // Some systems send this for .md files
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt', '.md', '.markdown']);

const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename(_req: Request, file, cb) {
    // Sanitize filename: strip path traversal, keep extension, prefix with UUID
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    cb(new AppError(400, `File type not allowed. Supported: PDF, TXT, MD`));
    return;
  }

  // Accept if mimetype or extension is valid
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
    files: 1,
  },
});
