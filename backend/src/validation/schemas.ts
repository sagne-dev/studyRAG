import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
});

export const deleteDocumentSchema = z.object({
  id: z.string().uuid('Invalid document ID'),
});

export const listDocumentsSchema = z.object({
  status: z.enum(['processing', 'ready', 'error']).optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(4000, 'Message too long'),
  conversationId: z.string().uuid().optional(),
  documentIds: z.array(z.string().uuid()).max(10).optional(),
  topK: z.number().int().min(1).max(20).default(5),
});

export const conversationIdSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
});
