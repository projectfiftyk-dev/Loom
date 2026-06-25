import type { Story, DialogueNode, ChatMessage, FreeTextAttempt } from '../types/story';
import type { CharacterInfo } from '../data/characters';
import { buildRecallContext } from './sessionContext';

export function buildSystemPrompt(
  character: CharacterInfo,
  story: Story,
  chatHistories: Record<string, ChatMessage[]>,
  freeTextAttempts: FreeTextAttempt[],
): string {
  let prompt = character.personality;

  // Inject first 20 dialogue lines as story context
  const lines = story.scenes
    .flatMap(s => s.nodes)
    .filter(n => n.type === 'dialogue')
    .slice(0, 20)
    .map(n => {
      const dn = n as DialogueNode;
      const charName = typeof dn.character === 'string' ? dn.character : (dn.character as any).name;
      return `${charName}: "${dn.text}"`;
    })
    .join('\n');

  if (lines) {
    prompt += `\n\nStory context so far:\n${lines}`;
  }

  if (character.recall_history) {
    // Build a character stub for recall context
    const charStub = {
      id: character.id,
      name: character.name,
      recall_history: true,
    };
    const recall = buildRecallContext(
      character.id,
      story,
      chatHistories,
      freeTextAttempts,
    );
    if (recall) {
      prompt += `\n\n${recall}`;
    }
  }

  return prompt;
}
