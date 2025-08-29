import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
app.use(cors({ origin: ['https://www.contentcreatures.com','https://contentcreatures.com'] }));                           // tighten CORS later
app.use(express.json({ limit: '1mb' }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/chat', async (req, res) => {
  try {
    const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const messages = incoming
      .filter(m => m && typeof m.content === 'string' && typeof m.role === 'string')
      .map(m => ({ role: m.role, content: m.content }));

    if (messages.length === 0) {
      return res.status(400).json({ error: "Provide messages: [{role:'user', content:'...'}]" });
    }

    const systemMsg = {
      role: 'system',
      content:
        "You are the Content Creatures website assistant. Be concise, friendly and helpful. " +
        "If you don't know something, say so. Keep answers short unless the user asks for detail."
    };

    const resp = await client.chat.completions.create({
      model: MODEL,
      messages: [systemMsg, ...messages]
      // no temperature or tools
    });

    const text = resp.choices?.[0]?.message?.content ?? '';
    return res.json({ text });
  } catch (e) {
    console.error(e?.stack || e);
    const msg = e?.message || 'Server error';
    const status =
      /api key|unauthorized|401/i.test(msg) ? 401 :
      /bad request|unknown parameter|missing required parameter|400/i.test(msg) ? 400 :
      500;
    return res.status(status).json({ error: msg });
  }
});

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, '127.0.0.1', () => {
  console.log(`CC bot listening on http://127.0.0.1:${PORT}`);
});
