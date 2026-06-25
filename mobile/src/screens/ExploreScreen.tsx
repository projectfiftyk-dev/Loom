import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PATHS, getTotalBooksInPath, LoomPath } from '../data/paths';
import { useProgress } from '../state/progress';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabsParamList, MainStackParamList } from '../../App';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, 'Explore'>,
  NativeStackScreenProps<MainStackParamList>
>;

const C = {
  bg: '#0C0B1A',
  surface: '#1E1C30',
  text: '#FFFFFF',
  textMuted: '#8B87B8',
};

const CATEGORY_LABELS: Record<string, string> = {
  language: '🌍 Language',
  kids: '🎠 Kids',
  topics: '⚔️ Topics',
  classic: '📜 Classics',
};

export default function ExploreScreen({ navigation }: Props) {
  const { progress } = useProgress();
  const categories = ['language', 'kids', 'topics', 'classic'] as const;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.sub}>Find your next adventure.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {categories.map(cat => {
          const catPaths = PATHS.filter(p => p.category === cat);
          return (
            <View key={cat} style={styles.section}>
              <Text style={styles.sectionTitle}>{CATEGORY_LABELS[cat]}</Text>
              {catPaths.map(path => (
                <PathCard
                  key={path.id}
                  path={path}
                  enrolled={progress.activePaths.includes(path.id)}
                  onPress={() => navigation.navigate('PathDetail', { pathId: path.id })}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function PathCard({ path, enrolled, onPress }: {
  path: LoomPath; enrolled: boolean; onPress: () => void;
}) {
  const total = getTotalBooksInPath(path);
  return (
    <TouchableOpacity style={[styles.card, { borderColor: path.accent + '44' }]} onPress={onPress}>
      <Text style={styles.emoji}>{path.coverEmoji}</Text>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{path.title}</Text>
          {enrolled && (
            <View style={[styles.enrolledBadge, { backgroundColor: path.accent + '22' }]}>
              <Text style={[styles.enrolledText, { color: path.accent }]}>Enrolled</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{path.description}</Text>
        <Text style={styles.meta}>{path.modules.length} modules · {total} {total === 1 ? 'book' : 'books'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: C.text },
  sub: { fontSize: 14, color: C.textMuted, marginTop: 4 },
  scroll: { paddingBottom: 40, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textMuted, paddingHorizontal: 24, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  emoji: { fontSize: 36, marginTop: 2 },
  cardBody: { flex: 1, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: C.text, flex: 1 },
  enrolledBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  enrolledText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: C.textMuted, lineHeight: 18 },
  meta: { fontSize: 12, color: C.textMuted, marginTop: 4 },
});
