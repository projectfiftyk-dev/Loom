import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ChatNode, Character, Story } from '../../types/story';
import type { BookPalette } from '../../styles/palettes';
import { hexToRgba } from '../../styles/palettes';

interface Props {
  node: ChatNode;
  story: Story;
  palette: BookPalette;
  onClose: () => void;
}

export default function ChatNodeView({ node, story, palette, onClose }: Props) {
  const character = (story.characters?.find(c => c.id === node.character) ?? { id: node.character, name: node.character }) as Character;
  const charColor = character.color || palette.accent;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
        <View style={[styles.avatar, { backgroundColor: charColor }]}>
          <Text style={styles.avatarText}>{character.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.charName, { color: charColor }]}>{character.name}</Text>
        </View>
      </View>

      {node.entry_line ? (
        <View style={styles.messageArea}>
          <View style={[styles.bubble, {
            backgroundColor: hexToRgba(charColor, 0.12),
            borderColor: hexToRgba(charColor, 0.25),
          }]}>
            <Text style={[styles.bubbleName, { color: hexToRgba(charColor, 0.9) }]}>{character.name}</Text>
            <Text style={styles.bubbleText}>{node.entry_line}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.note}>Chat not available in read mode</Text>
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: palette.accent }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.continueBtnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottomWidth: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  headerInfo: { flex: 1 },
  charName: { fontSize: 14, fontWeight: '600' },
  messageArea: { gap: 8 },
  bubble: { borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleName: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  bubbleText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20 },
  footer: { gap: 10 },
  note: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
  continueBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12 },
  continueBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
