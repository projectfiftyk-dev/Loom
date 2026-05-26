export interface StoryMetadata {
  title: string;
  author: string;
  version: string;
  language?: string;
  cover_image?: string;
  description?: string;
  tags?: string[];
}

export interface StorySettings {
  ai_model?: string;
  default_voice?: string;
  allow_chat_rewind?: boolean;
  max_free_text_attempts?: number;
}

export interface Character {
  id: string;
  name: string;
  avatar?: string | null;
  voice?: string;
  personality?: string | null;
}

export interface ChoiceOption {
  label: string;
  next: string;
  correct?: boolean;
}

export interface DialogueNode {
  id: string;
  type: 'dialogue';
  character: string | Character;
  text: string;
  audio?: string;
  next?: string;
}

export interface ChoiceNode {
  id: string;
  type: 'choice';
  prompt: string;
  options: ChoiceOption[];
}

export interface FreeTextNode {
  id: string;
  type: 'free_text';
  prompt: string;
  goal: string;
  on_success: string;
  on_fail: string;
  hint?: string;
  max_attempts?: number;
  on_exhausted?: string;
}

export interface ChatNode {
  id: string;
  type: 'chat';
  character: string;
  context_up_to: string;
  next?: string;
  entry_line?: string;
  standalone?: boolean;
}

export type StoryNode = DialogueNode | ChoiceNode | FreeTextNode | ChatNode;

export interface Scene {
  id: string;
  title: string;
  start?: boolean;
  end?: boolean;
  background?: string;
  music?: string;
  nodes: StoryNode[];
}

export interface StandaloneChat {
  character: string;
  unlock_after: string;
}

export interface Story {
  metadata: StoryMetadata;
  settings?: StorySettings;
  characters?: Character[];
  scenes: Scene[];
  standalone_chats?: StandaloneChat[];
}

export interface BookMeta {
  id: string;
  filename: string;
  title: string;
  author: string;
  description: string;
  cover_image: string | null;
  tags: string[];
  language: string;
  version: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
