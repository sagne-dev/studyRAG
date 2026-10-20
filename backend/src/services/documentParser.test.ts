import { describe, it, expect } from 'vitest';
import { detectFileType } from '../services/documentParser.js';

describe('detectFileType', () => {
  it('detects PDF files', () => {
    expect(detectFileType('document.pdf')).toBe('pdf');
    expect(detectFileType('DOCUMENT.PDF')).toBe('pdf');
  });

  it('detects Markdown files', () => {
    expect(detectFileType('readme.md')).toBe('markdown');
    expect(detectFileType('notes.markdown')).toBe('markdown');
    expect(detectFileType('FILE.MD')).toBe('markdown');
  });

  it('detects TXT files', () => {
    expect(detectFileType('notes.txt')).toBe('txt');
    expect(detectFileType('FILE.TXT')).toBe('txt');
  });

  it('returns null for unsupported types', () => {
    expect(detectFileType('image.png')).toBeNull();
    expect(detectFileType('data.csv')).toBeNull();
    expect(detectFileType('noextension')).toBeNull();
    expect(detectFileType('file.docx')).toBeNull();
  });
});
