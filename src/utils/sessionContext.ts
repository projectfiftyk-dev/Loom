import type { Story, ChatMessage, FreeTextAttempt } from '../types/story';

/**
 * Builds a recall-context string for a character that has recall_history enabled.
 * Injected into the system prompt under "--- Session memory ---".
 *
 * Priority (fills up to maxChars budget):
 *   1. Free-text exercise results  (most useful for the character to know)
 *   2. Other characters' recent chat (compressed to last 2 exchanges)
 */
export function buildRecallContext(
  characterId: string,
  story: Story,
  chatHistories: Record<string, ChatMessage[]>,
  freeTextAttempts: FreeTextAttempt[],
  maxChars = 2000,
): string {
  const sections: string[] = [];
  let budget = maxChars;

  // ── Tier 1: free-text exercise results ──────────────────────────────────
  if (freeTextAttempts.length > 0) {
    const lines = freeTextAttempts.map(a =>
      `  • "${a.prompt.slice(0, 60)}" → "${a.response.slice(0, 80)}" ${a.success ? '✓' : '✗'}`,
    );
    const block = `Player's exercise responses this session:\n${lines.join('\n')}`;
    if (block.length <= budget) {
      sections.push(block);
      budget -= block.length;
    } else {
      // Fit as many lines as possible
      const fitted: string[] = [];
      for (const line of lines) {
        if (budget < line.length + 50) break;
        fitted.push(line);
        budget -= line.length;
      }
      if (fitted.length > 0) {
        sections.push(`Player's exercise responses this session:\n${fitted.join('\n')}`);
      }
    }
  }

  // ── Tier 2: other characters' recent chats ───────────────────────────────
  for (const [charId, msgs] of Object.entries(chatHistories)) {
    if (budget <= 0) break;
    if (charId === characterId || msgs.length === 0) continue;

    const char = story.characters?.find(c => c.id === charId);
    const name = char?.name ?? charId;
    // Last 4 messages = 2 exchanges, truncated
    const recent = msgs.slice(-4)
      .map(m => `  ${m.role === 'assistant' ? name : 'Player'}: "${m.content.slice(0, 100)}"`)
      .join('\n');
    const block = `Player's recent chat with ${name}:\n${recent}`;
    if (block.length <= budget) {
      sections.push(block);
      budget -= block.length;
    }
  }

  return sections.join('\n\n');
}
