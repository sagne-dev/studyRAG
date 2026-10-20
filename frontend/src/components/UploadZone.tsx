import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { uploadDocument } from '../api/client.js';
import type { Document } from '../types/index.js';

interface UploadZoneProps {
  onUploadComplete: (doc: Document) => void;
}

interface UploadState {
  file: File | null;
  title: string;
  progress: number;
  uploading: boolean;
  error: string | null;
}

const ACCEPTED = '.pdf,.txt,.md,.markdown';
const MAX_MB = 50;

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>({
    file: null,
    title: '',
    progress: 0,
    uploading: false,
    error: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const setFile = (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      setState((s) => ({ ...s, error: `File exceeds ${MAX_MB}MB limit`, file: null }));
      return;
    }
    const defaultTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    setState((s) => ({ ...s, file, title: defaultTitle, error: null }));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFile(file);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!state.file) return;
    setState((s) => ({ ...s, uploading: true, error: null, progress: 0 }));
    try {
      const doc = await uploadDocument(state.file, state.title || undefined, (pct) => {
        setState((s) => ({ ...s, progress: pct }));
      });
      onUploadComplete(doc);
      setState({ file: null, title: '', progress: 0, uploading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        uploading: false,
        error: err instanceof Error ? err.message : 'Upload failed',
      }));
    }
  };

  const clearFile = () => setState((s) => ({ ...s, file: null, error: null, progress: 0 }));

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer ${
          isDragging
            ? 'border-brand-500 bg-brand-600/10 dropzone-active'
            : state.file
            ? 'border-emerald-600/40 bg-emerald-900/10'
            : 'border-surface-500 hover:border-surface-400 hover:bg-surface-700/30'
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !state.file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFileInput}
        />

        {state.file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-900/40 rounded-lg">
                <FileText size={20} className="text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-200 truncate max-w-[180px]">
                  {state.file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(state.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); clearFile(); }}
              className="p-1.5 rounded-lg hover:bg-surface-600 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto w-10 h-10 bg-surface-700 rounded-xl flex items-center justify-center">
              <Upload size={18} className="text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">Drop file here</p>
              <p className="text-xs text-slate-600 mt-0.5">PDF, TXT, or Markdown · Max {MAX_MB}MB</p>
            </div>
            <button
              className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            >
              Browse files
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {state.error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-900/20 border border-red-800/30 rounded-lg">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">{state.error}</p>
        </div>
      )}

      {/* Title input + upload button */}
      {state.file && !state.uploading && (
        <div className="space-y-2 animate-fade-in">
          <input
            type="text"
            className="input-base text-sm"
            placeholder="Document title (optional)"
            value={state.title}
            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleUpload()}
          />
          <button onClick={handleUpload} className="btn-primary w-full justify-center">
            <Upload size={14} />
            Upload Document
          </button>
        </div>
      )}

      {/* Progress */}
      {state.uploading && (
        <div className="space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              Uploading...
            </span>
            <span>{state.progress}%</span>
          </div>
          <div className="h-1.5 bg-surface-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
