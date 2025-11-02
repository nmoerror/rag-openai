import fs from 'fs';
import path from 'path';
import { Chunk, DocMeta, StoreFile } from './types';

const STORE_PATH = path.join(process.cwd(), 'data', 'store.json');

function load(): StoreFile{
  if (!fs.existsSync(STORE_PATH)) return { chunks: [], docs: [] };
  return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as StoreFile;
}

function save(data: StoreFile){
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function addDoc(meta: DocMeta, chunks: Chunk[]){
  const db = load();
  db.docs = db.docs.filter(d => d.id !== meta.id).concat(meta);
  db.chunks = db.chunks.concat(chunks);
  save(db);
}

export function listDocs(): DocMeta[]{
  return load().docs;
}

export function removeDoc(docId: string){
  const db = load();
  db.docs = db.docs.filter(d => d.id !== docId);
  db.chunks = db.chunks.filter(c => c.docId !== docId);
  save(db);
}

export function topKSimilar(
  queryEmbedding: number[],
  k = 8,
  domains?: string[]
): Chunk[]{
  const db = load();
  const normDomains = (domains ?? []).map(d => d.toLowerCase().trim()).filter(Boolean);
  const pool = normDomains.length
    ? db.chunks.filter(c => c.domain && normDomains.includes(c.domain.toLowerCase()))
    : db.chunks;

  const scored = pool.map(c => ({ c, score: cosine(queryEmbedding, c.embedding) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map(s => s.c);
}

// Safe cosine that tolerates length mismatch and noUncheckedIndexedAccess
function cosine(a: number[], b: number[]){
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}