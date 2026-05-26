# StoryFormat YAML — Full Specification
**Version 0.2 · MVP**

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Structure](#2-file-structure)
3. [Top-Level Keys](#3-top-level-keys)
4. [metadata](#4-metadata)
5. [settings](#5-settings)
6. [characters](#6-characters)
7. [scenes](#7-scenes)
8. [Node Types](#8-node-types)
   - 8.1 [dialogue](#81-dialogue)
   - 8.2 [choice](#82-choice)
   - 8.3 [free_text](#83-free_text)
   - 8.4 [chat](#84-chat)
9. [Flow Control](#9-flow-control)
10. [standalone_chats](#10-standalone_chats)
11. [Assets](#11-assets)
12. [Character Memory Model](#12-character-memory-model)
13. [Multi-File Layout (Optional)](#13-multi-file-layout-optional)
14. [AI Integration Points](#14-ai-integration-points)
15. [Validation Rules](#15-validation-rules)
16. [Full Annotated Example](#16-full-annotated-example)
17. [Changelog](#17-changelog)

---

## 1. Overview

**StoryFormat** is a YAML-based file format for defining audiovisual interactive stories. It is designed as an MVP that can be extended over time, inspired by the scene/label/jump model of Ren'Py.

### Core concepts

| Concept | Description |
|---|---|
| **Story** | One `.yaml` file (or a set of files) describing the entire narrative |
| **Scene** | A chapter or segment of the story, containing an ordered list of nodes |
| **Node** | The smallest narrative unit: a line of dialogue, a choice, a prompt, or a chat trigger |
| **Character** | A named entity that speaks, is chatted with, and carries AI personality |
| **Branch** | A fork in the story caused by a choice node; each option points to a different next target |
| **Flow** | The path through scenes and nodes, determined by `next` and `start`/`end` markers |

### Design principles

- **Single-file first.** An entire story lives in one `.yaml` file. Multi-file support is optional and additive.
- **Explicit flow.** Every node declares where the story goes next. There is no implicit "proceed to the next node in the file" — `next` is always required unless the node is in a terminal scene.
- **AI-ready.** Character personality, free-text goal evaluation, and memory boundaries are first-class fields, not afterthoughts.
- **Extensible.** All fields not listed as required are optional. Unknown fields must be ignored by the runtime (forward-compatibility).

---

## 2. File Structure

A valid StoryFormat file is a YAML 1.2 document with the following top-level shape:

```
story.yaml
├── metadata          (required)
├── settings          (optional)
├── characters        (optional — can also be defined inline per scene)
├── scenes            (required)
└── standalone_chats  (optional)
```

**Encoding:** UTF-8.  
**Extension:** `.yaml` (preferred) or `.yml`.  
**YAML version:** 1.2.  
**Multiline strings:** Use YAML block scalars (`>` folded or `|` literal) for any text longer than one sentence.

---

## 3. Top-Level Keys

| Key | Type | Required | Description |
|---|---|---|---|
| `metadata` | object | **yes** | Story identity and publishing info |
| `settings` | object | no | Runtime and AI configuration |
| `characters` | list | no | Global character definitions |
| `scenes` | list | **yes** | Ordered list of scene objects |
| `standalone_chats` | list | no | Characters available for free conversation outside the story flow |

---

## 4. metadata

Human-readable identity and publishing information for the story. Used in the app's library view, credits screen, and for versioning.

```yaml
metadata:
  title: "The Lighthouse Secret"
  author: "Jane Doe"
  version: "0.1"
  language: "en"
  cover_image: "assets/cover.jpg"
  description: >
    A mystery set on a remote island. Uncover the truth behind a
    century-old shipwreck.
  tags:
    - mystery
    - historical
```

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | **yes** | Display title of the story |
| `author` | string | **yes** | Author name(s), comma-separated if multiple |
| `version` | string | **yes** | Semantic version string (e.g. `"1.0"`, `"0.3-beta"`) |
| `language` | string | no | BCP 47 language tag (e.g. `"en"`, `"pt-BR"`). Defaults to `"en"` |
| `cover_image` | string | no | Relative path to cover image asset |
| `description` | string | no | Short synopsis shown in the library |
| `tags` | list of strings | no | Freeform tags for filtering and discovery |

---

## 5. settings

Global runtime and AI configuration. All fields are optional; the runtime uses defaults when absent.

```yaml
settings:
  ai_model: "claude-sonnet-4-20250514"
  default_voice: "neutral"
  allow_chat_rewind: false
  max_free_text_attempts: 3
```

### Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `ai_model` | string | runtime default | AI model identifier used for `free_text` evaluation and `chat` nodes |
| `default_voice` | string | `"neutral"` | Fallback TTS voice key when a character has no `voice` set |
| `allow_chat_rewind` | boolean | `false` | If `false`, chat history cannot be erased mid-story; only a full restart clears it |
| `max_free_text_attempts` | integer | `3` | Global default for how many times a player may attempt a `free_text` node before the `on_exhausted` fallback fires |

---

## 6. characters

A list of character objects defined globally and reusable across all scenes by their `id`. Characters can alternatively be defined inline inside a scene node (see [section 8.1](#81-dialogue)); inline definitions take precedence over global ones if the same `id` appears in both.

```yaml
characters:
  - id: elara
    name: "Elara Voss"
    avatar: "assets/elara.png"
    voice: "warm_female"
    personality: >
      You are Elara, a retired lighthouse keeper. You speak slowly and
      choose words carefully. You know a secret about the night the ship
      sank but will not reveal it unless truly pressed. You remember
      everything the player has told you or shown you so far.
```

### Character object fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | **yes** | Unique identifier. Used in `character:` fields throughout scenes. The special value `narrator` is built-in and requires no definition |
| `name` | string | **yes** | Display name shown in the UI |
| `avatar` | string | no | Relative path to character portrait image |
| `voice` | string | no | TTS voice key for this character. Falls back to `settings.default_voice` |
| `personality` | string | no | System-prompt fragment used when this character appears in a `chat` node. If absent, the character cannot be used in `chat` nodes |

### Built-in characters

| id | Description |
|---|---|
| `narrator` | The story's narrative voice. No avatar, no voice, no personality required. Always available. |

---

## 7. scenes

The `scenes` key is a YAML list. The runtime processes each scene in list order for authoring clarity, but actual playback order is determined by `next` references and `start`/`end` markers — not by position in the list.

```yaml
scenes:
  - id: scene_01
    title: "Arrival at the Lighthouse"
    start: true
    background: "assets/bg_lighthouse.jpg"
    music: "assets/ambient_sea.mp3"
    nodes:
      - ...
```

### Scene object fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | **yes** | Unique scene identifier. Used as a `next` target to jump between scenes |
| `title` | string | **yes** | Display title shown as a chapter heading |
| `start` | boolean | no | Marks this scene as the story's entry point. **Exactly one scene must carry `start: true`** |
| `end` | boolean | no | Marks this scene as a terminal (ending). Multiple terminal scenes are allowed, enabling multiple endings |
| `background` | string | no | Relative path to background image displayed during this scene |
| `music` | string | no | Relative path to background music audio track for this scene |
| `nodes` | list | **yes** | Ordered list of node objects (see section 8) |

### Scene flow rules

- The runtime enters a scene at its **first node** in the `nodes` list.
- Nodes execute top-to-bottom following `next` references.
- A `next` value that matches a **scene id** causes the runtime to jump to the first node of that scene.
- A `next` value that matches a **node id** within the current or any scene jumps directly to that node.
- A scene marked `end: true` needs no `next` on its final node. If a `next` is present on the last node of a terminal scene, it is ignored.

---

## 8. Node Types

Every node is an object inside a scene's `nodes` list. All nodes share two required fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | **yes** | Unique node identifier across the entire story |
| `type` | string | **yes** | One of: `dialogue`, `choice`, `free_text`, `chat` |

Node ids must be unique **globally** (not just within a scene), because `next` references can cross scene boundaries.

---

### 8.1 dialogue

The foundational node type. Displays a line of text attributed to a character, then proceeds to the next node.

```yaml
- id: n01_greets
  type: dialogue
  character: elara
  text: "You're the journalist? I expected someone older."
  audio: "/absolute/path/to/audio/elara_greets.mp3"
  next: n01_choice_reply
```

#### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `character` | string or object | **yes** | Either a character `id` string (references global or inline character), or an inline character object (see below) |
| `text` | string | **yes** | The line of dialogue or narration to display |
| `audio` | string | no | Absolute path to an audio file played when this dialogue line is displayed. See [section 11](#11-assets) for format notes and the MVP absolute-path convention |
| `next` | string | **yes** (unless in terminal scene) | Id of the next node or scene |

#### Audio playback behaviour

When `audio` is present the runtime plays the file as the dialogue line appears on screen. The runtime should:

- Start playback at the moment the dialogue text is displayed.
- Allow the player to advance to the next node before the audio finishes (audio cuts off).
- Not block story progression waiting for audio to complete, unless the runtime implements an explicit `wait_for_audio: true` flag (not part of v0.2, reserved for a future version).

When `audio` is absent the node is silent; any scene-level `music` track continues uninterrupted.

#### Inline character definition

When a character appears only once or in a single scene, it may be defined inline rather than in the global `characters` list:

```yaml
- id: n02_ghost
  type: dialogue
  character:
    id: ghost_inline
    name: "A Voice"
    avatar: null
    voice: "whisper"
    personality: null
  text: "…check behind the painting…"
  audio: "/absolute/path/to/audio/ghost_whisper.mp3"
  next: n02_painting_choice
```

An inline character object follows the same schema as global character objects (see section 6). Setting `personality: null` means the character cannot be used in `chat` nodes.

---

### 8.2 choice

Presents the player with up to four labelled options. Each option points to a different `next` target, creating a branch in the story. Options may optionally be marked as correct or incorrect for quiz-style sequences.

```yaml
- id: n01_choice_reply
  type: choice
  prompt: "How do you respond?"
  options:
    - label: "I'm full of surprises."
      next: n01_elara_laugh
    - label: "I just need answers about the wreck."
      next: n01_elara_cold
    - label: "Sorry to disappoint."
      next: n01_elara_laugh
    - label: "[Stay silent]"
      next: n01_elara_cold
```

#### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | **yes** | The question or situation label shown above the options |
| `options` | list | **yes** | List of option objects. Minimum 2, maximum 4 |

#### Option object fields

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | string | **yes** | Display text for this option. Keep short (one sentence or less) |
| `next` | string | **yes** | Node or scene id to jump to when this option is selected |
| `correct` | boolean | no | Optional correctness flag. `true` = right answer, `false` = wrong answer. When absent, the option is treated as neutral (no right/wrong). The runtime may use this for scoring or feedback UI, but it does not affect flow — `next` always determines where the story goes |

#### Constraints

- Options are displayed in list order.
- Minimum 2 options, maximum 4 options per `choice` node.
- A `choice` node has no top-level `next` field; flow is determined entirely by the selected option's `next`.

---

### 8.3 free_text

Prompts the player to type a free-form response. The runtime submits the player's input to the AI model along with the `goal` description; the AI determines whether the goal was reached. Supports retry loops and a fallback after a maximum number of failed attempts.

```yaml
- id: n02_free_text_deduction
  type: free_text
  prompt: "What do the ledger entries tell you?"
  hint: "Look at the dates and cargo weights."
  goal: >
    The player should conclude that the cargo was secretly doubled the night
    before the wreck, implying the ship was overloaded on purpose.
  on_success: n02_deduction_confirmed
  on_fail: n02_deduction_retry
  max_attempts: 3
  on_exhausted: n02_elara_hint
```

#### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | **yes** | The question or challenge shown to the player above the text input |
| `goal` | string | **yes** | Natural-language description of what the player's answer must demonstrate. Sent to the AI as the evaluation criterion |
| `on_success` | string | **yes** | Node or scene id to jump to when the AI determines the goal was reached |
| `on_fail` | string | **yes** | Node or scene id to jump to when the AI determines the goal was not reached and attempts remain |
| `hint` | string | no | A hint shown below the input field (always visible, or shown after the first failed attempt — runtime decision) |
| `max_attempts` | integer | no | Maximum number of attempts before `on_exhausted` fires. Defaults to `settings.max_free_text_attempts` |
| `on_exhausted` | string | no | Node or scene id to jump to after all attempts are used without success. If absent and attempts are exhausted, the runtime falls back to `on_success` and continues the story (graceful degradation) |

#### AI evaluation behaviour

The runtime constructs an evaluation prompt roughly of the form:

> *"The player was asked: [prompt]. The correct answer should demonstrate: [goal]. The player responded: [player input]. Did the player's response adequately meet the goal? Answer yes or no, and briefly explain."*

The exact prompt is a runtime implementation detail and may be tuned. The `goal` field should be written as a plain-language description that is clear to an AI evaluator.

---

### 8.4 chat

Opens a conversational interface between the player and a character. The character's AI prompt is built from their `personality` field combined with a context window of everything the player has seen up to the `context_up_to` node. Chat history from previous `chat` nodes with the same character is also included (unless the player has done a full restart).

```yaml
- id: n02_chat_unlock
  type: chat
  character: elara
  context_up_to: n02_chat_unlock
  entry_line: "You look like you've figured something out."
  standalone: false
  next: scene_03
```

#### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `character` | string | **yes** | Character `id`. The character must have a `personality` field defined |
| `context_up_to` | string | **yes** | Node id that marks the memory boundary. The AI will only know about story events that occurred at or before this node |
| `next` | string | **yes** (unless in terminal scene) | Node or scene id to proceed to after the player closes the chat |
| `entry_line` | string | no | An opening line the character says when the chat interface opens. If absent, the chat opens with no initial message |
| `standalone` | boolean | no | If `true`, this character is also listed in the standalone chat panel after this node is reached (see section 10). Defaults to `false` |

#### Memory model summary

See [section 12](#12-character-memory-model) for the full memory model. In brief:

- The character knows all dialogue, narration, and choice outcomes the player has seen up to `context_up_to`.
- The character remembers all prior turns in `chat` nodes with the same character.
- The character does **not** know about scenes or nodes the player has not yet visited.
- Chat history is never erased mid-story (unless `settings.allow_chat_rewind: true` and the player explicitly initiates a full restart).

---

## 9. Flow Control

### next targets

The `next` field on any node accepts either a **scene id** or a **node id**:

| Target type | Behaviour |
|---|---|
| Scene id | Jump to the first node of that scene |
| Node id | Jump directly to that node (may be in the current scene or any other scene) |

There is no implicit fall-through. If a node has no `next` and is not in a terminal scene, the runtime should raise a validation error.

### start and end

| Marker | Rule |
|---|---|
| `start: true` | Exactly one scene must carry this. It is the entry point when the story is first launched or restarted. |
| `end: true` | Any number of scenes may carry this. A terminal scene's last node does not require a `next` field. |

### Retry loops

A node's `next` may point back to itself or to an earlier node, creating a retry loop. This is the standard pattern for `choice` nodes that need re-attempting and for `free_text` nodes via the `on_fail` field. Loop depth is not limited by the format; the runtime may enforce a safety limit.

### Cross-scene node jumps

A `next` value pointing to a node id in a different scene is valid. The runtime should treat this as entering that scene at that specific node, **not** at the scene's first node. Scene-level assets (background, music) should still be applied when entering a scene mid-flow.

---

## 10. standalone_chats

Defines which characters are available for free conversation in a dedicated chat panel, outside the story's linear flow. This is separate from `chat` nodes embedded in scenes.

```yaml
standalone_chats:
  - character: elara
    unlock_after: scene_01
  - character: captain_dorn
    unlock_after: scene_03
```

### standalone_chat object fields

| Field | Type | Required | Description |
|---|---|---|---|
| `character` | string | **yes** | Character `id`. Must have a `personality` defined |
| `unlock_after` | string | **yes** | Scene id. The character becomes available in the standalone panel only after the player has completed this scene |

### Memory in standalone chats

The character's memory in a standalone chat follows the same model as embedded `chat` nodes:

- Context = all scenes completed by the player at the time of the conversation.
- Prior standalone chat turns with this character are included.
- No cross-character memory leakage.

---

## 11. Assets

### Path conventions

The format supports two path conventions depending on context:

| Context | Convention | Example |
|---|---|---|
| Scene-level assets (`background`, `music`) | Relative to the story file | `"assets/backgrounds/lighthouse.jpg"` |
| Node-level `audio` on `dialogue` nodes | **Absolute path** (MVP convention) | `"/Users/jane/project/audio/elara_greets.mp3"` |

The absolute path convention for `audio` is an intentional simplification for the MVP Showcase. It allows voice-over and sound effect files to be referenced directly from anywhere on disk without needing to bundle or co-locate them with the story file. A future version may introduce a unified relative-path or asset-manifest system.

### Recommended directory layout

```
my_story/
├── story.yaml
└── assets/
    ├── cover.jpg
    ├── backgrounds/
    │   ├── lighthouse_day.jpg
    │   └── study.jpg
    ├── characters/
    │   ├── elara.png
    │   └── captain_dorn.png
    ├── music/
    │   └── ambient_sea.mp3
    └── sfx/
        └── door_creak.mp3
```

Node-level audio files may live anywhere on disk; placing them under an `audio/` or `vo/` (voice-over) subdirectory alongside the story file is recommended for portability even though the format requires absolute paths at v0.2.

### Supported asset fields

| Context | Field | Path type | Notes |
|---|---|---|---|
| `metadata` | `cover_image` | relative | Story library cover |
| `scene` | `background` | relative | Full-screen or windowed background image |
| `scene` | `music` | relative | Looping background audio track |
| `character` | `avatar` | relative | Character portrait, any aspect ratio |
| `dialogue` node | `audio` | **absolute** | Audio clip played when the line is displayed |

Asset format support is runtime-dependent. Safe choices are JPEG/PNG for images and MP3/OGG/WAV for audio.

---

## 12. Character Memory Model

Understanding character memory is critical for authoring consistent `chat` and `free_text` nodes.

### What a character knows

When a `chat` node opens (or a `free_text` evaluation is made), the runtime constructs a context payload containing:

1. **The character's `personality` prompt** — always included.
2. **Story context up to `context_up_to`** — a serialised transcript of all dialogue lines, narration, choice prompts, and selected option labels that the player has encountered up to and including the `context_up_to` node.
3. **Prior chat history** — all previous turns the player has had in `chat` nodes or standalone chats with this same character, in chronological order.

### What a character does NOT know

- Events from nodes or scenes the player has not yet visited.
- The internal state of other characters' memory.
- Choices the player made that were not yet shown to them (i.e. branching logic is transparent, but only the path taken is in context).
- Free-text inputs from `free_text` nodes are **not** automatically included in character memory unless the runtime explicitly adds them (a runtime implementation decision, not mandated by the format).

### Memory persistence

- Chat history persists across sessions (saved to the runtime's local store).
- A full story restart wipes all chat history and progress.
- `settings.allow_chat_rewind: false` (default) means the player cannot selectively erase a character's memory without a full restart.

### context_up_to authoring guidance

Place `context_up_to` at the **current chat node's own id** when you want the character to know everything up to and including the current moment. Set it to an earlier node id to restrict knowledge (e.g. a character who hasn't witnessed a discovery yet).

---

## 13. Multi-File Layout (Optional)

For large stories, the `characters` and `scenes` lists may be split across multiple files using YAML merge keys or a custom `include` directive. The format defines a convention but does not require runtime support at v0.1.

### Convention

A root file (`story.yaml`) may reference external files:

```yaml
# story.yaml
metadata:
  title: "The Lighthouse Secret"

characters: !include characters.yaml
scenes:
  - !include scenes/act_01.yaml
  - !include scenes/act_02.yaml

standalone_chats: !include standalone_chats.yaml
```

The `!include` tag is a custom YAML tag; its implementation is runtime-specific. The included file must contain a valid YAML value of the expected type (a list for `characters` and `standalone_chats`, a single scene object for a scene include).

### Character deduplication

When multiple files are loaded, characters are merged by `id`. If the same `id` appears in more than one file, the last definition loaded wins (explicit override). The runtime should log a warning for duplicate ids.

---

## 14. AI Integration Points

The format has three AI integration points. All require the `settings.ai_model` field to be set (or a runtime default to be configured).

### 14.1 free_text evaluation

**Trigger:** When a player submits input in a `free_text` node.

**Runtime responsibility:** Build an evaluation prompt using the node's `prompt`, `goal`, and the player's input. Call the AI model. Parse the binary yes/no outcome and route to `on_success` or `on_fail`.

**Suggested system prompt template:**

```
You are an evaluation assistant for an interactive story.
The player was asked: "{node.prompt}"
The answer should demonstrate: "{node.goal}"
The player responded: "{player_input}"

Respond with a JSON object: { "success": true|false, "reason": "brief explanation" }
Do not add any other text.
```

### 14.2 in-story chat

**Trigger:** When a player opens a `chat` node.

**Runtime responsibility:** Build the character's system prompt from `personality` + serialised story context up to `context_up_to`. Include prior chat history as conversation turns. Stream responses back to the player. Append each turn to the persisted chat history.

**Suggested system prompt structure:**

```
{character.personality}

--- Story context (what has happened so far) ---
{serialised_story_context}

--- Previous conversations with this character ---
{prior_chat_history}

Respond in character. Do not break the fourth wall.
Do not reveal story events the player has not yet seen.
```

### 14.3 standalone chat

Identical to in-story chat (14.2), but `context_up_to` is implicitly the last completed scene rather than a specific node.

---

## 15. Validation Rules

A conformant StoryFormat file must satisfy all of the following. A runtime may reject a file that violates any required rule.

### Required

| Rule | Description |
|---|---|
| R01 | Exactly one scene has `start: true` |
| R02 | At least one scene has `end: true` |
| R03 | All node `id` values are unique across the entire file |
| R04 | All scene `id` values are unique |
| R05 | All `next` values reference an existing scene id or node id |
| R06 | All `character` string references resolve to a defined character (global, inline, or the built-in `narrator`) |
| R07 | Every `choice` node has between 2 and 4 options |
| R08 | Every `free_text` node has both `on_success` and `on_fail` |
| R09 | Every `chat` node references a character that has a non-null `personality` |
| R10 | The `context_up_to` field on a `chat` node references a valid node id |
| R11 | No node in a non-terminal scene is missing a `next` field (except the last node of a scene that jumps via scene-level `next` — not applicable in v0.1) |

### Warnings (non-blocking)

| Rule | Description |
|---|---|
| W01 | A character is defined but never referenced in any node |
| W02 | A scene is defined but unreachable from the `start` scene via any path |
| W03 | A `free_text` node has no `on_exhausted` fallback (graceful degradation applies) |
| W04 | Duplicate character ids across included files (last definition wins) |
| W05 | An `end: true` scene has a `next` on its last node (the `next` is ignored) |
| W06 | A `dialogue` node has an `audio` field whose path does not exist on disk at load time |

---

## 16. Full Annotated Example

Below is a complete, minimal but valid story file demonstrating all node types.

```yaml
# ─────────────────────────────────────────────────────────────────
#  The Lighthouse Secret — story.yaml
#  StoryFormat v0.1
# ─────────────────────────────────────────────────────────────────

metadata:
  title: "The Lighthouse Secret"
  author: "Jane Doe"
  version: "0.1"
  language: "en"
  cover_image: "assets/cover.jpg"
  description: >
    A mystery set on a remote island. Uncover the truth behind a
    century-old shipwreck.

settings:
  ai_model: "claude-sonnet-4-20250514"
  default_voice: "neutral"
  allow_chat_rewind: false
  max_free_text_attempts: 3

characters:
  - id: elara
    name: "Elara Voss"
    avatar: "assets/characters/elara.png"
    voice: "warm_female"
    personality: >
      You are Elara, a retired lighthouse keeper. You speak slowly and choose
      words carefully. You know a secret about the night the ship sank but
      will not reveal it unless truly pressed. You remember everything the
      player has told you or shown you so far.

  - id: captain_dorn
    name: "Captain Dorn"
    avatar: "assets/characters/dorn.png"
    voice: "gruff_male"
    personality: >
      You are Captain Dorn, suspicious of outsiders. Gruff, short answers.
      You will not discuss the cargo unless the player already found the ledger.

scenes:

  # ── ACT 1 ────────────────────────────────────────────────────
  - id: scene_01
    title: "Arrival at the Lighthouse"
    start: true
    background: "assets/backgrounds/lighthouse_day.jpg"
    music: "assets/music/ambient_sea.mp3"
    nodes:

      - id: n01_intro
        type: dialogue
        character: narrator
        text: >
          The ferry drops you on the rocky shore. Above you, the old lighthouse
          looms against a grey sky.
        audio: "/absolute/path/to/audio/n01_intro_narration.mp3"
        next: n01_elara_greets

      - id: n01_elara_greets
        type: dialogue
        character: elara
        text: "You're the journalist? I expected someone older."
        audio: "/absolute/path/to/audio/n01_elara_greets.mp3"
        next: n01_choice_reply

      # choice node — 4 options, no correct/incorrect markers (narrative branch)
      - id: n01_choice_reply
        type: choice
        prompt: "How do you respond?"
        options:
          - label: "I'm full of surprises."
            next: n01_elara_laugh
          - label: "I just need answers about the wreck."
            next: n01_elara_cold
          - label: "Sorry to disappoint."
            next: n01_elara_laugh
          - label: "[Stay silent]"
            next: n01_elara_cold

      - id: n01_elara_laugh
        type: dialogue
        character: elara
        text: "Ha. Come in, then."
        audio: "/absolute/path/to/audio/n01_elara_laugh.mp3"
        next: scene_02

      - id: n01_elara_cold
        type: dialogue
        character: elara
        text: "Hmm. Follow me."
        audio: "/absolute/path/to/audio/n01_elara_cold.mp3"
        next: scene_02

  # ── ACT 2 ────────────────────────────────────────────────────
  - id: scene_02
    title: "The Keeper's Study"
    background: "assets/backgrounds/study.jpg"
    nodes:

      # inline character — only appears in this one node
      - id: n02_ghost_whisper
        type: dialogue
        character:
          id: ghost_inline
          name: "A Voice"
          avatar: null
          voice: "whisper"
          personality: null
        text: "…check behind the painting…"
        audio: "/absolute/path/to/audio/n02_ghost_whisper.mp3"
        next: n02_painting_choice

      # graded choice — one option marked correct
      - id: n02_painting_choice
        type: choice
        prompt: "You see three paintings. Which do you inspect?"
        options:
          - label: "The seascape with the red boat."
            correct: true
            next: n02_found_ledger
          - label: "The portrait of a stern admiral."
            correct: false
            next: n02_wrong_painting
          - label: "The abstract swirl of colours."
            correct: false
            next: n02_wrong_painting
          - label: "None — leave the room."
            next: scene_03_skip

      - id: n02_found_ledger
        type: dialogue
        character: narrator
        text: "Behind the seascape, taped to the wall: a water-stained ledger."
        next: n02_free_text_deduction

      - id: n02_wrong_painting
        type: dialogue
        character: narrator
        text: "Nothing unusual here."
        next: n02_painting_choice   # retry loop

      # free_text node — AI evaluates player's typed answer
      - id: n02_free_text_deduction
        type: free_text
        prompt: "What do the ledger entries tell you?"
        hint: "Look at the dates and cargo weights."
        goal: >
          The player should conclude that the cargo was secretly doubled the
          night before the wreck, implying the ship was overloaded on purpose.
        on_success: n02_deduction_confirmed
        on_fail: n02_deduction_retry
        max_attempts: 3
        on_exhausted: n02_elara_hint

      - id: n02_deduction_confirmed
        type: dialogue
        character: narrator
        text: "The pieces fall into place. Someone wanted that ship to sink."
        next: n02_chat_unlock

      - id: n02_deduction_retry
        type: dialogue
        character: narrator
        text: "You sense you're missing something. Try again."
        next: n02_free_text_deduction

      - id: n02_elara_hint
        type: dialogue
        character: elara
        text: "Look at the weight column on the last page, dear."
        next: n02_free_text_deduction

      # chat node — unlocked after the deduction
      - id: n02_chat_unlock
        type: chat
        character: elara
        context_up_to: n02_chat_unlock
        entry_line: "You look like you've figured something out."
        standalone: false
        next: scene_03

  # ── ACT 3 ────────────────────────────────────────────────────
  - id: scene_03
    title: "Confronting the Captain"
    background: "assets/backgrounds/dock.jpg"
    nodes:

      - id: n03_dorn_meet
        type: dialogue
        character: captain_dorn
        text: "What do you want?"
        next: n03_choice_approach

      - id: n03_choice_approach
        type: choice
        prompt: "How do you approach him?"
        options:
          - label: "Show him the ledger directly."
            next: n03_dorn_shocked
          - label: "Mention the doubled cargo subtly."
            next: n03_dorn_deflects
          - label: "Ask about the night of the wreck."
            next: n03_dorn_deflects

      - id: n03_dorn_shocked
        type: dialogue
        character: captain_dorn
        text: "Where did you get that…?"
        next: scene_04_truth

      - id: n03_dorn_deflects
        type: dialogue
        character: captain_dorn
        text: "I don't know what you're talking about. Leave."
        next: scene_04_coverup

  # ── ENDINGS ───────────────────────────────────────────────────
  - id: scene_04_truth
    title: "The Truth Surfaces"
    end: true
    nodes:
      - id: n04_end_a
        type: dialogue
        character: narrator
        text: "The captain breaks. The truth of the wreck finally comes to light."

  - id: scene_04_coverup
    title: "The Silence Holds"
    end: true
    nodes:
      - id: n04_end_b
        type: dialogue
        character: narrator
        text: "You leave empty-handed. Some secrets stay buried."

  - id: scene_03_skip
    title: "A Different Path"
    end: true
    nodes:
      - id: n03_skip_end
        type: dialogue
        character: narrator
        text: "You never found the ledger. The case goes cold."

# ── STANDALONE CHATS ─────────────────────────────────────────────
standalone_chats:
  - character: elara
    unlock_after: scene_01
  - character: captain_dorn
    unlock_after: scene_03
```

---

## 17. Changelog

| Version | Date | Notes |
|---|---|---|
| 0.2 | 2026-05-26 | Added `audio` field to `dialogue` nodes (absolute path, MVP convention). Updated Assets section with path-convention table. Added validation warning W06. |
| 0.1 | 2026-05-25 | Initial MVP specification. Covers dialogue, choice, free_text, chat, standalone_chats, single-file format, and AI integration points. |

---

*StoryFormat is an open internal specification. Contributions and extensions should be proposed as versioned amendments to this document.*
