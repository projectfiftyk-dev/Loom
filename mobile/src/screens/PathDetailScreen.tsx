import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../App';
import { getPathById, getTotalBooksInPath } from '../data/paths';
import { getCharactersForBook, CharacterInfo } from '../data/characters';
import { useProgress } from '../state/progress';

type Props = NativeStackScreenProps<MainStackParamList, 'PathDetail'>;

const C = {
  bg: '#0C0B1A',
  surface: '#1E1C30',
  surfaceAlt: '#16152B',
  text: '#FFFFFF',
  textMuted: '#8B87B8',
};

export default function PathDetailScreen({ route, navigation }: Props) {
  const { pathId } = route.params;
  const path = getPathById(pathId);
  const { progress, enrollInPath, unenrollFromPath } = useProgress();

  if (!path) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={{ color: C.textMuted, padding: 24 }}>Path not found.</Text>
      </SafeAreaView>
    );
  }

  const enrolled = progress.activePaths.includes(path.id);
  const completedInPath = progress.completedBooks.filter(id =>
    path.modules.some(m => m.bookIds.includes(id))
  ).length;
  const total = getTotalBooksInPath(path);

  // All chat characters across every book in this path
  const allBookIds = path.modules.flatMap(m => m.bookIds);
  const characters: CharacterInfo[] = allBookIds.flatMap(getCharactersForBook);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero header */}
        <View style={[styles.hero, { borderBottomColor: path.accent + '33' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.emoji}>{path.coverEmoji}</Text>
          <Text style={styles.title}>{path.title}</Text>
          <Text style={styles.desc}>{path.description}</Text>

          <View style={styles.stats}>
            <Stat label="Modules" value={String(path.modules.length)} />
            <View style={styles.statDivider} />
            <Stat label="Books" value={String(total)} />
            {enrolled && (
              <>
                <View style={styles.statDivider} />
                <Stat label="Completed" value={`${completedInPath}/${total}`} accent={path.accent} />
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.enrollBtn, enrolled
              ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: path.accent + '66' }
              : { backgroundColor: path.accent }]}
            onPress={() => enrolled ? unenrollFromPath(path.id) : enrollInPath(path.id)}
          >
            <Text style={[styles.enrollText, enrolled && { color: path.accent }]}>
              {enrolled ? 'Unenroll' : 'Enroll in Path'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Character hub — visible once enrolled */}
        {characters.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Characters</Text>
            {!enrolled && (
              <Text style={styles.enrollHint}>Enroll to start chatting with characters.</Text>
            )}
            <View style={styles.charGrid}>
              {characters.map(char => (
                <TouchableOpacity
                  key={`${char.bookId}-${char.id}`}
                  style={[
                    styles.charCard,
                    enrolled
                      ? { borderColor: char.color + '55' }
                      : { borderColor: 'rgba(139,135,184,0.12)', opacity: 0.5 },
                  ]}
                  onPress={() => {
                    if (!enrolled) return;
                    navigation.navigate('CharacterChat', { bookId: char.bookId, characterId: char.id });
                  }}
                  activeOpacity={enrolled ? 0.75 : 1}
                >
                  <View style={[
                    styles.charAvatar,
                    { backgroundColor: enrolled ? char.color : 'rgba(139,135,184,0.2)' },
                  ]}>
                    <Text style={styles.charAvatarText}>
                      {char.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.charName, !enrolled && { color: C.textMuted }]}>
                    {char.name.split(' ')[0]}
                  </Text>
                  {enrolled ? (
                    <View style={[styles.charBadge, { backgroundColor: char.color + '22' }]}>
                      <Text style={[styles.charBadgeText, { color: char.color }]}>Chat →</Text>
                    </View>
                  ) : (
                    <View style={[styles.charBadge, { backgroundColor: 'rgba(139,135,184,0.1)' }]}>
                      <Text style={[styles.charBadgeText, { color: C.textMuted }]}>🔒</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Modules */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Modules</Text>
          {path.modules.map((mod, idx) => (
            <TouchableOpacity
              key={mod.id}
              style={styles.moduleCard}
              onPress={() => navigation.navigate('ModuleDetail', { pathId: path.id, moduleId: mod.id })}
            >
              <View style={[styles.moduleIndex, { backgroundColor: path.accent + '22' }]}>
                <Text style={[styles.moduleIndexText, { color: path.accent }]}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.moduleName}>{mod.title}</Text>
                <Text style={styles.moduleDesc} numberOfLines={2}>{mod.description}</Text>
                <Text style={styles.moduleMeta}>{mod.bookIds.length} {mod.bookIds.length === 1 ? 'book' : 'books'}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent ? { color: accent } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 48 },
  hero: { padding: 24, borderBottomWidth: 1, gap: 10, marginBottom: 8 },
  back: { marginBottom: 8 },
  backText: { color: C.textMuted, fontSize: 15 },
  emoji: { fontSize: 48 },
  title: { fontSize: 28, fontWeight: '700', color: C.text },
  desc: { fontSize: 15, color: C.textMuted, lineHeight: 22 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 8 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: C.text },
  statLabel: { fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(139,135,184,0.2)' },
  enrollBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  enrollText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  section: { paddingHorizontal: 24, paddingTop: 20, marginBottom: 8 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },
  enrollHint: { fontSize: 13, color: 'rgba(139,135,184,0.5)', marginBottom: 12 },

  charGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  charCard: {
    width: '47%', backgroundColor: C.surface,
    borderRadius: 16, padding: 14, borderWidth: 1,
    alignItems: 'center', gap: 8,
  },
  charAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  charAvatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  charName: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'center' },
  charBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  charBadgeText: { fontSize: 11, fontWeight: '600' },

  moduleCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  moduleIndex: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moduleIndexText: { fontSize: 15, fontWeight: '700' },
  moduleName: { fontSize: 16, fontWeight: '600', color: C.text },
  moduleDesc: { fontSize: 13, color: C.textMuted, lineHeight: 18 },
  moduleMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  chevron: { fontSize: 22, color: C.textMuted },
});
