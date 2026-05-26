import type { ChoiceNode } from '../../types/story';
import clsx from 'clsx';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

interface Props {
  node: ChoiceNode;
  isDark: boolean;
  onChoose: (next: string) => void;
}

export default function ChoiceNodeView({ node, onChoose }: Props) {
  return (
    <div className="px-6 pt-4 pb-5 flex flex-col gap-3">
      {/* Prompt */}
      <p className="text-white/70 text-sm font-medium leading-snug">
        {node.prompt}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {node.options.map((option, i) => (
          <button
            key={i}
            onClick={() => onChoose(option.next)}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left',
              'bg-white/5 border border-white/10',
              'hover:bg-white/10 hover:border-violet-400/40',
              'active:scale-[0.98] transition-all duration-150 group'
            )}
          >
            {/* Letter badge */}
            <span className="w-6 h-6 flex-shrink-0 rounded-md bg-white/10 flex items-center justify-center text-[11px] font-bold text-white/50 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              {OPTION_LABELS[i]}
            </span>

            <span className="flex-1 text-sm text-white/85">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
