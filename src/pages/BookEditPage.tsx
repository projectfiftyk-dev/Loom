import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mic2, FileText, Sparkles, Edit3, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import clsx from 'clsx';

export default function BookEditPage() {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const [bookTitle, setBookTitle] = useState<string>(bookId || '');
  const [scriptSelected, setScriptSelected] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    fetch(`/api/books/${bookId}`)
      .then(r => r.text())
      .then(yamlText => {
        const match = yamlText.match(/title:\s*(.+)/);
        if (match) setBookTitle(match[1].trim().replace(/^["']|["']$/g, ''));
      })
      .catch(() => {});
  }, [bookId]);

  return (
    <div className={clsx(
      'min-h-screen transition-colors duration-300',
      isDark ? 'bg-[#0C0B1A]' : 'bg-[#F5F3FF]'
    )}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={clsx(
          'absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full blur-3xl opacity-10',
          isDark ? 'bg-violet-600' : 'bg-violet-400'
        )} />
      </div>

      <header className={clsx(
        'sticky top-0 z-20 backdrop-blur-md border-b',
        isDark ? 'bg-[#0C0B1A]/80 border-[#2D2B47]' : 'bg-[#F5F3FF]/80 border-[#E2DFFF]'
      )}>
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/library')}
            className={clsx(
              'flex items-center gap-2 text-sm font-medium transition-colors',
              isDark ? 'text-[#8B87B8] hover:text-violet-300' : 'text-violet-500 hover:text-violet-700'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Library
          </button>

          <div className="flex-1 flex items-center gap-2">
            <Sparkles className={clsx('w-4 h-4', isDark ? 'text-violet-400' : 'text-violet-600')} />
            <span className={clsx('font-bold tracking-wide', isDark ? 'text-white' : 'text-[#1A1839]')}>
              LOOM
            </span>
            <span className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>/ Edit</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3',
            isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200'
          )}>
            <Edit3 className="w-3 h-3" />
            Edit Mode
          </div>
          <h1 className={clsx('text-3xl font-bold mb-1', isDark ? 'text-white' : 'text-[#1A1839]')}>
            {bookTitle}
          </h1>
          <p className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>
            Choose what to edit
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Voice Cast */}
          <button
            onClick={() => navigate(`/edit/${bookId}/voices`)}
            className={clsx(
              'group text-left p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
              isDark
                ? 'bg-[#1E1C30] border-[#2D2B47] hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-900/30'
                : 'bg-white border-[#E2DFFF] hover:border-violet-400 hover:shadow-lg hover:shadow-violet-200/50'
            )}
          >
            <div className={clsx(
              'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
              isDark ? 'bg-violet-600/20' : 'bg-violet-100'
            )}>
              <Mic2 className={clsx('w-6 h-6', isDark ? 'text-violet-400' : 'text-violet-600')} />
            </div>
            <h3 className={clsx(
              'font-bold text-lg mb-1 group-hover:text-violet-400 transition-colors',
              isDark ? 'text-white' : 'text-[#1A1839]'
            )}>
              Voice Cast
            </h3>
            <p className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
              Assign ElevenLabs voices to characters and test them
            </p>
          </button>

          {/* Audio Generation */}
          <button
            onClick={() => navigate(`/edit/${bookId}/audio`)}
            className={clsx(
              'group text-left p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
              isDark
                ? 'bg-[#1E1C30] border-[#2D2B47] hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-900/20'
                : 'bg-white border-[#E2DFFF] hover:border-teal-400 hover:shadow-lg hover:shadow-teal-100/50'
            )}
          >
            <div className={clsx(
              'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
              isDark ? 'bg-teal-600/20' : 'bg-teal-50'
            )}>
              <Volume2 className={clsx('w-6 h-6', isDark ? 'text-teal-400' : 'text-teal-600')} />
            </div>
            <h3 className={clsx(
              'font-bold text-lg mb-1 group-hover:text-teal-400 transition-colors',
              isDark ? 'text-white' : 'text-[#1A1839]'
            )}>
              Audio Generation
            </h3>
            <p className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
              Generate voice audio for all dialogue nodes
            </p>
          </button>

          {/* Edit Script */}
          <button
            onClick={() => setScriptSelected(v => !v)}
            className={clsx(
              'group text-left p-6 rounded-2xl border-2 transition-all duration-200',
              scriptSelected
                ? isDark
                  ? 'border-violet-500/50 bg-violet-600/5'
                  : 'border-violet-300 bg-violet-50'
                : isDark
                  ? 'bg-[#1E1C30] border-[#2D2B47] hover:border-violet-500/30'
                  : 'bg-white border-[#E2DFFF] hover:border-violet-200'
            )}
          >
            <div className={clsx(
              'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
              isDark ? 'bg-[#16152B]' : 'bg-slate-100'
            )}>
              <FileText className={clsx('w-6 h-6', isDark ? 'text-[#5A5780]' : 'text-slate-400')} />
            </div>
            <h3 className={clsx(
              'font-bold text-lg mb-1',
              isDark ? 'text-[#8B87B8]' : 'text-slate-400'
            )}>
              Edit Script
            </h3>
            <p className={clsx('text-sm', isDark ? 'text-[#5A5780]' : 'text-slate-300')}>
              Modify the story YAML directly
            </p>
          </button>
        </div>

        {scriptSelected && (
          <div className={clsx(
            'mt-4 rounded-2xl p-10 text-center border-2 border-dashed',
            isDark ? 'border-[#2D2B47]' : 'border-[#E2DFFF]'
          )}>
            <FileText className={clsx('w-10 h-10 mx-auto mb-3', isDark ? 'text-[#2D2B47]' : 'text-violet-200')} />
            <p className={clsx('font-medium', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
              Script editor coming soon
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
