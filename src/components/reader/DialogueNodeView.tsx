import { useEffect, useRef } from 'react';
import { ChevronRight, Volume2 } from 'lucide-react';
import type { Character, Story } from '../../types/story';
import type { DialogueNode } from '../../types/story';
import clsx from 'clsx';

interface Props {
  node: DialogueNode;
  story: Story;
  isDark: boolean;
  onNext: () => void;
  hasNext: boolean;
}

export default function DialogueNodeView({ node, story, isDark, onNext, hasNext }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const character = resolveCharacter(node.character, story);
  const isNarrator = !character || character.id === 'narrator';

  useEffect(() => {
    if (!node.audio) return;
    const audio = new Audio(node.audio);
    audioRef.current = audio;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [node.id, node.audio]);

  return (
    <div className="animate-slide-up">
      {/* Narrator vs Character layout */}
      {isNarrator ? (
        <NarratorBlock text={node.text} isDark={isDark} hasAudio={!!node.audio} />
      ) : (
        <CharacterBlock character={character!} text={node.text} isDark={isDark} hasAudio={!!node.audio} />
      )}

      {/* Advance control */}
      {hasNext && (
        <div className="flex justify-end mt-5">
          <button
            onClick={onNext}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.97]',
              isDark
                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            )}
          >
            {node.audio && (
              <Volume2 className="w-4 h-4 opacity-70" />
            )}
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function NarratorBlock({ text, isDark, hasAudio }: { text: string; isDark: boolean; hasAudio: boolean }) {
  return (
    <div className={clsx(
      'rounded-xl p-5',
      isDark ? 'bg-violet-950/30 border border-violet-900/30' : 'bg-violet-50 border border-violet-100'
    )}>
      <div className="flex items-center gap-2 mb-3">
        <span className={clsx(
          'text-xs font-semibold tracking-widest uppercase',
          isDark ? 'text-violet-400' : 'text-violet-500'
        )}>
          ▶ Narrator
        </span>
        {hasAudio && (
          <Volume2 className={clsx('w-3 h-3 animate-pulse', isDark ? 'text-violet-400' : 'text-violet-400')} />
        )}
      </div>
      <p className={clsx(
        'italic reader-text text-base leading-relaxed',
        isDark ? 'text-[#C4B5FD]' : 'text-violet-800'
      )}>
        "{text}"
      </p>
    </div>
  );
}

function CharacterBlock({ character, text, isDark, hasAudio }: {
  character: Character;
  text: string;
  isDark: boolean;
  hasAudio: boolean;
}) {
  return (
    <div>
      {/* Character header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div className={clsx(
          'w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2',
          isDark ? 'ring-violet-500/40' : 'ring-violet-400/40'
        )}>
          {character.avatar ? (
            <img
              src={character.avatar.startsWith('/') ? character.avatar : `/book-assets/${character.avatar}`}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={clsx(
              'w-full h-full flex items-center justify-center text-lg font-bold',
              isDark ? 'bg-violet-800 text-violet-200' : 'bg-violet-200 text-violet-800'
            )}>
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <div className={clsx(
            'font-semibold text-sm',
            isDark ? 'text-violet-300' : 'text-violet-700'
          )}>
            {character.name}
          </div>
          {hasAudio && (
            <div className="flex items-center gap-1">
              <Volume2 className={clsx('w-3 h-3 animate-pulse', isDark ? 'text-violet-400' : 'text-violet-400')} />
              <span className={clsx('text-xs', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>Playing audio…</span>
            </div>
          )}
        </div>
      </div>

      {/* Dialogue bubble */}
      <div className={clsx(
        'ml-13 rounded-xl rounded-tl-sm p-4',
        isDark
          ? 'bg-[#1E1C30] border border-[#2D2B47]'
          : 'bg-white border border-[#E2DFFF] shadow-sm'
      )}>
        <p className={clsx(
          'reader-text text-base',
          isDark ? 'text-[#E8E6FF]' : 'text-[#1A1839]'
        )}>
          {text}
        </p>
      </div>
    </div>
  );
}

function resolveCharacter(ref: string | Character, story: Story): Character | undefined {
  if (typeof ref !== 'string') return ref as Character;
  if (ref === 'narrator') return { id: 'narrator', name: 'Narrator' };
  return story.characters?.find(c => c.id === ref);
}
