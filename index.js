require('dotenv').config();
const express = require('express');
const path = require('path');
const { metaoperate, runNormalStream, log } = require('./metaoperation');
const { chats: initialChats, threads: initialThreads } = require('./metapromptdata');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Request logging middleware ────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  const body = req.body && Object.keys(req.body).length ? req.body : undefined;
  log(`[http] --> ${req.method} ${req.path}${body ? ' ' + JSON.stringify(body) : ''}`);
  res.on('finish', () => {
    log(`[http] <-- ${req.method} ${req.path} ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// In-memory state — initialized from metapromptdata
let chats = [...initialChats];
let threads = [...initialThreads];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/state', (req, res) => {
  res.json({ chats, threads });
});

function parsePrefix(raw) {
  let text = raw.trim();
  let isMeta = false, useAiContext = false;
  if (text.startsWith('/meta')) { isMeta = true; text = text.slice(5).trim(); }
  if (text.startsWith('/aicontext')) { useAiContext = true; text = text.slice(10).trim(); }
  if (text.startsWith('/meta')) { isMeta = true; text = text.slice(5).trim(); }
  return { userRequest: text, isMeta, useAiContext };
}

app.post('/api/operate', async (req, res) => {
  const raw = req.body.userRequest;
  const { activeThreadId } = req.body;
  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({ error: 'userRequest is required' });
  }
  const { userRequest, isMeta, useAiContext } = parsePrefix(raw);
  log(`[http] parsed — isMeta:${isMeta} useAiContext:${useAiContext} request:"${userRequest}"`);

  if (!isMeta) {
    // Normal mode — stream tokens via SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const abortCtrl = new AbortController();
    res.on('close', () => abortCtrl.abort());

    try {
      await runNormalStream(
        chats, threads, userRequest, activeThreadId ?? null, useAiContext, raw,
        (token) => res.write(`data: ${JSON.stringify({ token })}\n\n`),
        abortCtrl.signal
      );
      const main = threads.find(t => t.th_id === 1);
      if (main) main.context = chats.map(m => m.id);
      res.write(`data: ${JSON.stringify({ done: true, chats, threads })}\n\n`);
    } catch (err) {
      log('[http] stream error', err.stack || err.message);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    } finally {
      res.end();
    }
    return;
  }

  // Meta pipeline — SSE with step events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const onEvent = (evt) => res.write(`data: ${JSON.stringify(evt)}\n\n`);
  try {
    await metaoperate(chats, threads, userRequest, activeThreadId ?? null, isMeta, useAiContext, raw, onEvent);
    const main = threads.find(t => t.th_id === 1);
    if (main) main.context = chats.map(m => m.id);
    res.write(`data: ${JSON.stringify({ type: 'done', chats, threads })}\n\n`);
  } catch (err) {
    log('[http] error', err.stack || err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log(`[server] listening on http://localhost:${PORT}`);
  console.log(`Listening on http://localhost:${PORT}`);
});
