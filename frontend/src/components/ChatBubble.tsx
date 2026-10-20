import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Loader2 } from 'lucide-react';
import { SourceCitations } from './SourceCitations.js';
import type { ChatMessage } from '../types/index.js';

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-brand-600 text-white'
            : 'bg-surface-600 text-slate-300 border border-white/10'
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-brand-600 text-white rounded-tr-sm'
              : 'bg-surface-700/60 text-slate-200 rounded-tl-sm border border-white/5'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className={`prose prose-sm prose-invert max-w-none ${
                message.isStreaming ? 'typing-cursor' : ''
              }`}
            >
              {message.isStreaming && !message.content ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs">Thinking…</span>
                </div>
              ) : (
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-surface-900/80 px-1.5 py-0.5 rounded text-brand-300 text-xs font-mono" {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="block bg-surface-900/80 p-3 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto" {...props}>
                          {children}
                        </code>
                      );
                    },
                    p({ children }) {
                      return <p className="mb-2 last:mb-0">{children}</p>;
                    },
                    ul({ children }) {
                      return <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>;
                    },
                    ol({ children }) {
                      return <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>;
                    },
                    strong({ children }) {
                      return <strong className="text-slate-100 font-semibold">{children}</strong>;
                    },
                    blockquote({ children }) {
                      return (
                        <blockquote className="border-l-2 border-brand-500 pl-3 text-slate-400 italic">
                          {children}
                        </blockquote>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && !message.isStreaming && (
          <SourceCitations sources={message.sources} />
        )}

        <span className="text-xs text-slate-600 mt-1 px-1">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

interface ChatScrollAnchorProps {
  deps: unknown[];
}

export function ChatScrollAnchor({ deps }: ChatScrollAnchorProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <div ref={ref} />;
}
