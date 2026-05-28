import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Mic2, FileText, Sparkles, Edit3, Volume2,
  Save, AlertCircle, ChevronDown, ChevronRight, Check, ImagePlus, ImageOff, X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BOOK_THEMES } from '../styles/palettes';
import clsx from 'clsx';
import yaml from 'js-yaml';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LocalMeta {
  title: string;
  author: string;
  description: string;
  language: string;
  tags: string;
  cover_image?: string;
  style: string;
  version: string;
}

interface LocalChar {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
  [key: string]: any;
}

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

function SectionCard({ title, isDark, defaultOpen = true, children }: {
  title: string; isDark: boolean; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={clsx('rounded-2xl border overflow-hidden',
      isDark ? 'bg-[#1E1C30] border-[#2D2B47]' : 'bg-white border-[#E2DFFF] shadow-sm')}>
      <button onClick={() => setOpen(v => !v)}
        className={clsx('w-full flex items-center gap-3 px-5 py-4 text-left transition-colors',
          isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-violet-50/40')}>
        {open
          ? <ChevronDown className={clsx('w-4 h-4 shrink-0', isDark ? 'text-[#5A5780]' : 'text-violet-300')} />
          : <ChevronRight className={clsx('w-4 h-4 shrink-0', isDark ? 'text-[#5A5780]' : 'text-violet-300')} />}
        <span className={clsx('font-semibold', isDark ? 'text-white' : 'text-[#1A1839]')}>{title}</span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function CoverPicker({ value, onChange, bookId, isDark }: {
  value?: string; onChange: (p: string | undefined) => void; bookId: string; isDark: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const data: string = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const r = await fetch(`/api/books/${bookId}/images`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error);
      onChange(json.path);
    } catch (err) { console.error(err); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ''; }
  };

  return (
    <div className="flex items-center gap-3">
      <div className={clsx('w-20 h-14 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center',
        isDark ? 'border-[#2D2B47] bg-[#16152B]' : 'border-[#E2DFFF] bg-violet-50')}>
        {value
          ? <img src={`/book-assets/${value}`} alt="cover" className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <ImageOff className={clsx('w-5 h-5', isDark ? 'text-[#3D3B57]' : 'text-violet-200')} />}
      </div>
      <span className={clsx('text-xs truncate flex-1 min-w-0', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>
        {value ?? 'No cover image'}
      </span>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button onClick={() => inputRef.current?.click()} disabled={uploading}
        className={clsx('shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors',
          isDark ? 'border-[#2D2B47] text-[#8B87B8] hover:text-violet-300 hover:border-violet-500/50'
                 : 'border-[#E2DFFF] text-violet-400 hover:text-violet-600 hover:border-violet-300')}>
        <ImagePlus className="w-3.5 h-3.5" />
        {uploading ? 'Uploading…' : value ? 'Change' : 'Upload'}
      </button>
      {value && (
        <button onClick={() => onChange(undefined)}
          className={clsx('shrink-0 p-1.5 rounded-lg transition-colors',
            isDark ? 'text-[#5A5780] hover:text-red-400 hover:bg-red-500/10'
                   : 'text-violet-300 hover:text-red-500 hover:bg-red-50')}>
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BookEditPage() {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const [rawStory, setRawStory] = useState<Record<string, any> | null>(null);
  const [meta, setMeta] = useState<LocalMeta>({
    title: '', author: '', description: '', language: 'en', tags: '', style: 'dark', version: '0.1',
  });
  const [characters, setCharacters] = useState<LocalChar[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    fetch(`/api/books/${bookId}`)
      .then(r => r.text())
      .then(text => {
        const story = yaml.load(text) as Record<string, any>;
        setRawStory(story);
        const m = story.metadata || {};
        setMeta({
          title: m.title || '',
          author: m.author || '',
          description: m.description || '',
          language: m.language || 'en',
          tags: Array.isArray(m.tags) ? m.tags.join(', ') : (m.tags || ''),
          cover_image: m.cover_image,
          style: m.style || 'dark',
          version: m.version || '0.1',
        });
        const definedChars: LocalChar[] = (story.characters || []).map((c: any) => ({ ...c, color: c.color || '' }));
        const definedIds = new Set(definedChars.map((c: LocalChar) => c.id));
        const implicitIds = new Set<string>();
        for (const scene of (story.scenes || [])) {
          for (const node of (scene.nodes || [])) {
            if (node.type === 'dialogue' && typeof node.character === 'string' && !definedIds.has(node.character)) {
              implicitIds.add(node.character);
            }
          }
        }
        const implicitChars: LocalChar[] = Array.from(implicitIds).map(id => ({
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          color: '',
        }));
        setCharacters([...definedChars, ...implicitChars]);
      })
      .catch(() => {});
  }, [bookId]);

  const updateMeta = (k: keyof LocalMeta, v: string | undefined) => {
    setMeta(prev => ({ ...prev, [k]: v ?? '' }));
    setDirty(true);
  };

  const updateCharColor = (id: string, color: string) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, color } : c));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!rawStory || !bookId) return;
    setSaving(true); setSaveError(null);
    try {
      const updatedStory = {
        ...rawStory,
        metadata: {
          ...rawStory.metadata,
          title: meta.title,
          author: meta.author,
          description: meta.description,
          language: meta.language,
          tags: meta.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
          cover_image: meta.cover_image || undefined,
          style: meta.style,
          version: meta.version,
        },
        characters: characters.map(c => ({ ...c, color: c.color || undefined })),
      };
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStory),
      });
      if (!res.ok) throw new Error(await res.text());
      setDirty(false);
    } catch (e: any) {
      setSaveError(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className={clsx('min-h-screen transition-colors duration-300', isDark ? 'bg-[#0C0B1A]' : 'bg-[#F5F3FF]')}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={clsx('absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full blur-3xl opacity-10',
          isDark ? 'bg-violet-600' : 'bg-violet-400')} />
      </div>

      <header className={clsx('sticky top-0 z-20 backdrop-blur-md border-b',
        isDark ? 'bg-[#0C0B1A]/80 border-[#2D2B47]' : 'bg-[#F5F3FF]/80 border-[#E2DFFF]')}>
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/library')}
            className={clsx('flex items-center gap-2 text-sm font-medium transition-colors',
              isDark ? 'text-[#8B87B8] hover:text-violet-300' : 'text-violet-500 hover:text-violet-700')}>
            <ArrowLeft className="w-4 h-4" />Library
          </button>
          <div className="flex-1 flex items-center gap-2">
            <Sparkles className={clsx('w-4 h-4', isDark ? 'text-violet-400' : 'text-violet-600')} />
            <span className={clsx('font-bold tracking-wide', isDark ? 'text-white' : 'text-[#1A1839]')}>LOOM</span>
            <span className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>/ Edit</span>
          </div>
          <div className="flex items-center gap-3">
            {saveError && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5" />{saveError}
              </span>
            )}
            {dirty && !saving && (
              <span className={clsx('text-xs', isDark ? 'text-amber-400' : 'text-amber-500')}>Unsaved</span>
            )}
            <button onClick={handleSave} disabled={!dirty || saving}
              className={clsx('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                dirty && !saving
                  ? 'bg-violet-600 hover:bg-violet-500 text-white'
                  : isDark ? 'bg-[#1E1C30] text-[#5A5780] border border-[#2D2B47] cursor-not-allowed'
                           : 'bg-violet-100 text-violet-300 cursor-not-allowed')}>
              <Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-8 space-y-4">
        <div className="mb-6">
          <div className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3',
            isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-200')}>
            <Edit3 className="w-3 h-3" />Edit Mode
          </div>
          <h1 className={clsx('text-3xl font-bold mb-1', isDark ? 'text-white' : 'text-[#1A1839]')}>
            {meta.title || bookId}
          </h1>
        </div>

        {/* Book Details */}
        <SectionCard title="Book Details" isDark={isDark}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={clsx('block text-xs font-medium mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Title</label>
                <input value={meta.title} onChange={e => updateMeta('title', e.target.value)} className={inputCls(isDark)} />
              </div>
              <div>
                <label className={clsx('block text-xs font-medium mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Author</label>
                <input value={meta.author} onChange={e => updateMeta('author', e.target.value)} className={inputCls(isDark)} />
              </div>
            </div>
            <div>
              <label className={clsx('block text-xs font-medium mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Description</label>
              <textarea rows={3} value={meta.description} onChange={e => updateMeta('description', e.target.value)}
                className={clsx(inputCls(isDark), 'resize-none')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={clsx('block text-xs font-medium mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Language</label>
                <select value={meta.language} onChange={e => updateMeta('language', e.target.value)} className={inputCls(isDark)}>
                  {Object.entries(LANG_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={clsx('block text-xs font-medium mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Tags (comma-separated)</label>
                <input value={meta.tags} onChange={e => updateMeta('tags', e.target.value)}
                  placeholder="mystery, drama" className={inputCls(isDark)} />
              </div>
            </div>
            <div>
              <label className={clsx('block text-xs font-medium mb-2', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Cover Image</label>
              <CoverPicker value={meta.cover_image} onChange={p => updateMeta('cover_image', p)} bookId={bookId!} isDark={isDark} />
            </div>
          </div>
        </SectionCard>

        {/* Visual Style */}
        <SectionCard title="Visual Style" isDark={isDark}>
          <p className={clsx('text-xs mb-3', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
            Sets the color palette for the reader — backgrounds, accents, and character bubble tones.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {BOOK_THEMES.map(theme => (
              <button key={theme.id} type="button" onClick={() => updateMeta('style', theme.id)}
                className={clsx(
                  'relative rounded-xl overflow-hidden h-16 border-2 transition-all duration-150',
                  meta.style === theme.id
                    ? 'border-violet-500 scale-[1.02] shadow-lg shadow-violet-900/30'
                    : isDark ? 'border-[#2D2B47] hover:border-violet-500/50' : 'border-[#E2DFFF] hover:border-violet-300'
                )}
                style={{ background: theme.swatchBg }}>
                <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: theme.swatchAccent }} />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                  style={{ color: theme.swatchAccent }}>{theme.name}</span>
                {meta.style === theme.id && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Characters */}
        {characters.length > 0 && (
          <SectionCard title="Characters" isDark={isDark}>
            <p className={clsx('text-xs mb-3', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
              Assign a color to each character — it tints their dialogue bubbles and accent line in the reader.
            </p>
            <div className="space-y-2">
              {characters.map(char => (
                <div key={char.id} className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl border',
                  isDark ? 'bg-[#16152B] border-[#2D2B47]' : 'bg-violet-50/50 border-[#E2DFFF]')}>
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{
                      background: char.color || (isDark ? '#2D2B47' : '#E2DFFF'),
                      color: char.color ? '#fff' : (isDark ? '#8B87B8' : '#7C6EA8'),
                      boxShadow: char.color ? `0 0 0 2px ${char.color}55` : undefined,
                    }}>
                    {char.avatar
                      ? <img src={`/book-assets/${char.avatar}`} alt={char.name} className="w-full h-full object-cover" />
                      : char.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-medium truncate', isDark ? 'text-white' : 'text-[#1A1839]')}>{char.name}</p>
                    <p className={clsx('text-xs font-mono truncate', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>{char.id}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {char.color && (
                      <span className={clsx('text-xs font-mono', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>{char.color}</span>
                    )}
                    <label className="cursor-pointer">
                      <input type="color" value={char.color || '#7C3AED'}
                        onChange={e => updateCharColor(char.id, e.target.value)}
                        className="sr-only" />
                      <div className="w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 cursor-pointer"
                        style={{
                          background: char.color || (isDark ? '#2D2B47' : '#E2DFFF'),
                          borderColor: char.color || (isDark ? '#3D3B57' : '#C4B5FD'),
                        }} />
                    </label>
                    {char.color && (
                      <button onClick={() => updateCharColor(char.id, '')}
                        className={clsx('p-1 rounded transition-colors',
                          isDark ? 'text-[#5A5780] hover:text-red-400' : 'text-violet-300 hover:text-red-500')}>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Editing Tools */}
        <div className={clsx('pt-2 border-t', isDark ? 'border-[#2D2B47]' : 'border-[#E2DFFF]')}>
          <p className={clsx('text-xs font-medium mb-3 px-1', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>Editing Tools</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NavCard icon={<Mic2 className={clsx('w-6 h-6', isDark ? 'text-violet-400' : 'text-violet-600')} />}
              iconBg={isDark ? 'bg-violet-600/20' : 'bg-violet-100'} title="Voice Cast"
              description="Assign ElevenLabs voices to characters and test them"
              hoverCls={isDark ? 'hover:border-violet-500/50 hover:shadow-violet-900/30' : 'hover:border-violet-400 hover:shadow-violet-200/50'}
              hoverText="group-hover:text-violet-400" isDark={isDark} onClick={() => navigate(`/edit/${bookId}/voices`)} />
            <NavCard icon={<Volume2 className={clsx('w-6 h-6', isDark ? 'text-teal-400' : 'text-teal-600')} />}
              iconBg={isDark ? 'bg-teal-600/20' : 'bg-teal-50'} title="Audio Generation"
              description="Generate voice audio for all dialogue nodes"
              hoverCls={isDark ? 'hover:border-teal-500/50 hover:shadow-teal-900/20' : 'hover:border-teal-400 hover:shadow-teal-100/50'}
              hoverText="group-hover:text-teal-400" isDark={isDark} onClick={() => navigate(`/edit/${bookId}/audio`)} />
            <NavCard icon={<FileText className={clsx('w-6 h-6', isDark ? 'text-violet-400' : 'text-violet-600')} />}
              iconBg={isDark ? 'bg-violet-600/20' : 'bg-violet-100'} title="Edit Script"
              description="Edit scenes, nodes and characters"
              hoverCls={isDark ? 'hover:border-violet-500/50 hover:shadow-violet-900/30' : 'hover:border-violet-400 hover:shadow-violet-200/50'}
              hoverText="group-hover:text-violet-400" isDark={isDark} onClick={() => navigate(`/edit/${bookId}/script`)} />
          </div>
        </div>
      </main>
    </div>
  );
}

function NavCard({ icon, iconBg, title, description, hoverCls, hoverText, isDark, onClick }: {
  icon: React.ReactNode; iconBg: string; title: string; description: string;
  hoverCls: string; hoverText: string; isDark: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={clsx(
        'group text-left p-6 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg',
        isDark ? `bg-[#1E1C30] border-[#2D2B47] ${hoverCls}` : `bg-white border-[#E2DFFF] ${hoverCls}`,
      )}>
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center mb-4', iconBg)}>{icon}</div>
      <h3 className={clsx('font-bold text-lg mb-1 transition-colors', hoverText, isDark ? 'text-white' : 'text-[#1A1839]')}>{title}</h3>
      <p className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>{description}</p>
    </button>
  );
}
