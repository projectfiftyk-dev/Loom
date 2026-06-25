import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '../types/story';

const STORAGE_KEY = 'loom_progress';
const ONBOARDING_KEY = 'loom_onboarding_done';

export interface LastAccessed {
  pathId: string;
  moduleId: string;
  bookId: string;
}

export interface UserProgress {
  userName?: string;
  activePaths: string[];
  completedBooks: string[];
  inProgressBooks: Record<string, string>;           // bookId → last nodeId
  chatHistories: Record<string, Record<string, ChatMessage[]>>; // bookId → charId → msgs
  completedScenes: Record<string, string[]>;         // bookId → completed scene IDs
  bookProgress: Record<string, number>;              // bookId → 0-100
  lastAccessed?: LastAccessed;
  selectedCategory?: 'language' | 'kids';
  selectedLanguage?: string;
}

const DEFAULT_PROGRESS: UserProgress = {
  activePaths: [],
  completedBooks: [],
  inProgressBooks: {},
  chatHistories: {},
  completedScenes: {},
  bookProgress: {},
};

export function useProgress() {
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<UserProgress>;
          // Merge with defaults so new fields are always present
          setProgress({ ...DEFAULT_PROGRESS, ...parsed });
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback((updater: (prev: UserProgress) => UserProgress) => {
    setProgress(prev => {
      const next = updater(prev);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const save = useCallback(async (next: UserProgress) => {
    setProgress(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const enrollInPath = useCallback((pathId: string) => {
    persist(prev => prev.activePaths.includes(pathId)
      ? prev
      : { ...prev, activePaths: [...prev.activePaths, pathId] });
  }, [persist]);

  const unenrollFromPath = useCallback((pathId: string) => {
    persist(prev => ({ ...prev, activePaths: prev.activePaths.filter(id => id !== pathId) }));
  }, [persist]);

  const setLastAccessed = useCallback((entry: LastAccessed) => {
    persist(prev => ({ ...prev, lastAccessed: entry }));
  }, [persist]);

  const markBookInProgress = useCallback((bookId: string, nodeId: string, pct: number) => {
    persist(prev => ({
      ...prev,
      inProgressBooks: { ...prev.inProgressBooks, [bookId]: nodeId },
      bookProgress: { ...prev.bookProgress, [bookId]: pct },
    }));
  }, [persist]);

  const markSceneComplete = useCallback((bookId: string, sceneId: string) => {
    persist(prev => {
      const existing = prev.completedScenes[bookId] ?? [];
      if (existing.includes(sceneId)) return prev;
      return {
        ...prev,
        completedScenes: { ...prev.completedScenes, [bookId]: [...existing, sceneId] },
      };
    });
  }, [persist]);

  const markBookComplete = useCallback((bookId: string) => {
    persist(prev => {
      const inProgress = { ...prev.inProgressBooks };
      delete inProgress[bookId];
      const completed = prev.completedBooks.includes(bookId)
        ? prev.completedBooks
        : [...prev.completedBooks, bookId];
      return {
        ...prev,
        inProgressBooks: inProgress,
        completedBooks: completed,
        bookProgress: { ...prev.bookProgress, [bookId]: 100 },
      };
    });
  }, [persist]);

  const saveChatHistory = useCallback((bookId: string, charId: string, msgs: ChatMessage[]) => {
    persist(prev => ({
      ...prev,
      chatHistories: {
        ...prev.chatHistories,
        [bookId]: {
          ...(prev.chatHistories[bookId] ?? {}),
          [charId]: msgs,
        },
      },
    }));
  }, [persist]);

  return {
    progress, loaded, save,
    enrollInPath, unenrollFromPath,
    setLastAccessed,
    markBookInProgress, markSceneComplete, markBookComplete,
    saveChatHistory,
  };
}

export async function isOnboardingDone(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
}

export async function setOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
  await AsyncStorage.removeItem(STORAGE_KEY);
}
