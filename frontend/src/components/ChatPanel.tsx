import { useState, useRef, useCallback, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, Bot, Sparkles } from 'lucide-react';
import { ChatBubble, ChatScrollAnchor } from './ChatBubble.js';
import { ChatInput } from './ChatInput.js';
import { sendChatMessage, getConversationMessages, deleteConversation } from '../api/client.js';
import type { ChatMessage, Source } from '../types/index.js';

interface ChatPanelProps {
  selectedDocIds: string[];
  onFilterClick: () => void;
}

const WELCOME_SUGGESTIONS = [
  'Summarize the main topics in my documents',
  'What are the key concepts covered?',
  'Explain the most important findings',
  'What questions can I answer with these documents?',
];

export function ChatPanel({ selectedDocIds, onFilterClick }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const handleSend = useCallback(
    (userMessage: string) => {
      setError(null);

      // Add user message immediately
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userMessage,
        sources: null,
        createdAt: new Date().toISOString(),
      };

      // Add placeholder assistant message
      const assistantId = `assistant-${Date.now()}`;
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        sources: null,
        isStreaming: true,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setIsStreaming(true);

      let currentSources: Source[] = [];

      const stop = sendChatMessage(
        {
          message: userMessage,
          conversationId,
          documentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
          topK: 5,
        },
        {
          onMeta(convId, sources) {
            setConversationId(convId);
            currentSources = sources;
          },
          onToken(token) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + token }
                  : m
              )
            );
          },
          onDone() {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, isStreaming: false, sources: currentSources }
                  : m
              )
            );
            setIsStreaming(false);
          },
          onError(err) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: `⚠️ Error: ${err}`,
                      isStreaming: false,
                      sources: [],
                    }
                  : m
              )
            );
            setIsStreaming(false);
            setError(err);
          },
        }
      );

      stopRef.current = stop;
    },
    [conversationId, selectedDocIds]
  );

  const handleStop = () => {
    stopRef.current?.();
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
    setIsStreaming(false);
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(undefined);
    setError(null);
  };

  return (
    <div className="flex-1 glass-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-surface-800/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brand-600/20 rounded-lg">
            <MessageSquare size={16} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-200">AI Assistant</h2>
            {conversationId && (
              <p className="text-xs text-slate-600 truncate max-w-[200px]">
                Conversation active
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversationId && (
            <button
              onClick={async () => {
                if (confirm('Delete this conversation?')) {
                  await deleteConversation(conversationId).catch(() => {});
                  handleNewConversation();
                }
              }}
              className="btn-danger"
              title="Delete conversation"
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
          <button onClick={handleNewConversation} className="btn-secondary text-xs py-1.5 px-3">
            <Plus size={13} />
            New chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in">
            {/* Welcome */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-brand-600/30 to-purple-600/30 rounded-2xl flex items-center justify-center border border-brand-500/20">
                <Sparkles size={28} className="text-brand-400" />
              </div>
              <h3 className="text-xl font-semibold gradient-text">StudyRAG</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Ask questions about your uploaded documents. Answers are grounded in your knowledge base with verifiable citations.
              </p>
            </div>

            {/* Suggestion chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {WELCOME_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left px-4 py-3 bg-surface-700/40 hover:bg-surface-700/80 border border-white/5 hover:border-brand-500/20 rounded-xl text-xs text-slate-400 hover:text-slate-300 transition-all duration-200"
                >
                  {s}
                </button>
              ))}
            </div>

            {selectedDocIds.length > 0 && (
              <p className="text-xs text-brand-400 bg-brand-600/10 border border-brand-500/20 rounded-lg px-3 py-1.5">
                🎯 Searching {selectedDocIds.length} selected document{selectedDocIds.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            <ChatScrollAnchor deps={[messages.length, messages[messages.length - 1]?.content]} />
          </>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 p-2.5 bg-red-900/20 border border-red-800/30 rounded-lg">
          <p className="text-xs text-red-300">⚠️ {error}</p>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        isStreaming={isStreaming}
        onStop={handleStop}
        selectedDocCount={selectedDocIds.length}
        onFilterClick={onFilterClick}
      />
    </div>
  );
}
