import { API_BASE } from './config';
import type { BookMeta, ChatMessage } from '../types/story';

export async function fetchBooks(): Promise<BookMeta[]> {
  const res = await fetch(`${API_BASE}/api/books`);
  if (!res.ok) throw new Error('Failed to load books');
  return res.json();
}

export async function fetchBookYaml(id: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/books/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Book not found');
  return res.text();
}

export async function fetchAudioConfig(bookId: string): Promise<Record<string, string>> {
  const res = await fetch(`${API_BASE}/api/audio-config/${bookId}`);
  return res.ok ? res.json() : {};
}

export async function evaluateFreeText(
  prompt: string,
  goal: string,
  playerInput: string,
): Promise<{ success: boolean; reason: string }> {
  const res = await fetch(`${API_BASE}/api/llm/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'gemini', apiKey: '', prompt, goal, playerInput }),
  });
  if (!res.ok) throw new Error('Evaluation failed');
  return res.json();
}

export async function chatWithCharacter(
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/llm/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'gemini', apiKey: '', systemPrompt, messages }),
  });
  if (!res.ok) throw new Error('Chat request failed');
  const data = await res.json();
  return data.reply;
}

export function bookAssetUrl(path: string): string {
  if (!path) return '';
  return path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/book-assets/${path}`;
}

export function audioUrl(audioPath: string): string {
  return audioPath.startsWith('/') ? `${API_BASE}${audioPath}` : `${API_BASE}/${audioPath}`;
}
