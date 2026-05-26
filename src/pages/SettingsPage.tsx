import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, BookOpen, Moon, Sun, Zap, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import clsx from 'clsx';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme, llmProvider, setLlmProvider, apiKey, setApiKey } = useApp();
  const [showKey, setShowKey] = useState(false);

  const isDark = theme === 'dark';

  return (
    <div className={clsx(
      'min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300',
      isDark ? 'bg-[#0C0B1A]' : 'bg-[#F5F3FF]'
    )}>
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={clsx(
          'absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-20',
          isDark ? 'bg-violet-600' : 'bg-violet-300'
        )} />
      </div>

      {/* Hero */}
      <div className="relative z-10 text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            isDark ? 'bg-violet-600' : 'bg-violet-600'
          )}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className={clsx(
            'text-xs font-semibold tracking-[0.25em] uppercase',
            isDark ? 'text-violet-400' : 'text-violet-600'
          )}>
            A Loom Experience
          </span>
        </div>
        <h1 className={clsx(
          'text-7xl font-black tracking-tight mb-3',
          isDark
            ? 'text-transparent bg-clip-text bg-gradient-to-br from-violet-300 via-violet-400 to-purple-600'
            : 'text-transparent bg-clip-text bg-gradient-to-br from-violet-600 via-violet-700 to-purple-900'
        )}>
          LOOM
        </h1>
        <p className={clsx(
          'text-lg',
          isDark ? 'text-[#8B87B8]' : 'text-violet-500'
        )}>
          Step inside the story.
        </p>
      </div>

      {/* Settings panel */}
      <div className="relative z-10 w-full max-w-md space-y-4">

        {/* Display mode */}
        <div className={clsx(
          'rounded-2xl p-5',
          isDark ? 'bg-[#1E1C30] border border-[#2D2B47]' : 'bg-white border border-[#E2DFFF] shadow-sm'
        )}>
          <h2 className={clsx(
            'text-xs font-semibold tracking-widest uppercase mb-4',
            isDark ? 'text-[#8B87B8]' : 'text-violet-500'
          )}>
            Display
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={clsx(
                'flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200',
                theme === 'dark'
                  ? 'border-violet-500 bg-violet-600/10'
                  : isDark
                    ? 'border-[#2D2B47] hover:border-violet-500/40'
                    : 'border-[#E2DFFF] hover:border-violet-300'
              )}
            >
              <Moon className={clsx('w-5 h-5', isDark ? 'text-violet-400' : 'text-violet-600')} />
              <div className="text-left">
                <div className={clsx('font-semibold text-sm', isDark ? 'text-white' : 'text-[#1A1839]')}>Dark</div>
                <div className={clsx('text-xs', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>Cinematic</div>
              </div>
            </button>
            <button
              onClick={() => setTheme('light')}
              className={clsx(
                'flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200',
                theme === 'light'
                  ? 'border-violet-500 bg-violet-600/10'
                  : isDark
                    ? 'border-[#2D2B47] hover:border-violet-500/40'
                    : 'border-[#E2DFFF] hover:border-violet-300'
              )}
            >
              <Sun className={clsx('w-5 h-5', isDark ? 'text-amber-400' : 'text-amber-500')} />
              <div className="text-left">
                <div className={clsx('font-semibold text-sm', isDark ? 'text-white' : 'text-[#1A1839]')}>Light</div>
                <div className={clsx('text-xs', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>Vibrant</div>
              </div>
            </button>
          </div>
        </div>

        {/* LLM Provider */}
        <div className={clsx(
          'rounded-2xl p-5',
          isDark ? 'bg-[#1E1C30] border border-[#2D2B47]' : 'bg-white border border-[#E2DFFF] shadow-sm'
        )}>
          <h2 className={clsx(
            'text-xs font-semibold tracking-widest uppercase mb-4',
            isDark ? 'text-[#8B87B8]' : 'text-violet-500'
          )}>
            AI Provider
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(['openai', 'gemini'] as const).map(p => (
              <button
                key={p}
                onClick={() => setLlmProvider(p)}
                className={clsx(
                  'flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200',
                  llmProvider === p
                    ? 'border-violet-500 bg-violet-600/10'
                    : isDark
                      ? 'border-[#2D2B47] hover:border-violet-500/40'
                      : 'border-[#E2DFFF] hover:border-violet-300'
                )}
              >
                <Zap className={clsx('w-5 h-5', llmProvider === p ? 'text-violet-400' : isDark ? 'text-[#8B87B8]' : 'text-violet-400')} />
                <div className="text-left">
                  <div className={clsx('font-semibold text-sm', isDark ? 'text-white' : 'text-[#1A1839]')}>
                    {p === 'openai' ? 'OpenAI' : 'Gemini'}
                  </div>
                  <div className={clsx('text-xs', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
                    {p === 'openai' ? 'GPT-4o mini' : '1.5 Flash'}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* API Key */}
          <div className="relative">
            <label className={clsx(
              'block text-xs font-medium mb-1.5',
              isDark ? 'text-[#8B87B8]' : 'text-violet-500'
            )}>
              API Key <span className={isDark ? 'text-[#5A5780]' : 'text-violet-300'}>(optional — enables AI features)</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={`Enter ${llmProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key…`}
                className={clsx(
                  'w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all',
                  isDark
                    ? 'bg-[#16152B] border border-[#2D2B47] text-white placeholder:text-[#5A5780] focus:border-violet-500'
                    : 'bg-[#F5F3FF] border border-[#E2DFFF] text-[#1A1839] placeholder:text-violet-300 focus:border-violet-400'
                )}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className={clsx(
                  'absolute right-3 top-1/2 -translate-y-1/2',
                  isDark ? 'text-[#5A5780] hover:text-violet-400' : 'text-violet-300 hover:text-violet-500'
                )}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Enter Library button */}
        <button
          onClick={() => navigate('/library')}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white transition-all duration-200 shadow-lg shadow-violet-900/30"
        >
          <BookOpen className="w-5 h-5" />
          Enter Library
        </button>

        <p className={clsx(
          'text-center text-xs pb-2',
          isDark ? 'text-[#5A5780]' : 'text-violet-300'
        )}>
          Place your <code className={isDark ? 'text-violet-400' : 'text-violet-600'}>.yaml</code> story files in the <code className={isDark ? 'text-violet-400' : 'text-violet-600'}>books/</code> folder
        </p>
      </div>
    </div>
  );
}
