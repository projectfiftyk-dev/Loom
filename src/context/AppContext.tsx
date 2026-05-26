import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
type LLMProvider = 'openai' | 'gemini';

interface AppContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  llmProvider: LLMProvider;
  setLlmProvider: (p: LLMProvider) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  elevenLabsApiKey: string;
  setElevenLabsApiKey: (k: string) => void;
  isEditMode: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('loom-theme') as Theme) || 'dark';
  });

  const [llmProvider, setLlmProviderState] = useState<LLMProvider>(() => {
    return (localStorage.getItem('loom-provider') as LLMProvider) || 'openai';
  });

  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem('loom-api-key') || '';
  });

  const [elevenLabsApiKey, setElevenLabsApiKeyState] = useState<string>(() => {
    return localStorage.getItem('loom-elevenlabs-key') || '';
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('loom-theme', t);
  };

  const setLlmProvider = (p: LLMProvider) => {
    setLlmProviderState(p);
    localStorage.setItem('loom-provider', p);
  };

  const setApiKey = (k: string) => {
    setApiKeyState(k);
    localStorage.setItem('loom-api-key', k);
  };

  const setElevenLabsApiKey = (k: string) => {
    setElevenLabsApiKeyState(k);
    localStorage.setItem('loom-elevenlabs-key', k);
  };

  const isEditMode = !!elevenLabsApiKey;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <AppContext.Provider value={{ theme, setTheme, llmProvider, setLlmProvider, apiKey, setApiKey, elevenLabsApiKey, setElevenLabsApiKey, isEditMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
