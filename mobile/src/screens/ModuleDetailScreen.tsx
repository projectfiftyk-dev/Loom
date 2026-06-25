import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../App';
import { getPathById } from '../data/paths';
import { useProgress } from '../state/progress';
import { fetchBooks } from '../api/client';
import type { BookMeta } from '../types/story';

type Props = NativeStackScreenProps<MainStackParamList, 'ModuleDetail'>;

const C = {
  bg: '#0C0B1A',
  surface: '#1E1C30',
  surfaceAlt: '#16152B',
  text: '#FFFFFF',
  textMuted: '#8B87B8',
};

export default function ModuleDetailScreen({ route, navigation }: Props) {
  const { pathId, moduleId } = route.params;
  const path = getPathById(pathId);
  const mod = path?.modules.find(m => m.id === moduleId);
  const { progress, setLastAccessed } = useProgress();
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooks()
      .then(all => setBooks(all.filter(b => mod?.bookIds.includes(b.id) ?? false)))
      .finally(() => setLoading(false));
  }, [mod]);

  if (!path || !mod) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={{ color: C.textMuted, padding: 24 }}>Module not found.</Text>
      </SafeAreaView>
    );
  }

  const isBookComplete = (bookId: string) => progress.completedBooks.includes(bookId);
  const isBookStarted = (bookId: string) =>
    bookId in progress.inProgressBooks || progress.completedBooks.includes(bookId);
  const getBookProgress = (bookId: string): number => progress.bookProgress[bookId] ?? 0;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <View style={[styles.pathTag, { backgroundColor: path.accent + '22' }]}>
            <Text style={[styles.pathTagText, { color: path.accent }]}>{path.coverEmoji} {path.title}</Text>
          </View>
          <Text style={styles.title}>{mod.title}</Text>
          <Text style={styles.desc}>{mod.description}</Text>
        </View>

        {/* Books */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Books in this module</Text>
          {loading ? (
            <ActivityIndicator color={path.accent} style={{ marginTop: 24 }} />
          ) : books.length === 0 ? (
            <Text style={styles.empty}>Make sure the server is running.</Text>
          ) : (
            books.map(book => {
              const complete = isBookComplete(book.id);
              const started = isBookStarted(book.id);
              const pct = getBookProgress(book.id);
              const completedScenes = progress.completedScenes[book.id] ?? [];

              return (
                <TouchableOpacity
                  key={book.id}
                  style={styles.bookCard}
                  onPress={() => {
                    setLastAccessed({ pathId, moduleId, bookId: book.id });
                    navigation.navigate('Reader', { bookId: book.id });
                  }}
                >
                  <View style={[styles.statusDot, {
                    backgroundColor: complete ? '#22C55E' : started ? path.accent : C.textMuted,
                  }]} />

                  <View style={styles.bookInfo}>
                    <View style={styles.bookTopRow}>
                      <Text style={styles.bookTitle}>{book.title}</Text>
                      {complete && (
                        <View style={styles.completeBadge}>
                          <Text style={styles.completeBadgeText}>✓ Done</Text>
                        </View>
                      )}
                    </View>

                    {book.author ? <Text style={styles.bookAuthor}>by {book.author}</Text> : null}
                    {book.description ? (
                      <Text style={styles.bookDesc} numberOfLines={2}>{book.description}</Text>
                    ) : null}

                    {/* Progress bar */}
                    {started && !complete && (
                      <View style={styles.progressWrap}>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, {
                            width: `${pct}%` as any,
                            backgroundColor: path.accent,
                          }]} />
                        </View>
                        <Text style={[styles.progressLabel, { color: path.accent }]}>{pct}%</Text>
                      </View>
                    )}

                    {/* Scene completion dots */}
                    {completedScenes.length > 0 && (
                      <View style={styles.sceneDots}>
                        {completedScenes.map(sceneId => (
                          <View
                            key={sceneId}
                            style={[styles.sceneDot, { backgroundColor: complete ? '#22C55E' : path.accent }]}
                          />
                        ))}
                      </View>
                    )}

                    {/* Tags */}
                    <View style={styles.tags}>
                      {book.language && (
                        <View style={[styles.tag, { backgroundColor: path.accent + '22' }]}>
                          <Text style={[styles.tagText, { color: path.accent }]}>{book.language.toUpperCase()}</Text>
                        </View>
                      )}
                      {book.tags?.slice(0, 2).map(t => (
                        <View key={t} style={styles.tag}>
                          <Text style={styles.tagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 48 },
  header: { padding: 24, gap: 10 },
  back: { color: C.textMuted, fontSize: 15, marginBottom: 4 },
  pathTag: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pathTagText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '700', color: C.text },
  desc: { fontSize: 14, color: C.textMuted, lineHeight: 20 },
  section: { paddingHorizontal: 24, marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.textMuted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { color: C.textMuted, fontSize: 14, marginTop: 8 },
  bookCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  bookInfo: { flex: 1, gap: 5 },
  bookTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  bookTitle: { fontSize: 16, fontWeight: '600', color: C.text, flex: 1 },
  completeBadge: { backgroundColor: '#22C55E22', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  completeBadgeText: { color: '#22C55E', fontSize: 11, fontWeight: '700' },
  bookAuthor: { fontSize: 12, color: C.textMuted },
  bookDesc: { fontSize: 13, color: C.textMuted, lineHeight: 18 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  progressTrack: { flex: 1, height: 4, backgroundColor: C.surfaceAlt, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 11, fontWeight: '700', minWidth: 28 },
  sceneDots: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 2 },
  sceneDot: { width: 6, height: 6, borderRadius: 3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tag: { backgroundColor: 'rgba(139,135,184,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { color: C.textMuted, fontSize: 11, fontWeight: '600' },
  chevron: { fontSize: 22, color: C.textMuted, alignSelf: 'center' },
});
