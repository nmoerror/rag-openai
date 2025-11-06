import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import { chunkText } from './chunk';
import {
  addCorpusToSource,
  addSource,
  createCorpus,
  deleteCorpus, getSource, listCorpus,
  listSources,
  removeSource,
  topKSimilar
} from './vectorStore';
import { Chunk, SourceMeta } from './types';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import mime from 'mime-types';

const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

function domainFromUrl(u: string){
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

const PORT = 4000;
const client = new OpenAI({
  maxRetries: 3,
  apiKey: process.env.OPENAI_API_KEY
});
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const ANSWER_MODEL = process.env.ANSWER_MODEL || 'gpt-5-mini-2025-08-07';

const app = express();


const ALLOW_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.post('/api/fetch-url', express.json(), async (req, res) => {
  try {
    const { url, selectedCorpusName } = req.body as { url?: string, selectedCorpusName: string };
    if (!url) return res.status(400).json({ error: 'Missing url' });

    const dom = await (await fetch(url)).text();
    const source = new JSDOM(dom, { url });
    const reader = new Readability(source.window.sourceument);
    const article = reader.parse();
    const text = (article?.textContent || '').trim();
    if (!text) return res.status(400).json({ error: 'Could not extract readable text' });

    const parts = chunkText(text);
    const embeddings: number[][] = new Array(parts.length);
    for (let i = 0; i < parts.length; i += 50) {
      const batch = parts.slice(i, i + 50);
      const resp = await client.embeddings.create({ model: EMBEDDING_MODEL, input: batch });
      resp.data.forEach((d, j) => {
        embeddings[i + j] = d.embedding;
      });
    }

    const sourceId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const domain = domainFromUrl(url);

    // @ts-ignore
    const chunks: Chunk[] = parts.map((content, idx) => ({
      id: `${sourceId}_${idx}`,
      sourceId,
      content,
      embedding: embeddings[idx]!,
      domain,
    }));

    const meta: SourceMeta = {
      id: sourceId,
      name: url,
      sourceType: 'website',
      corpusNames: [selectedCorpusName],
      size: text.length,
      uploadedAt: Date.now(),
      chunkCount: chunks.length,
      domain,
    };

    addSource(meta, chunks);
    res.json({ ok: true, source: meta });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || 'Fetch failed' });
  }
});

app.use(cors({
  origin(origin, cb){
    if (!origin) return cb(null, true); // allow curl/postman
    if (ALLOW_ORIGINS.length === 0 || ALLOW_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'));
  },
  credentials: false
}));
app.use(express.json({ limit: '5mb' }));

const upload = multer({ dest: 'data/uploads' });

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/sources', (_req, res) => {
  res.json({ sources: listSources() });
});

app.delete('/api/sources/:id', (req, res) => {
  removeSource(req.params.id);
  res.json({ ok: true });
});

app.delete('/api/corpus/:name', (req, res) => {
  deleteCorpus(req.params.name);
  res.json({ ok: true });
});

app.get('/api/corpus', (req, res) => {
  res.json({ corpus: listCorpus() });
});


app.post('/api/corpus', (req, res) => {
  try {
    const { corpus } = req.body as { corpus: { name: string, id: string } };

    const updated = createCorpus(corpus);

    if (!updated) {
      return res.status(404).json({ error: 'Already exists' });
    }
    res.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Failed to add corpus' });
  }
});


app.post('/api/sources/:id/corpus', async (req, res) => {
  try {
    const { corpusName } = req.body as { corpusName?: string };
    const { id } = req.params;

    if (!corpusName) {
      return res.status(400).json({ error: 'Missing corpusName' });
    }

    const updated = addCorpusToSource(id, corpusName);
    if (!updated) {
      return res.status(404).json({ error: 'Source not found' });
    }

    return res.json({ ok: true, source: updated });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || 'Failed to add corpusName' });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const { originalname, path: tempFilePath, size, mimetype } = req.file;
    const { corpusName } = req.body;

    const ext = path.extname(originalname).toLowerCase();
    let text = '';

    // 1) Extract text from the temporary uploaded file
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(tempFilePath);
      const parsed = new PDFParse(new Uint8Array(buffer));
      const result = await parsed.getText();
      text = result.text;
    } else {
      // naive: treat as UTF-8 text file
      text = fs.readFileSync(tempFilePath, 'utf-8');
    }

    if (!text.trim()) {
      return res.status(400).json({ error: 'Empty text extracted' });
    }

    const parts = chunkText(text);

    // Pre-size array to avoid undefined indexes and silence TS “possibly undefined”
    const embeddings: number[][] = new Array(parts.length);

    // 2) Create embeddings in batches
    for (let i = 0; i < parts.length; i += 50) {
      const batch = parts.slice(i, i + 50);
      const resp = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
      });

      // Map each returned embedding to its absolute index in `parts`
      resp.data.forEach((d, j) => {
        embeddings[i + j] = d.embedding;
      });
    }

    // Extra safety: verify no holes remained
    if (embeddings.some(e => !Array.isArray(e))) {
      return res.status(500).json({ error: 'Embedding generation mismatch' });
    }

    // 3) Create source id
    const sourceId = `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    // 4) Move file from Multer temp location to a permanent uploads dir
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const storedFilename = `${sourceId}${ext || ''}`;
    const storedPath = path.join(UPLOADS_DIR, storedFilename);

    // If you prefer copy instead of move, use fs.copyFileSync
    fs.renameSync(tempFilePath, storedPath);

    // 5) Build chunks
    const chunks: Chunk[] = parts.map((content, idx) => ({
      id: `${sourceId}_${idx}`,
      sourceId,
      content,
      embedding: embeddings[idx]!, // non-null after the check above
    }));

    // 6) Build meta with filePath
    const meta: SourceMeta = {
      id: sourceId,
      name: originalname,
      sourceType: 'document',
      size,
      corpusNames: corpusName ? [corpusName] : [],
      uploadedAt: Date.now(),
      chunkCount: chunks.length,
      filePath: path.relative(process.cwd(), storedPath), // e.g. "data/uploads/123_abc.pdf"
      mimeType: mimetype,
      ext,
    };

    addSource(meta, chunks);

    res.json({ ok: true, source: meta });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || 'Upload failed' });
  }
});

app.post('/api/ask', async (req, res) => {
  try {
    const { question, k = 8, sites } = req.body as { question?: string; k?: number; sites?: string[] };
    if (!question?.trim()) return res.status(400).json({ error: 'Missing question' });

    const emb = await client.embeddings.create({ model: EMBEDDING_MODEL, input: question });
    const queryEmbedding = emb.data?.[0]?.embedding;
    if (!queryEmbedding) return res.status(500).json({ error: 'Failed to create query embedding' });

    const hits = topKSimilar(queryEmbedding, k, sites);

    const context = hits.map((h, i) => `# Chunk ${i + 1}\n${h.content}`).join('\n\n');

    const system = `You are a strict RAG assistant. Only answer using the provided CONTEXT.
If the answer is not fully contained in the CONTEXT, say: "I don’t have enough information in the uploaded sourceuments to answer that."`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      { role: 'user', content: `CONTEXT:\n\n${context}\n\nQUESTION: ${question}` },
    ];

    const completion = await client.chat.completions.create({
      model: ANSWER_MODEL,
      messages,
      temperature: 1,
    });

    const content = completion.choices?.[0]?.message?.content ?? '';
    res.json({ answer: content, usedChunks: hits.length });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || 'Ask failed' });
  }
});


app.get('/api/sources/:id/file', (req, res) => {
  const { id } = req.params;
  const source = getSource(id);

  if (!source || !source.filePath) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Resolve to an absolute path
  const absolutePath = path.isAbsolute(source.filePath)
    ? source.filePath
    : path.join(process.cwd(), source.filePath);

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  const mimeType =
    source.mimeType || mime.lookup(source.ext || '') || 'application/octet-stream';

  res.setHeader('Content-Type', mimeType);
  // Optionally make browser download instead of inline view:
  // res.setHeader('Content-Disposition', `inline; filename="${source.name}"`);

  fs.createReadStream(absolutePath).pipe(res);
});

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));