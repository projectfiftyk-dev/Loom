import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../App';
import { useOnboarding } from '../context/onboarding';
import { PATHS } from '../data/paths';
import { useProgress } from '../state/progress';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'LanguagePick'>;

const C = {
  bg: '#0C0B1A',
  surface: '#1E1C30',
  text: '#FFFFFF',
  textMuted: '#8B87B8',
};

const LANGUAGE_LABELS: Record<string, { label: string; flag: string }> = {
  es: { label: 'Spanish', flag: '🇪🇸' },
  de: { label: 'German', flag: '🇩🇪' },
  fr: { label: 'French', flag: '🇫🇷' },
  it: { label: 'Italian', flag: '🇮🇹' },
};

export default function LanguagePickScreen({ route, navigation }: Props) {
  const { userName } = route.params ?? {};
  const { completeOnboarding } = useOnboarding();
  const { enrollInPath } = useProgress();
  const languagePaths = PATHS.filter(p => p.category === 'language');

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pick a Language</Text>
        <Text style={styles.subtitle}>We'll build your path around it.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {languagePaths.map(path => {
          const lang = LANGUAGE_LABELS[path.targetLanguage ?? ''] ?? { label: path.title, flag: path.coverEmoji };
          return (
            <TouchableOpacity
              key={path.id}
              style={[styles.card, { borderColor: path.accent + '55' }]}
              onPress={() => { enrollInPath(path.id); completeOnboarding(); }}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text style={styles.langName}>{lang.label}</Text>
              <Text style={styles.pathTitle}>{path.title}</Text>
              <View style={[styles.dot, { backgroundColor: path.accent }]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 8 },
  back: { color: C.textMuted, fontSize: 15, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: C.text },
  subtitle: { fontSize: 15, color: C.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  card: {
    width: '46%',
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  flag: { fontSize: 44 },
  langName: { fontSize: 18, fontWeight: '700', color: C.text },
  pathTitle: { fontSize: 12, color: C.textMuted, textAlign: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});
