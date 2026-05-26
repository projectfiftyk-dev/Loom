import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Play, Square, Check, Loader2, Search, UserCircle2, MicOff, ArrowRight, Volume2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import clsx from 'clsx';
import yaml from 'js-yaml';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

interface CharacterInfo {
  id: string;
  name: string;
  avatar?: string | null;
}

interface VoiceAssignment {
  voiceId: string;
  voiceName: string;
}

export default function VoicesPage() {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const { theme, elevenLabsApiKey } = useApp();
  const isDark = theme === 'dark';

  const [bookTitle, setBookTitle] = useState('');
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [selectedChar, setSelectedChar] = useState<CharacterInfo | null>(null);

  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [assignments, setAssignments] = useState<Record<string, VoiceAssignment>>({});

  const [loadingBook, setLoadingBook] = useState(true);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [voicesError, setVoicesError] = useState<string | null>(null);

  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load book and extract characters
  useEffect(() => {
    if (!bookId) return;
    fetch(`/api/books/${bookId}`)
      .then(r => r.text())
      .then(yamlText => {
        const story = yaml.load(yamlText) as any;
        setBookTitle(story.metadata?.title || bookId);

        const chars: CharacterInfo[] = [];
        const seen = new Set<string>();

        if (story.characters) {
          for (const c of story.characters) {
            if (c.id && !seen.has(c.id)) {
              seen.add(c.id);
              chars.push({ id: c.id, name: c.name || c.id, avatar: c.avatar });
            }
          }
        }

        if (story.scenes) {
          for (const scene of story.scenes) {
            for (const node of scene.nodes || []) {
              if (node.character && typeof node.character === 'string' && !seen.has(node.character)) {
                seen.add(node.character);
                chars.push({ id: node.character, name: node.character });
              }
            }
          }
        }

        setCharacters(chars);
        if (chars.length > 0) setSelectedChar(chars[0]);
      })
      .catch(() => setBookTitle(bookId || ''))
      .finally(() => setLoadingBook(false));
  }, [bookId]);

  // Load ElevenLabs voices
  useEffect(() => {
    if (!elevenLabsApiKey) return;
    setLoadingVoices(true);
    setVoicesError(null);
    fetch('/api/elevenlabs/voices', {
      headers: { 'x-elevenlabs-key': elevenLabsApiKey },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setVoices(data);
        } else {
          throw new Error(data.error || 'Failed to load voices');
        }
      })
      .catch(e => setVoicesError(e.message))
      .finally(() => setLoadingVoices(false));
  }, [elevenLabsApiKey]);

  // Load voice assignments
  useEffect(() => {
    fetch('/api/voice-config')
      .then(r => r.json())
      .then(config => {
        const relevant: Record<string, VoiceAssignment> = {};
        for (const [key, value] of Object.entries(config.voiceAssignments || {})) {
          if (key.startsWith(`${bookId}::`)) {
            const charId = key.split('::')[1];
            relevant[charId] = value as VoiceAssignment;
          }
        }
        setAssignments(relevant);
      })
      .catch(() => {});
  }, [bookId]);

  const filteredVoices = searchQuery.trim()
    ? voices.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.category || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : voices;

  const handleTest = async (voice: ElevenLabsVoice) => {
    if (!selectedChar) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingVoiceId(null);
    }

    if (playingVoiceId === voice.voice_id) return;

    setTestingVoiceId(voice.voice_id);
    try {
      const res = await fetch('/api/elevenlabs/test-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: elevenLabsApiKey,
          voiceId: voice.voice_id,
          characterId: selectedChar.id,
          characterName: selectedChar.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');

      const audio = new Audio(data.audioPath);
      audioRef.current = audio;
      setPlayingVoiceId(voice.voice_id);
      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };
      audio.play();
    } catch (e) {
      console.error('Voice test failed:', e);
    } finally {
      setTestingVoiceId(null);
    }
  };

  const handleStopPlay = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
  };

  const handleAssign = async (voice: ElevenLabsVoice) => {
    if (!selectedChar || !bookId) return;

    const isAssigned = assignments[selectedChar.id]?.voiceId === voice.voice_id;

    await fetch('/api/voice-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId,
        characterId: selectedChar.id,
        voiceId: isAssigned ? null : voice.voice_id,
        voiceName: isAssigned ? null : voice.name,
      }),
    });

    setAssignments(prev => {
      const next = { ...prev };
      if (isAssigned) {
        delete next[selectedChar.id];
      } else {
        next[selectedChar.id] = { voiceId: voice.voice_id, voiceName: voice.name };
      }
      return next;
    });
  };

  return (
    <div className={clsx(
      'min-h-screen transition-colors duration-300',
      isDark ? 'bg-[#0C0B1A]' : 'bg-[#F5F3FF]'
    )}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={clsx(
          'absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full blur-3xl opacity-10',
          isDark ? 'bg-violet-600' : 'bg-violet-400'
        )} />
      </div>

      {/* Header */}
      <header className={clsx(
        'sticky top-0 z-20 backdrop-blur-md border-b',
        isDark ? 'bg-[#0C0B1A]/80 border-[#2D2B47]' : 'bg-[#F5F3FF]/80 border-[#E2DFFF]'
      )}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate(`/edit/${bookId}`)}
            className={clsx(
              'flex items-center gap-2 text-sm font-medium transition-colors',
              isDark ? 'text-[#8B87B8] hover:text-violet-300' : 'text-violet-500 hover:text-violet-700'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Edit
          </button>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Sparkles className={clsx('w-4 h-4 shrink-0', isDark ? 'text-violet-400' : 'text-violet-600')} />
            <span className={clsx('font-bold tracking-wide shrink-0', isDark ? 'text-white' : 'text-[#1A1839]')}>
              LOOM
            </span>
            <span className={clsx('text-sm shrink-0', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>/ Voice Cast</span>
            {bookTitle && (
              <span className={clsx('text-sm truncate', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>
                — {bookTitle}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {loadingBook ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Character selector */}
            {characters.length === 0 ? (
              <div className={clsx(
                'rounded-2xl p-6 text-center',
                isDark ? 'bg-[#1E1C30] border border-[#2D2B47]' : 'bg-white border border-[#E2DFFF]'
              )}>
                <MicOff className={clsx('w-8 h-8 mx-auto mb-2', isDark ? 'text-[#5A5780]' : 'text-violet-200')} />
                <p className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
                  No characters found in this book.
                </p>
              </div>
            ) : (
              <>
                {/* Character tabs */}
                <div>
                  <p className={clsx('text-xs font-semibold tracking-widest uppercase mb-3', isDark ? 'text-[#8B87B8]' : 'text-violet-500')}>
                    Characters
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {characters.map(char => {
                      const assigned = assignments[char.id];
                      const isActive = selectedChar?.id === char.id;
                      return (
                        <button
                          key={char.id}
                          onClick={() => setSelectedChar(char)}
                          className={clsx(
                            'flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all duration-150',
                            isActive
                              ? isDark
                                ? 'border-violet-500 bg-violet-600/10 text-white'
                                : 'border-violet-500 bg-violet-50 text-violet-800'
                              : isDark
                                ? 'border-[#2D2B47] text-[#8B87B8] hover:border-violet-500/40 hover:text-violet-300'
                                : 'border-[#E2DFFF] text-violet-400 hover:border-violet-300 hover:text-violet-600'
                          )}
                        >
                          <UserCircle2 className="w-4 h-4 shrink-0" />
                          {char.name}
                          {assigned && (
                            <span className={clsx(
                              'text-xs px-1.5 py-0.5 rounded-full',
                              isDark ? 'bg-violet-600/20 text-violet-300' : 'bg-violet-100 text-violet-600'
                            )}>
                              {assigned.voiceName}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Voice browser */}
                {selectedChar && (
                  <div className={clsx(
                    'rounded-2xl border overflow-hidden',
                    isDark ? 'bg-[#1E1C30] border-[#2D2B47]' : 'bg-white border-[#E2DFFF] shadow-sm'
                  )}>
                    {/* Panel header */}
                    <div className={clsx(
                      'px-5 py-4 border-b flex items-center justify-between gap-4',
                      isDark ? 'border-[#2D2B47]' : 'border-[#E2DFFF]'
                    )}>
                      <div>
                        <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-[#1A1839]')}>
                          {selectedChar.name}
                        </p>
                        <p className={clsx('text-xs mt-0.5', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
                          {assignments[selectedChar.id]
                            ? <>Assigned: <span className={isDark ? 'text-violet-300' : 'text-violet-600'}>{assignments[selectedChar.id].voiceName}</span></>
                            : 'No voice assigned'}
                        </p>
                      </div>

                      {/* Search */}
                      <div className="relative w-56">
                        <Search className={clsx(
                          'absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none',
                          isDark ? 'text-[#5A5780]' : 'text-violet-300'
                        )} />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search voices…"
                          className={clsx(
                            'w-full rounded-lg pl-8 pr-3 py-2 text-sm outline-none transition-all',
                            isDark
                              ? 'bg-[#16152B] border border-[#2D2B47] text-white placeholder:text-[#5A5780] focus:border-violet-500'
                              : 'bg-[#F5F3FF] border border-[#E2DFFF] text-[#1A1839] placeholder:text-violet-300 focus:border-violet-400'
                          )}
                        />
                      </div>
                    </div>

                    {/* Voice list */}
                    <div className="max-h-[480px] overflow-y-auto">
                      {loadingVoices && (
                        <div className="flex items-center justify-center py-16 gap-3">
                          <Loader2 className={clsx('w-5 h-5 animate-spin', isDark ? 'text-violet-400' : 'text-violet-500')} />
                          <span className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>
                            Loading voices…
                          </span>
                        </div>
                      )}

                      {!loadingVoices && voicesError && (
                        <div className="px-5 py-8 text-center">
                          <p className={clsx('text-sm', isDark ? 'text-red-400' : 'text-red-500')}>{voicesError}</p>
                        </div>
                      )}

                      {!loadingVoices && !voicesError && filteredVoices.length === 0 && (
                        <div className="px-5 py-8 text-center">
                          <p className={clsx('text-sm', isDark ? 'text-[#8B87B8]' : 'text-violet-400')}>No voices match your search.</p>
                        </div>
                      )}

                      {!loadingVoices && !voicesError && filteredVoices.map((voice, i) => {
                        const isAssigned = assignments[selectedChar.id]?.voiceId === voice.voice_id;
                        const isTesting = testingVoiceId === voice.voice_id;
                        const isPlaying = playingVoiceId === voice.voice_id;

                        return (
                          <div
                            key={voice.voice_id}
                            className={clsx(
                              'flex items-center gap-3 px-5 py-3 transition-colors',
                              i !== 0 && (isDark ? 'border-t border-[#2D2B47]' : 'border-t border-[#F0EEFF]'),
                              isAssigned
                                ? isDark ? 'bg-violet-600/5' : 'bg-violet-50/60'
                                : isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-violet-50/40'
                            )}
                          >
                            {/* Voice name + category */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={clsx('text-sm font-medium truncate', isDark ? 'text-white' : 'text-[#1A1839]')}>
                                  {voice.name}
                                </span>
                                {isAssigned && (
                                  <span className={clsx(
                                    'shrink-0 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium',
                                    isDark ? 'bg-violet-600/20 text-violet-300' : 'bg-violet-100 text-violet-600'
                                  )}>
                                    <Check className="w-3 h-3" />
                                    Assigned
                                  </span>
                                )}
                              </div>
                              {voice.category && (
                                <p className={clsx('text-xs mt-0.5 capitalize', isDark ? 'text-[#5A5780]' : 'text-violet-300')}>
                                  {voice.category}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => isPlaying ? handleStopPlay() : handleTest(voice)}
                                disabled={isTesting}
                                title={isPlaying ? 'Stop' : 'Test voice'}
                                className={clsx(
                                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                  isTesting
                                    ? isDark ? 'bg-violet-600/10 text-violet-400 cursor-wait' : 'bg-violet-50 text-violet-400 cursor-wait'
                                    : isPlaying
                                      ? isDark ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                      : isDark ? 'bg-violet-600/10 text-violet-400 hover:bg-violet-600/20' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                                )}
                              >
                                {isTesting
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : isPlaying
                                    ? <Square className="w-3.5 h-3.5" />
                                    : <Play className="w-3.5 h-3.5" />
                                }
                                {isTesting ? 'Loading…' : isPlaying ? 'Stop' : 'Test'}
                              </button>

                              <button
                                onClick={() => handleAssign(voice)}
                                className={clsx(
                                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                  isAssigned
                                    ? isDark ? 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/10' : 'bg-violet-100 text-violet-600 hover:bg-violet-50'
                                    : isDark ? 'bg-[#16152B] text-[#8B87B8] hover:text-violet-300 border border-[#2D2B47] hover:border-violet-500/40' : 'bg-white text-violet-400 hover:text-violet-600 border border-[#E2DFFF] hover:border-violet-300'
                                )}
                              >
                                <Check className="w-3.5 h-3.5" />
                                {isAssigned ? 'Unassign' : 'Assign'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* CTA: proceed to audio generation once all characters have voices */}
            {characters.length > 0 && characters.every(c => assignments[c.id]) && (
              <div className={clsx(
                'rounded-2xl p-5 flex items-center justify-between gap-4',
                isDark ? 'bg-teal-600/10 border border-teal-500/20' : 'bg-teal-50 border border-teal-200'
              )}>
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    isDark ? 'bg-teal-600/20' : 'bg-teal-100'
                  )}>
                    <Volume2 className={clsx('w-5 h-5', isDark ? 'text-teal-400' : 'text-teal-600')} />
                  </div>
                  <div>
                    <p className={clsx('font-semibold text-sm', isDark ? 'text-teal-300' : 'text-teal-800')}>
                      All characters have voices assigned
                    </p>
                    <p className={clsx('text-xs mt-0.5', isDark ? 'text-teal-400/70' : 'text-teal-600')}>
                      Ready to generate audio for dialogue nodes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/edit/${bookId}/audio`)}
                  className={clsx(
                    'shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                    isDark
                      ? 'bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 border border-teal-500/30'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  )}
                >
                  Generate Audio
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
