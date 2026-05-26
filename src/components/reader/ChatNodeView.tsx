import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import type { ChatNode, Character, Story, ChatMessage } from '../../types/story';
import { useApp } from '../../context/AppContext';
import { chatWithCharacter } from '../../api/client';
import clsx from 'clsx';

interface Props {
  node: ChatNode;
  story: Story;
  isDark: boolean;
  history: ChatMessage[];
  onUpdateHistory: (msgs: ChatMessage[]) => void;
  onClose: () => void;
}

export default function ChatNodeView({ node, story, history, onUpdateHistory, onClose }: Props) {
  const { llmProvider, apiKey } = useApp();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const character = story.characters?.find(c => c.id === node.character)
    ?? { id: node.character, name: node.character };

  const avatarSrc = (avatar: string | undefined) => {
    if (!avatar) return null;
    return avatar.startsWith('/') ? avatar : `/book-assets/${avatar}`;
  };

  // Seed with entry_line if history is empty
  const displayMessages: ChatMessage[] = history.length === 0 && node.entry_line
    ? [{ role: 'assistant', content: node.entry_line }]
    : history;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length]);

  const buildSystemPrompt = () => {
    const personality = (character as Character).personality || `You are ${character.name}. Respond in character.`;
    const storyContext = story.scenes
      .flatMap(s => s.nodes)
      .filter(n => n.type === 'dialogue')
      .slice(0, 20)
      .map(n => {
        const d = n as { character: string | Character; text: string };
        const name = typeof d.character === 'string' ? d.character : d.character.name;
        return `${name}: "${d.text}"`;
      })
      .join('\n');

    return `${personality}\n\n--- Story context so far ---\n${storyContext}\n\nRespond in character. Keep responses concise (1-3 sentences).`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newHistory = [...displayMessages, userMsg];
    onUpdateHistory(newHistory);
    setInput('');
    setLoading(true);

    try {
      const reply = await chatWithCharacter(llmProvider, apiKey, buildSystemPrompt(), newHistory);
      onUpdateHistory([...newHistory, { role: 'assistant', content: reply }]);
    } catch {
      onUpdateHistory([...newHistory, { role: 'assistant', content: '(No response — check your API key in Settings.)' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full px-5 pt-5 pb-4">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 pb-4 mb-1 border-b border-white/10 flex-shrink-0">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/20">
          {avatarSrc((character as Character).avatar) ? (
            <img
              src={avatarSrc((character as Character).avatar)!}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-violet-700 flex items-center justify-center text-white text-sm font-bold">
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="text-white text-sm font-semibold">{character.name}</div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-white/40 text-xs">Online</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white text-xs font-medium transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Exit chat
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1 py-2">
        {displayMessages.map((msg, i) => (
          <div
            key={i}
            className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div className={clsx(
              'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-sm'
                : 'bg-white/8 border border-white/10 text-white/90 rounded-bl-sm'
            )}>
              {msg.role === 'assistant' && (
                <div className="text-[10px] font-semibold text-violet-400/80 mb-1 tracking-wide uppercase">
                  {character.name}
                </div>
              )}
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm bg-white/8 border border-white/10">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="flex items-end gap-2 pt-3 border-t border-white/10 flex-shrink-0">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={`Message ${character.name}…`}
          rows={1}
          className={clsx(
            'flex-1 rounded-xl px-4 py-3 text-sm resize-none outline-none',
            'bg-white/5 border border-white/10 text-white placeholder:text-white/25',
            'focus:border-violet-500/60 transition-colors'
          )}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-all active:scale-[0.95] disabled:opacity-30 mb-0.5"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
