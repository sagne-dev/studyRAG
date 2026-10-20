import fs from 'fs/promises';
import path from 'path';

/**
 * Ensure an upload directory exists, creating it recursively if needed.
 */
export async function ensureUploadDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'EEXIST') throw err;
  }
}

/**
 * Delete a file, ignoring errors if it doesn't exist.
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') {
      console.warn(`Could not delete file ${filePath}:`, e.message);
    }
  }
}

/**
 * Safely resolve a path within a base directory, preventing path traversal.
 */
export function safeResolvePath(baseDir: string, filename: string): string {
  const resolved = path.resolve(baseDir, filename);
  const base = path.resolve(baseDir);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

/**
 * Get file size in bytes.
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stat = await fs.stat(filePath);
  return stat.size;
}
