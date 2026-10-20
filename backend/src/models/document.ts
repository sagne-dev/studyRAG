// Type definitions for document-related database rows and API shapes

export interface DocumentRow {
  id: string;
  title: string;
  filename: string;
  file_type: 'pdf' | 'markdown' | 'txt';
  file_size: number;
  status: 'processing' | 'ready' | 'error';
  error_msg: string | null;
  page_count: number | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentResponse {
  id: string;
  title: string;
  filename: string;
  fileType: 'pdf' | 'markdown' | 'txt';
  fileSize: number;
  status: 'processing' | 'ready' | 'error';
  errorMsg: string | null;
  pageCount: number | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export function toDocumentResponse(row: DocumentRow): DocumentResponse {
  return {
    id: row.id,
    title: row.title,
    filename: row.filename,
    fileType: row.file_type,
    fileSize: row.file_size,
    status: row.status,
    errorMsg: row.error_msg,
    pageCount: row.page_count,
    chunkCount: row.chunk_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
