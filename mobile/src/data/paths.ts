export interface LoomModule {
  id: string;
  title: string;
  description: string;
  bookIds: string[];
}

export interface LoomPath {
  id: string;
  title: string;
  description: string;
  category: 'language' | 'kids' | 'topics' | 'classic';
  targetLanguage?: string;
  accent: string;
  coverEmoji: string;
  modules: LoomModule[];
}

export const PATHS: LoomPath[] = [
  {
    id: 'learning_german',
    title: 'Learning German',
    description: 'Master German through immersive everyday Berlin stories.',
    category: 'language',
    targetLanguage: 'de',
    accent: '#0EA5E9',
    coverEmoji: '🇩🇪',
    modules: [
      {
        id: 'ein_tag',
        title: 'Ein Tag in Berlin',
        description: 'Navigate the city, meet locals, and learn German.',
        bookIds: ['ein_tag_in_berlin'],
      },
    ],
  },
  {
    id: 'kids_stories',
    title: 'Kids Stories',
    description: 'Magical adventures for curious young readers.',
    category: 'kids',
    accent: '#D97706',
    coverEmoji: '🌈',
    modules: [
      {
        id: 'rainbow_tales',
        title: 'Rainbow Tales',
        description: 'A colorful story about friendship and discovery.',
        bookIds: ['mochi_rainbow'],
      },
    ],
  },
  {
    id: 'topics_learning',
    title: 'Topics Learning',
    description: 'Dive deep into history through immersive storytelling.',
    category: 'topics',
    accent: '#EF4444',
    coverEmoji: '⚔️',
    modules: [
      {
        id: 'thermopylae_module',
        title: 'The 300 Spartans',
        description: 'Relive the legendary Battle of Thermopylae.',
        bookIds: ['thermopylae'],
      },
    ],
  },
  {
    id: 'classic_stories',
    title: 'Classic Stories',
    description: 'Timeless tales from the world\'s greatest literature.',
    category: 'classic',
    accent: '#7C3AED',
    coverEmoji: '📜',
    modules: [
      {
        id: 'shakespeare',
        title: 'Shakespeare',
        description: 'The timeless tragedy of Romeo and Juliet.',
        bookIds: ['romeo_and_juliet'],
      },
    ],
  },
];

export function getPathById(id: string): LoomPath | undefined {
  return PATHS.find(p => p.id === id);
}

export function getPathForBook(bookId: string): LoomPath | undefined {
  return PATHS.find(p => p.modules.some(m => m.bookIds.includes(bookId)));
}

export function getModuleForBook(bookId: string): LoomModule | undefined {
  for (const p of PATHS) {
    const m = p.modules.find(mod => mod.bookIds.includes(bookId));
    if (m) return m;
  }
  return undefined;
}

export function getTotalBooksInPath(path: LoomPath): number {
  return path.modules.reduce((sum, m) => sum + m.bookIds.length, 0);
}
