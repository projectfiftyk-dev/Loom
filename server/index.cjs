const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const yaml = require('js-yaml');

const app = express();
app.use(cors());
app.use(express.json());

const BOOKS_DIR = path.join(__dirname, '..', 'books');

// Ensure books directory exists
if (!fs.existsSync(BOOKS_DIR)) {
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
}

// Serve book assets (backgrounds, avatars, etc.) from the books folder
app.use('/book-assets', express.static(BOOKS_DIR));

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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemMsg }] },
          contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Gemini error');
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"success":false,"reason":"No response"}';
      res.json(JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()));

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
      const geminiMessages = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\x1b[36m[Loom API]\x1b[0m Server running on http://localhost:${PORT}`);
  console.log(`\x1b[36m[Loom API]\x1b[0m Books folder: ${BOOKS_DIR}`);
});
