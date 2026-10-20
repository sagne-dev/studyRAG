import { describe, it, expect } from 'vitest';
import { safeResolvePath, ensureUploadDir } from '../utils/fileUtils.js';
import path from 'path';
import os from 'os';

describe('safeResolvePath', () => {
  const base = 'C:\\uploads';

  it('resolves a valid filename', () => {
    const result = safeResolvePath(base, 'file.pdf');
    expect(result).toContain('file.pdf');
  });

  it('throws on path traversal attempt', () => {
    expect(() => safeResolvePath(base, '../etc/passwd')).toThrow('Path traversal detected');
  });

  it('throws on absolute path attempt', () => {
    // This would resolve outside the base dir
    expect(() => safeResolvePath('/uploads', '../../etc/passwd')).toThrow();
  });
});

describe('ensureUploadDir', () => {
  it('creates a directory without error', async () => {
    const tmpDir = path.join(os.tmpdir(), `studyrag-test-${Date.now()}`);
    await expect(ensureUploadDir(tmpDir)).resolves.toBeUndefined();

    // Calling again (directory exists) should also be fine
    await expect(ensureUploadDir(tmpDir)).resolves.toBeUndefined();
  });
});
