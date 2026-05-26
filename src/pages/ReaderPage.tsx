import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, ChevronRight, ArrowLeft, RotateCcw, CheckCircle } from 'lucide-react';
import yaml from 'js-yaml';
import { useApp } from '../context/AppContext';
import { fetchBookYaml } from '../api/client';
import type {
  Story, StoryNode, Scene, ChatMessage,
  DialogueNode, Character,
} from '../types/story';
import ChoiceNodeView from '../components/reader/ChoiceNodeView';
import FreeTextNodeView from '../components/reader/FreeTextNodeView';
import ChatNodeView from '../components/reader/ChatNodeView';

// ─── helpers ────────────────────────────────────────────────────────────────

function resolveCharacter(ref: string | Character, story: Story): Character {
  if (typeof ref !== 'string') return ref as Character;
  if (ref === 'narrator') return { id: 'narrator', name: 'Loom Narrator' };
  return story.characters?.find(c => c.id === ref) ?? { id: ref, name: ref };
}

function avatarSrc(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  return avatar.startsWith('/') ? avatar : `/book-assets/${avatar}`;
}

// ─── component ──────────────────────────────────────────────────────────────

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { theme } = useApp();

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState('');
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [finished, setFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // suppress unused theme warning
  void theme;

  // ── load story ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    fetchBookYaml(bookId)
      .then(text => {
        const parsed = yaml.load(text) as Story;
        setStory(parsed);
        const start = parsed.scenes.find(s => s.start);
        if (start?.nodes?.[0]) setCurrentNodeId(start.nodes[0].id);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookId]);

  // ── maps ────────────────────────────────────────────────────────────────
  const { nodeMap, sceneByNode, nodeIndex } = useMemo(() => {
    if (!story) return {
      nodeMap: new Map<string, StoryNode>(),
      sceneByNode: new Map<string, Scene>(),
      nodeIndex: new Map<string, number>(),
    };
    const nm = new Map<string, StoryNode>();
    const sbn = new Map<string, Scene>();
    const ni = new Map<string, number>();
    story.scenes.forEach(scene =>
      scene.nodes.forEach((node, idx) => {
        nm.set(node.id, node);
        sbn.set(node.id, scene);
        ni.set(node.id, idx);
      })
    );
    return { nodeMap: nm, sceneByNode: sbn, nodeIndex: ni };
  }, [story]);

  // ── navigation ──────────────────────────────────────────────────────────
  const navigateTo = (target: string) => {
    if (!story) return;
    const scene = story.scenes.find(s => s.id === target);
    if (scene) {
      if (scene.end && !scene.nodes.length) { setFinished(true); return; }
      if (scene.nodes[0]) { setCurrentNodeId(scene.nodes[0].id); return; }
    }
    if (nodeMap.has(target)) setCurrentNodeId(target);
  };

  const handleAdvance = () => {
    if (!story || !currentNodeId) return;
    const node = nodeMap.get(currentNodeId);
    if (!node || node.type !== 'dialogue') return;
    if (!node.next) {
      const scene = sceneByNode.get(currentNodeId);
      if (scene?.end) { setFinished(true); return; }
      const next = scene?.nodes[(nodeIndex.get(currentNodeId) ?? -1) + 1];
      if (next) setCurrentNodeId(next.id);
    } else {
      navigateTo(node.next);
    }
  };

  // ── audio ───────────────────────────────────────────────────────────────
  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (!currentNodeId) return;
    const node = nodeMap.get(currentNodeId);
    if (node?.type === 'dialogue' && node.audio) {
      const a = new Audio(node.audio);
      audioRef.current = a;
      a.play().catch(() => {});
    }
  }, [currentNodeId]);

  // ── derived ─────────────────────────────────────────────────────────────
  const currentNode = currentNodeId ? nodeMap.get(currentNodeId) : null;
  const currentScene = currentNodeId ? sceneByNode.get(currentNodeId) : null;
  const bgUrl = currentScene?.background ? `/book-assets/${currentScene.background}` : null;

  const speaker = useMemo(() => {
    if (!story || !currentNode || currentNode.type !== 'dialogue') return null;
    return resolveCharacter((currentNode as DialogueNode).character, story);
  }, [story, currentNode]);

  const isNarrator = speaker?.id === 'narrator';

  const progress = useMemo(() => {
    if (!story || !currentNodeId) return 0;
    let total = 0, pos = 0, found = false;
    for (const sc of story.scenes)
      for (const n of sc.nodes) {
        total++;
        if (!found) pos++;
        if (n.id === currentNodeId) found = true;
      }
    return Math.round((pos / Math.max(total, 1)) * 100);
  }, [story, currentNodeId]);

  // Layout mode flags
  const isDialogue = currentNode?.type === 'dialogue';
  const isRightPanel = currentNode?.type === 'choice'
    || currentNode?.type === 'free_text'
    || currentNode?.type === 'chat';

  const chatKey = currentNode?.type === 'chat' ? currentNode.character : '';
  const hasNext = isDialogue && (
    !!(currentNode as DialogueNode).next ||
    !!(sceneByNode.get(currentNodeId)?.nodes[(nodeIndex.get(currentNodeId) ?? -1) + 1])
  );
  const isLastNode = isDialogue && !hasNext && !!currentScene?.end;

  // ── loading / error / finished ──────────────────────────────────────────
  if (loading) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  if (error || !story) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-red-400 mb-4">{error || 'Could not load book.'}</p>
        <button onClick={() => navigate('/library')} className="text-violet-400 underline">Back to Library</button>
      </div>
    </div>
  );

  if (finished) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-violet-400" />
        <h2 className="text-2xl font-bold text-white mb-2">Story Complete</h2>
        <p className="text-white/40 text-sm mb-6">{story.metadata.title}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              const s = story.scenes.find(sc => sc.start);
              if (s?.nodes?.[0]) { setCurrentNodeId(s.nodes[0].id); setFinished(false); setChatHistories({}); }
            }}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 text-white/50 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Read Again
          </button>
          <button
            onClick={() => navigate('/library')}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Library
          </button>
        </div>
      </div>
    </div>
  );

  // ── main render ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">

      {/* ── BACKGROUND IMAGE ── */}
      {bgUrl && (
        <img
          src={bgUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* ── VIGNETTE ── */}
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/75 to-transparent pointer-events-none z-10" />

      {/* ════════════════════════════════════════════════════════════════════
          TOP OVERLAY — z-40 so it stays above the right panel
          ════════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-0 inset-x-0 z-40 flex items-start pt-4 px-5 gap-3 pointer-events-none">

        {/* Speaker badge — top left (dialogue only) */}
        <div className="flex-shrink-0 pointer-events-auto">
          {isDialogue && speaker && (
            <div className="flex items-center gap-2 bg-black/75 rounded-lg px-3 py-2 backdrop-blur-sm">
              {isNarrator ? (
                <>
                  <span className="text-amber-400 text-[11px] leading-none">▶</span>
                  <span className="text-white text-sm font-medium tracking-wide">Loom Narrator</span>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/20">
                    {avatarSrc(speaker.avatar) ? (
                      <img src={avatarSrc(speaker.avatar)!} alt={speaker.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold">
                        {speaker.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="text-white text-sm font-medium">{speaker.name}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Scene title — center */}
        <div className="flex-1 flex justify-center items-center pt-1.5">
          <span className="italic text-white/50 text-sm tracking-wide text-center leading-snug max-w-xs">
            {currentScene?.title}
          </span>
        </div>

        {/* Progress + close — right */}
        <div className="flex items-center gap-3 flex-shrink-0 pt-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-amber-400/70 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-white/30 text-[10px]">{progress}%</span>
          </div>
          <button
            onClick={() => navigate('/library')}
            className="text-white/30 hover:text-white/70 transition-colors"
            title="Back to Library"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BOTTOM BAR — dialogue only
          ════════════════════════════════════════════════════════════════════ */}
      {isDialogue && currentNode && (
        <div className="absolute bottom-0 inset-x-0 z-20">
          <div className="h-px bg-amber-500/35" />
          <div className="bg-black/88 backdrop-blur-sm h-[22vh] min-h-[130px] max-h-[210px]">
            <div className="h-full flex flex-col px-8 py-4">
              <p className="italic text-white/90 text-base leading-relaxed flex-1 overflow-hidden">
                {(currentNode as DialogueNode).text}
              </p>
              <div className="flex items-center justify-between mt-3 flex-shrink-0">
                <span className="text-[10px] tracking-[0.18em] text-white/22 uppercase select-none">
                  {story.metadata.title}
                </span>
                {hasNext && !isLastNode && (
                  <button
                    onClick={handleAdvance}
                    className="text-white/45 hover:text-white transition-colors active:scale-95 p-1"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
                {isLastNode && (
                  <button
                    onClick={() => setFinished(true)}
                    className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
                  >
                    Finish →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT PANEL — slides in from right for choice / free_text / chat
          Starts at top-14 (below the top overlay) and reaches the bottom.
          Width: 40% with a min of 300px.
          ════════════════════════════════════════════════════════════════════ */}
      {isRightPanel && currentNode && (
        <div className="absolute right-0 top-14 bottom-0 z-30
                        w-[40%] min-w-[300px] max-w-[480px]
                        bg-black/90 backdrop-blur-md
                        border-l border-t border-white/10
                        flex flex-col overflow-hidden
                        animate-slide-in-right">

          {/* Thin amber accent on the left edge */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-amber-500/30 pointer-events-none" />

          {/* ── CHOICE ── */}
          {currentNode.type === 'choice' && (
            <div className="flex flex-col justify-center flex-1">
              <ChoiceNodeView
                node={currentNode}
                isDark={true}
                onChoose={navigateTo}
              />
            </div>
          )}

          {/* ── FREE TEXT ── */}
          {currentNode.type === 'free_text' && (
            <div className="flex flex-col justify-center flex-1">
              <FreeTextNodeView
                node={currentNode}
                isDark={true}
                onNavigate={navigateTo}
                maxAttempts={story.settings?.max_free_text_attempts ?? 3}
              />
            </div>
          )}

          {/* ── CHAT ── */}
          {currentNode.type === 'chat' && (
            <ChatNodeView
              node={currentNode}
              story={story}
              isDark={true}
              history={chatHistories[chatKey] ?? []}
              onUpdateHistory={msgs => setChatHistories(prev => ({ ...prev, [chatKey]: msgs }))}
              onClose={() => currentNode.next && navigateTo(currentNode.next)}
            />
          )}
        </div>
      )}
    </div>
  );
}
