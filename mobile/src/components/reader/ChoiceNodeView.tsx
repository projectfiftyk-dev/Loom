import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ChoiceNode } from '../../types/story';
import type { BookPalette } from '../../styles/palettes';
import { hexToRgba } from '../../styles/palettes';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

interface Props {
  node: ChoiceNode;
  palette: BookPalette;
  onChoose: (next: string) => void;
}

export default function ChoiceNodeView({ node, palette, onChoose }: Props) {
  return (
    <View style={styles.container}>
      <Text style={[styles.prompt, { color: 'rgba(255,255,255,0.8)' }]}>{node.prompt}</Text>
      {node.options.map((option, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.option, { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)' }]}
          onPress={() => onChoose(option.next)}
          activeOpacity={0.7}
        >
          <View style={[styles.label, { backgroundColor: hexToRgba(palette.accent, 0.25) }]}>
            <Text style={[styles.labelText, { color: palette.accent }]}>{OPTION_LABELS[i]}</Text>
          </View>
          <Text style={styles.optionText}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  prompt: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 4 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1,
  },
  label: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  labelText: { fontSize: 11, fontWeight: '700' },
  optionText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
});
