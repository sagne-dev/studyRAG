import { config } from '../config.js';

export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber?: number;
  tokenCount: number;
}

/**
 * Estimate token count using rough approximation (1 token ≈ 4 chars).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Clean raw text by removing excessive whitespace, null bytes, and control chars.
 */
export function cleanText(text: string): string {
  return text
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ') // Collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive blank lines
    .replace(/[^\x09\x0A\x20-\x7E\x80-\xFF]/g, '') // Remove non-printable except tab/newline
    .trim();
}

/**
 * Split text into overlapping chunks by sentence boundaries.
 * Respects paragraph structure and sentence endings.
 */
export function splitIntoChunks(
  text: string,
  chunkSize: number = config.chunking.chunkSize,
  chunkOverlap: number = config.chunking.chunkOverlap,
  pageNumber?: number
): TextChunk[] {
  if (!text || text.trim().length === 0) return [];

  const cleaned = cleanText(text);
  if (cleaned.length === 0) return [];

  // Split by paragraph breaks first, then by sentences
  const paragraphs = cleaned.split(/\n{2,}/);
  const sentences: string[] = [];

  for (const para of paragraphs) {
    const stripped = para.trim();
    if (!stripped) continue;

    // Split paragraph into sentences
    const sentenceMatches = stripped.match(/[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [stripped];
    for (const s of sentenceMatches) {
      const trimmed = s.trim();
      if (trimmed) sentences.push(trimmed);
    }
  }

  if (sentences.length === 0) return [];

  const chunks: TextChunk[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceLength = sentence.length;

    // If single sentence is larger than chunkSize, split it by words
    if (sentenceLength > chunkSize * 4) {
      // Flush current chunk
      if (currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join(' '),
          chunkIndex: chunkIndex++,
          pageNumber,
          tokenCount: estimateTokens(currentChunk.join(' ')),
        });
        currentChunk = [];
        currentLength = 0;
      }
      // Split oversized sentence by words
      const words = sentence.split(/\s+/);
      let wordChunk: string[] = [];
      let wordLength = 0;
      for (const word of words) {
        if (wordLength + word.length + 1 > chunkSize * 4) {
          if (wordChunk.length > 0) {
            chunks.push({
              content: wordChunk.join(' '),
              chunkIndex: chunkIndex++,
              pageNumber,
              tokenCount: estimateTokens(wordChunk.join(' ')),
            });
          }
          wordChunk = [word];
          wordLength = word.length;
        } else {
          wordChunk.push(word);
          wordLength += word.length + 1;
        }
      }
      if (wordChunk.length > 0) {
        chunks.push({
          content: wordChunk.join(' '),
          chunkIndex: chunkIndex++,
          pageNumber,
          tokenCount: estimateTokens(wordChunk.join(' ')),
        });
      }
      continue;
    }

    if (currentLength + sentenceLength > chunkSize * 4 && currentChunk.length > 0) {
      // Save current chunk
      const chunkText = currentChunk.join(' ');
      chunks.push({
        content: chunkText,
        chunkIndex: chunkIndex++,
        pageNumber,
        tokenCount: estimateTokens(chunkText),
      });

      // Overlap: keep last N sentences
      const overlapSentences: string[] = [];
      let overlapLength = 0;
      for (let j = currentChunk.length - 1; j >= 0; j--) {
        const s = currentChunk[j];
        if (overlapLength + s.length > chunkOverlap * 4) break;
        overlapSentences.unshift(s);
        overlapLength += s.length;
      }
      currentChunk = overlapSentences;
      currentLength = overlapLength;
    }

    currentChunk.push(sentence);
    currentLength += sentenceLength;
  }

  // Push remaining sentences
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ');
    chunks.push({
      content: chunkText,
      chunkIndex: chunkIndex++,
      pageNumber,
      tokenCount: estimateTokens(chunkText),
    });
  }

  return chunks;
}

/**
 * Split text that has page boundaries marked with `[PAGE:n]` markers.
 */
export function splitPagedText(
  pagedText: Array<{ text: string; pageNumber: number }>,
  chunkSize?: number,
  chunkOverlap?: number
): TextChunk[] {
  const allChunks: TextChunk[] = [];
  let globalIndex = 0;

  for (const { text, pageNumber } of pagedText) {
    const pageChunks = splitIntoChunks(text, chunkSize, chunkOverlap, pageNumber);
    for (const chunk of pageChunks) {
      allChunks.push({ ...chunk, chunkIndex: globalIndex++ });
    }
  }

  return allChunks;
}
