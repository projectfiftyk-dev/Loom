const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const yaml = require('js-yaml');

const app = express();
app.use(cors());
app.use(express.json());

const BOOKS_DIR = path.join(__dirname, '..', 'books');
const VOICE_TESTS_DIR = path.join(__dirname, '..', 'voice-tests');
const AUDIO_DIR = path.join(__dirname, '..', 'audio');
const VOICE_CONFIG_FILE = path.join(__dirname, '..', 'voice-config.json');
const AUDIO_CONFIG_FILE = path.join(__dirname, '..', 'audio-config.json');

if (!fs.existsSync(BOOKS_DIR)) fs.mkdirSync(BOOKS_DIR, { recursive: true });
if (!fs.existsSync(VOICE_TESTS_DIR)) fs.mkdirSync(VOICE_TESTS_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Serve book assets (backgrounds, avatars, etc.) from the books folder
app.use('/book-assets', express.static(BOOKS_DIR));

// Serve generated voice test audio files
app.use('/voice-tests', express.static(VOICE_TESTS_DIR));

// Serve generated node audio files
app.use('/audio', express.static(AUDIO_DIR));

function readVoiceConfig() {
  try {
    if (fs.existsSync(VOICE_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(VOICE_CONFIG_FILE, 'utf8'));
    }
  } catch (e) {}
  return { voiceAssignments: {}, testedCombinations: {} };
}

function writeVoiceConfig(config) {
  fs.writeFileSync(VOICE_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// List all books
app.get('/api/books', (req, res) => {
  try {
    const files = fs.readdirSync(BOOKS_DIR)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    const books = files.map(file => {
      try {
        const content = fs.readFileSync(path.join(BOOKS_DIR, file), 'utf8');
        const story = yaml.load(content);
        return {
          id: file.replace(/\.ya?ml$/, ''),
          filename: file,
          title: story.metadata?.title || file,
          author: story.metadata?.author || 'Unknown',
          description: story.metadata?.description || '',
          cover_image: story.metadata?.cover_image || null,
          tags: story.metadata?.tags || [],
          language: story.metadata?.language || 'en',
          version: story.metadata?.version || '0.1',
          style: story.metadata?.style || 'dark',
        };
      } catch (e) {
        return {
          id: file.replace(/\.ya?ml$/, ''),
          filename: file,
          title: file,
          author: 'Unknown',
          description: '',
          cover_image: null,
          tags: [],
          language: 'en',
          version: '0.1',
          style: 'dark',
        };
      }
    });

    res.json(books);
  } catch (e) {
    res.json([]);
  }
});

// Get a specific book's raw YAML
app.get('/api/books/:id', (req, res) => {
  const { id } = req.params;
  const candidates = [
    path.join(BOOKS_DIR, `${id}.yaml`),
    path.join(BOOKS_DIR, `${id}.yml`),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(content);
    }
  }

  res.status(404).json({ error: 'Book not found' });
});

// LLM: free-text evaluation
app.post('/api/llm/evaluate', async (req, res) => {
  const { provider, prompt, goal, playerInput, apiKey } = req.body;

  if (!apiKey) {
    // Fallback: always succeed when no key provided (mock mode)
    return res.json({ success: true, reason: 'Mock mode: no API key provided, treating as success.' });
  }

  try {
    const systemMsg = 'You are an evaluation assistant for an interactive story. Respond ONLY with a JSON object with no markdown: {"success": true or false, "reason": "brief explanation"}';
    const userMsg = `The player was asked: "${prompt}"\nThe answer should demonstrate: "${goal}"\nThe player responded: "${playerInput}"\n\nDid the player adequately meet the goal?`;

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userMsg },
          ],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'OpenAI error');
      const text = data.choices?.[0]?.message?.content || '{"success":false,"reason":"No response"}';
      res.json(JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()));

    } else if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemMsg }] },
          contents: [{ role: 'user', parts: [{ text: userMsg }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Gemini error');
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      // Strip markdown fences if present, then try to extract a JSON object
      const stripped = raw.replace(/```json\n?|\n?```/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(stripped);
      } catch {
        const match = stripped.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : { success: false, reason: 'Could not evaluate — continuing anyway.' };
      }
      res.json(parsed);

    } else {
      res.status(400).json({ error: 'Unknown provider' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// LLM: character chat
app.post('/api/llm/chat', async (req, res) => {
  const { provider, messages, systemPrompt, apiKey } = req.body;

  if (!apiKey) {
    return res.json({ reply: '(Mock mode: no API key set. Configure one on the Settings page to enable live character chat.)' });
  }

  try {
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'OpenAI error');
      res.json({ reply: data.choices?.[0]?.message?.content || 'No response.' });

    } else if (provider === 'gemini') {
      // Map roles and strip leading model messages (Gemini requires conversations to start with 'user').
      // Entry lines from chat nodes arrive as role:'assistant' — fold them into the system prompt.
      const mapped = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const leadingModel = [];
      while (mapped.length > 0 && mapped[0].role === 'model') {
        leadingModel.push(mapped.shift().parts[0].text);
      }
      // Merge consecutive same-role messages (Gemini requires strict alternation).
      const geminiMessages = [];
      for (const msg of mapped) {
        const prev = geminiMessages[geminiMessages.length - 1];
        if (prev && prev.role === msg.role) {
          prev.parts[0].text += '\n' + msg.parts[0].text;
        } else {
          geminiMessages.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
        }
      }
      const fullSystem = leadingModel.length > 0
        ? `${systemPrompt}\n\nYour opening message to the player was:\n${leadingModel.join('\n')}`
        : systemPrompt;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: fullSystem }] },
          contents: geminiMessages,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Gemini error');
      res.json({ reply: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.' });

    } else {
      res.status(400).json({ error: 'Unknown provider' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function readAudioConfig() {
  try {
    if (fs.existsSync(AUDIO_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(AUDIO_CONFIG_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function writeAudioConfig(config) {
  fs.writeFileSync(AUDIO_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// Voice config: read
app.get('/api/voice-config', (req, res) => {
  res.json(readVoiceConfig());
});

// Voice config: update one character assignment
app.post('/api/voice-config', (req, res) => {
  const { bookId, characterId, voiceId, voiceName } = req.body;
  const config = readVoiceConfig();
  const key = `${bookId}::${characterId}`;
  if (voiceId) {
    config.voiceAssignments[key] = { voiceId, voiceName };
  } else {
    delete config.voiceAssignments[key];
  }
  writeVoiceConfig(config);
  res.json({ ok: true });
});

// ElevenLabs: list available voices for the given API key
app.get('/api/elevenlabs/voices', async (req, res) => {
  const apiKey = req.headers['x-elevenlabs-key'];
  if (!apiKey) {
    return res.status(400).json({ error: 'Missing ElevenLabs API key header' });
  }
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail?.message || data.detail || 'ElevenLabs error');
    res.json(data.voices || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ElevenLabs: generate or retrieve a test clip for a character+voice combination
app.post('/api/elevenlabs/test-voice', async (req, res) => {
  const { apiKey, voiceId, characterId, characterName } = req.body;

  if (!apiKey || !voiceId || !characterId || !characterName) {
    return res.status(400).json({ error: 'Missing required fields: apiKey, voiceId, characterId, characterName' });
  }

  const config = readVoiceConfig();
  const combinationKey = `${characterId}::${voiceId}`;
  const existingRelPath = config.testedCombinations?.[combinationKey];

  if (existingRelPath) {
    const absPath = path.join(__dirname, '..', existingRelPath);
    if (fs.existsSync(absPath)) {
      return res.json({ audioPath: `/${existingRelPath}` });
    }
  }

  try {
    const text = `Hi I am ${characterName}. Nice to meet you.`;
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.detail?.message || errBody.detail || `ElevenLabs TTS error ${response.status}`);
    }

    const filename = `${characterId}_${voiceId}.mp3`;
    const filePath = path.join(VOICE_TESTS_DIR, filename);
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, audioBuffer);

    const relativePath = `voice-tests/${filename}`;
    if (!config.testedCombinations) config.testedCombinations = {};
    config.testedCombinations[combinationKey] = relativePath;
    writeVoiceConfig(config);

    res.json({ audioPath: `/${relativePath}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Audio config: get all generated nodes for a book
app.get('/api/audio-config/:bookId', (req, res) => {
  const { bookId } = req.params;
  const config = readAudioConfig();
  const result = {};
  for (const [key, val] of Object.entries(config)) {
    if (key.startsWith(`${bookId}::`)) {
      result[key] = val;
    }
  }
  res.json(result);
});

// ElevenLabs: generate audio for a single dialogue node
app.post('/api/elevenlabs/generate-audio', async (req, res) => {
  const { apiKey, voiceId, bookId, nodeId, text, force } = req.body;

  if (!apiKey || !voiceId || !bookId || !nodeId || !text) {
    return res.status(400).json({ error: 'Missing required fields: apiKey, voiceId, bookId, nodeId, text' });
  }

  const configKey = `${bookId}::${nodeId}`;
  const config = readAudioConfig();

  // Return cached file if it already exists (skip when force re-generation is requested)
  if (!force && config[configKey]) {
    const absPath = path.join(__dirname, '..', config[configKey].replace(/^\//, ''));
    if (fs.existsSync(absPath)) {
      return res.json({ audioPath: config[configKey] });
    }
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.detail?.message || errBody.detail || `ElevenLabs TTS error ${response.status}`);
    }

    const bookAudioDir = path.join(AUDIO_DIR, bookId);
    if (!fs.existsSync(bookAudioDir)) fs.mkdirSync(bookAudioDir, { recursive: true });

    const filename = `${nodeId}.mp3`;
    const filePath = path.join(bookAudioDir, filename);
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, audioBuffer);

    const audioPath = `/audio/${bookId}/${filename}`;
    config[configKey] = audioPath;
    writeAudioConfig(config);

    res.json({ audioPath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload a background image for a book
app.post('/api/books/:bookId/images', (req, res) => {
  const { bookId } = req.params;
  const { filename, data } = req.body;
  if (!filename || !data) return res.status(400).json({ error: 'Missing filename or data' });
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const bookImgDir = path.join(BOOKS_DIR, bookId);
  if (!fs.existsSync(bookImgDir)) fs.mkdirSync(bookImgDir, { recursive: true });
  try {
    const base64 = data.replace(/^data:[^;]+;base64,/, '');
    fs.writeFileSync(path.join(bookImgDir, safeName), Buffer.from(base64, 'base64'));
    res.json({ path: `${bookId}/${safeName}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create a new book
app.post('/api/books', (req, res) => {
  const { title, author, description, language, tags, style } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

  const id = title.trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40) || `book_${Date.now()}`;

  const filePath = path.join(BOOKS_DIR, `${id}.yaml`);
  if (fs.existsSync(filePath)) {
    return res.status(409).json({ error: `A book with id "${id}" already exists. Choose a different title.` });
  }

  const story = {
    metadata: {
      title: title.trim(),
      author: author?.trim() || 'Unknown',
      description: description?.trim() || '',
      language: language || 'en',
      tags: tags || [],
      version: '0.1',
      style: style || 'dark',
    },
    settings: {},
    characters: [],
    scenes: [{ id: 'scene_1', title: 'Scene 1', start: true, nodes: [] }],
  };

  try {
    const yamlStr = yaml.dump(story, { lineWidth: -1, noRefs: true });
    fs.writeFileSync(filePath, yamlStr, 'utf8');
    res.json({ id, ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Save a book (JSON → YAML written to disk)
app.put('/api/books/:id', (req, res) => {
  const { id } = req.params;
  const story = req.body;
  const candidates = [
    path.join(BOOKS_DIR, `${id}.yaml`),
    path.join(BOOKS_DIR, `${id}.yml`),
  ];
  const filePath = candidates.find(p => fs.existsSync(p)) || candidates[0];
  try {
    const yamlStr = yaml.dump(story, { lineWidth: -1, noRefs: true });
    fs.writeFileSync(filePath, yamlStr, 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\x1b[36m[Loom API]\x1b[0m Server running on http://localhost:${PORT}`);
  console.log(`\x1b[36m[Loom API]\x1b[0m Books folder: ${BOOKS_DIR}`);
});
