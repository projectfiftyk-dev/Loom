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

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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

        <View style={styles.bookList}>
          <Text style={styles.sectionTitle}>Books in this module</Text>
          {loading ? (
            <ActivityIndicator color={path.accent} style={{ marginTop: 24 }} />
          ) : books.length === 0 ? (
            <Text style={styles.empty}>Books loading — make sure the server is running.</Text>
          ) : (
            books.map(book => {
              const isComplete = progress.completedBooks.includes(book.id);
              const isInProgress = book.id in progress.inProgressBooks && !isComplete;
              return (
                <TouchableOpacity
                  key={book.id}
                  style={styles.bookCard}
                  onPress={() => {
                    setLastAccessed({ pathId, moduleId, bookId: book.id });
                    navigation.navigate('Reader', { bookId: book.id });
                  }}
                >
                  <View style={styles.bookCardLeft}>
                    <View style={[styles.statusDot, {
                      backgroundColor: isComplete ? '#22C55E' : isInProgress ? path.accent : C.textMuted,
                    }]} />
                  </View>
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    {book.author ? <Text style={styles.bookAuthor}>by {book.author}</Text> : null}
                    {book.description ? (
                      <Text style={styles.bookDesc} numberOfLines={2}>{book.description}</Text>
                    ) : null}
                    <View style={styles.bookMeta}>
                      {book.language && (
                        <View style={[styles.tag, { backgroundColor: path.accent + '22' }]}>
                          <Text style={[styles.tagText, { color: path.accent }]}>{book.language.toUpperCase()}</Text>
                        </View>
                      )}
                      {isComplete && (
                        <View style={[styles.tag, { backgroundColor: '#22C55E22' }]}>
                          <Text style={[styles.tagText, { color: '#22C55E' }]}>✓ Completed</Text>
                        </View>
                      )}
                      {isInProgress && (
                        <View style={[styles.tag, { backgroundColor: path.accent + '22' }]}>
                          <Text style={[styles.tagText, { color: path.accent }]}>In Progress</Text>
                        </View>
                      )}
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
  scroll: { paddingBottom: 40 },
  header: { padding: 24, gap: 10 },
  back: { color: C.textMuted, fontSize: 15, marginBottom: 4 },
  pathTag: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pathTagText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '700', color: C.text },
  desc: { fontSize: 14, color: C.textMuted, lineHeight: 20 },
  bookList: { paddingHorizontal: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  empty: { color: C.textMuted, fontSize: 14, marginTop: 8 },
  bookCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bookCardLeft: { paddingTop: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  bookInfo: { flex: 1, gap: 4 },
  bookTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  bookAuthor: { fontSize: 13, color: C.textMuted },
  bookDesc: { fontSize: 13, color: C.textMuted, lineHeight: 18 },
  bookMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: '600' },
  chevron: { fontSize: 22, color: C.textMuted, alignSelf: 'center' },
});
