import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Play, Square, Loader2, Volume2, ChevronDown, ChevronRight,
  Check, MicOff, X, Mic2, Search, UserCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import clsx from 'clsx';
import yaml from 'js-yaml';

interface CharacterInfo { id: string; name: string; }
interface ElevenLabsVoice { voice_id: string; name: string; category?: string; }
interface VoiceAssignment { voiceId: string; voiceName: string; }

interface DialogueNodeInfo {
  sceneId: string;
  nodeId: string;
  character: string;
  characterName: string;
  text: string;
}

interface SceneGroup {
  id: string;
  title: string;
  nodes: DialogueNodeInfo[];
}

export default function AudioPage() {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const { theme, elevenLabsApiKey } = useApp();
  const isDark = theme === 'dark';

  const [bookTitle, setBookTitle] = useState('');
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [scenes, setScenes] = useState<SceneGroup[]>([]);
  const [assignments, setAssignments] = useState<Record<string, VoiceAssignment>>({});
  const [audioConfig, setAudioConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Voice cast panel
  const [voiceCastCollapsed, setVoiceCastCollapsed] = useState(false);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [expandedCharId, setExpandedCharId] = useState<string | null>(null);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);
  const [playingTestId, setPlayingTestId] = useState<string | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio generation
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedScenes, setCollapsedScenes] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0, nodeId: '' });
  const stopGenRef = useRef(false);

  // Playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingNodeId, setPlayingNodeId] = useState<string | null>(null);

  // Preview
  const [previewSceneId, setPreviewSceneId] = useState<string | null>(null);
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);
  const previewActiveRef = useRef(false);

  // ── Load book data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookId) return;
    Promise.all([
      fetch(`/api/books/${bookId}`).then(r => r.text()),
      fetch('/api/voice-config').then(r => r.ok ? r.json() : {}),
      fetch(`/api/audio-config/${bookId}`).then(r => r.ok ? r.json() : {}),
    ])
      .then(([yamlText, voiceConfig, audioCfg]) => {
        const story = yaml.load(yamlText) as any;
        setBookTitle(story.metadata?.title || bookId);
        setAudioConfig(audioCfg || {});

        const charNames: Record<string, string> = {};
        const chars: CharacterInfo[] = [];
        for (const c of story.characters || []) {
          charNames[c.id] = c.name || c.id;
          chars.push({ id: c.id, name: c.name || c.id });
        }

        // Also collect any character IDs used in dialogue nodes but not declared in characters
        const seenIds = new Set(chars.map(c => c.id));
        for (const scene of story.scenes || []) {
          for (const node of scene.nodes || []) {
            if (node.type === 'dialogue' && node.character) {
              const charId = typeof node.character === 'string' ? node.character : node.character?.id;
              if (charId && !seenIds.has(charId)) {
                seenIds.add(charId);
                const name = charId.charAt(0).toUpperCase() + charId.slice(1);
                charNames[charId] = name;
                chars.push({ id: charId, name });
              }
            }
          }
        }

        setCharacters(chars);

        const assigns: Record<string, VoiceAssignment> = {};
        for (const [key, val] of Object.entries(voiceConfig.voiceAssignments || {})) {
          if (key.startsWith(`${bookId}::`)) {
            assigns[key.split('::')[1]] = val as VoiceAssignment;
          }
        }
        setAssignments(assigns);
        setVoiceCastCollapsed(chars.length > 0 && chars.every(c => assigns[c.id]));

        const sceneGroups: SceneGroup[] = [];
        for (const scene of story.scenes || []) {
          const nodes: DialogueNodeInfo[] = [];
          for (const node of scene.nodes || []) {
            if (node.type === 'dialogue' && node.character && node.text) {
              const charId = typeof node.character === 'string' ? node.character : node.character?.id;
              nodes.push({
                sceneId: scene.id,
                nodeId: node.id,
                character: charId,
                characterName: charNames[charId] || charId,
                text: node.text,
              });
            }
          }
          if (nodes.length > 0) sceneGroups.push({ id: scene.id, title: scene.title || scene.id, nodes });
        }
        setScenes(sceneGroups);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookId]);

  // ── Load ElevenLabs voices ─────────────────────────────────────────────────
  useEffect(() => {
    if (!elevenLabsApiKey) { setLoadingVoices(false); return; }
    setLoadingVoices(true);
    fetch('/api/elevenlabs/voices', { headers: { 'x-elevenlabs-key': elevenLabsApiKey } })
      .then(r => r.json())
      .then(data => setVoices(Array.isArray(data) ? data : []))
      .catch(e => setVoicesError(e.message))
      .finally(() => setLoadingVoices(false));
  }, [elevenLabsApiKey]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const allNodes = scenes.flatMap(s => s.nodes);
  const assignedNodes = allNodes.filter(n => assignments[n.character]?.voiceId);
  const unprocessedNodes = assignedNodes.filter(n => !audioConfig[`${bookId}::${n.nodeId}`]);
  const generatedCount = assignedNodes.filter(n => audioConfig[`${bookId}::${n.nodeId}`]).length;
  const audioPathFor = (nodeId: string) => audioConfig[`${bookId}::${nodeId}`];
  const assignedCharCount = characters.filter(c => assignments[c.id]).length;

  const filteredVoices = voiceSearch.trim()
    ? voices.filter(v => v.name.toLowerCase().includes(voiceSearch.toLowerCase()) || (v.category || '').toLowerCase().includes(voiceSearch.toLowerCase()))
    : voices;

  const selectedAssignedNodes = allNodes.filter(n =>
    selectedIds.has(n.nodeId) && assignments[n.character]?.voiceId
  );
  const currentGenNode = generating ? allNodes.find(n => n.nodeId === genProgress.nodeId) : null;

  // ── Voice cast handlers ────────────────────────────────────────────────────
  const toggleExpandChar = (charId: string) => {
    setExpandedCharId(prev => {
      if (prev === charId) return null;
      setVoiceSearch('');
      return charId;
    });
  };

  const stopTestAudio = () => {
    if (testAudioRef.current) { testAudioRef.current.pause(); testAudioRef.current = null; }
    setPlayingTestId(null);
  };

  const handleTestVoice = async (voice: ElevenLabsVoice) => {
    const char = characters.find(c => c.id === expandedCharId);
    if (!char) return;
    stopTestAudio();
    if (playingTestId === voice.voice_id) return;
    setTestingVoiceId(voice.voice_id);
    try {
      const res = await fetch('/api/elevenlabs/test-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: elevenLabsApiKey, voiceId: voice.voice_id, characterId: char.id, characterName: char.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const audio = new Audio(data.audioPath);
      testAudioRef.current = audio;
      setPlayingTestId(voice.voice_id);
      audio.onended = () => { setPlayingTestId(null); testAudioRef.current = null; };
      audio.play();
    } catch (e) {
      console.error('Voice test failed:', e);
    } finally {
      setTestingVoiceId(null);
    }
  };

  const handleAssignVoice = async (voice: ElevenLabsVoice) => {
    if (!expandedCharId || !bookId) return;
    const isAssigned = assignments[expandedCharId]?.voiceId === voice.voice_id;
    await fetch('/api/voice-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId,
        characterId: expandedCharId,
        voiceId: isAssigned ? null : voice.voice_id,
        voiceName: isAssigned ? null : voice.name,
      }),
    });
    setAssignments(prev => {
      const next = { ...prev };
      if (isAssigned) delete next[expandedCharId];
      else next[expandedCharId] = { voiceId: voice.voice_id, voiceName: voice.name };
      return next;
    });
  };

  // ── Audio playback ─────────────────────────────────────────────────────────
  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingNodeId(null);
  };

  const playNode = (nodeId: string) => {
    const path = audioPathFor(nodeId);
    if (!path) return;
    stopAudio();
    if (playingNodeId === nodeId) return;
    const audio = new Audio(path);
    audioRef.current = audio;
    setPlayingNodeId(nodeId);
    audio.onended = () => { setPlayingNodeId(null); audioRef.current = null; };
    audio.play();
  };

  // ── Generation ─────────────────────────────────────────────────────────────
  const generateBatch = async (nodesToGen: DialogueNodeInfo[]) => {
    if (generating || nodesToGen.length === 0) return;
    stopAudio(); stopPreview();
    stopGenRef.current = false;
    setGenerating(true);
    setGenProgress({ current: 0, total: nodesToGen.length, nodeId: '' });
    for (let i = 0; i < nodesToGen.length; i++) {
      if (stopGenRef.current) break;
      const node = nodesToGen[i];
      const voiceId = assignments[node.character]?.voiceId;
      if (!voiceId) continue;
      setGenProgress({ current: i + 1, total: nodesToGen.length, nodeId: node.nodeId });
      try {
        const res = await fetch('/api/elevenlabs/generate-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: elevenLabsApiKey, voiceId, bookId, nodeId: node.nodeId, text: node.text, force: !!audioPathFor(node.nodeId) }),
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => `HTTP ${res.status}`);
          throw new Error(msg.startsWith('<') ? `HTTP ${res.status} — is the server running the latest code?` : msg);
        }
        const data = await res.json();
        if (data.audioPath) setAudioConfig(prev => ({ ...prev, [`${bookId}::${node.nodeId}`]: data.audioPath }));
      } catch (e) {
        console.error(`Audio generation failed for node ${node.nodeId}:`, e);
      }
    }
    setGenerating(false);
    setSelectedIds(new Set());
  };

  // ── Preview ────────────────────────────────────────────────────────────────
  const startPreview = (scene: SceneGroup) => {
    const generated = scene.nodes.filter(n => audioPathFor(n.nodeId));
    if (generated.length === 0) return;
    stopAudio();
    previewActiveRef.current = true;
    setPreviewSceneId(scene.id);
    playPreviewSequence(scene.id, generated, 0);
  };

  const playPreviewSequence = (sceneId: string, nodes: DialogueNodeInfo[], index: number) => {
    if (!previewActiveRef.current || index >= nodes.length) {
      setPreviewSceneId(null); setPreviewNodeId(null); previewActiveRef.current = false; return;
    }
    const node = nodes[index];
    const path = audioPathFor(node.nodeId);
    if (!path) { playPreviewSequence(sceneId, nodes, index + 1); return; }
    const audio = new Audio(path);
    audioRef.current = audio;
    setPlayingNodeId(node.nodeId); setPreviewNodeId(node.nodeId);
    audio.onended = () => { setPlayingNodeId(null); playPreviewSequence(sceneId, nodes, index + 1); };
    audio.play();
  };

  const stopPreview = () => {
    previewActiveRef.current = false;
    stopAudio();
    setPreviewSceneId(null); setPreviewNodeId(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={clsx('min-h-screen transition-colors duration-300', isDark ? 'bg-[#0C0B1A]' : 'bg-[#F5F3FF]')}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={clsx(
          'absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full blur-3xl opacity-10',
          isDark ? 'bg-teal-600' : 'bg-teal-400'
        )} />
      </div>

      {/* Header */}
      <header className={clsx(
        'sticky top-0 z-20 backdrop-blur-md border-b',
        isDark ? 'bg-[#0C0B1A]/80 border-[#2D2B47]' : 'bg-[#F5F3FF]/80 border-[#E2DFFF]'
      )}>
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate(`/edit/${bookId}`)}
            className={clsx('flex items-center gap-2 text-sm font-medium transition-colors',
              isDark ? 'text-[#8B87B8] hover:text-violet-300' : 'text-violet-500 hover:text-violet-700')}
          >
            <ArrowLeft className="w-4 h-4" />
            Edit
          </button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Sparkles className={clsx('w-4 h-4 shrink-0', isDark ? 'text-violet-400' : 'text-violet-600')} />
            <span className={clsx('font-bold tracking-wide shrink-0', isDark ? 'text-white' : 'text-[#1A1839]')}>LOOM</span>
            <span className={clsx('text-sm shrink-0', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>/ Audio Generation</span>
            {bookTitle && <span className={clsx('text-sm truncate', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>— {bookTitle}</span>}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">

            {/* ── Voice Cast ────────────────────────────────────────────── */}
            <div className={clsx(
              'rounded-2xl border overflow-hidden',
              isDark ? 'bg-[#1E1C30] border-[#2D2B47]' : 'bg-white border-[#E2DFFF] shadow-sm'
            )}>
              {/* Section header */}
              <div
                className={clsx(
                  'flex items-center gap-3 px-5 py-4 cursor-pointer select-none',
                  isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-violet-50/40'
                )}
                onClick={() => setVoiceCastCollapsed(v => !v)}
              >
                <div className={clsx(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                  isDark ? 'bg-violet-600/20' : 'bg-violet-100'
                )}>
                  <Mic2 className={clsx('w-4 h-4', isDark ? 'text-violet-400' : 'text-violet-600')} />
                </div>
                <span className={clsx('font-semibold flex-1', isDark ? 'text-white' : 'text-[#1A1839]')}>Voice Cast</span>
                <span className={clsx(
                  'text-xs font-medium px-2 py-0.5 rounded-full mr-1',
                  assignedCharCount === characters.length && characters.length > 0
                    ? isDark ? 'bg-teal-600/20 text-teal-300' : 'bg-teal-50 text-teal-700'
                    : isDark ? 'bg-[#2D2B47] text-[#8B87B8]' : 'bg-violet-50 text-violet-400'
                )}>
                  {assignedCharCount}/{characters.length} assigned
                </span>
                {voiceCastCollapsed
                  ? <ChevronRight className={clsx('w-4 h-4 shrink-0', isDark ? 'text-[#5A5780]' : 'text-violet-300')} />
                  : <ChevronDown className={clsx('w-4 h-4 shrink-0', isDark ? 'text-[#5A5780]' : 'text-violet-300')} />
                }
              </div>

              {/* Characters */}
              {!voiceCastCollapsed && (
                <div className={clsx('border-t', isDark ? 'border-[#2D2B47]' : 'border-[#E2DFFF]')}>
                  {characters.length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <p className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>No characters found in this book.</p>
                    </div>
                  ) : characters.map((char, i) => {
                    const assignment = assignments[char.id];
                    const isExpanded = expandedCharId === char.id;

                    return (
                      <div key={char.id} className={clsx(i > 0 && (isDark ? 'border-t border-[#2D2B47]' : 'border-t border-[#F0EEFF]'))}>
                        {/* Character row */}
                        <div className="flex items-center gap-3 px-5 py-3">
                          <UserCircle2 className={clsx('w-4 h-4 shrink-0', isDark ? 'text-[#5A5780]' : 'text-violet-300')} />
                          <span className={clsx('font-medium text-sm flex-1', isDark ? 'text-white' : 'text-[#1A1839]')}>{char.name}</span>
                          {assignment ? (
                            <span className={clsx(
                              'text-xs px-2 py-0.5 rounded-full',
                              isDark ? 'bg-violet-600/20 text-violet-300' : 'bg-violet-100 text-violet-600'
                            )}>
                              {assignment.voiceName}
                            </span>
                          ) : (
                            <span className={clsx(
                              'text-xs px-2 py-0.5 rounded-full',
                              isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-400'
                            )}>
                              No voice
                            </span>
                          )}
                          <button
                            onClick={() => toggleExpandChar(char.id)}
                            className={clsx(
                              'flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors',
                              isExpanded
                                ? isDark ? 'bg-violet-600/20 text-violet-300' : 'bg-violet-100 text-violet-600'
                                : isDark ? 'text-[#8B87B8] hover:text-violet-300 hover:bg-violet-600/10' : 'text-violet-400 hover:text-violet-600 hover:bg-violet-50'
                            )}
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            Change
                          </button>
                        </div>

                        {/* Voice picker */}
                        {isExpanded && (
                          <div className={clsx(
                            'mx-3 mb-3 rounded-xl border overflow-hidden',
                            isDark ? 'bg-[#16152B] border-[#2D2B47]' : 'bg-[#F5F3FF] border-[#E2DFFF]'
                          )}>
                            {/* Search */}
                            <div className={clsx('flex items-center gap-2 px-3 py-2 border-b', isDark ? 'border-[#2D2B47]' : 'border-[#E2DFFF]')}>
                              <Search className={clsx('w-3.5 h-3.5 shrink-0', isDark ? 'text-[#5A5780]' : 'text-violet-300')} />
                              <input
                                type="text"
                                value={voiceSearch}
                                onChange={e => setVoiceSearch(e.target.value)}
                                placeholder="Search voices…"
                                className={clsx(
                                  'flex-1 text-sm bg-transparent outline-none',
                                  isDark ? 'text-white placeholder:text-[#5A5780]' : 'text-[#1A1839] placeholder:text-violet-300'
                                )}
                              />
                              {voiceSearch && (
                                <button onClick={() => setVoiceSearch('')} className={isDark ? 'text-[#5A5780]' : 'text-violet-300'}>
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Voice list */}
                            <div className="max-h-56 overflow-y-auto">
                              {loadingVoices && (
                                <div className="flex items-center justify-center py-6 gap-2">
                                  <Loader2 className={clsx('w-4 h-4 animate-spin', isDark ? 'text-violet-400' : 'text-violet-500')} />
                                  <span className={clsx('text-xs', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>Loading voices…</span>
                                </div>
                              )}
                              {!loadingVoices && voicesError && (
                                <p className={clsx('px-3 py-4 text-xs text-center', isDark ? 'text-red-400' : 'text-red-500')}>{voicesError}</p>
                              )}
                              {!loadingVoices && !voicesError && filteredVoices.map((voice, vi) => {
                                const isAssigned = assignment?.voiceId === voice.voice_id;
                                const isTesting = testingVoiceId === voice.voice_id;
                                const isPlayingTest = playingTestId === voice.voice_id;
                                return (
                                  <div
                                    key={voice.voice_id}
                                    className={clsx(
                                      'flex items-center gap-2 px-3 py-2 transition-colors',
                                      vi > 0 && (isDark ? 'border-t border-[#2D2B47]' : 'border-t border-[#E8E5FF]'),
                                      isAssigned
                                        ? isDark ? 'bg-violet-600/5' : 'bg-violet-50/60'
                                        : isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-violet-50/30'
                                    )}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className={clsx('text-xs font-medium truncate', isDark ? 'text-white' : 'text-[#1A1839]')}>{voice.name}</span>
                                        {isAssigned && <Check className="w-3 h-3 text-violet-500 shrink-0" />}
                                      </div>
                                      {voice.category && <p className={clsx('text-xs capitalize', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>{voice.category}</p>}
                                    </div>
                                    <button
                                      onClick={() => isPlayingTest ? stopTestAudio() : handleTestVoice(voice)}
                                      disabled={isTesting}
                                      className={clsx(
                                        'shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                                        isTesting
                                          ? isDark ? 'text-violet-400 cursor-wait' : 'text-violet-400 cursor-wait'
                                          : isPlayingTest
                                            ? isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
                                            : isDark ? 'bg-violet-600/10 text-violet-400 hover:bg-violet-600/20' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                                      )}
                                    >
                                      {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : isPlayingTest ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                      {isTesting ? 'Loading' : isPlayingTest ? 'Stop' : 'Test'}
                                    </button>
                                    <button
                                      onClick={() => handleAssignVoice(voice)}
                                      className={clsx(
                                        'shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                                        isAssigned
                                          ? isDark ? 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/10' : 'bg-violet-100 text-violet-600 hover:bg-violet-50'
                                          : isDark ? 'bg-[#2D2B47] text-[#8B87B8] hover:text-violet-300 border border-[#3D3B57]' : 'bg-white text-violet-400 hover:text-violet-600 border border-[#E2DFFF]'
                                      )}
                                    >
                                      <Check className="w-3 h-3" />
                                      {isAssigned ? 'Assigned' : 'Assign'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Generation stats + actions ────────────────────────────── */}
            <div className={clsx(
              'rounded-2xl p-5',
              isDark ? 'bg-[#1E1C30] border border-[#2D2B47]' : 'bg-white border border-[#E2DFFF] shadow-sm'
            )}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-4 flex-1 flex-wrap">
                  {[
                    { label: 'Dialogue nodes', value: allNodes.length },
                    { label: 'With voice', value: assignedNodes.length },
                    { label: 'Generated', value: generatedCount },
                    { label: 'Remaining', value: unprocessedNodes.length },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-[#1A1839]')}>{stat.value}</div>
                      <div className={clsx('text-xs', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>{stat.label}</div>
                    </div>
                  ))}
                  {assignedNodes.length > 0 && (
                    <div className="flex-1 min-w-[120px]">
                      <div className={clsx('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-[#2D2B47]' : 'bg-violet-100')}>
                        <div className="h-full bg-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round((generatedCount / assignedNodes.length) * 100)}%` }} />
                      </div>
                      <div className={clsx('text-xs mt-1', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>
                        {Math.round((generatedCount / assignedNodes.length) * 100)}% complete
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {generating ? (
                    <>
                      <span className={clsx('text-xs', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>{genProgress.current}/{genProgress.total}</span>
                      <button onClick={() => { stopGenRef.current = true; }}
                        className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                          isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200')}>
                        <Square className="w-3.5 h-3.5" />Stop
                      </button>
                    </>
                  ) : (
                    <>
                      {selectedIds.size > 0 && (
                        <button onClick={() => setSelectedIds(new Set())}
                          className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                            isDark ? 'text-[#8B87B8] hover:text-violet-300' : 'text-violet-400 hover:text-violet-600')}>
                          <X className="w-3.5 h-3.5" />Clear
                        </button>
                      )}
                      {selectedAssignedNodes.length > 0 && (
                        <button onClick={() => generateBatch(selectedAssignedNodes)}
                          className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
                            isDark ? 'bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 border border-teal-500/30' : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200')}>
                          <Volume2 className="w-3.5 h-3.5" />Generate Selected ({selectedAssignedNodes.length})
                        </button>
                      )}
                      {unprocessedNodes.length > 0 && (
                        <button
                          onClick={() => selectedIds.size > 0
                            ? setSelectedIds(new Set(unprocessedNodes.map(n => n.nodeId)))
                            : generateBatch(unprocessedNodes)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors">
                          <Volume2 className="w-3.5 h-3.5" />
                          {selectedIds.size > 0 ? 'Select All Remaining' : `Generate All (${unprocessedNodes.length})`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {generating && (
                <div className="mt-4">
                  <div className={clsx('h-1 rounded-full overflow-hidden', isDark ? 'bg-[#2D2B47]' : 'bg-violet-100')}>
                    <div className="h-full bg-teal-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((genProgress.current / genProgress.total) * 100)}%` }} />
                  </div>
                  {currentGenNode && (
                    <p className={clsx('text-xs mt-2', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
                      <Loader2 className="inline w-3 h-3 animate-spin mr-1.5" />
                      Generating <span className={isDark ? 'text-teal-300' : 'text-teal-700'}>{currentGenNode.characterName}</span>
                      {' — '}
                      <span className="italic">"{currentGenNode.text.slice(0, 60)}{currentGenNode.text.length > 60 ? '…' : ''}"</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Scene list ────────────────────────────────────────────── */}
            {scenes.length === 0 ? (
              <div className={clsx('rounded-2xl p-10 text-center border-2 border-dashed', isDark ? 'border-[#2D2B47]' : 'border-[#E2DFFF]')}>
                <MicOff className={clsx('w-10 h-10 mx-auto mb-3', isDark ? 'text-[#2D2B47]' : 'text-violet-200')} />
                <p className={clsx('font-medium', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>No dialogue nodes found in this book.</p>
              </div>
            ) : scenes.map(scene => {
              const isCollapsed = collapsedScenes.has(scene.id);
              const isPreviewing = previewSceneId === scene.id;
              const sceneGeneratedCount = scene.nodes.filter(n => audioPathFor(n.nodeId)).length;

              return (
                <div key={scene.id} className={clsx('rounded-2xl border overflow-hidden',
                  isDark ? 'bg-[#1E1C30] border-[#2D2B47]' : 'bg-white border-[#E2DFFF] shadow-sm')}>

                  {/* Scene header */}
                  <div
                    className={clsx('flex items-center gap-3 px-5 py-4 cursor-pointer select-none',
                      isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-violet-50/40')}
                    onClick={() => setCollapsedScenes(prev => {
                      const next = new Set(prev);
                      next.has(scene.id) ? next.delete(scene.id) : next.add(scene.id);
                      return next;
                    })}
                  >
                    <button className={clsx('shrink-0', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={clsx('font-semibold', isDark ? 'text-white' : 'text-[#1A1839]')}>{scene.title}</span>
                      <span className={clsx('text-xs ml-2', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>
                        {sceneGeneratedCount}/{scene.nodes.length} generated
                      </span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); isPreviewing ? stopPreview() : startPreview(scene); }}
                      disabled={sceneGeneratedCount === 0}
                      className={clsx('shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        sceneGeneratedCount === 0
                          ? isDark ? 'text-[#2D2B47] cursor-not-allowed' : 'text-violet-200 cursor-not-allowed'
                          : isPreviewing
                            ? isDark ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            : isDark ? 'bg-teal-600/10 text-teal-400 hover:bg-teal-600/20' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                      )}
                    >
                      {isPreviewing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isPreviewing ? 'Stop' : 'Preview'}
                    </button>
                  </div>

                  {/* Node rows */}
                  {!isCollapsed && scene.nodes.map((node, i) => {
                    const audioPath = audioPathFor(node.nodeId);
                    const isGenerated = !!audioPath;
                    const nodeAssignment = assignments[node.character];
                    const hasVoice = !!nodeAssignment?.voiceId;
                    const isSelected = selectedIds.has(node.nodeId);
                    const isPlaying = playingNodeId === node.nodeId;
                    const isCurrentPreview = previewNodeId === node.nodeId;
                    const isGeneratingThis = generating && genProgress.nodeId === node.nodeId;

                    return (
                      <div key={node.nodeId} className={clsx(
                        'flex items-start gap-3 px-5 py-3 transition-colors',
                        i !== 0 && (isDark ? 'border-t border-[#2D2B47]' : 'border-t border-[#F0EEFF]'),
                        isCurrentPreview
                          ? isDark ? 'bg-teal-600/10' : 'bg-teal-50/60'
                          : isSelected
                            ? isDark ? 'bg-violet-600/5' : 'bg-violet-50/40'
                            : ''
                      )}>
                        {/* Checkbox */}
                        <button
                          onClick={() => hasVoice && setSelectedIds(prev => {
                            const next = new Set(prev);
                            next.has(node.nodeId) ? next.delete(node.nodeId) : next.add(node.nodeId);
                            return next;
                          })}
                          disabled={!hasVoice}
                          className={clsx(
                            'mt-0.5 w-4 h-4 rounded shrink-0 border flex items-center justify-center transition-colors',
                            !hasVoice
                              ? isDark ? 'border-[#2D2B47] cursor-not-allowed' : 'border-violet-200 cursor-not-allowed'
                              : isSelected
                                ? 'bg-violet-600 border-violet-600'
                                : isGenerated
                                  ? isDark ? 'bg-teal-600/20 border-teal-500/40 hover:border-violet-500' : 'bg-teal-100 border-teal-300 hover:border-violet-400'
                                  : isDark ? 'border-[#2D2B47] hover:border-violet-500' : 'border-violet-200 hover:border-violet-400'
                          )}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          {!isSelected && isGenerated && <Check className="w-2.5 h-2.5 text-teal-500" />}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={clsx('text-xs font-semibold', isDark ? 'text-violet-300' : 'text-violet-600')}>
                              {node.characterName}
                            </span>
                            {nodeAssignment?.voiceName && (
                              <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', isDark ? 'bg-[#2D2B47] text-[#8B87B8]' : 'bg-violet-50 text-violet-400')}>
                                {nodeAssignment.voiceName}
                              </span>
                            )}
                            {!hasVoice && (
                              <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-400')}>
                                No voice assigned
                              </span>
                            )}
                            {isGeneratingThis && <Loader2 className={clsx('w-3 h-3 animate-spin', isDark ? 'text-teal-400' : 'text-teal-600')} />}
                            {isCurrentPreview && (
                              <span className={clsx('text-xs font-medium flex items-center gap-1', isDark ? 'text-teal-400' : 'text-teal-600')}>
                                <Volume2 className="w-3 h-3" />Playing
                              </span>
                            )}
                          </div>
                          <p className={clsx('text-sm leading-relaxed',
                            !hasVoice ? isDark ? 'text-[#5A5780]' : 'text-slate-300' : isDark ? 'text-[#8B87B8]' : 'text-slate-500')}>
                            {node.text}
                          </p>
                        </div>

                        {/* Play button */}
                        {isGenerated && (
                          <button
                            onClick={() => isPlaying ? stopAudio() : playNode(node.nodeId)}
                            className={clsx('shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                              isPlaying
                                ? isDark ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                : isDark ? 'bg-teal-600/10 text-teal-400 hover:bg-teal-600/20' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                            )}
                          >
                            {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Preview now-playing bar */}
      {previewSceneId && (
        <div className={clsx('fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md',
          isDark ? 'bg-[#0C0B1A]/90 border-[#2D2B47]' : 'bg-white/90 border-[#E2DFFF]')}>
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              isDark ? 'bg-teal-600/20' : 'bg-teal-100')}>
              <Volume2 className={clsx('w-4 h-4', isDark ? 'text-teal-400' : 'text-teal-600')} />
            </div>
            <div className="flex-1 min-w-0">
              {(() => {
                const scene = scenes.find(s => s.id === previewSceneId);
                const node = scene?.nodes.find(n => n.nodeId === previewNodeId);
                return (
                  <>
                    <p className={clsx('text-xs font-medium', isDark ? 'text-teal-300' : 'text-teal-700')}>
                      Preview — {scene?.title}
                    </p>
                    {node && (
                      <p className={clsx('text-sm truncate', isDark ? 'text-[#8B87B8]' : 'text-slate-500')}>
                        <span className={clsx('font-semibold mr-1', isDark ? 'text-violet-300' : 'text-violet-600')}>{node.characterName}:</span>
                        {node.text}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
            <button onClick={stopPreview}
              className={clsx('shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isDark ? 'text-[#8B87B8] hover:text-violet-300' : 'text-violet-400 hover:text-violet-600')}>
              <X className="w-4 h-4" />Stop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
