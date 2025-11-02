import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
// NOTE: pdf-parse has quirky typings; use require + cast to callable.
import { PDFParse } from 'pdf-parse';

import { chunkText } from './chunk';
import { addDoc, listDocs, removeDoc, topKSimilar } from './vectorStore';
import { Chunk, DocMeta } from './types';

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

app.get('/api/docs', (_req, res) => {
  res.json({ docs: listDocs() });
});

app.delete('/api/docs/:id', (req, res) => {
  removeDoc(req.params.id);
  res.json({ ok: true });
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const { originalname, path: filePath, size } = req.file;

    const ext = path.extname(originalname).toLowerCase();
    let text = '';
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      const parsed = new PDFParse(new Uint8Array(buffer));
      const result = await parsed.getText();
      text = result.text;

    } else {
      text = fs.readFileSync(filePath, 'utf-8');
    }

    if (!text.trim()) return res.status(400).json({ error: 'Empty text extracted' });

    const parts = chunkText(text);

    // Pre-size array to avoid undefined indexes and silence TS “possibly undefined”
    const embeddings: number[][] = new Array(parts.length);

    for (let i = 0; i < parts.length; i += 50) {
      const batch = parts.slice(i, i + 50);
      const resp = await client.embeddings.create({ model: EMBEDDING_MODEL, input: batch });
      // Map each returned embedding to its absolute index in `parts`
      resp.data.forEach((d, j) => {
        embeddings[i + j] = d.embedding;
      });
    }

    // Extra safety: verify no holes remained
    if (embeddings.some(e => !Array.isArray(e))) {
      return res.status(500).json({ error: 'Embedding generation mismatch' });
    }

    const docId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const chunks: Chunk[] = parts.map((content, idx) => ({
      id: `${docId}_${idx}`,
      docId,
      content,
      embedding: embeddings[idx]!, // non-null after the check above
    }));

    const meta: DocMeta = {
      id: docId,
      filename: originalname,
      size,
      uploadedAt: Date.now(),
      chunkCount: chunks.length,
    };

    addDoc(meta, chunks);

    res.json({ ok: true, doc: meta });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || 'Upload failed' });
  }
});

app.post('/api/ask', async (req, res) => {
  try {
    const { question, k = 8 } = req.body as { question?: string; k?: number };
    if (!question || !question.trim()) return res.status(400).json({ error: 'Missing question' });

    const emb = await client.embeddings.create({ model: EMBEDDING_MODEL, input: question });
    const queryEmbedding = emb.data?.[0]?.embedding;
    if (!queryEmbedding) return res.status(500).json({ error: 'Failed to create query embedding' });

    const hits = topKSimilar(queryEmbedding, k);

    const context = hits.map((h, i) => `# Chunk ${i + 1}\n${h.content}`).join('\n\n');

    const system = `You are a strict RAG assistant. Only answer using the provided CONTEXT.
If the answer is not fully contained in the CONTEXT, say: "I don’t have enough information in the uploaded documents to answer that."`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      { role: 'user', content: `CONTEXT:\n\n${context}\n\nQUESTION: ${question}` },
    ];

    const completion = await client.chat.completions.create({
      model: ANSWER_MODEL,
      messages,
      temperature: 0.1,
    });

    const content = completion.choices?.[0]?.message?.content ?? '';
    res.json({ answer: content, usedChunks: hits.length });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || 'Ask failed' });
  }
});

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));