import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import { cleanText } from './chunkingService.js';

export interface ParsedDocument {
  fullText: string;
  pages: Array<{ text: string; pageNumber: number }>;
  pageCount: number;
}

/**
 * Parse a PDF file, extracting text per page.
 */
export async function parsePdf(filePath: string): Promise<ParsedDocument> {
  const buffer = await fs.readFile(filePath);
  
  const pages: Array<{ text: string; pageNumber: number }> = [];
  let pageCount = 0;

  // pdf-parse callback to capture per-page text
  const data = await pdfParse(buffer, {
    pagerender(pageData: { getTextContent: () => Promise<{ items: Array<{ str: string; hasEOL: boolean }> }> }) {
      return pageData
        .getTextContent()
        .then((textContent: { items: Array<{ str: string; hasEOL: boolean }> }) => {
          pageCount++;
          let pageText = '';
          for (const item of textContent.items) {
            pageText += item.str;
            if (item.hasEOL) pageText += '\n';
          }
          pages.push({ text: cleanText(pageText), pageNumber: pageCount });
          return pageText;
        });
    },
  });

  // Fallback if pagerender didn't fire correctly
  if (pages.length === 0) {
    const cleaned = cleanText(data.text);
    pages.push({ text: cleaned, pageNumber: 1 });
    pageCount = data.numpages || 1;
  }

  return {
    fullText: pages.map((p) => p.text).join('\n\n'),
    pages,
    pageCount: data.numpages || pageCount,
  };
}

/**
 * Parse a Markdown file.
 */
export async function parseMarkdown(filePath: string): Promise<ParsedDocument> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const cleaned = cleanText(raw);
  return {
    fullText: cleaned,
    pages: [{ text: cleaned, pageNumber: 1 }],
    pageCount: 1,
  };
}

/**
 * Parse a plain text file.
 */
export async function parseTxt(filePath: string): Promise<ParsedDocument> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const cleaned = cleanText(raw);
  return {
    fullText: cleaned,
    pages: [{ text: cleaned, pageNumber: 1 }],
    pageCount: 1,
  };
}

/**
 * Parse a document file based on its extension.
 */
export async function parseDocument(
  filePath: string,
  fileType: 'pdf' | 'markdown' | 'txt'
): Promise<ParsedDocument> {
  switch (fileType) {
    case 'pdf':
      return parsePdf(filePath);
    case 'markdown':
      return parseMarkdown(filePath);
    case 'txt':
      return parseTxt(filePath);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Detect file type from extension.
 */
export function detectFileType(filename: string): 'pdf' | 'markdown' | 'txt' | null {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.md' || ext === '.markdown') return 'markdown';
  if (ext === '.txt') return 'txt';
  return null;
}
