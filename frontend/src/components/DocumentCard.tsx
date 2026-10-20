import { FileText, FileCode, File, CheckCircle, Clock, AlertCircle, Trash2, ChevronRight } from 'lucide-react';
import type { Document } from '../types/index.js';

interface DocumentCardProps {
  doc: Document;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function FileIcon({ type }: { type: Document['fileType'] }) {
  if (type === 'pdf') return <FileText size={14} className="text-red-400" />;
  if (type === 'markdown') return <FileCode size={14} className="text-blue-400" />;
  return <File size={14} className="text-slate-400" />;
}

function StatusBadge({ status, errorMsg }: { status: Document['status']; errorMsg: string | null }) {
  if (status === 'ready') {
    return (
      <span className="badge-ready">
        <CheckCircle size={10} />
        Ready
      </span>
    );
  }
  if (status === 'processing') {
    return (
      <span className="badge-processing">
        <Clock size={10} className="animate-spin-slow" />
        Processing
      </span>
    );
  }
  return (
    <span className="badge-error" title={errorMsg ?? undefined}>
      <AlertCircle size={10} />
      Error
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentCard({ doc, isSelected, onSelect, onDelete }: DocumentCardProps) {
  return (
    <div
      className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
        isSelected
          ? 'bg-brand-600/20 border-brand-500/40 shadow-lg shadow-brand-600/10'
          : 'bg-surface-700/40 border-white/5 hover:bg-surface-700/70 hover:border-white/10'
      }`}
      onClick={() => onSelect(doc.id)}
    >
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 p-1.5 rounded-md ${isSelected ? 'bg-brand-600/30' : 'bg-surface-600/50'}`}>
          <FileIcon type={doc.fileType} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm font-medium text-slate-200 truncate">{doc.title}</p>
            {isSelected && <ChevronRight size={12} className="text-brand-400 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={doc.status} errorMsg={doc.errorMsg} />
            {doc.status === 'ready' && (
              <span className="text-xs text-slate-500">
                {doc.chunkCount} chunks
                {doc.pageCount ? ` · ${doc.pageCount}p` : ''}
              </span>
            )}
            <span className="text-xs text-slate-600">{formatBytes(doc.fileSize)}</span>
          </div>
        </div>

        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-900/30 text-slate-600 hover:text-red-400"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(doc.id);
          }}
          title="Delete document"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
