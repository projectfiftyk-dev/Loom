import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import type { ChatNode, Character, Story, ChatMessage } from '../../types/story';
import type { BookPalette } from '../../styles/palettes';
import { hexToRgba } from '../../styles/palettes';
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
  palette: BookPalette;
}

export default function ChatNodeView({ node, story, history, onUpdateHistory, onClose, palette }: Props) {
  const { llmProvider, apiKey } = useApp();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const character = (story.characters?.find(c => c.id === node.character) ?? { id: node.character, name: node.character }) as Character;
  const charColor = character.color || palette.accent;

  const avatarSrc = (avatar: string | null | undefined) => {
    if (!avatar) return null;
    return avatar.startsWith('/') ? avatar : `/book-assets/${avatar}`;
  };

  const displayMessages: ChatMessage[] = history.length === 0 && node.entry_line
    ? [{ role: 'assistant', content: node.entry_line }]
    : history;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length]);

  const buildSystemPrompt = () => {
    const personality = character.personality || `You are ${character.name}. Respond in character.`;
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

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-1 border-b border-white/10 flex-shrink-0">
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
          style={{ boxShadow: `0 0 0 2px ${hexToRgba(charColor, 0.5)}` }}>
          {avatarSrc(character.avatar) ? (
            <img src={avatarSrc(character.avatar)!} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: charColor }}>
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="text-white text-sm font-semibold" style={{ color: charColor }}>{character.name}</div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-white/40 text-xs">Online</span>
          </div>
        </div>
        <button onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white text-xs font-medium transition-colors">
          <X className="w-3.5 h-3.5" />Exit chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1 py-2">
        {displayMessages.map((msg, i) => (
          <div key={i} className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'user' ? (
              <div className="max-w-[78%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed text-white"
                style={{ background: palette.accent }}>
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[78%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed border"
                style={{
                  background: hexToRgba(charColor, 0.12),
                  borderColor: hexToRgba(charColor, 0.25),
                  color: 'rgba(255,255,255,0.9)',
                }}>
                <div className="text-[10px] font-semibold mb-1 tracking-wide uppercase"
                  style={{ color: hexToRgba(charColor, 0.8) }}>
                  {character.name}
                </div>
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm border"
              style={{ background: hexToRgba(charColor, 0.08), borderColor: hexToRgba(charColor, 0.2) }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: charColor, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 pt-3 border-t border-white/10 flex-shrink-0">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={`Message ${character.name}…`}
          rows={1}
          className="flex-1 rounded-xl px-4 py-3 text-sm resize-none outline-none bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:border-white/30 transition-colors"
        />
        <button onClick={sendMessage} disabled={!input.trim() || loading}
          className="flex-shrink-0 w-10 h-10 rounded-xl text-white flex items-center justify-center transition-all active:scale-[0.95] disabled:opacity-30 mb-0.5"
          style={{ background: palette.accent }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
