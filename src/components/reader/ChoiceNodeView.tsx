import type { ChoiceNode } from '../../types/story';
import type { BookPalette } from '../../styles/palettes';
import { hexToRgba } from '../../styles/palettes';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

interface Props {
  node: ChoiceNode;
  isDark: boolean;
  onChoose: (next: string) => void;
  palette: BookPalette;
}

export default function ChoiceNodeView({ node, onChoose, palette }: Props) {
  return (
    <div className="px-6 pt-4 pb-5 flex flex-col gap-3">
      <p className="text-white/70 text-sm font-medium leading-snug">{node.prompt}</p>

      <div className="flex flex-col gap-2">
        {node.options.map((option, i) => (
          <button
            key={i}
            onClick={() => onChoose(option.next)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left border border-white/10 active:scale-[0.98] transition-all duration-150"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.background = hexToRgba(palette.accent, 0.15))}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            <span
              className="w-6 h-6 flex-shrink-0 rounded-md flex items-center justify-center text-[11px] font-bold transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
              onMouseEnter={e => { e.currentTarget.style.background = palette.accent; e.currentTarget.style.color = palette.accentFg; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
            >
              {OPTION_LABELS[i]}
            </span>
            <span className="flex-1 text-sm text-white/85">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
