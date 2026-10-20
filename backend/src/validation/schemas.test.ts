import { describe, it, expect } from 'vitest';
import {
  uploadDocumentSchema,
  listDocumentsSchema,
  chatMessageSchema,
  conversationIdSchema,
} from '../validation/schemas.js';

describe('uploadDocumentSchema', () => {
  it('accepts valid title', () => {
    const result = uploadDocumentSchema.safeParse({ title: 'My Document' });
    expect(result.success).toBe(true);
  });

  it('accepts missing title (optional)', () => {
    const result = uploadDocumentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = uploadDocumentSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title over 255 chars', () => {
    const result = uploadDocumentSchema.safeParse({ title: 'a'.repeat(256) });
    expect(result.success).toBe(false);
  });
});

describe('listDocumentsSchema', () => {
  it('uses defaults when no params provided', () => {
    const result = listDocumentsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(0);
    }
  });

  it('accepts valid status filter', () => {
    const result = listDocumentsSchema.safeParse({ status: 'ready' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = listDocumentsSchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('coerces string limit to number', () => {
    const result = listDocumentsSchema.safeParse({ limit: '25' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
    }
  });

  it('rejects limit over 100', () => {
    const result = listDocumentsSchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });
});

describe('chatMessageSchema', () => {
  it('accepts valid message', () => {
    const result = chatMessageSchema.safeParse({ message: 'What is RAG?' });
    expect(result.success).toBe(true);
  });

  it('rejects empty message', () => {
    const result = chatMessageSchema.safeParse({ message: '' });
    expect(result.success).toBe(false);
  });

  it('rejects message over 4000 chars', () => {
    const result = chatMessageSchema.safeParse({ message: 'a'.repeat(4001) });
    expect(result.success).toBe(false);
  });

  it('accepts optional documentIds array', () => {
    const result = chatMessageSchema.safeParse({
      message: 'Hello',
      documentIds: ['550e8400-e29b-41d4-a716-446655440000'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID in documentIds', () => {
    const result = chatMessageSchema.safeParse({
      message: 'Hello',
      documentIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 10 document IDs', () => {
    const ids = Array(11).fill('550e8400-e29b-41d4-a716-446655440000');
    const result = chatMessageSchema.safeParse({ message: 'Hello', documentIds: ids });
    expect(result.success).toBe(false);
  });

  it('applies default topK of 5', () => {
    const result = chatMessageSchema.safeParse({ message: 'Hello' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.topK).toBe(5);
  });
});

describe('conversationIdSchema', () => {
  it('accepts valid UUID', () => {
    const result = conversationIdSchema.safeParse({
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = conversationIdSchema.safeParse({ conversationId: 'abc-123' });
    expect(result.success).toBe(false);
  });
});
