import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import type { ChatNode, Story, ChatMessage, FreeTextAttempt } from '../../types/story';
import type { BookPalette } from '../../styles/palettes';
import { hexToRgba } from '../../styles/palettes';
import { getCharacterInfo } from '../../data/characters';
import { chatWithCharacter } from '../../api/client';
import { buildSystemPrompt } from '../../utils/buildSystemPrompt';

interface Props {
  node: ChatNode;
  story: Story;
  palette: BookPalette;
  bookId: string;
  chatHistories: Record<string, ChatMessage[]>;    // all chars for this book
  freeTextAttempts: FreeTextAttempt[];
  onUpdateHistory: (charId: string, msgs: ChatMessage[]) => void;
  onClose: () => void;
}

export default function ChatNodeView({
  node, story, palette, bookId,
  chatHistories, freeTextAttempts,
  onUpdateHistory, onClose,
}: Props) {
  const charInfo = getCharacterInfo(bookId, node.character);
  const charFromStory = story.characters?.find(c => c.id === node.character);
  const charName = charInfo?.name ?? charFromStory?.name ?? node.character;
  const charColor = charInfo?.color ?? charFromStory?.color ?? palette.accent;

  const initialHistory = chatHistories[node.character] ?? [];
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (initialHistory.length > 0) return initialHistory;
    if (node.entry_line) return [{ role: 'assistant', content: node.entry_line }];
    return [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const systemPrompt = charInfo
        ? buildSystemPrompt(charInfo, story, chatHistories, freeTextAttempts)
        : (charFromStory?.personality ?? `You are ${charName}.`);

      const reply = await chatWithCharacter(systemPrompt, next);
      const withReply = [...next, { role: 'assistant' as const, content: reply }];
      setMessages(withReply);
      onUpdateHistory(node.character, withReply);
    } catch {
      const err = [...next, { role: 'assistant' as const, content: '…' }];
      setMessages(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: hexToRgba(charColor, 0.2) }]}>
        <View style={[styles.avatar, { backgroundColor: charColor }]}>
          <Text style={styles.avatarText}>{charName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={[styles.charName, { color: charColor }]}>{charName}</Text>
        <TouchableOpacity style={styles.exitBtn} onPress={onClose}>
          <Text style={styles.exitText}>Exit chat</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              msg.role === 'user' ? styles.bubbleUser : styles.bubbleChar,
              msg.role === 'user'
                ? { backgroundColor: hexToRgba(palette.accent, 0.2), borderColor: hexToRgba(palette.accent, 0.3) }
                : { backgroundColor: hexToRgba(charColor, 0.12), borderColor: hexToRgba(charColor, 0.22) },
            ]}
          >
            {msg.role === 'assistant' && (
              <Text style={[styles.bubbleName, { color: hexToRgba(charColor, 0.8) }]}>{charName}</Text>
            )}
            <Text style={styles.bubbleText}>{msg.content}</Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.bubbleChar, {
            backgroundColor: hexToRgba(charColor, 0.1),
            borderColor: hexToRgba(charColor, 0.18),
          }]}>
            <ActivityIndicator size="small" color={charColor} />
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputRow, { borderTopColor: hexToRgba(palette.accent, 0.15) }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message…"
          placeholderTextColor="rgba(255,255,255,0.25)"
          multiline
          maxLength={300}
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: input.trim() ? palette.accent : 'rgba(255,255,255,0.08)' }]}
          onPress={send}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendIcon}>›</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  charName: { flex: 1, fontSize: 14, fontWeight: '600' },
  exitBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)' },
  exitText: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  messageList: { flex: 1 },
  messageContent: { padding: 14, gap: 10 },
  bubble: {
    maxWidth: '82%', borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 13, paddingVertical: 9, gap: 3,
  },
  bubbleChar: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleName: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  bubbleText: { color: 'rgba(255,255,255,0.88)', fontSize: 14, lineHeight: 20 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1,
  },
  input: {
    flex: 1, color: '#fff', fontSize: 14, lineHeight: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: -2 },
});
