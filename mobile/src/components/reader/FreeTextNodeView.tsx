import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { FreeTextNode, FreeTextAttempt } from '../../types/story';
import type { BookPalette } from '../../styles/palettes';

interface Props {
  node: FreeTextNode;
  palette: BookPalette;
  maxAttempts: number;
  onNavigate: (nodeId: string) => void;
  onAttempt?: (attempt: FreeTextAttempt) => void;
}

export default function FreeTextNodeView({ node, palette, onNavigate, onAttempt }: Props) {
  const [input, setInput] = useState('');

  const handleContinue = () => {
    onAttempt?.({ nodeId: node.id, prompt: node.prompt, response: input.trim(), success: true });
    onNavigate(node.on_success);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{node.prompt}</Text>

      {node.hint && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>💡 {node.hint}</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        value={input}
        onChangeText={setInput}
        placeholder="Type your response…"
        placeholderTextColor="rgba(255,255,255,0.25)"
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.continueBtn, { backgroundColor: palette.accent }]}
        onPress={handleContinue}
        activeOpacity={0.8}
      >
        <Text style={styles.continueBtnText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  prompt: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.85)', lineHeight: 20 },
  hintBox: {
    backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)', borderRadius: 10, padding: 10,
  },
  hintText: { fontSize: 12, color: 'rgba(252,211,77,0.85)' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#fff', minHeight: 72,
  },
  continueBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 12,
  },
  continueBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
