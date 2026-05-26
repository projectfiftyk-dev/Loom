import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, RefreshCw, Sparkles, Globe, Tag, Edit3 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchBooks } from '../api/client';
import type { BookMeta } from '../types/story';
import clsx from 'clsx';

const LANG_LABELS: Record<string, string> = {
  en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch',
  pt: 'Português', it: 'Italiano', ja: '日本語', zh: '中文',
};

export default function LibraryPage() {
  const navigate = useNavigate();
  const { theme, isEditMode } = useApp();
  const isDark = theme === 'dark';

  const [books, setBooks] = useState<BookMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBooks();
      setBooks(data);
    } catch (e) {
      setError('Could not connect to the Loom API server. Make sure it is running (npm run dev).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className={clsx(
      'min-h-screen transition-colors duration-300',
      isDark ? 'bg-[#0C0B1A]' : 'bg-[#F5F3FF]'
    )}>
      {/* Fixed background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={clsx(
          'absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full blur-3xl opacity-10',
          isDark ? 'bg-violet-600' : 'bg-violet-400'
        )} />
      </div>

      {/* Header */}
      <header className={clsx(
        'sticky top-0 z-20 backdrop-blur-md border-b',
        isDark ? 'bg-[#0C0B1A]/80 border-[#2D2B47]' : 'bg-[#F5F3FF]/80 border-[#E2DFFF]'
      )}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className={clsx(
              'flex items-center gap-2 text-sm font-medium transition-colors',
              isDark ? 'text-[#8B87B8] hover:text-violet-300' : 'text-violet-500 hover:text-violet-700'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Settings
          </button>

          <div className="flex-1 flex items-center gap-2">
            <Sparkles className={clsx('w-4 h-4', isDark ? 'text-violet-400' : 'text-violet-600')} />
            <span className={clsx('font-bold tracking-wide', isDark ? 'text-white' : 'text-[#1A1839]')}>
              LOOM
            </span>
            <span className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>/ Library</span>
            {isEditMode && (
              <span className={clsx(
                'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ml-1',
                isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200'
              )}>
                <Edit3 className="w-3 h-3" />
                Edit Mode
              </span>
            )}
          </div>

          <button
            onClick={load}
            disabled={loading}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              isDark ? 'text-[#8B87B8] hover:text-violet-300 hover:bg-violet-600/10' : 'text-violet-500 hover:text-violet-700 hover:bg-violet-100'
            )}
            title="Refresh"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className={clsx('text-3xl font-bold mb-1', isDark ? 'text-white' : 'text-[#1A1839]')}>
            Your Books
          </h1>
          <p className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>
            {books.length} {books.length === 1 ? 'story' : 'stories'} available in the <code className={isDark ? 'text-violet-400' : 'text-violet-600'}>books/</code> folder
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              <p className={isDark ? 'text-[#8B87B8]' : 'text-violet-500'}>Loading books…</p>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className={clsx(
            'rounded-2xl p-6 text-center',
            isDark ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'
          )}>
            <p className={clsx('font-medium mb-1', isDark ? 'text-red-300' : 'text-red-700')}>{error}</p>
            <button onClick={load} className="mt-3 text-sm text-violet-400 hover:text-violet-300 underline">
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && books.length === 0 && (
          <div className={clsx(
            'rounded-2xl p-10 text-center border-2 border-dashed',
            isDark ? 'border-[#2D2B47]' : 'border-[#E2DFFF]'
          )}>
            <BookOpen className={clsx('w-12 h-12 mx-auto mb-4', isDark ? 'text-[#2D2B47]' : 'text-violet-200')} />
            <h3 className={clsx('font-semibold text-lg mb-2', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
              No books yet
            </h3>
            <p className={clsx('text-sm', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>
              Add <code>.yaml</code> story files to the <code className={isDark ? 'text-violet-400' : 'text-violet-600'}>books/</code> folder and refresh.
            </p>
          </div>
        )}

        {/* Book grid */}
        {!loading && !error && books.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map(book => (
              <BookCard
                key={book.id}
                book={book}
                isDark={isDark}
                onClick={() => navigate(`/read/${book.id}`)}
                isEditMode={isEditMode}
                onEdit={() => navigate(`/edit/${book.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function BookCard({ book, isDark, onClick, isEditMode, onEdit }: {
  book: BookMeta;
  isDark: boolean;
  onClick: () => void;
  isEditMode: boolean;
  onEdit: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      className={clsx(
        'group text-left rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer',
        isDark
          ? 'bg-[#1E1C30] border border-[#2D2B47] hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-900/30'
          : 'bg-white border border-[#E2DFFF] hover:border-violet-400 hover:shadow-lg hover:shadow-violet-200/50'
      )}
    >
      {/* Cover */}
      <div className={clsx(
        'relative h-36 overflow-hidden',
        isDark ? 'bg-[#16152B]' : 'bg-[#EDE9FF]'
      )}>
        {book.cover_image ? (
          <img
            src={`/book-assets/${book.cover_image}`}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className={clsx(
              'w-16 h-16 rounded-2xl flex items-center justify-center',
              isDark ? 'bg-violet-600/20' : 'bg-violet-100'
            )}>
              <BookOpen className={clsx('w-8 h-8', isDark ? 'text-violet-400' : 'text-violet-500')} />
            </div>
          </div>
        )}
        {/* Language badge */}
        {book.language && (
          <span className={clsx(
            'absolute top-3 right-3 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm',
            isDark ? 'bg-black/50 text-violet-300' : 'bg-white/70 text-violet-700'
          )}>
            <Globe className="w-3 h-3" />
            {LANG_LABELS[book.language] || book.language.toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className={clsx(
          'font-bold text-base mb-0.5 leading-snug group-hover:text-violet-400 transition-colors',
          isDark ? 'text-white' : 'text-[#1A1839]'
        )}>
          {book.title}
        </h3>
        <p className={clsx('text-xs mb-2', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
          by {book.author}
        </p>
        {book.description && (
          <p className={clsx(
            'text-xs leading-relaxed line-clamp-2 mb-3',
            isDark ? 'text-[#7E7AA8]' : 'text-slate-500'
          )}>
            {book.description}
          </p>
        )}
        {book.tags && book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {book.tags.slice(0, 3).map(tag => (
              <span key={tag} className={clsx(
                'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
                isDark ? 'bg-violet-900/40 text-violet-300' : 'bg-violet-100 text-violet-700'
              )}>
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}
        {isEditMode && (
          <div className={clsx(
            'mt-3 pt-3 border-t flex items-center justify-end',
            isDark ? 'border-[#2D2B47]' : 'border-[#E2DFFF]'
          )}>
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                isDark ? 'text-amber-400 hover:bg-amber-500/10' : 'text-amber-600 hover:bg-amber-50'
              )}
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
