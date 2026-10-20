import { useState, useEffect, useCallback } from 'react';
import { Library, Search, RefreshCw, BookOpen, Plus, CheckSquare, Square } from 'lucide-react';
import { DocumentCard } from './DocumentCard.js';
import { UploadZone } from './UploadZone.js';
import { listDocuments, deleteDocument } from '../api/client.js';
import type { Document } from '../types/index.js';

interface DocumentSidebarProps {
  selectedDocIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDocumentsChange: (docs: Document[]) => void;
}

export function DocumentSidebar({
  selectedDocIds,
  onSelectionChange,
  onDocumentsChange,
}: DocumentSidebarProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());

  const loadDocuments = useCallback(async () => {
    try {
      const data = await listDocuments({ search: search || undefined, limit: 100 });
      setDocuments(data.documents);
      onDocumentsChange(data.documents);
      setError(null);

      // Find documents still processing — start polling
      const stillProcessing = new Set(
        data.documents.filter((d) => d.status === 'processing').map((d) => d.id)
      );
      setPollingIds(stillProcessing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [search, onDocumentsChange]);

  // Initial load and search refresh
  useEffect(() => {
    setLoading(true);
    loadDocuments();
  }, [loadDocuments]);

  // Poll processing documents every 2 seconds
  useEffect(() => {
    if (pollingIds.size === 0) return;
    const interval = setInterval(loadDocuments, 2000);
    return () => clearInterval(interval);
  }, [pollingIds, loadDocuments]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document and all its embeddings?')) return;
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      onSelectionChange(selectedDocIds.filter((sid) => sid !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleSelect = (id: string) => {
    if (selectedDocIds.includes(id)) {
      onSelectionChange(selectedDocIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedDocIds, id]);
    }
  };

  const toggleSelectAll = () => {
    const readyIds = documents.filter((d) => d.status === 'ready').map((d) => d.id);
    if (selectedDocIds.length === readyIds.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(readyIds);
    }
  };

  const readyDocs = documents.filter((d) => d.status === 'ready');
  const allSelected = readyDocs.length > 0 && selectedDocIds.length === readyDocs.length;

  return (
    <aside className="w-72 flex-shrink-0 glass-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-600/20 rounded-lg">
              <Library size={16} className="text-brand-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-200">Knowledge Base</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={loadDocuments}
              className="p-1.5 rounded-lg hover:bg-surface-600 text-slate-500 hover:text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => setShowUpload((v) => !v)}
              className={`p-1.5 rounded-lg transition-colors ${
                showUpload
                  ? 'bg-brand-600/30 text-brand-400'
                  : 'hover:bg-surface-600 text-slate-500 hover:text-slate-300'
              }`}
              title="Upload document"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Upload zone */}
        {showUpload && (
          <div className="mb-3 animate-fade-in">
            <UploadZone
              onUploadComplete={(doc) => {
                setDocuments((prev) => [doc, ...prev]);
                setPollingIds((prev) => new Set([...prev, doc.id]));
                setShowUpload(false);
              }}
            />
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* Select all bar */}
      {documents.length > 0 && (
        <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {allSelected ? (
              <CheckSquare size={12} className="text-brand-400" />
            ) : (
              <Square size={12} />
            )}
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          {selectedDocIds.length > 0 && (
            <span className="text-xs text-brand-400 font-medium">
              {selectedDocIds.length} selected
            </span>
          )}
        </div>
      )}

      {/* Document list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Loading…</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {!loading && !error && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-12 h-12 bg-surface-700 rounded-2xl flex items-center justify-center">
              <BookOpen size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">No documents yet</p>
              <p className="text-xs text-slate-600 mt-0.5">Upload PDF, TXT, or Markdown files</p>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="btn-primary text-xs"
            >
              <Plus size={12} />
              Upload first document
            </button>
          </div>
        )}

        {!loading && documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            isSelected={selectedDocIds.includes(doc.id)}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Footer stats */}
      {documents.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5">
          <p className="text-xs text-slate-600">
            {readyDocs.length} ready · {documents.filter((d) => d.status === 'processing').length} processing
          </p>
        </div>
      )}
    </aside>
  );
}
