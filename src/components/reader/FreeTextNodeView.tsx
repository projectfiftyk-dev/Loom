import { useState } from 'react';
import { Send, Lightbulb, AlertCircle, CheckCircle } from 'lucide-react';
import type { FreeTextNode } from '../../types/story';
import { useApp } from '../../context/AppContext';
import { evaluateFreeText } from '../../api/client';
import clsx from 'clsx';

interface Props {
  node: FreeTextNode;
  isDark: boolean;
  onNavigate: (nodeId: string) => void;
  maxAttempts: number;
}

type EvalState = 'idle' | 'loading' | 'success' | 'fail';

export default function FreeTextNodeView({ node, onNavigate, maxAttempts }: Props) {
  const { llmProvider, apiKey } = useApp();
  const [input, setInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [evalState, setEvalState] = useState<EvalState>('idle');
  const [evalReason, setEvalReason] = useState('');

  const limit = node.max_attempts ?? maxAttempts;

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setEvalState('loading');

    try {
      const result = await evaluateFreeText(llmProvider, apiKey, node.prompt, node.goal, input.trim());
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setEvalReason(result.reason);

      if (result.success) {
        setEvalState('success');
        setTimeout(() => onNavigate(node.on_success), 1200);
      } else {
        setEvalState('fail');
        if (newAttempts >= limit) {
          const fallback = node.on_exhausted || node.on_success;
          setTimeout(() => onNavigate(fallback), 1500);
        }
      }
    } catch {
      setEvalState('fail');
      setEvalReason('Could not evaluate — continuing anyway.');
      setTimeout(() => onNavigate(node.on_success), 1500);
    }
  };

  const handleRetry = () => {
    setEvalState('idle');
    setInput('');
    if (evalState === 'fail' && attempts < limit) {
      onNavigate(node.on_fail);
    }
  };

  return (
    <div className="px-6 pt-4 pb-5 flex flex-col gap-3">
      {/* Prompt + attempt counter */}
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-white/80 text-sm font-medium leading-snug flex-1">
          {node.prompt}
        </p>
        <span className="text-white/25 text-[10px] flex-shrink-0">
          {attempts}/{limit}
        </span>
      </div>

      {/* Hint */}
      {node.hint && evalState === 'idle' && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300/80 text-xs">
          <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{node.hint}</span>
        </div>
      )}

      {/* Feedback */}
      {evalState === 'success' && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{evalReason || 'Correct! Moving on…'}</span>
        </div>
      )}

      {evalState === 'fail' && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{evalReason || 'Not quite — try again.'}</span>
        </div>
      )}

      {/* Input + submit */}
      {evalState !== 'success' && attempts < limit && (
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your response…"
            rows={2}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit(); }}
            className={clsx(
              'flex-1 rounded-xl px-4 py-3 text-sm resize-none outline-none',
              'bg-white/5 border border-white/10 text-white placeholder:text-white/25',
              'focus:border-violet-500/60 transition-colors'
            )}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || evalState === 'loading'}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-all active:scale-[0.95] disabled:opacity-30 mb-0.5"
          >
            {evalState === 'loading' ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {/* Retry */}
      {evalState === 'fail' && attempts < limit && (
        <button
          onClick={handleRetry}
          className="text-xs text-violet-400 hover:text-violet-300 underline self-start"
        >
          Try again
        </button>
      )}
    </div>
  );
}
