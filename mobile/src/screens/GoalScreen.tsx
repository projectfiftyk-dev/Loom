import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../App';
import { useOnboarding } from '../context/onboarding';
import { useProgress } from '../state/progress';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Goal'>;

const C = {
  bg: '#0C0B1A',
  surface: '#1E1C30',
  text: '#FFFFFF',
  textMuted: '#8B87B8',
};

const GOALS = [
  {
    emoji: '🌍',
    title: 'Learn a Language',
    desc: 'Master German and more through immersive stories and character conversations.',
    badge: 'Languages',
    badgeBg: 'rgba(14,165,233,0.15)',
    badgeColor: '#0EA5E9',
    borderColor: 'rgba(14,165,233,0.35)',
    pathId: 'learning_german',
  },
  {
    emoji: '🌈',
    title: 'Explore for Kids',
    desc: 'Magical adventures and colorful characters for curious young readers.',
    badge: 'Kids',
    badgeBg: 'rgba(217,119,6,0.15)',
    badgeColor: '#D97706',
    borderColor: 'rgba(217,119,6,0.35)',
    pathId: 'kids_stories',
  },
  {
    emoji: '📚',
    title: 'Read & Explore',
    desc: 'Dive into history, classic literature, and stories that make you think.',
    badge: 'General',
    badgeBg: 'rgba(124,58,237,0.15)',
    badgeColor: '#7C3AED',
    borderColor: 'rgba(124,58,237,0.35)',
    pathId: 'classic_stories',
  },
] as const;

export default function GoalScreen({ route, navigation }: Props) {
  const userName = route.params?.userName;
  const { completeOnboarding } = useOnboarding();
  const { enrollInPath } = useProgress();

  const handleSelect = (pathId: string, isLanguage: boolean) => {
    if (isLanguage) {
      navigation.navigate('LanguagePick', { userName });
      return;
    }
    enrollInPath(pathId);
    completeOnboarding();
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {userName ? `Hi ${userName}! 👋` : 'What brings you here?'}
        </Text>
        <Text style={styles.subtitle}>Choose your path to get started.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.cards}
        showsVerticalScrollIndicator={false}
      >
        {GOALS.map(g => (
          <TouchableOpacity
            key={g.pathId}
            style={[styles.card, { borderColor: g.borderColor }]}
            onPress={() => handleSelect(g.pathId, g.pathId === 'learning_german')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardEmoji}>{g.emoji}</Text>
            <Text style={styles.cardTitle}>{g.title}</Text>
            <Text style={styles.cardDesc}>{g.desc}</Text>
            <View style={[styles.badge, { backgroundColor: g.badgeBg }]}>
              <Text style={[styles.badgeText, { color: g.badgeColor }]}>{g.badge}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24, gap: 8 },
  title: { fontSize: 28, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 16, color: C.textMuted },
  cards: { paddingHorizontal: 24, paddingBottom: 32, gap: 14 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    gap: 8,
  },
  cardEmoji: { fontSize: 38, marginBottom: 2 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  cardDesc: { fontSize: 14, color: C.textMuted, lineHeight: 20 },
  badge: {
    alignSelf: 'flex-start', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
