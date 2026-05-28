import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, RefreshCw, Sparkles, Globe, Tag, Edit3, Plus, X, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchBooks } from '../api/client';
import type { BookMeta } from '../types/story';
import { BOOK_THEMES, getPaletteForStyle, hexToRgba } from '../styles/palettes';
import clsx from 'clsx';

const LANG_LABELS: Record<string, string> = {
  en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch',
  pt: 'Português', it: 'Italiano', ja: '日本語', zh: '中文',
};

function inputCls(isDark: boolean) {
  return clsx(
    'w-full text-sm px-3 py-1.5 rounded-lg border outline-none transition-colors',
    isDark
      ? 'bg-[#0C0B1A] border-[#2D2B47] text-white placeholder:text-[#5A5780] focus:border-violet-500'
      : 'bg-white border-[#E2DFFF] text-[#1A1839] placeholder:text-violet-300 focus:border-violet-400',
  );
}

// ── New Book Modal ─────────────────────────────────────────────────────────────

function NewBookModal({ isDark, onClose, onCreated }: {
  isDark: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [tags, setTags] = useState('');
  const [style, setStyle] = useState('dark');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author,
          description,
          language,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          style,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onCreated(json.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={clsx(
        'w-full max-w-lg rounded-2xl border p-6 shadow-2xl',
        isDark ? 'bg-[#1E1C30] border-[#2D2B47]' : 'bg-white border-[#E2DFFF]'
      )}>
        <div className="flex items-center justify-between mb-5">
          <h2 className={clsx('text-lg font-bold', isDark ? 'text-white' : 'text-[#1A1839]')}>New Book</h2>
          <button onClick={onClose} className={clsx('p-1.5 rounded-lg transition-colors',
            isDark ? 'text-[#8B87B8] hover:text-white hover:bg-white/5' : 'text-violet-400 hover:text-violet-700 hover:bg-violet-50')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={clsx('block text-xs font-medium mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>
              Title <span className="text-red-400">*</span>
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. The Lighthouse Secret"
              className={inputCls(isDark)} autoFocus />
          </div>

          <div>
            <label className={clsx('block text-xs font-medium mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Author</label>
            <input value={author} onChange={e => setAuthor(e.target.value)}
              placeholder="e.g. Jane Doe" className={inputCls(isDark)} />
          </div>

          <div>
            <label className={clsx('block text-xs font-medium mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Description</label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="A short summary…" className={clsx(inputCls(isDark), 'resize-none')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={clsx('block text-xs font-medium mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className={inputCls(isDark)}>
                {Object.entries(LANG_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={clsx('block text-xs font-medium mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Tags (comma-separated)</label>
              <input value={tags} onChange={e => setTags(e.target.value)}
                placeholder="mystery, drama" className={inputCls(isDark)} />
            </div>
          </div>

          <div>
            <label className={clsx('block text-xs font-medium mb-2', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Visual Style</label>
            <div className="grid grid-cols-3 gap-2">
              {BOOK_THEMES.map(theme => (
                <button key={theme.id} type="button" onClick={() => setStyle(theme.id)}
                  className={clsx(
                    'relative rounded-xl overflow-hidden h-14 border-2 transition-all duration-150',
                    style === theme.id
                      ? 'border-violet-500 scale-[1.03] shadow-lg'
                      : isDark ? 'border-[#2D2B47] hover:border-violet-500/50' : 'border-[#E2DFFF] hover:border-violet-300'
                  )}
                  style={{ background: theme.swatchBg }}>
                  <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: theme.swatchAccent }} />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold"
                    style={{ color: theme.swatchAccent }}>
                    {theme.name}
                  </span>
                  {style === theme.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

          <div className={clsx('flex gap-2 justify-end pt-3 border-t', isDark ? 'border-[#2D2B47]' : 'border-[#E2DFFF]')}>
            <button onClick={onClose}
              className={clsx('px-4 py-2 text-sm rounded-xl transition-colors',
                isDark ? 'text-[#8B87B8] hover:text-white' : 'text-violet-400 hover:text-violet-700')}>
              Cancel
            </button>
            <button onClick={handleCreate} disabled={saving || !title.trim()}
              className="px-4 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors disabled:opacity-40">
              {saving ? 'Creating…' : 'Create Book'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const navigate = useNavigate();
  const { theme, isEditMode } = useApp();
  const isDark = theme === 'dark';

  const [books, setBooks] = useState<BookMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewBook, setShowNewBook] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try { setBooks(await fetchBooks()); }
    catch { setError('Could not connect to the Loom API server. Make sure it is running (npm run dev).'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className={clsx('min-h-screen transition-colors duration-300', isDark ? 'bg-[#0C0B1A]' : 'bg-[#F5F3FF]')}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={clsx('absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full blur-3xl opacity-10',
          isDark ? 'bg-violet-600' : 'bg-violet-400')} />
      </div>

      <header className={clsx('sticky top-0 z-20 backdrop-blur-md border-b',
        isDark ? 'bg-[#0C0B1A]/80 border-[#2D2B47]' : 'bg-[#F5F3FF]/80 border-[#E2DFFF]')}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/')}
            className={clsx('flex items-center gap-2 text-sm font-medium transition-colors',
              isDark ? 'text-[#8B87B8] hover:text-violet-300' : 'text-violet-500 hover:text-violet-700')}>
            <ArrowLeft className="w-4 h-4" />Settings
          </button>
          <div className="flex-1 flex items-center gap-2">
            <Sparkles className={clsx('w-4 h-4', isDark ? 'text-violet-400' : 'text-violet-600')} />
            <span className={clsx('font-bold tracking-wide', isDark ? 'text-white' : 'text-[#1A1839]')}>LOOM</span>
            <span className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>/ Library</span>
            {isEditMode && (
              <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ml-1',
                isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200')}>
                <Edit3 className="w-3 h-3" />Edit Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditMode && (
              <button onClick={() => setShowNewBook(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors">
                <Plus className="w-4 h-4" />New Book
              </button>
            )}
            <button onClick={load} disabled={loading}
              className={clsx('p-2 rounded-lg transition-colors',
                isDark ? 'text-[#8B87B8] hover:text-violet-300 hover:bg-violet-600/10' : 'text-violet-500 hover:text-violet-700 hover:bg-violet-100')}
              title="Refresh">
              <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className={clsx('text-3xl font-bold mb-1', isDark ? 'text-white' : 'text-[#1A1839]')}>Your Books</h1>
          <p className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>
            {books.length} {books.length === 1 ? 'story' : 'stories'} available in the{' '}
            <code className={isDark ? 'text-violet-400' : 'text-violet-600'}>books/</code> folder
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              <p className={isDark ? 'text-[#8B87B8]' : 'text-violet-500'}>Loading books…</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className={clsx('rounded-2xl p-6 text-center',
            isDark ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200')}>
            <p className={clsx('font-medium mb-1', isDark ? 'text-red-300' : 'text-red-700')}>{error}</p>
            <button onClick={load} className="mt-3 text-sm text-violet-400 hover:text-violet-300 underline">Try again</button>
          </div>
        )}

        {!loading && !error && books.length === 0 && (
          <div className={clsx('rounded-2xl p-10 text-center border-2 border-dashed',
            isDark ? 'border-[#2D2B47]' : 'border-[#E2DFFF]')}>
            <BookOpen className={clsx('w-12 h-12 mx-auto mb-4', isDark ? 'text-[#2D2B47]' : 'text-violet-200')} />
            <h3 className={clsx('font-semibold text-lg mb-2', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>No books yet</h3>
            <p className={clsx('text-sm', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>
              Add <code>.yaml</code> story files to the{' '}
              <code className={isDark ? 'text-violet-400' : 'text-violet-600'}>books/</code> folder and refresh.
            </p>
            {isEditMode && (
              <button onClick={() => setShowNewBook(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors">
                <Plus className="w-4 h-4" />Create your first book
              </button>
            )}
          </div>
        )}

        {!loading && !error && books.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map(book => (
              <BookCard key={book.id} book={book} isDark={isDark}
                onClick={() => navigate(`/read/${book.id}`)}
                isEditMode={isEditMode}
                onEdit={() => navigate(`/edit/${book.id}`)} />
            ))}
          </div>
        )}
      </main>

      {showNewBook && (
        <NewBookModal isDark={isDark}
          onClose={() => setShowNewBook(false)}
          onCreated={id => { setShowNewBook(false); navigate(`/edit/${id}`); }} />
      )}
    </div>
  );
}

function BookCard({ book, isDark, onClick, isEditMode, onEdit }: {
  book: BookMeta; isDark: boolean; onClick: () => void; isEditMode: boolean; onEdit: () => void;
}) {
  const palette = getPaletteForStyle(book.style);
  const accent = palette.accent;

  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={e => e.key === 'Enter' && onClick()}
      className={clsx(
        'group text-left rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer border',
        isDark ? 'bg-[#1E1C30] border-[#2D2B47]' : 'bg-white border-[#E2DFFF]'
      )}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = hexToRgba(accent, 0.6);
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${hexToRgba(accent, 0.18)}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}>
      <div className={clsx('relative h-36 overflow-hidden', isDark ? 'bg-[#16152B]' : 'bg-[#EDE9FF]')}>
        {book.cover_image ? (
          <img src={`/book-assets/${book.cover_image}`} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: hexToRgba(accent, isDark ? 0.08 : 0.06) }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: hexToRgba(accent, 0.15) }}>
              <BookOpen className="w-8 h-8" style={{ color: accent }} />
            </div>
          </div>
        )}
        {book.language && (
          <span className={clsx('absolute top-3 right-3 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm',
            isDark ? 'bg-black/50' : 'bg-white/80')}
            style={{ color: accent }}>
            <Globe className="w-3 h-3" />
            {LANG_LABELS[book.language] || book.language.toUpperCase()}
          </span>
        )}
        {/* accent bar at bottom of cover */}
        <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: hexToRgba(accent, 0.7) }} />
      </div>
      <div className="p-4">
        <h3 className={clsx('font-bold text-base mb-0.5 leading-snug transition-colors',
          isDark ? 'text-white' : 'text-[#1A1839]')}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accent; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = ''; }}>
          {book.title}
        </h3>
        <p className="text-xs mb-2" style={{ color: hexToRgba(accent, 0.75) }}>by {book.author}</p>
        {book.description && (
          <p className={clsx('text-xs leading-relaxed line-clamp-2 mb-3', isDark ? 'text-[#7E7AA8]' : 'text-slate-500')}>
            {book.description}
          </p>
        )}
        {book.tags && book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {book.tags.slice(0, 3).map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ background: hexToRgba(accent, 0.12), color: accent }}>
                <Tag className="w-2.5 h-2.5" />{tag}
              </span>
            ))}
          </div>
        )}
        {isEditMode && (
          <div className={clsx('mt-3 pt-3 border-t flex items-center justify-between',
            isDark ? 'border-[#2D2B47]' : 'border-[#E2DFFF]')}>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: hexToRgba(accent, 0.5) }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: accent }} />
              {book.style || 'dark'}
            </span>
            <button onClick={e => { e.stopPropagation(); onEdit(); }}
              className={clsx('flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                isDark ? 'text-amber-400 hover:bg-amber-500/10' : 'text-amber-600 hover:bg-amber-50')}>
              <Edit3 className="w-3 h-3" />Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
