# Loom

An interactive fiction reader and editor. Write branching stories in YAML, assign AI voices, generate audio, and read them in a cinematic player — all from a local web app.

---

## Prerequisites

- **Node.js 18 or later** — download from [nodejs.org](https://nodejs.org). During installation, make sure "Add to PATH" is checked.
- **npm** — included with Node.js, no separate install needed.

To verify your installation open **Command Prompt** or **PowerShell** and run:

```
node --version
npm --version
```

Both commands should print a version number.

---

## Installation

1. Open **PowerShell** and navigate to the project folder:

   ```powershell
   cd "C:\path\to\Loom"
   ```

2. Install dependencies:

   ```powershell
   npm install
   ```

   This installs everything listed in `package.json` — React, Express, Vite, Tailwind, and all supporting libraries. It only needs to be run once (or again after pulling changes that update `package.json`).

---

## Starting the app

```powershell
npm run dev
```

This starts two processes simultaneously:

| Process | Address | Purpose |
|---|---|---|
| API server | `http://localhost:3001` | Reads/writes YAML books, proxies ElevenLabs TTS, handles image uploads |
| Vite dev server | `http://localhost:5173` | Serves the React UI with hot module reload |

Open **http://localhost:5173** in your browser. Both processes must be running — keep the terminal window open while you use the app.

To stop, press `Ctrl + C` in the terminal.

---

## App overview

### Library (`/library`)

Lists all `.yaml` / `.yml` story files found in the `books/` folder at the root of the project. Each card shows the book's cover image, title, author, and description pulled from its `metadata` block. Click a card to read the story, or click the edit icon to open the editor.

### Reader (`/read/:bookId`)

The cinematic story player. Dialogue appears in a bottom bar over a full-screen background image. The reader:

- Plays generated audio automatically when a node has a voice file, then advances to the next node when the audio ends.
- Shows a **Pause** button while audio is playing and a **Resume** button when paused.
- Shows a **Skip →** arrow to advance manually at any time.
- Renders choice panels, free-text input boxes, and character chat interfaces as the story branches.

The `×` button in the top-right exits back to wherever you came from (Library, Script Editor, or Audio Generation).

### Edit hub (`/edit/:bookId`)

Gateway to the three editing tools for a book.

---

### Script Editor (`/edit/:bookId/script`)

A full in-browser editor for the story's YAML structure. No need to touch the YAML file directly.

**What you can do:**

- **Expand a scene** by clicking its header to see all its nodes.
- **Edit a node** — click the pencil icon on any node row to open an inline form. You can change the node ID, type, character, text, branching targets, and more. Autocomplete dropdowns help you wire `next` references to existing node IDs.
- **Delete a node** — click the trash icon (requires one confirmation click).
- **Add a node** to a scene — use the "+ Add node" button at the bottom of any expanded scene. The ID is pre-filled as `sceneId_N` to help with naming.
- **Set a background image** for a scene or an individual node — each expanded scene has a "Scene background" row, and each node edit form has a "Background override" section. Click **Upload** to pick an image from disk; it is saved under `books/<bookId>/` and the path is stored in the YAML automatically.
- **Add a scene** — the "+ Add scene" panel at the bottom of the page.
- **Delete a scene** — the trash icon in the scene header (requires confirmation).
- **Preview from any scene** — the play button (▶) in a scene header opens the Reader at that scene's first node.

Click **Save** in the header to write all changes back to the YAML file on disk. An "Unsaved" indicator appears whenever there are pending changes.

---

### Voice Cast (`/edit/:bookId/voices`)

Assign ElevenLabs voices to characters. Requires an ElevenLabs API key set on the Settings page.

- All characters declared in the story (including `narrator` if used) appear as rows.
- For each character, select a voice from the dropdown and click **Test** to hear a short sample clip.
- Assignments are saved to `voice-config.json` at the project root and used automatically by the Audio Generation page.

---

### Audio Generation (`/edit/:bookId/audio`)

Batch-generates MP3 voice files for every `dialogue` node that has a character with a voice assignment.

- Nodes that already have a generated file are shown in teal. You can still select and re-generate them (useful after editing the dialogue text).
- Select individual nodes or use the scene checkboxes to select all nodes in a scene.
- Click **Generate selected** to call ElevenLabs TTS for each selected node.
- Generated files are saved to `audio/<bookId>/<nodeId>.mp3` and the paths are recorded in `audio-config.json`.
- The **Preview ▶** button on each scene header opens the Reader at that scene so you can hear the results in context.

---

### Settings (`/settings`)

Configure API keys. All keys are stored in your browser's `localStorage` — they are never sent to any server other than the relevant provider's own API.

| Setting | Used for |
|---|---|
| LLM provider (OpenAI / Gemini) + API key | Evaluating `free_text` node answers and powering `chat` node conversations |
| ElevenLabs API key | Listing voices, testing voice clips, and generating audio |

---

## Adding a new book

1. Create a `.yaml` file in the `books/` folder at the project root. The filename (without extension) becomes the book ID used in all URLs.
2. Give it at minimum a `metadata` block with `title`, `author`, and `version`, a `scenes` list with one scene marked `start: true`, and one scene marked `end: true`.
3. Refresh the Library page — the new book appears automatically.

### Minimal valid story

```yaml
metadata:
  title: "My First Story"
  author: "Your Name"
  version: "0.1"
  description: "A short test story."

characters:
  - id: alex
    name: "Alex"

scenes:
  - id: intro
    title: "Introduction"
    start: true
    nodes:
      - id: intro_1
        type: dialogue
        character: narrator
        text: "Once upon a time…"
        next: intro_2
      - id: intro_2
        type: dialogue
        character: alex
        text: "Hello, world."
        next: the_end

  - id: the_end
    title: "The End"
    end: true
    nodes:
      - id: end_1
        type: dialogue
        character: narrator
        text: "And that was that."
```

For the full story format reference — all node types, branching rules, AI integration fields, and asset conventions — see [`storyformat-spec.md`](storyformat-spec.md).

---

## Project structure

```
Loom/
├── books/                  # Story YAML files (one file = one book)
│   └── <bookId>/           # Per-book uploaded images (auto-created)
├── audio/                  # Generated voice MP3s (auto-created)
│   └── <bookId>/
├── voice-tests/            # Voice preview clips (auto-created)
├── server/
│   └── index.cjs           # Express API server
├── src/                    # React + TypeScript frontend
│   ├── pages/
│   ├── components/
│   ├── context/
│   └── types/
├── audio-config.json       # Maps bookId::nodeId → audio file path
├── voice-config.json       # Maps bookId::characterId → ElevenLabs voice
├── package.json
└── storyformat-spec.md     # Full YAML story format specification
```

The `audio/`, `voice-tests/`, and per-book image subfolders inside `books/` are created automatically the first time they are needed.

---

## Troubleshooting

**Port already in use** — if `:3001` or `:5173` is taken by another process, stop that process first or change the port in `server/index.cjs` (line `const PORT = 3001`) and `vite.config.ts`.

**Books folder not found** — the `books/` directory is created automatically on first server start. If it still does not appear, check that the terminal is in the correct project directory before running `npm run dev`.

**ElevenLabs voices not loading** — confirm the API key is entered correctly on the Settings page and that your ElevenLabs account has an active subscription or free quota remaining.

**Audio does not play in the reader** — check that the book has been through Audio Generation and that `audio-config.json` contains entries for the book. The reader only auto-plays nodes that have a generated file listed in that config.
