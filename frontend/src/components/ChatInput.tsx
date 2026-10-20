import { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, Filter } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  disabled?: boolean;
  selectedDocCount: number;
  onFilterClick: () => void;
}

export function ChatInput({
  onSend,
  isStreaming,
  onStop,
  disabled,
  selectedDocCount,
  onFilterClick,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  const handleSend = () => {
    const msg = value.trim();
    if (!msg || isStreaming || disabled) return;
    onSend(msg);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-white/5 bg-surface-800/60 backdrop-blur-sm">
      <div className="flex items-end gap-2">
        {/* Filter button */}
        <button
          onClick={onFilterClick}
          className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 border ${
            selectedDocCount > 0
              ? 'bg-brand-600/20 border-brand-500/30 text-brand-400'
              : 'bg-surface-700 border-white/5 text-slate-500 hover:text-slate-300'
          }`}
          title={selectedDocCount > 0 ? `Searching ${selectedDocCount} document(s)` : 'Search all documents'}
        >
          <Filter size={16} />
          {selectedDocCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center">
              {selectedDocCount}
            </span>
          )}
        </button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Waiting for documents to process…' : 'Ask a question about your documents… (Enter to send, Shift+Enter for new line)'}
            rows={1}
            disabled={disabled || isStreaming}
            className="input-base resize-none py-3 pr-12 leading-relaxed min-h-[44px] max-h-[160px]"
          />
        </div>

        {/* Send/Stop */}
        {isStreaming ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 p-2.5 bg-red-700/80 hover:bg-red-600 text-white rounded-xl transition-all duration-200 active:scale-95"
            title="Stop generation"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className="flex-shrink-0 p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand-600/30"
            title="Send (Enter)"
          >
            <Send size={16} />
          </button>
        )}
      </div>

      {selectedDocCount > 0 && (
        <p className="text-xs text-slate-600 mt-2 pl-1">
          Filtering to {selectedDocCount} selected document{selectedDocCount > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
