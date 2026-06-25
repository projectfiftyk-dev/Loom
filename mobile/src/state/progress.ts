import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  inProgressBooks: Record<string, string>;
  lastAccessed?: LastAccessed;
  selectedCategory?: 'language' | 'kids';
  selectedLanguage?: string;
}

const DEFAULT_PROGRESS: UserProgress = {
  activePaths: [],
  completedBooks: [],
  inProgressBooks: {},
};

export function useProgress() {
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setProgress(JSON.parse(raw)); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const save = useCallback(async (next: UserProgress) => {
    setProgress(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const persist = useCallback((updater: (prev: UserProgress) => UserProgress) => {
    setProgress(prev => {
      const next = updater(prev);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
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

  const markBookInProgress = useCallback((bookId: string, nodeId: string) => {
    persist(prev => ({
      ...prev,
      inProgressBooks: { ...prev.inProgressBooks, [bookId]: nodeId },
    }));
  }, [persist]);

  const markBookComplete = useCallback((bookId: string) => {
    persist(prev => {
      const inProgress = { ...prev.inProgressBooks };
      delete inProgress[bookId];
      const completed = prev.completedBooks.includes(bookId)
        ? prev.completedBooks
        : [...prev.completedBooks, bookId];
      return { ...prev, inProgressBooks: inProgress, completedBooks: completed };
    });
  }, [persist]);

  return {
    progress, loaded, save,
    enrollInPath, unenrollFromPath,
    setLastAccessed,
    markBookInProgress, markBookComplete,
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
