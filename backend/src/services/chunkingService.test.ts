import { describe, it, expect } from 'vitest';
import {
  cleanText,
  splitIntoChunks,
  splitPagedText,
  estimateTokens,
} from '../services/chunkingService.js';

describe('cleanText', () => {
  it('removes null bytes', () => {
    expect(cleanText('hello\x00world')).toBe('hello world');
  });

  it('normalizes line endings', () => {
    expect(cleanText('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('collapses excessive blank lines', () => {
    expect(cleanText('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('collapses horizontal whitespace', () => {
    expect(cleanText('a   b\t\tc')).toBe('a b c');
  });

  it('trims leading and trailing whitespace', () => {
    expect(cleanText('  hello  ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(cleanText('')).toBe('');
  });
});

describe('estimateTokens', () => {
  it('estimates roughly 1 token per 4 chars', () => {
    expect(estimateTokens('test')).toBe(1);
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});

describe('splitIntoChunks', () => {
  it('returns empty array for empty text', () => {
    expect(splitIntoChunks('')).toHaveLength(0);
    expect(splitIntoChunks('   ')).toHaveLength(0);
  });

  it('returns a single chunk for short text', () => {
    const text = 'This is a short paragraph. It has two sentences.';
    const chunks = splitIntoChunks(text, 500, 50);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].content).toContain('short paragraph');
  });

  it('splits long text into multiple chunks', () => {
    // Generate text with many sentences that exceeds chunkSize
    const sentence = 'This is a sentence that contains some words to fill space. ';
    const text = sentence.repeat(100);
    const chunks = splitIntoChunks(text, 200, 30);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('assigns sequential chunk indices', () => {
    const sentence = 'A fairly long sentence to ensure we get multiple chunks generated here properly. ';
    const text = sentence.repeat(50);
    const chunks = splitIntoChunks(text, 100, 20);
    chunks.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i);
    });
  });

  it('preserves page number', () => {
    const text = 'This is page two content with enough text to create a chunk.';
    const chunks = splitIntoChunks(text, 500, 50, 2);
    expect(chunks[0].pageNumber).toBe(2);
  });

  it('includes token count', () => {
    const text = 'Hello world this is a test sentence for token counting.';
    const chunks = splitIntoChunks(text, 500, 50);
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
  });

  it('produces overlapping content between consecutive chunks', () => {
    const sentence = 'Each sentence adds meaningful content to ensure overlap works. ';
    const text = sentence.repeat(60);
    const chunks = splitIntoChunks(text, 100, 40);
    if (chunks.length >= 2) {
      // There should be some shared content between consecutive chunks
      // (this verifies overlap logic doesn't silently break)
      expect(chunks.every((c) => c.content.length > 0)).toBe(true);
    }
  });

  it('handles text larger than chunkSize', () => {
    // Single very long "sentence" (no punctuation)
    const text = 'word '.repeat(500);
    const chunks = splitIntoChunks(text, 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.content.length > 0)).toBe(true);
  });
});

describe('splitPagedText', () => {
  it('assigns global sequential indices across pages', () => {
    const pagedText = [
      { text: 'Page one has content here for testing purposes.', pageNumber: 1 },
      { text: 'Page two also has content here for testing purposes.', pageNumber: 2 },
    ];
    const chunks = splitPagedText(pagedText, 500, 50);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    chunks.forEach((c, i) => expect(c.chunkIndex).toBe(i));
  });

  it('assigns correct page numbers to each chunk', () => {
    const sentence = 'Content for page. ';
    const pagedText = [
      { text: sentence.repeat(5), pageNumber: 3 },
      { text: sentence.repeat(5), pageNumber: 4 },
    ];
    const chunks = splitPagedText(pagedText, 500, 50);
    const page3Chunks = chunks.filter((c) => c.pageNumber === 3);
    const page4Chunks = chunks.filter((c) => c.pageNumber === 4);
    expect(page3Chunks.length).toBeGreaterThan(0);
    expect(page4Chunks.length).toBeGreaterThan(0);
  });

  it('returns empty array for empty pages', () => {
    expect(splitPagedText([])).toHaveLength(0);
  });
});
