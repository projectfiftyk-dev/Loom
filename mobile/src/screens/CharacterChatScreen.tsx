import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../App';
import { getCharacterInfo } from '../data/characters';
import { useProgress } from '../state/progress';
import { fetchBookYaml } from '../api/client';
import { chatWithCharacter } from '../api/client';
import { buildSystemPrompt } from '../utils/buildSystemPrompt';
import { hexToRgba } from '../styles/palettes';
import type { Story, ChatMessage, FreeTextAttempt } from '../types/story';
const yaml = require('js-yaml') as typeof import('js-yaml');

type Props = NativeStackScreenProps<MainStackParamList, 'CharacterChat'>;

const BG = '#0C0B1A';
const SURFACE = '#1E1C30';

export default function CharacterChatScreen({ route, navigation }: Props) {
  const { bookId, characterId } = route.params;
  const charInfo = getCharacterInfo(bookId, characterId);
  const { progress, saveChatHistory } = useProgress();

  const [story, setStory] = useState<Story | null>(null);
  const [loadingStory, setLoadingStory] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const charColor = charInfo?.color ?? '#7C3AED';
  const charName = charInfo?.name ?? characterId;

  // Messages: load from persisted history or start with entry line
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = progress.chatHistories[bookId]?.[characterId];
    if (saved && saved.length > 0) return saved;
    if (charInfo?.entryLine) return [{ role: 'assistant', content: charInfo.entryLine }];
    return [];
  });

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchBookYaml(bookId)
      .then(text => setStory(yaml.load(text) as Story))
      .catch(() => {})
      .finally(() => setLoadingStory(false));
  }, [bookId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const chatHistoriesForBook = progress.chatHistories[bookId] ?? {};
  const freeTextAttempts: FreeTextAttempt[] = [];

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !story) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setSending(true);

    try {
      const systemPrompt = charInfo
        ? buildSystemPrompt(charInfo, story, chatHistoriesForBook, freeTextAttempts)
        : `You are ${charName}.`;
      const reply = await chatWithCharacter(systemPrompt, next);
      const withReply: ChatMessage[] = [...next, { role: 'assistant', content: reply }];
      setMessages(withReply);
      saveChatHistory(bookId, characterId, withReply);
    } catch {
      const err: ChatMessage[] = [...next, { role: 'assistant', content: '…' }];
      setMessages(err);
    } finally {
      setSending(false);
    }
  };

  if (!charInfo) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={{ color: '#8B87B8', padding: 24 }}>Character not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: charColor + '33' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={[styles.avatar, { backgroundColor: charColor }]}>
          <Text style={styles.avatarText}>{charName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.charName, { color: charColor }]}>{charName}</Text>
          <Text style={styles.charBook}>{story?.metadata.title ?? '…'}</Text>
        </View>
        {loadingStory && <ActivityIndicator size="small" color={charColor} />}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 && !loadingStory && (
            <Text style={styles.emptyHint}>Say something to start a conversation.</Text>
          )}
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                msg.role === 'user'
                  ? [styles.bubbleUser, { backgroundColor: hexToRgba('#7C3AED', 0.18), borderColor: hexToRgba('#7C3AED', 0.28) }]
                  : [styles.bubbleChar, { backgroundColor: hexToRgba(charColor, 0.12), borderColor: hexToRgba(charColor, 0.22) }],
              ]}
            >
              {msg.role === 'assistant' && (
                <Text style={[styles.bubbleLabel, { color: hexToRgba(charColor, 0.75) }]}>{charName}</Text>
              )}
              <Text style={styles.bubbleText}>{msg.content}</Text>
            </View>
          ))}
          {sending && (
            <View style={[styles.bubble, styles.bubbleChar, { backgroundColor: hexToRgba(charColor, 0.08), borderColor: hexToRgba(charColor, 0.15) }]}>
              <ActivityIndicator size="small" color={charColor} />
            </View>
          )}
        </ScrollView>

        {/* Locked state if story not loaded yet */}
        {loadingStory ? (
          <View style={styles.inputRow}>
            <Text style={styles.loadingNote}>Loading character…</Text>
          </View>
        ) : (
          <View style={[styles.inputRow, { borderTopColor: charColor + '22' }]}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message…"
              placeholderTextColor="rgba(255,255,255,0.22)"
              multiline
              maxLength={300}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: input.trim() && !sending ? charColor : 'rgba(255,255,255,0.08)' }]}
              onPress={send}
              disabled={!input.trim() || sending}
            >
              <Text style={styles.sendIcon}>›</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  backText: { color: '#8B87B8', fontSize: 22 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerInfo: { flex: 1 },
  charName: { fontSize: 16, fontWeight: '700' },
  charBook: { fontSize: 12, color: '#8B87B8', marginTop: 1 },
  messageList: { flex: 1 },
  messageContent: { padding: 16, gap: 12 },
  emptyHint: { color: 'rgba(255,255,255,0.2)', fontSize: 14, textAlign: 'center', marginTop: 40 },
  bubble: {
    maxWidth: '80%', borderRadius: 18, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10, gap: 4,
  },
  bubbleChar: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  bubbleText: { color: 'rgba(255,255,255,0.88)', fontSize: 15, lineHeight: 21 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1,
  },
  loadingNote: { color: '#8B87B8', fontSize: 13, flex: 1, textAlign: 'center', paddingVertical: 10 },
  input: {
    flex: 1, color: '#fff', fontSize: 15, lineHeight: 21,
    backgroundColor: SURFACE, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 11, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: -2 },
});
