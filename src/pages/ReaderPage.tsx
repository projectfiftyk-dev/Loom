import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { X, ChevronRight, ArrowLeft, RotateCcw, CheckCircle, Pause, Play } from 'lucide-react';
import yaml from 'js-yaml';
import { useApp } from '../context/AppContext';
import { fetchBookYaml } from '../api/client';
import { getPaletteForStyle, hexToRgba } from '../styles/palettes';
import type {
  Story, StoryNode, Scene, ChatMessage,
  DialogueNode, Character, FreeTextAttempt,
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
  const [searchParams] = useSearchParams();
  const startScene = searchParams.get('scene');
  const fromParam = searchParams.get('from');
  const exitPath = fromParam === 'script' ? `/edit/${bookId}/script`
                 : fromParam === 'audio'  ? `/edit/${bookId}/audio`
                 : '/library';
  void useApp();

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState('');
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [freeTextAttempts, setFreeTextAttempts] = useState<FreeTextAttempt[]>([]);
  const [finished, setFinished] = useState(false);
  const [audioConfig, setAudioConfig] = useState<Record<string, string>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const advanceRef = useRef<() => void>(() => {});

  // ── load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    Promise.all([
      fetchBookYaml(bookId),
      fetch(`/api/audio-config/${bookId}`).then(r => r.ok ? r.json() : {}),
    ])
      .then(([text, audioCfg]) => {
        const parsed = yaml.load(text) as Story;
        setStory(parsed);
        setAudioConfig(audioCfg || {});
        const scene = startScene
          ? (parsed.scenes.find(s => s.id === startScene) ?? parsed.scenes.find(s => s.start))
          : parsed.scenes.find(s => s.start);
        if (scene?.nodes?.[0]) setCurrentNodeId(scene.nodes[0].id);
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

  // ── palette ─────────────────────────────────────────────────────────────
  const palette = useMemo(() => getPaletteForStyle(story?.metadata.style), [story]);

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
  advanceRef.current = handleAdvance;

  const handlePause = () => { audioRef.current?.pause(); setIsPlaying(false); setIsPaused(true); };
  const handleResume = () => {
    if (!audioRef.current) return;
    audioRef.current.play().then(() => { setIsPlaying(true); setIsPaused(false); }).catch(() => {});
  };

  // ── audio ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) { audioRef.current.onended = null; audioRef.current.pause(); audioRef.current = null; }
    setIsPlaying(false); setIsPaused(false);
    if (!currentNodeId || !bookId) return;
    const audioPath = audioConfig[`${bookId}::${currentNodeId}`];
    if (!audioPath) return;
    const a = new Audio(audioPath);
    audioRef.current = a;
    a.onended = () => { setIsPlaying(false); advanceRef.current(); };
    a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    return () => { a.onended = null; a.pause(); audioRef.current = null; };
  }, [currentNodeId, audioConfig]);

  // Stop audio when the story finishes (finished screen has no nodes)
  useEffect(() => {
    if (!finished) return;
    if (audioRef.current) { audioRef.current.onended = null; audioRef.current.pause(); audioRef.current = null; }
    setIsPlaying(false); setIsPaused(false);
  }, [finished]);

  // ── derived ─────────────────────────────────────────────────────────────
  const currentNode = currentNodeId ? nodeMap.get(currentNodeId) : null;
  const currentScene = currentNodeId ? sceneByNode.get(currentNodeId) : null;
  const nodeBg = (currentNode as any)?.background as string | undefined;
  const bg = nodeBg ?? currentScene?.background;
  const bgUrl = bg ? `/book-assets/${bg}` : null;

  const speaker = useMemo(() => {
    if (!story || !currentNode || currentNode.type !== 'dialogue') return null;
    return resolveCharacter((currentNode as DialogueNode).character, story);
  }, [story, currentNode]);

  const isNarrator = speaker?.id === 'narrator';
  const speakerAccent = speaker?.color || palette.accent;

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

  const isDialogue = currentNode?.type === 'dialogue';
  const isRightPanel = currentNode?.type === 'choice' || currentNode?.type === 'free_text' || currentNode?.type === 'chat';

  const chatKey = currentNode?.type === 'chat' ? currentNode.character : '';
  const hasNext = isDialogue && (
    !!(currentNode as DialogueNode).next ||
    !!(sceneByNode.get(currentNodeId)?.nodes[(nodeIndex.get(currentNodeId) ?? -1) + 1])
  );
  const isLastNode = isDialogue && !hasNext && !!currentScene?.end;

  // ── loading / error / finished ──────────────────────────────────────────
  if (loading) return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: palette.accent, borderTopColor: 'transparent' }} />
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
        <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: palette.accent }} />
        <h2 className="text-2xl font-bold text-white mb-2">Story Complete</h2>
        <p className="text-white/40 text-sm mb-6">{story.metadata.title}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              const s = story.scenes.find(sc => sc.start);
              if (s?.nodes?.[0]) { setCurrentNodeId(s.nodes[0].id); setFinished(false); setChatHistories({}); setFreeTextAttempts([]); }
            }}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 text-white/50 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Read Again
          </button>
          <button
            onClick={() => navigate(exitPath)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-white"
            style={{ background: palette.accent }}
          >
            <ArrowLeft className="w-4 h-4" />
            {fromParam === 'script' ? 'Back to Script Editor' : fromParam === 'audio' ? 'Back to Audio' : 'Back to Library'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── main render ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">

      {/* BACKGROUND IMAGE */}
      {bgUrl && <img src={bgUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}

      {/* VIGNETTE */}
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/75 to-transparent pointer-events-none z-10" />

      {/* TOP OVERLAY */}
      <div className="absolute top-0 inset-x-0 z-40 flex items-start pt-4 px-5 gap-3 pointer-events-none">

        {/* Speaker badge */}
        <div className="flex-shrink-0 pointer-events-auto">
          {isDialogue && speaker && (
            <div className="flex items-center gap-2 bg-black/75 rounded-lg px-3 py-2 backdrop-blur-sm"
              style={{ boxShadow: `0 0 0 1px ${hexToRgba(speakerAccent, 0.3)}` }}>
              {isNarrator ? (
                <>
                  <span style={{ color: speakerAccent }} className="text-[11px] leading-none">▶</span>
                  <span className="text-white text-sm font-medium tracking-wide">Loom Narrator</span>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                    style={{ boxShadow: `0 0 0 1.5px ${hexToRgba(speakerAccent, 0.6)}` }}>
                    {avatarSrc(speaker.avatar) ? (
                      <img src={avatarSrc(speaker.avatar)!} alt={speaker.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: speakerAccent }}>
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

        {/* Scene title */}
        <div className="flex-1 flex justify-center items-center pt-1.5">
          <span className="italic text-white/50 text-sm tracking-wide text-center leading-snug max-w-xs">
            {currentScene?.title}
          </span>
        </div>

        {/* Progress + close */}
        <div className="flex items-center gap-3 flex-shrink-0 pt-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: hexToRgba(palette.accent, 0.7) }} />
            </div>
            <span className="text-white/30 text-[10px]">{progress}%</span>
          </div>
          <button onClick={() => navigate(exitPath)}
            className="text-white/30 hover:text-white/70 transition-colors"
            title={fromParam === 'script' ? 'Back to Script Editor' : 'Back to Library'}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BOTTOM BAR — dialogue */}
      {isDialogue && currentNode && (
        <div className="absolute bottom-0 inset-x-0 z-20">
          <div className="h-px" style={{ background: hexToRgba(speakerAccent, 0.4) }} />
          <div className="bg-black/88 backdrop-blur-sm min-h-[130px] max-h-[280px]">
            <div className="flex flex-col px-8 py-4">
              <p className="italic text-white/90 text-base leading-relaxed">
                {(currentNode as DialogueNode).text}
              </p>
              {(currentNode as DialogueNode).hint && (
                <div className="mt-3 flex-shrink-0">
                  <div className="h-px bg-white/10 mb-2" />
                  <p className="text-xs leading-relaxed text-white/45">
                    <span className="font-semibold text-white/30 uppercase tracking-wider text-[10px] mr-1.5">Hint</span>
                    {(currentNode as DialogueNode).hint}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between mt-3 flex-shrink-0">
                <span className="text-[10px] tracking-[0.18em] text-white/22 uppercase select-none">
                  {story.metadata.title}
                </span>
                <div className="flex items-center gap-1">
                  {isPlaying && (
                    <button onClick={handlePause}
                      className="text-white/45 hover:text-white transition-colors active:scale-95 p-1" title="Pause">
                      <Pause className="w-4 h-4" />
                    </button>
                  )}
                  {isPaused && (
                    <button onClick={handleResume}
                      className="hover:opacity-80 transition-opacity active:scale-95 p-1" title="Resume"
                      style={{ color: speakerAccent }}>
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  {hasNext && !isLastNode && (
                    <button onClick={handleAdvance}
                      className="text-white/45 hover:text-white transition-colors active:scale-95 p-1" title="Next">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                  {isLastNode && (
                    <button onClick={() => setFinished(true)}
                      className="text-xs hover:opacity-80 transition-opacity"
                      style={{ color: speakerAccent }}>
                      Finish →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT PANEL — choice / free_text / chat */}
      {isRightPanel && currentNode && (
        <div className="absolute right-0 top-14 bottom-0 z-30
                        w-[40%] min-w-[300px] max-w-[480px]
                        bg-black/90 backdrop-blur-md
                        border-l border-t border-white/10
                        flex flex-col overflow-hidden
                        animate-slide-in-right">
          <div className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
            style={{ background: hexToRgba(palette.accent, 0.35) }} />

          {currentNode.type === 'choice' && (
            <div className="flex flex-col justify-center flex-1">
              <ChoiceNodeView node={currentNode} isDark={true} onChoose={navigateTo} palette={palette} />
            </div>
          )}

          {currentNode.type === 'free_text' && (
            <div className="flex flex-col justify-center flex-1">
              <FreeTextNodeView node={currentNode} isDark={true} onNavigate={navigateTo}
                maxAttempts={story.settings?.max_free_text_attempts ?? 3} palette={palette}
                onAttempt={a => setFreeTextAttempts(prev => [...prev, a])} />
            </div>
          )}

          {currentNode.type === 'chat' && (
            <ChatNodeView node={currentNode} story={story} isDark={true}
              history={chatHistories[chatKey] ?? []}
              onUpdateHistory={msgs => setChatHistories(prev => ({ ...prev, [chatKey]: msgs }))}
              onClose={() => currentNode.next && navigateTo(currentNode.next)}
              palette={palette}
              chatHistories={chatHistories}
              freeTextAttempts={freeTextAttempts} />
          )}
        </div>
      )}
    </div>
  );
}
