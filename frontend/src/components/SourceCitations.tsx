import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, FileText, Hash } from 'lucide-react';
import type { Source } from '../types/index.js';

interface SourceCitationsProps {
  sources: Source[];
}

function getSimilarityColor(score: number): string {
  if (score >= 0.7) return 'text-emerald-400';
  if (score >= 0.5) return 'text-amber-400';
  return 'text-slate-500';
}

function getSimilarityLabel(score: number): string {
  if (score >= 0.7) return 'High relevance';
  if (score >= 0.5) return 'Medium relevance';
  return 'Low relevance';
}

interface SourceItemProps {
  source: Source;
  index: number;
}

function SourceItem({ source, index }: SourceItemProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = source.content.length > 160
    ? source.content.slice(0, 160) + '…'
    : source.content;

  return (
    <div className="source-card pl-4 bg-surface-700/30 rounded-r-lg border border-white/5 border-l-0 overflow-hidden">
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0 w-5 h-5 bg-brand-600/30 text-brand-400 rounded text-xs font-bold flex items-center justify-center">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-300 truncate">{source.documentTitle}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {source.pageNumber !== null && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <FileText size={10} />
                    Page {source.pageNumber}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-slate-600">
                  <Hash size={10} />
                  Chunk {source.chunkIndex}
                </span>
              </div>
            </div>
          </div>
          <span className={`flex-shrink-0 text-xs font-medium ${getSimilarityColor(source.similarity)}`}
                title={getSimilarityLabel(source.similarity)}>
            {(source.similarity * 100).toFixed(0)}%
          </span>
        </div>

        {/* Content preview */}
        <p className="text-xs text-slate-400 leading-relaxed font-mono">
          {expanded ? source.content : preview}
        </p>

        {/* Expand toggle */}
        {source.content.length > 160 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-2 flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            {expanded ? (
              <><ChevronUp size={12} /> Show less</>
            ) : (
              <><ChevronDown size={12} /> Show more</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-3 animate-fade-in">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-400 mb-2 transition-colors"
      >
        {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        {sources.length} source{sources.length !== 1 ? 's' : ''} retrieved
      </button>

      {!collapsed && (
        <div className="space-y-2">
          {sources.map((source, i) => (
            <SourceItem key={source.chunkId} source={source} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
