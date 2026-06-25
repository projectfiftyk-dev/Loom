import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProgress } from '../state/progress';
import { PATHS, getPathById, getTotalBooksInPath } from '../data/paths';
import { fetchBooks } from '../api/client';
import type { BookMeta } from '../types/story';
import { MainTabsParamList, MainStackParamList } from '../../App';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, 'Home'>,
  NativeStackScreenProps<MainStackParamList>
>;

const C = {
  bg: '#0C0B1A',
  surface: '#1E1C30',
  surfaceAlt: '#16152B',
  text: '#FFFFFF',
  textMuted: '#8B87B8',
  accent: '#7C3AED',
};

export default function HomeScreen({ navigation }: Props) {
  const { progress } = useProgress();
  const [books, setBooks] = useState<BookMeta[]>([]);

  useEffect(() => {
    fetchBooks().then(setBooks).catch(() => {});
  }, []);

  const getBook = (id: string) => books.find(b => b.id === id);

  const enrolledPaths = progress.activePaths
    .map(id => getPathById(id))
    .filter(Boolean) as ReturnType<typeof getPathById>[];

  const inProgressIds = Object.keys(progress.inProgressBooks).filter(
    id => !progress.completedBooks.includes(id)
  );
  const completedIds = progress.completedBooks;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {progress.userName ? `Hey, ${progress.userName} 👋` : 'Welcome back 👋'}
          </Text>
          <Text style={styles.sub}>Keep the momentum going.</Text>
        </View>

        {/* Enrolled paths */}
        {enrolledPaths.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Paths</Text>
            {(enrolledPaths as NonNullable<(typeof enrolledPaths)[number]>[]).map(path => {
              const completedInPath = completedIds.filter(id =>
                path.modules.some(m => m.bookIds.includes(id))
              ).length;
              const total = getTotalBooksInPath(path);
              const fraction = total > 0 ? completedInPath / total : 0;

              return (
                <TouchableOpacity
                  key={path.id}
                  style={[styles.pathCard, { borderColor: path.accent + '55' }]}
                  onPress={() => navigation.navigate('PathDetail', { pathId: path.id })}
                >
                  <View style={styles.pathCardTop}>
                    <Text style={styles.pathEmoji}>{path.coverEmoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pathTitle}>{path.title}</Text>
                      <Text style={styles.pathMeta}>{completedInPath}/{total} books completed</Text>
                    </View>
                    <Text style={[styles.pct, { color: path.accent }]}>
                      {Math.round(fraction * 100)}%
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, {
                      width: `${Math.round(fraction * 100)}%` as any,
                      backgroundColor: path.accent,
                    }]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyCard}
            onPress={() => navigation.navigate('Explore')}
          >
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyTitle}>No active paths yet</Text>
            <Text style={styles.emptySub}>Go to Explore and enroll in a path to start.</Text>
          </TouchableOpacity>
        )}

        {/* In progress books */}
        {inProgressIds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>In Progress</Text>
            {inProgressIds.map(id => {
              const book = getBook(id);
              if (!book) return null;
              return (
                <BookRow key={id} book={book} accent={C.accent} badge="In Progress"
                  onPress={() => navigation.navigate('Reader', { bookId: id })} />
              );
            })}
          </View>
        )}

        {/* Completed books */}
        {completedIds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedIds.map(id => {
              const book = getBook(id);
              if (!book) return null;
              return (
                <BookRow key={id} book={book} accent="#22C55E" badge="✓ Done"
                  onPress={() => navigation.navigate('Reader', { bookId: id })} />
              );
            })}
          </View>
        )}

        {enrolledPaths.length > 0 && inProgressIds.length === 0 && completedIds.length === 0 && (() => {
          const firstPath = enrolledPaths[0] as NonNullable<(typeof enrolledPaths)[number]>;
          const firstMod = firstPath?.modules[0];
          const firstBookId = firstMod?.bookIds[0];
          return (
            <View style={styles.startCard}>
              <Text style={styles.startEmoji}>📖</Text>
              <Text style={styles.startTitle}>Ready to start?</Text>
              <Text style={styles.startSub}>You've enrolled in {firstPath?.title}. Open your first book to begin.</Text>
              {firstBookId && (
                <TouchableOpacity
                  style={[styles.startBtn, { backgroundColor: firstPath?.accent ?? C.accent }]}
                  onPress={() => {
                    if (firstPath && firstMod) {
                      navigation.navigate('ModuleDetail', { pathId: firstPath.id, moduleId: firstMod.id });
                    }
                  }}
                >
                  <Text style={styles.startBtnText}>Start Reading →</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}
      </ScrollView>
    </SafeAreaView>
  );
}

function BookRow({ book, accent, badge, onPress }: {
  book: BookMeta; accent: string; badge: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.bookRow} onPress={onPress}>
      <View style={[styles.bookDot, { backgroundColor: accent }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.bookTitle}>{book.title}</Text>
        {book.author ? <Text style={styles.bookAuthor}>{book.author}</Text> : null}
      </View>
      <View style={[styles.bookBadge, { backgroundColor: accent + '22' }]}>
        <Text style={[styles.bookBadgeText, { color: accent }]}>{badge}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '700', color: C.text },
  sub: { fontSize: 14, color: C.textMuted, marginTop: 4 },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  pathCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
  },
  pathCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pathEmoji: { fontSize: 28 },
  pathTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  pathMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  pct: { fontSize: 16, fontWeight: '700' },
  progressTrack: { height: 5, backgroundColor: C.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  emptyCard: {
    marginHorizontal: 24,
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,135,184,0.2)',
    marginBottom: 24,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  emptySub: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  bookDot: { width: 10, height: 10, borderRadius: 5 },
  bookTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  bookAuthor: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  bookBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  bookBadgeText: { fontSize: 11, fontWeight: '700' },
  startCard: {
    marginHorizontal: 24, marginBottom: 24,
    backgroundColor: C.surface, borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(139,135,184,0.2)',
  },
  startEmoji: { fontSize: 36 },
  startTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  startSub: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  startBtn: {
    marginTop: 8, borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 28,
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
