import type { BookMeta, ChatMessage } from '../types/story';

const BASE = '';

export async function fetchBooks(): Promise<BookMeta[]> {
  const res = await fetch(`${BASE}/api/books`);
  if (!res.ok) throw new Error('Failed to load books');
  return res.json();
}

export async function fetchBookYaml(id: string): Promise<string> {
  const res = await fetch(`${BASE}/api/books/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Book not found');
  return res.text();
}

export async function evaluateFreeText(
  provider: string,
  apiKey: string,
  prompt: string,
  goal: string,
  playerInput: string
): Promise<{ success: boolean; reason: string }> {
  const res = await fetch(`${BASE}/api/llm/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey, prompt, goal, playerInput }),
  });
  if (!res.ok) throw new Error('Evaluation failed');
  return res.json();
}

export async function chatWithCharacter(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch(`${BASE}/api/llm/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey, systemPrompt, messages }),
  });
  if (!res.ok) throw new Error('Chat request failed');
  const data = await res.json();
  return data.reply;
}
