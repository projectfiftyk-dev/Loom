import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProgress } from '../state/progress';
import { getPathById } from '../data/paths';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabsParamList, MainStackParamList } from '../../App';
import { resetOnboarding } from '../state/progress';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, 'Profile'>,
  NativeStackScreenProps<MainStackParamList>
>;

const C = {
  bg: '#0C0B1A',
  surface: '#1E1C30',
  text: '#FFFFFF',
  textMuted: '#8B87B8',
  accent: '#7C3AED',
  danger: '#EF4444',
};

export default function ProfileScreen({ navigation }: Props) {
  const { progress } = useProgress();
  const name = progress.userName ?? 'Learner';
  const initial = name.charAt(0).toUpperCase();

  const enrolledPaths = progress.activePaths
    .map(id => getPathById(id))
    .filter(Boolean) as NonNullable<ReturnType<typeof getPathById>>[];

  const completedCount = progress.completedBooks.length;
  const inProgressCount = Object.keys(progress.inProgressBooks).filter(
    id => !progress.completedBooks.includes(id)
  ).length;

  const handleReset = () => {
    Alert.alert(
      'Reset Demo',
      'This will clear all progress and return to onboarding. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetOnboarding();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: C.accent }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.sub}>Loom Reader</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatBox label="Day Streak" value="1 🔥" />
          <View style={styles.statDivider} />
          <StatBox label="In Progress" value={String(inProgressCount)} />
          <View style={styles.statDivider} />
          <StatBox label="Completed" value={String(completedCount)} />
        </View>

        {/* Enrolled paths */}
        {enrolledPaths.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Paths</Text>
            {enrolledPaths.map(path => (
              <TouchableOpacity
                key={path.id}
                style={[styles.pathRow, { borderColor: path.accent + '44' }]}
                onPress={() => navigation.navigate('PathDetail', { pathId: path.id })}
              >
                <Text style={styles.pathEmoji}>{path.coverEmoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pathName}>{path.title}</Text>
                  <Text style={styles.pathMeta}>{path.modules.length} modules</Text>
                </View>
                <Text style={[styles.chevron, { color: path.accent }]}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {enrolledPaths.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.empty}>No active paths. Head to Explore to enroll in one.</Text>
          </View>
        )}

        {/* Reset */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetText}>Reset Demo</Text>
          </TouchableOpacity>
          <Text style={styles.resetHint}>Clears all progress and returns to onboarding.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 48 },
  hero: { alignItems: 'center', paddingTop: 36, paddingBottom: 24, gap: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: C.text },
  sub: { fontSize: 14, color: C.textMuted },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 24,
    backgroundColor: C.surface, borderRadius: 20, padding: 18,
    marginBottom: 28, alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: C.text },
  statLabel: { fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(139,135,184,0.2)' },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },
  pathRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 8, borderWidth: 1,
  },
  pathEmoji: { fontSize: 24 },
  pathName: { fontSize: 15, fontWeight: '600', color: C.text },
  pathMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  chevron: { fontSize: 22 },
  empty: { color: C.textMuted, fontSize: 14, lineHeight: 20 },
  resetBtn: {
    borderRadius: 14, borderWidth: 1, borderColor: C.danger + '55',
    paddingVertical: 14, alignItems: 'center',
  },
  resetText: { color: C.danger, fontSize: 15, fontWeight: '600' },
  resetHint: { color: C.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
