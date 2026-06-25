import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  ActivityIndicator, StyleSheet, StatusBar, RefreshControl,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import type { BookMeta } from '../types/story';
import { fetchBooks, bookAssetUrl } from '../api/client';
import { getPaletteForStyle, hexToRgba } from '../styles/palettes';

type Props = { navigation: any };

const LANG_LABELS: Record<string, string> = {
  en: 'EN', es: 'ES', fr: 'FR', de: 'DE',
  pt: 'PT', it: 'IT', ja: 'JA', zh: 'ZH',
};

export default function LibraryScreen({ navigation }: Props) {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      setBooks(await fetchBooks());
    } catch {
      setError('Could not connect to the Loom server.\nMake sure it is running (npm run dev).');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brand}>✦ LOOM</Text>
        <Text style={styles.subtitle}>Library</Text>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color="#7C3AED" size="large" />
          <Text style={styles.loadingText}>Loading books…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && books.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>No books yet</Text>
          <Text style={styles.emptyDesc}>Add .yaml story files to the books/ folder and refresh.</Text>
        </View>
      )}

      {!loading && !error && books.length > 0 && (
        <FlatList
          data={books}
          keyExtractor={b => b.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
          renderItem={({ item }) => (
            <BookCard book={item} onPress={() => navigation.navigate('Reader', { bookId: item.id })} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function BookCard({ book, onPress }: { book: BookMeta; onPress: () => void }) {
  const palette = getPaletteForStyle(book.style);
  const accent = palette.accent;
  const isSvg = book.cover_image?.toLowerCase().endsWith('.svg');
  const coverUri = book.cover_image ? bookAssetUrl(book.cover_image) : null;

  return (
    <TouchableOpacity style={[styles.card, { borderColor: hexToRgba(accent, 0.25) }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.cardCover, { backgroundColor: hexToRgba(accent, 0.08) }]}>
        {coverUri && isSvg ? (
          <SvgUri uri={coverUri} width="100%" height="100%" style={StyleSheet.absoluteFill} />
        ) : coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.coverImg} resizeMode="cover" />
        ) : (
          <Text style={[styles.coverPlaceholder, { color: accent }]}>📖</Text>
        )}
        {book.language && (
          <View style={styles.langBadge}>
            <Text style={[styles.langText, { color: accent }]}>{LANG_LABELS[book.language] || book.language.toUpperCase()}</Text>
          </View>
        )}
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={[styles.cardAuthor, { color: hexToRgba(accent, 0.8) }]} numberOfLines={1}>by {book.author}</Text>
        {book.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{book.description}</Text>
        ) : null}
        {book.tags && book.tags.length > 0 && (
          <View style={styles.tags}>
            {book.tags.slice(0, 2).map(tag => (
              <View key={tag} style={[styles.tag, { backgroundColor: hexToRgba(accent, 0.12) }]}>
                <Text style={[styles.tagText, { color: accent }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0C0B1A' },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(124,58,237,0.15)' },
  brand: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  subtitle: { fontSize: 13, color: '#8B87B8', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  loadingText: { color: '#8B87B8', fontSize: 14 },
  errorText: { color: '#f87171', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: 10 },
  retryText: { color: '#7C3AED', fontSize: 14, fontWeight: '600' },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: '#8B87B8', fontSize: 18, fontWeight: '600' },
  emptyDesc: { color: '#5A5780', fontSize: 13, textAlign: 'center' },
  grid: { padding: 12, paddingBottom: 32 },
  row: { gap: 12 },
  card: {
    flex: 1, backgroundColor: '#1E1C30', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, marginBottom: 12,
  },
  cardCover: { height: 130, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  coverImg: { position: 'absolute', inset: 0, width: '100%', height: '100%' } as any,
  coverPlaceholder: { fontSize: 36 },
  langBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  langText: { fontSize: 10, fontWeight: '700' },
  accentBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
  cardBody: { padding: 12, gap: 3 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#fff', lineHeight: 18 },
  cardAuthor: { fontSize: 11 },
  cardDesc: { fontSize: 11, color: '#7E7AA8', lineHeight: 16, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '500' },
});
