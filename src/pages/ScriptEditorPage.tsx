import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Plus, Trash2, Edit3, Check, X,
  ChevronDown, ChevronRight, Save, AlertCircle, Play, ImagePlus, ImageOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import clsx from 'clsx';
import yaml from 'js-yaml';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StoryCharacter {
  id: string; name: string; avatar?: string; voice?: string; personality?: string;
}
interface ChoiceOption { label: string; correct?: boolean; next?: string; }
interface StoryNode {
  id: string;
  type: 'dialogue' | 'choice' | 'free_text' | 'chat';
  background?: string;
  character?: string;
  text?: string;
  next?: string;
  prompt?: string;
  options?: ChoiceOption[];
  hint?: string;
  goal?: string;
  on_success?: string;
  on_fail?: string;
  max_attempts?: number;
  on_exhausted?: string;
  entry_line?: string;
  context_up_to?: string;
  standalone?: boolean;
}
interface StoryScene {
  id: string; title?: string; start?: boolean; end?: boolean;
  background?: string; nodes: StoryNode[];
}
interface Story {
  metadata: Record<string, any>;
  settings?: Record<string, any>;
  characters: StoryCharacter[];
  scenes: StoryScene[];
  standalone_chats?: any[];
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resolveCharId(character: any): string | null {
  if (!character) return null;
  if (typeof character === 'string') return character;
  return (character as any)?.id ?? null;
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function inputCls(isDark: boolean) {
  return clsx(
    'w-full text-sm px-3 py-1.5 rounded-lg border outline-none transition-colors',
    isDark
      ? 'bg-[#0C0B1A] border-[#2D2B47] text-white placeholder:text-[#5A5780] focus:border-violet-500'
      : 'bg-white border-[#E2DFFF] text-[#1A1839] placeholder:text-violet-300 focus:border-violet-400',
  );
}

function FieldLabel({ label, isDark, children }: { label: string; isDark: boolean; children: ReactNode }) {
  return (
    <div>
      <p className={clsx('text-xs font-medium mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>{label}</p>
      {children}
    </div>
  );
}

function NodeRefInput({ label, value, onChange, nodeIds, isDark }: {
  label: string; value: string; onChange: (v: string) => void; nodeIds: string[]; isDark: boolean;
}) {
  const uid = useId();
  const listId = `nri-${uid}`;
  return (
    <FieldLabel label={label} isDark={isDark}>
      <input list={listId} value={value} onChange={e => onChange(e.target.value)}
        placeholder="node id or blank" className={inputCls(isDark)} />
      <datalist id={listId}>{nodeIds.map(id => <option key={id} value={id} />)}</datalist>
    </FieldLabel>
  );
}

function CharSelect({ value, onChange, characters, isDark, onCreateChar }: {
  value: string; onChange: (v: string) => void; characters: StoryCharacter[];
  isDark: boolean; onCreateChar: (c: StoryCharacter) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [nid, setNid] = useState('');
  const [nname, setNname] = useState('');

  const commit = () => {
    if (!nid.trim() || !nname.trim()) return;
    const c: StoryCharacter = { id: nid.trim(), name: nname.trim() };
    onCreateChar(c);
    onChange(c.id);
    setCreating(false); setNid(''); setNname('');
  };

  return (
    <FieldLabel label="Character" isDark={isDark}>
      <select
        value={creating ? '__new__' : (value || 'narrator')}
        onChange={e => {
          if (e.target.value === '__new__') { setCreating(true); }
          else { setCreating(false); onChange(e.target.value); }
        }}
        className={inputCls(isDark)}
      >
        <option value="narrator">Narrator</option>
        {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        <option value="__new__">+ Create new character…</option>
      </select>
      {creating && (
        <div className="flex gap-2 mt-2">
          <input value={nid} onChange={e => setNid(e.target.value)} placeholder="id (e.g. sofia)"
            className={clsx(inputCls(isDark), 'flex-1')} />
          <input value={nname} onChange={e => setNname(e.target.value)} placeholder="Display name"
            className={clsx(inputCls(isDark), 'flex-1')} />
          <button onClick={commit}
            className="px-2.5 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">
            Add
          </button>
          <button onClick={() => { setCreating(false); onChange(value); }}
            className={clsx('px-2.5 py-1.5 text-xs rounded-lg', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
            Cancel
          </button>
        </div>
      )}
    </FieldLabel>
  );
}

// ── Background picker ──────────────────────────────────────────────────────────

function BackgroundPicker({ value, onChange, bookId, isDark }: {
  value: string | undefined; onChange: (path: string | undefined) => void;
  bookId: string; isDark: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await readFileAsBase64(file);
      const res = await fetch(`/api/books/${bookId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onChange(json.path);
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Thumbnail */}
      <div className={clsx(
        'w-16 h-10 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center',
        isDark ? 'border-[#2D2B47] bg-[#16152B]' : 'border-[#E2DFFF] bg-violet-50'
      )}>
        {value ? (
          <img src={`/book-assets/${value}`} alt="background"
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <ImageOff className={clsx('w-4 h-4', isDark ? 'text-[#3D3B57]' : 'text-violet-200')} />
        )}
      </div>

      {/* Path label */}
      <span className={clsx('text-xs truncate flex-1 min-w-0', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>
        {value ?? 'No background'}
      </span>

      {/* Actions */}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={clsx(
          'shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors',
          isDark ? 'border-[#2D2B47] text-[#8B87B8] hover:text-violet-300 hover:border-violet-500/50'
                 : 'border-[#E2DFFF] text-violet-400 hover:text-violet-600 hover:border-violet-300'
        )}
      >
        <ImagePlus className="w-3.5 h-3.5" />
        {uploading ? 'Uploading…' : value ? 'Change' : 'Upload'}
      </button>
      {value && (
        <button
          onClick={() => onChange(undefined)}
          className={clsx('shrink-0 p-1.5 rounded-lg transition-colors',
            isDark ? 'text-[#5A5780] hover:text-red-400 hover:bg-red-500/10'
                   : 'text-violet-300 hover:text-red-500 hover:bg-red-50')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Node type forms ────────────────────────────────────────────────────────────

function DialogueForm({ node, onChange, nodeIds, characters, isDark, onCreateChar }: {
  node: StoryNode; onChange: (n: StoryNode) => void; nodeIds: string[];
  characters: StoryCharacter[]; isDark: boolean; onCreateChar: (c: StoryCharacter) => void;
}) {
  const set = (k: keyof StoryNode, v: any) => onChange({ ...node, [k]: v });
  return (
    <div className="space-y-3">
      <CharSelect value={resolveCharId(node.character) || 'narrator'} onChange={v => set('character', v)}
        characters={characters} isDark={isDark} onCreateChar={onCreateChar} />
      <FieldLabel label="Text" isDark={isDark}>
        <textarea rows={3} value={node.text || ''} onChange={e => set('text', e.target.value)}
          className={clsx(inputCls(isDark), 'resize-none')} />
      </FieldLabel>
      <NodeRefInput label="Next node" value={node.next || ''} onChange={v => set('next', v)}
        nodeIds={nodeIds} isDark={isDark} />
    </div>
  );
}

function ChoiceForm({ node, onChange, nodeIds, isDark }: {
  node: StoryNode; onChange: (n: StoryNode) => void; nodeIds: string[]; isDark: boolean;
}) {
  const formUid = useId();
  const set = (k: keyof StoryNode, v: any) => onChange({ ...node, [k]: v });
  const opts = node.options || [];
  const setOpt = (i: number, opt: ChoiceOption) => { const next = [...opts]; next[i] = opt; set('options', next); };
  const removeOpt = (i: number) => set('options', opts.filter((_, j) => j !== i));

  return (
    <div className="space-y-3">
      <FieldLabel label="Prompt" isDark={isDark}>
        <textarea rows={2} value={node.prompt || ''} onChange={e => set('prompt', e.target.value)}
          className={clsx(inputCls(isDark), 'resize-none')} />
      </FieldLabel>

      <p className={clsx('text-xs font-medium', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Options</p>
      <div className="space-y-2">
        {opts.map((opt, i) => (
          <div key={i} className={clsx('rounded-lg p-3 space-y-2 border',
            isDark ? 'bg-[#0C0B1A] border-[#2D2B47]' : 'bg-violet-50/40 border-[#E2DFFF]')}>
            <div className="flex gap-2 items-center">
              <input value={opt.label} onChange={e => setOpt(i, { ...opt, label: e.target.value })}
                placeholder="Option label" className={clsx(inputCls(isDark), 'flex-1')} />
              <button onClick={() => removeOpt(i)}
                className={clsx('shrink-0 p-1.5 rounded transition-colors',
                  isDark ? 'text-[#5A5780] hover:text-red-400' : 'text-violet-300 hover:text-red-500')}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className={clsx('flex items-center gap-2 text-xs cursor-pointer', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>
                <input type="checkbox" checked={!!opt.correct} onChange={e => setOpt(i, { ...opt, correct: e.target.checked })} />
                Correct answer
              </label>
              <div>
                <p className={clsx('text-xs font-medium mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Next node</p>
                <input list={`${formUid}-opt-${i}`} value={opt.next || ''} onChange={e => setOpt(i, { ...opt, next: e.target.value })}
                  placeholder="node id" className={inputCls(isDark)} />
                <datalist id={`${formUid}-opt-${i}`}>{nodeIds.map(id => <option key={id} value={id} />)}</datalist>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => set('options', [...opts, { label: '', next: '' }])}
        className={clsx('flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
          isDark ? 'border-[#2D2B47] text-[#8B87B8] hover:text-violet-300 hover:border-violet-500/50'
                 : 'border-[#E2DFFF] text-violet-400 hover:text-violet-600 hover:border-violet-300')}>
        <Plus className="w-3.5 h-3.5" /> Add option
      </button>
    </div>
  );
}

function FreeTextForm({ node, onChange, nodeIds, isDark }: {
  node: StoryNode; onChange: (n: StoryNode) => void; nodeIds: string[]; isDark: boolean;
}) {
  const set = (k: keyof StoryNode, v: any) => onChange({ ...node, [k]: v });
  return (
    <div className="space-y-3">
      <FieldLabel label="Prompt shown to player" isDark={isDark}>
        <textarea rows={2} value={node.prompt || ''} onChange={e => set('prompt', e.target.value)}
          className={clsx(inputCls(isDark), 'resize-none')} />
      </FieldLabel>
      <FieldLabel label="Hint (optional)" isDark={isDark}>
        <textarea rows={2} value={node.hint || ''} onChange={e => set('hint', e.target.value)}
          className={clsx(inputCls(isDark), 'resize-none')} />
      </FieldLabel>
      <FieldLabel label="Goal — what the LLM checks for" isDark={isDark}>
        <textarea rows={3} value={node.goal || ''} onChange={e => set('goal', e.target.value)}
          className={clsx(inputCls(isDark), 'resize-none')} />
      </FieldLabel>
      <div className="grid grid-cols-2 gap-3">
        <NodeRefInput label="On success →" value={node.on_success || ''} onChange={v => set('on_success', v)} nodeIds={nodeIds} isDark={isDark} />
        <NodeRefInput label="On fail →" value={node.on_fail || ''} onChange={v => set('on_fail', v)} nodeIds={nodeIds} isDark={isDark} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldLabel label="Max attempts" isDark={isDark}>
          <input type="number" min={1} value={node.max_attempts ?? 3}
            onChange={e => set('max_attempts', parseInt(e.target.value) || 1)} className={inputCls(isDark)} />
        </FieldLabel>
        <NodeRefInput label="On exhausted →" value={node.on_exhausted || ''} onChange={v => set('on_exhausted', v)} nodeIds={nodeIds} isDark={isDark} />
      </div>
    </div>
  );
}

function ChatForm({ node, onChange, nodeIds, characters, isDark, onCreateChar }: {
  node: StoryNode; onChange: (n: StoryNode) => void; nodeIds: string[];
  characters: StoryCharacter[]; isDark: boolean; onCreateChar: (c: StoryCharacter) => void;
}) {
  const set = (k: keyof StoryNode, v: any) => onChange({ ...node, [k]: v });
  return (
    <div className="space-y-3">
      <CharSelect value={resolveCharId(node.character) || ''} onChange={v => set('character', v)}
        characters={characters} isDark={isDark} onCreateChar={onCreateChar} />
      <FieldLabel label="Entry line" isDark={isDark}>
        <input value={node.entry_line || ''} onChange={e => set('entry_line', e.target.value)} className={inputCls(isDark)} />
      </FieldLabel>
      <label className={clsx('flex items-center gap-2 text-sm cursor-pointer', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>
        <input type="checkbox" checked={!!node.standalone} onChange={e => set('standalone', e.target.checked)} />
        Standalone (player can chat freely, no auto-advance)
      </label>
      <NodeRefInput label="Next node" value={node.next || ''} onChange={v => set('next', v)} nodeIds={nodeIds} isDark={isDark} />
    </div>
  );
}

// ── Node row ───────────────────────────────────────────────────────────────────

const TYPE_BADGE_CLS: Record<string, [string, string]> = {
  dialogue:  ['bg-violet-600/20 text-violet-300',  'bg-violet-100 text-violet-600'],
  choice:    ['bg-amber-500/10 text-amber-400',     'bg-amber-50 text-amber-600'],
  free_text: ['bg-teal-600/10 text-teal-400',      'bg-teal-50 text-teal-700'],
  chat:      ['bg-blue-500/10 text-blue-400',       'bg-blue-50 text-blue-600'],
};

function NodeRow({ node, isDark, allNodeIds, characters, bookId, onSave, onDelete, onCreateChar }: {
  node: StoryNode; isDark: boolean; allNodeIds: string[]; bookId: string;
  characters: StoryCharacter[]; onSave: (n: StoryNode) => void;
  onDelete: () => void; onCreateChar: (c: StoryCharacter) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<StoryNode>(() => ({
    ...node,
    character: resolveCharId(node.character) ?? undefined,
  }));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const badgeCls = (TYPE_BADGE_CLS[node.type] ?? TYPE_BADGE_CLS.dialogue)[isDark ? 0 : 1];
  const preview = node.text || node.prompt || node.entry_line || '—';
  const charId = resolveCharId(node.character);
  const charName = charId ? (characters.find(c => c.id === charId)?.name ?? charId) : null;

  return (
    <div className={clsx('border-t', isDark ? 'border-[#2D2B47]' : 'border-[#F0EEFF]')}>
      {/* Row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 whitespace-nowrap', badgeCls)}>
          {node.type.replace('_', ' ')}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('text-xs font-mono', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>{node.id}</span>
            {charName && <span className={clsx('text-xs font-medium', isDark ? 'text-violet-400' : 'text-violet-500')}>{charName}</span>}
          </div>
          <p className={clsx('text-sm mt-0.5 line-clamp-2', isDark ? 'text-[#8B87B8]' : 'text-slate-500')}>
            {preview}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <button
            onClick={() => { setEditing(v => !v); setDraft({ ...node, character: resolveCharId(node.character) ?? undefined }); setConfirmDelete(false); }}
            className={clsx('p-1.5 rounded-lg transition-colors',
              editing
                ? isDark ? 'bg-violet-600/20 text-violet-300' : 'bg-violet-100 text-violet-600'
                : isDark ? 'text-[#5A5780] hover:text-violet-300 hover:bg-violet-600/10'
                         : 'text-violet-300 hover:text-violet-600 hover:bg-violet-50')}>
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={onDelete}
                className="px-2 py-1 text-xs font-medium bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className={clsx('px-2 py-1 text-xs rounded-lg', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className={clsx('p-1.5 rounded-lg transition-colors',
                isDark ? 'text-[#5A5780] hover:text-red-400 hover:bg-red-500/10'
                       : 'text-violet-300 hover:text-red-500 hover:bg-red-50')}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline edit form */}
      {editing && (
        <div className={clsx('mx-4 mb-4 rounded-xl border p-4',
          isDark ? 'bg-[#16152B] border-[#2D2B47]' : 'bg-[#F5F3FF] border-[#E2DFFF]')}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <FieldLabel label="Node ID" isDark={isDark}>
              <input value={draft.id} onChange={e => setDraft(d => ({ ...d, id: e.target.value }))}
                className={inputCls(isDark)} />
            </FieldLabel>
            <FieldLabel label="Type" isDark={isDark}>
              <select value={draft.type}
                onChange={e => setDraft(d => ({ ...d, type: e.target.value as StoryNode['type'] }))}
                className={inputCls(isDark)}>
                <option value="dialogue">dialogue</option>
                <option value="choice">choice</option>
                <option value="free_text">free_text</option>
                <option value="chat">chat</option>
              </select>
            </FieldLabel>
          </div>

          <div className={clsx('rounded-lg p-3 mb-4 border', isDark ? 'bg-[#0C0B1A] border-[#2D2B47]' : 'bg-violet-50/40 border-[#E2DFFF]')}>
            <p className={clsx('text-xs font-medium mb-2', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Background override</p>
            <BackgroundPicker
              value={draft.background}
              onChange={path => setDraft(d => ({ ...d, background: path }))}
              bookId={bookId}
              isDark={isDark}
            />
          </div>

          {draft.type === 'dialogue' && (
            <DialogueForm node={draft} onChange={setDraft} nodeIds={allNodeIds}
              characters={characters} isDark={isDark} onCreateChar={onCreateChar} />
          )}
          {draft.type === 'choice' && (
            <ChoiceForm node={draft} onChange={setDraft} nodeIds={allNodeIds} isDark={isDark} />
          )}
          {draft.type === 'free_text' && (
            <FreeTextForm node={draft} onChange={setDraft} nodeIds={allNodeIds} isDark={isDark} />
          )}
          {draft.type === 'chat' && (
            <ChatForm node={draft} onChange={setDraft} nodeIds={allNodeIds}
              characters={characters} isDark={isDark} onCreateChar={onCreateChar} />
          )}

          <div className={clsx('flex justify-end gap-2 mt-4 pt-3 border-t',
            isDark ? 'border-[#2D2B47]' : 'border-[#E2DFFF]')}>
            <button onClick={() => setEditing(false)}
              className={clsx('px-3 py-1.5 text-sm rounded-lg transition-colors',
                isDark ? 'text-[#8B87B8] hover:text-violet-300' : 'text-violet-400 hover:text-violet-600')}>
              Cancel
            </button>
            <button onClick={() => { onSave(draft); setEditing(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">
              <Check className="w-3.5 h-3.5" /> Save node
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add node panel ─────────────────────────────────────────────────────────────

function AddNodePanel({ isDark, onAdd, sceneId, nodeCount }: {
  isDark: boolean; onAdd: (n: StoryNode) => void; sceneId: string; nodeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState('');
  const [type, setType] = useState<StoryNode['type']>('dialogue');

  const handleOpen = () => {
    setId(`${sceneId}_${nodeCount + 1}`);
    setType('dialogue');
    setOpen(true);
  };

  const handleAdd = () => {
    if (!id.trim()) return;
    onAdd({ id: id.trim(), type });
    setOpen(false);
  };

  return (
    <div className={clsx('px-4 py-3 border-t', isDark ? 'border-[#2D2B47]' : 'border-[#F0EEFF]')}>
      {!open ? (
        <button onClick={handleOpen}
          className={clsx('flex items-center gap-1.5 text-xs font-medium transition-colors',
            isDark ? 'text-[#5A5780] hover:text-violet-300' : 'text-violet-300 hover:text-violet-600')}>
          <Plus className="w-3.5 h-3.5" /> Add node
        </button>
      ) : (
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <p className={clsx('text-xs mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Node ID</p>
            <input value={id} onChange={e => setId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className={clsx(inputCls(isDark), 'w-52')} />
          </div>
          <div>
            <p className={clsx('text-xs mb-1', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Type</p>
            <select value={type} onChange={e => setType(e.target.value as StoryNode['type'])} className={inputCls(isDark)}>
              <option value="dialogue">dialogue</option>
              <option value="choice">choice</option>
              <option value="free_text">free_text</option>
              <option value="chat">chat</option>
            </select>
          </div>
          <button onClick={handleAdd}
            className="px-3 py-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">
            Add
          </button>
          <button onClick={() => setOpen(false)}
            className={clsx('px-3 py-1.5 text-sm rounded-lg transition-colors',
              isDark ? 'text-[#8B87B8] hover:text-violet-300' : 'text-violet-400 hover:text-violet-600')}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Add scene panel ────────────────────────────────────────────────────────────

function AddScenePanel({ isDark, sceneCount, onAdd }: {
  isDark: boolean; sceneCount: number; onAdd: (s: StoryScene) => void;
}) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');

  const handleOpen = () => {
    setId(`scene_${sceneCount + 1}`);
    setTitle('');
    setOpen(true);
  };

  const handleAdd = () => {
    if (!id.trim()) return;
    onAdd({ id: id.trim(), title: title.trim() || undefined, nodes: [] });
    setOpen(false);
  };

  return (
    <div className={clsx('rounded-2xl border-2 border-dashed p-5 transition-colors',
      open
        ? isDark ? 'border-violet-500/30 bg-[#1E1C30]' : 'border-violet-300 bg-white'
        : isDark ? 'border-[#2D2B47] hover:border-violet-500/30' : 'border-[#E2DFFF] hover:border-violet-300'
    )}>
      {!open ? (
        <button onClick={handleOpen}
          className={clsx('w-full flex items-center justify-center gap-2 text-sm font-medium py-1 transition-colors',
            isDark ? 'text-[#5A5780] hover:text-violet-300' : 'text-violet-300 hover:text-violet-600')}>
          <Plus className="w-4 h-4" /> Add scene
        </button>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Scene ID" isDark={isDark}>
              <input value={id} onChange={e => setId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className={inputCls(isDark)} />
            </FieldLabel>
            <FieldLabel label="Title" isDark={isDark}>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Scene title (optional)"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className={inputCls(isDark)} />
            </FieldLabel>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd}
              className="px-3 py-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">
              Add scene
            </button>
            <button onClick={() => setOpen(false)}
              className={clsx('px-3 py-1.5 text-sm rounded-lg transition-colors',
                isDark ? 'text-[#8B87B8] hover:text-violet-300' : 'text-violet-400 hover:text-violet-600')}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ScriptEditorPage() {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [collapsedScenes, setCollapsedScenes] = useState<Set<string>>(new Set());
  const [confirmDeleteSceneId, setConfirmDeleteSceneId] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;
    fetch(`/api/books/${bookId}`)
      .then(r => r.text())
      .then(text => setStory(yaml.load(text) as Story))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookId]);

  const allNodeIds = story?.scenes.flatMap(s => s.nodes.map(n => n.id)) ?? [];

  const update = (fn: (s: Story) => Story) => {
    setStory(prev => prev ? fn(prev) : prev);
    setDirty(true);
  };

  const handleCreateChar = (char: StoryCharacter) =>
    update(s => ({ ...s, characters: [...(s.characters ?? []), char] }));

  const handleSaveNode = (sceneId: string, originalId: string, updated: StoryNode) =>
    update(s => ({
      ...s,
      scenes: s.scenes.map(sc =>
        sc.id === sceneId
          ? { ...sc, nodes: sc.nodes.map(n => n.id === originalId ? updated : n) }
          : sc
      ),
    }));

  const handleDeleteNode = (sceneId: string, nodeId: string) =>
    update(s => ({
      ...s,
      scenes: s.scenes.map(sc =>
        sc.id === sceneId ? { ...sc, nodes: sc.nodes.filter(n => n.id !== nodeId) } : sc
      ),
    }));

  const handleAddNode = (sceneId: string, node: StoryNode) =>
    update(s => ({
      ...s,
      scenes: s.scenes.map(sc =>
        sc.id === sceneId ? { ...sc, nodes: [...sc.nodes, node] } : sc
      ),
    }));

  const handleAddScene = (scene: StoryScene) =>
    update(s => ({ ...s, scenes: [...s.scenes, scene] }));

  const handleDeleteScene = (sceneId: string) => {
    update(s => ({ ...s, scenes: s.scenes.filter(sc => sc.id !== sceneId) }));
    setConfirmDeleteSceneId(null);
  };

  const handleUpdateScene = (sceneId: string, updated: Partial<StoryScene>) =>
    update(s => ({ ...s, scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, ...updated } : sc) }));

  const handleSave = async () => {
    if (!story || !bookId) return;
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(story),
      });
      if (!res.ok) throw new Error(await res.text());
      setDirty(false);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={clsx('min-h-screen transition-colors duration-300', isDark ? 'bg-[#0C0B1A]' : 'bg-[#F5F3FF]')}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={clsx(
          'absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full blur-3xl opacity-10',
          isDark ? 'bg-violet-600' : 'bg-violet-400'
        )} />
      </div>

      <header className={clsx('sticky top-0 z-20 backdrop-blur-md border-b',
        isDark ? 'bg-[#0C0B1A]/80 border-[#2D2B47]' : 'bg-[#F5F3FF]/80 border-[#E2DFFF]')}>
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate(`/edit/${bookId}`)}
            className={clsx('flex items-center gap-2 text-sm font-medium transition-colors',
              isDark ? 'text-[#8B87B8] hover:text-violet-300' : 'text-violet-500 hover:text-violet-700')}>
            <ArrowLeft className="w-4 h-4" />Edit
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Sparkles className={clsx('w-4 h-4 shrink-0', isDark ? 'text-violet-400' : 'text-violet-600')} />
            <span className={clsx('font-bold tracking-wide shrink-0', isDark ? 'text-white' : 'text-[#1A1839]')}>LOOM</span>
            <span className={clsx('text-sm shrink-0', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>/ Script Editor</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
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

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : !story ? (
          <p className={clsx('text-center py-20', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>Failed to load book.</p>
        ) : (
          <div className="space-y-4">
            {story.scenes.map(scene => {
              const collapsed = collapsedScenes.has(scene.id);
              return (
                <div key={scene.id} className={clsx('rounded-2xl border overflow-hidden',
                  isDark ? 'bg-[#1E1C30] border-[#2D2B47]' : 'bg-white border-[#E2DFFF] shadow-sm')}>

                  <div
                    className={clsx('flex items-center gap-3 px-5 py-4 cursor-pointer select-none',
                      isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-violet-50/40')}
                    onClick={() => setCollapsedScenes(prev => {
                      const next = new Set(prev); next.has(scene.id) ? next.delete(scene.id) : next.add(scene.id); return next;
                    })}
                  >
                    {collapsed
                      ? <ChevronRight className={clsx('w-4 h-4 shrink-0', isDark ? 'text-[#5A5780]' : 'text-violet-300')} />
                      : <ChevronDown className={clsx('w-4 h-4 shrink-0', isDark ? 'text-[#5A5780]' : 'text-violet-300')} />
                    }
                    <div className="flex-1 min-w-0">
                      <span className={clsx('font-semibold', isDark ? 'text-white' : 'text-[#1A1839]')}>{scene.title || scene.id}</span>
                      <span className={clsx('text-xs ml-2', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>
                        {scene.nodes.length} node{scene.nodes.length !== 1 ? 's' : ''}
                        {scene.start ? ' · start' : ''}
                        {scene.end ? ' · end' : ''}
                      </span>
                    </div>
                    <span className={clsx('text-xs font-mono shrink-0', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>{scene.id}</span>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/read/${bookId}?scene=${scene.id}&from=script`); }}
                      className={clsx('shrink-0 p-1.5 rounded-lg transition-colors',
                        isDark ? 'text-[#5A5780] hover:text-teal-400 hover:bg-teal-500/10'
                               : 'text-violet-300 hover:text-teal-600 hover:bg-teal-50')}
                      title="Preview from this scene"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    {confirmDeleteSceneId === scene.id ? (
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteScene(scene.id)}
                          className="px-2 py-1 text-xs font-medium bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors">
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteSceneId(null)}
                          className={clsx('px-2 py-1 text-xs rounded-lg', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteSceneId(scene.id); }}
                        className={clsx('shrink-0 p-1.5 rounded-lg transition-colors',
                          isDark ? 'text-[#5A5780] hover:text-red-400 hover:bg-red-500/10'
                                 : 'text-violet-300 hover:text-red-500 hover:bg-red-50')}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {!collapsed && (
                    <>
                      <div className={clsx('px-5 py-3 border-b', isDark ? 'border-[#2D2B47]' : 'border-[#F0EEFF]')}>
                        <p className={clsx('text-xs font-medium mb-2', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>Scene background</p>
                        <BackgroundPicker
                          value={scene.background}
                          onChange={path => handleUpdateScene(scene.id, { background: path })}
                          bookId={bookId!}
                          isDark={isDark}
                        />
                      </div>
                      {scene.nodes.map(node => (
                        <NodeRow
                          key={node.id}
                          node={node}
                          isDark={isDark}
                          allNodeIds={allNodeIds}
                          bookId={bookId!}
                          characters={story.characters ?? []}
                          onSave={updated => handleSaveNode(scene.id, node.id, updated)}
                          onDelete={() => handleDeleteNode(scene.id, node.id)}
                          onCreateChar={handleCreateChar}
                        />
                      ))}
                      <AddNodePanel isDark={isDark} onAdd={n => handleAddNode(scene.id, n)}
                        sceneId={scene.id} nodeCount={scene.nodes.length} />
                    </>
                  )}
                </div>
              );
            })}
            <AddScenePanel isDark={isDark} sceneCount={story.scenes.length} onAdd={handleAddScene} />
          </div>
        )}
      </main>
    </div>
  );
}
