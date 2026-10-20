import { CheckCircle2, XCircle, Loader2, Cpu, Database } from 'lucide-react';
import type { HealthStatus } from '../types/index.js';

interface StatusBarProps {
  health: HealthStatus | null;
  loading: boolean;
}

export function StatusBar({ health, loading }: StatusBarProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-700/50 border border-white/5">
        <Loader2 size={12} className="animate-spin text-slate-500" />
        <span className="text-xs text-slate-600">Checking services…</span>
      </div>
    );
  }

  if (!health) return null;

  const dbOk = health.services.database.ok;
  const ollamaOk = health.services.ollama.ok;

  return (
    <div className="flex items-center gap-3">
      {/* Database */}
      <div className="flex items-center gap-1.5" title={health.services.database.error ?? 'PostgreSQL connected'}>
        <Database size={12} className={dbOk ? 'text-emerald-400' : 'text-red-400'} />
        <span className={`text-xs ${dbOk ? 'text-slate-500' : 'text-red-400'}`}>DB</span>
        {dbOk
          ? <CheckCircle2 size={11} className="text-emerald-400" />
          : <XCircle size={11} className="text-red-400" />
        }
      </div>

      <div className="w-px h-3 bg-white/10" />

      {/* Ollama */}
      <div className="flex items-center gap-1.5" title={health.services.ollama.error ?? `Ollama: ${health.services.ollama.models.join(', ')}`}>
        <Cpu size={12} className={ollamaOk ? 'text-emerald-400' : 'text-red-400'} />
        <span className={`text-xs ${ollamaOk ? 'text-slate-500' : 'text-red-400'}`}>Ollama</span>
        {ollamaOk
          ? <CheckCircle2 size={11} className="text-emerald-400" />
          : <XCircle size={11} className="text-red-400" />
        }
      </div>
    </div>
  );
}
