import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ImageBackground, StatusBar, Dimensions,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
const yaml = require('js-yaml') as typeof import('js-yaml');
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import type {
  Story, StoryNode, Scene, Character,
  DialogueNode, ChatMessage, FreeTextAttempt,
} from '../types/story';
import { fetchBookYaml, fetchAudioConfig, bookAssetUrl, audioUrl } from '../api/client';
import { getPaletteForStyle, hexToRgba } from '../styles/palettes';
import { useProgress } from '../state/progress';
import ChoiceNodeView from '../components/reader/ChoiceNodeView';
import FreeTextNodeView from '../components/reader/FreeTextNodeView';
import ChatNodeView from '../components/reader/ChatNodeView';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function resolveCharacter(ref: string | Character, story: Story): Character {
  if (typeof ref !== 'string') return ref as Character;
  if (ref === 'narrator') return { id: 'narrator', name: 'Loom Narrator' };
  return story.characters?.find(c => c.id === ref) ?? { id: ref, name: ref };
}

export default function ReaderScreen({ navigation, route }: Props) {
  const { bookId } = route.params;
  const insets = useSafeAreaInsets();
  const { progress, markBookInProgress, markSceneComplete, markBookComplete, saveChatHistory } = useProgress();

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState('');
  const [freeTextAttempts, setFreeTextAttempts] = useState<FreeTextAttempt[]>([]);
  const [finished, setFinished] = useState(false);
  const [audioConfig, setAudioConfig] = useState<Record<string, string>>({});

  // Chat histories for this book, keyed by characterId
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});

  const advanceRef = useRef<() => void>(() => {});
  const prevSceneIdRef = useRef<string | null>(null);

  // ── load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBookYaml(bookId), fetchAudioConfig(bookId)])
      .then(([text, audioCfg]) => {
        const parsed = yaml.load(text) as Story;
        setStory(parsed);
        setAudioConfig(audioCfg || {});
        const scene = parsed.scenes.find(s => s.start);
        // Resume from last node if available
        const savedNode = progress.inProgressBooks[bookId];
        const resumeId = savedNode && parsed.scenes.flatMap(s => s.nodes).find(n => n.id === savedNode)
          ? savedNode
          : scene?.nodes?.[0]?.id ?? '';
        setCurrentNodeId(resumeId);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookId]);

  // Load persisted chat histories for this book
  useEffect(() => {
    const saved = progress.chatHistories[bookId];
    if (saved) setChatHistories(saved);
  }, [bookId]);

  // ── maps ─────────────────────────────────────────────────────────────────
  const { nodeMap, sceneByNode, nodeIndex, totalNodes } = useMemo(() => {
    if (!story) return {
      nodeMap: new Map<string, StoryNode>(),
      sceneByNode: new Map<string, Scene>(),
      nodeIndex: new Map<string, number>(),
      totalNodes: 0,
    };
    const nm = new Map<string, StoryNode>();
    const sbn = new Map<string, Scene>();
    const ni = new Map<string, number>();
    let total = 0;
    story.scenes.forEach(scene =>
      scene.nodes.forEach((node, idx) => {
        nm.set(node.id, node); sbn.set(node.id, scene); ni.set(node.id, idx); total++;
      })
    );
    return { nodeMap: nm, sceneByNode: sbn, nodeIndex: ni, totalNodes: total };
  }, [story]);

  const palette = useMemo(() => getPaletteForStyle(story?.metadata.style), [story]);

  // ── scene tracking ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!story || !currentNodeId) return;
    const scene = sceneByNode.get(currentNodeId);
    if (!scene) return;

    // Mark previous scene complete when we move to a new one
    if (prevSceneIdRef.current && prevSceneIdRef.current !== scene.id) {
      markSceneComplete(bookId, prevSceneIdRef.current);
    }
    prevSceneIdRef.current = scene.id;

    // Compute progress percentage
    let pos = 0;
    let found = false;
    for (const sc of story.scenes) {
      for (const n of sc.nodes) {
        if (!found) pos++;
        if (n.id === currentNodeId) { found = true; break; }
      }
      if (found) break;
    }
    const pct = Math.round((pos / Math.max(totalNodes, 1)) * 100);
    markBookInProgress(bookId, currentNodeId, pct);
  }, [currentNodeId]);

  // ── navigation ────────────────────────────────────────────────────────────
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

  const handleFinish = () => {
    if (currentNodeId) markSceneComplete(bookId, sceneByNode.get(currentNodeId)?.id ?? '');
    markBookComplete(bookId);
    setFinished(true);
  };

  // ── chat history ──────────────────────────────────────────────────────────
  const handleUpdateChatHistory = (charId: string, msgs: ChatMessage[]) => {
    const next = { ...chatHistories, [charId]: msgs };
    setChatHistories(next);
    saveChatHistory(bookId, charId, msgs);
  };

  // ── audio ─────────────────────────────────────────────────────────────────
  const audioSource = useMemo(() => {
    if (!currentNodeId || !bookId || finished) return null;
    const path = audioConfig[`${bookId}::${currentNodeId}`];
    if (!path) return null;
    return { uri: audioUrl(path) };
  }, [currentNodeId, audioConfig, bookId, finished]);

  const player = useAudioPlayer(audioSource ?? null);
  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => { if (audioSource) player.play(); }, [audioSource]);
  useEffect(() => { if (playerStatus.didJustFinish) advanceRef.current(); }, [playerStatus.didJustFinish]);

  // ── derived ───────────────────────────────────────────────────────────────
  const currentNode = currentNodeId ? nodeMap.get(currentNodeId) : null;
  const currentScene = currentNodeId ? sceneByNode.get(currentNodeId) : null;
  const bg = (currentNode as any)?.background ?? currentScene?.background;
  const bgUri = bg ? bookAssetUrl(bg) : null;
  const bgIsSvg = bg?.toLowerCase().endsWith('.svg') ?? false;

  const speaker = useMemo(() => {
    if (!story || !currentNode || currentNode.type !== 'dialogue') return null;
    return resolveCharacter((currentNode as DialogueNode).character, story);
  }, [story, currentNode]);

  const isNarrator = speaker?.id === 'narrator';
  const speakerAccent = speaker?.color || palette.accent;

  const readingProgress = useMemo(() => {
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
  const isPanel = currentNode?.type === 'choice' || currentNode?.type === 'free_text' || currentNode?.type === 'chat';

  const hasNext = isDialogue && (
    !!(currentNode as DialogueNode).next ||
    !!(sceneByNode.get(currentNodeId)?.nodes[(nodeIndex.get(currentNodeId) ?? -1) + 1])
  );
  const isLastNode = isDialogue && !hasNext && !!currentScene?.end;
  const isPlaying = playerStatus.playing;
  const hasAudio = !!audioSource;

  // ── screens ───────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={[styles.fill, styles.center, { backgroundColor: '#000' }]}>
      <ActivityIndicator color={palette.accent} size="large" />
    </View>
  );

  if (error || !story) return (
    <View style={[styles.fill, styles.center, { backgroundColor: '#000', padding: 32 }]}>
      <Text style={{ color: '#f87171', textAlign: 'center', marginBottom: 16 }}>{error || 'Could not load book.'}</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={{ color: '#7C3AED', textDecorationLine: 'underline' }}>Go back</Text>
      </TouchableOpacity>
    </View>
  );

  if (finished) return (
    <View style={[styles.fill, styles.center, { backgroundColor: '#000', padding: 32 }]}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>✦</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 }}>Story Complete</Text>
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>{story.metadata.title}</Text>
      <TouchableOpacity
        style={[styles.finishBtn, { borderColor: 'rgba(255,255,255,0.15)' }]}
        onPress={() => {
          const s = story.scenes.find(sc => sc.start);
          if (s?.nodes?.[0]) {
            setCurrentNodeId(s.nodes[0].id);
            setFinished(false);
            setFreeTextAttempts([]);
          }
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>↺  Read Again</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.finishBtn, { backgroundColor: palette.accent, borderColor: palette.accent, marginTop: 10 }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  // ── main ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.fill, { backgroundColor: '#000' }]}>
      <StatusBar barStyle="light-content" hidden />

      {/* Background */}
      {bgUri && bgIsSvg ? (
        <View style={StyleSheet.absoluteFill}>
          <SvgUri uri={bgUri} width="100%" height="100%" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
        </View>
      ) : bgUri ? (
        <ImageBackground source={{ uri: bgUri }} style={StyleSheet.absoluteFill} resizeMode="cover">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
        </ImageBackground>
      ) : null}

      <View style={styles.vignette} pointerEvents="none" />

      {/* TOP BAR */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <View style={styles.topBarInner}>
          {isDialogue && speaker && (
            <View style={[styles.speakerBadge, { borderColor: hexToRgba(speakerAccent, 0.35) }]}>
              {isNarrator ? <Text style={[styles.narratorIcon, { color: speakerAccent }]}>▶</Text> : null}
              <Text style={styles.speakerName}>{isNarrator ? 'Loom Narrator' : speaker.name}</Text>
            </View>
          )}
          <View style={styles.topBarCenter}>
            <Text style={styles.sceneTitle} numberOfLines={1}>{currentScene?.title}</Text>
          </View>
          <View style={styles.topBarRight}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${readingProgress}%` as any, backgroundColor: hexToRgba(palette.accent, 0.7) }]} />
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* DIALOGUE BOTTOM BAR */}
      {isDialogue && currentNode && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, borderTopColor: hexToRgba(speakerAccent, 0.4) }]}>
          <Text style={styles.dialogueText}>{(currentNode as DialogueNode).text}</Text>
          {(currentNode as DialogueNode).hint && (
            <View style={styles.hintRow}>
              <View style={styles.hintDivider} />
              <Text style={styles.hintText}>
                <Text style={styles.hintLabel}>Hint  </Text>
                {(currentNode as DialogueNode).hint}
              </Text>
            </View>
          )}
          <View style={styles.bottomBarFooter}>
            <Text style={styles.bookTitle}>{story.metadata.title}</Text>
            <View style={styles.controls}>
              {hasAudio && isPlaying && (
                <TouchableOpacity style={styles.controlBtn} onPress={() => player.pause()}>
                  <Text style={styles.controlIcon}>⏸</Text>
                </TouchableOpacity>
              )}
              {hasAudio && !isPlaying && (
                <TouchableOpacity style={styles.controlBtn} onPress={() => player.play()}>
                  <Text style={[styles.controlIcon, { color: speakerAccent }]}>▶</Text>
                </TouchableOpacity>
              )}
              {hasNext && !isLastNode && (
                <TouchableOpacity style={styles.controlBtn} onPress={handleAdvance}>
                  <Text style={styles.controlIcon}>›</Text>
                </TouchableOpacity>
              )}
              {isLastNode && (
                <TouchableOpacity onPress={handleFinish}>
                  <Text style={[styles.controlIcon, { color: speakerAccent, fontSize: 14 }]}>Finish →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* PANEL — choice / free_text / chat */}
      {isPanel && currentNode && (
        <View style={[styles.panel, { paddingBottom: insets.bottom, borderTopColor: hexToRgba(palette.accent, 0.35) }]}>
          <View style={[styles.panelAccentLine, { backgroundColor: hexToRgba(palette.accent, 0.35) }]} />
          {currentNode.type === 'choice' && (
            <ChoiceNodeView node={currentNode} palette={palette} onChoose={navigateTo} />
          )}
          {currentNode.type === 'free_text' && (
            <FreeTextNodeView
              node={currentNode} palette={palette}
              maxAttempts={story.settings?.max_free_text_attempts ?? 3}
              onNavigate={navigateTo}
              onAttempt={a => setFreeTextAttempts(prev => [...prev, a])}
            />
          )}
          {currentNode.type === 'chat' && (
            <ChatNodeView
              node={currentNode}
              story={story}
              palette={palette}
              bookId={bookId}
              chatHistories={chatHistories}
              freeTextAttempts={freeTextAttempts}
              onUpdateHistory={handleUpdateChatHistory}
              onClose={() => (currentNode as any).next && navigateTo((currentNode as any).next)}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  vignette: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.35, backgroundColor: 'transparent' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40 },
  topBarInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  speakerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  narratorIcon: { fontSize: 10 },
  speakerName: { color: '#fff', fontSize: 12, fontWeight: '600' },
  topBarCenter: { flex: 1, alignItems: 'center' },
  sceneTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontStyle: 'italic' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: { width: 52, height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%' as any, borderRadius: 2 },
  closeBtn: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '300' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.88)', borderTopWidth: 1,
    paddingHorizontal: 24, paddingTop: 16,
  },
  dialogueText: { color: 'rgba(255,255,255,0.92)', fontSize: 15, lineHeight: 24, fontStyle: 'italic' },
  hintRow: { marginTop: 10 },
  hintDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 8 },
  hintText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 18 },
  hintLabel: { fontWeight: '700', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1 },
  bottomBarFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  bookTitle: { fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, textTransform: 'uppercase' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  controlBtn: { padding: 6 },
  controlIcon: { color: 'rgba(255,255,255,0.5)', fontSize: 22 },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
    maxHeight: SCREEN_HEIGHT * 0.65,
    backgroundColor: 'rgba(0,0,0,0.92)', borderTopWidth: 1,
  },
  panelAccentLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  finishBtn: { width: 220, paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
