import type { Story, ChatMessage, FreeTextAttempt } from '../types/story';

export function buildRecallContext(
  characterId: string,
  story: Story,
  chatHistories: Record<string, ChatMessage[]>,
  freeTextAttempts: FreeTextAttempt[],
  maxChars = 2000,
): string {
  const sections: string[] = [];
  let budget = maxChars;

  if (freeTextAttempts.length > 0) {
    const lines = freeTextAttempts.map(a =>
      `  • "${a.prompt.slice(0, 60)}" → "${a.response.slice(0, 80)}" ${a.success ? '✓' : '✗'}`,
    );
    const block = `Player's exercise responses this session:\n${lines.join('\n')}`;
    if (block.length <= budget) {
      sections.push(block);
      budget -= block.length;
    }
  }

  for (const [charId, msgs] of Object.entries(chatHistories)) {
    if (budget <= 0) break;
    if (charId === characterId || msgs.length === 0) continue;
    const char = story.characters?.find(c => c.id === charId);
    const name = char?.name ?? charId;
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
