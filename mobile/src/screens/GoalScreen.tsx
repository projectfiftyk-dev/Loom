import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../App';
import { useOnboarding } from '../context/onboarding';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Goal'>;

const C = {
  bg: '#0C0B1A',
  surface: '#1E1C30',
  text: '#FFFFFF',
  textMuted: '#8B87B8',
  accent: '#7C3AED',
};

export default function GoalScreen({ route, navigation }: Props) {
  const userName = route.params?.userName;
  const { completeOnboarding } = useOnboarding();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {userName ? `Hi ${userName}! 👋` : 'What brings you here?'}
        </Text>
        <Text style={styles.subtitle}>Choose your adventure to get started.</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={[styles.card, { borderColor: 'rgba(34,197,94,0.4)' }]}
          onPress={() => navigation.navigate('LanguagePick', { userName })}
        >
          <Text style={styles.cardEmoji}>🌍</Text>
          <Text style={styles.cardTitle}>Learn a Language</Text>
          <Text style={styles.cardDesc}>
            Master Spanish, German, and more through immersive stories.
          </Text>
          <View style={[styles.badge, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
            <Text style={[styles.badgeText, { color: '#22C55E' }]}>Languages</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, { borderColor: 'rgba(217,119,6,0.4)' }]}
          onPress={() => completeOnboarding()}
        >
          <Text style={styles.cardEmoji}>🌈</Text>
          <Text style={styles.cardTitle}>Explore for Kids</Text>
          <Text style={styles.cardDesc}>
            Magical adventures, mysteries, and classic tales for young readers.
          </Text>
          <View style={[styles.badge, { backgroundColor: 'rgba(217,119,6,0.15)' }]}>
            <Text style={[styles.badgeText, { color: '#D97706' }]}>Kids</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24 },
  header: { paddingTop: 48, paddingBottom: 32, gap: 8 },
  title: { fontSize: 28, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 16, color: C.textMuted },
  cards: { gap: 16 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    gap: 8,
  },
  cardEmoji: { fontSize: 40, marginBottom: 4 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  cardDesc: { fontSize: 14, color: C.textMuted, lineHeight: 20 },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
