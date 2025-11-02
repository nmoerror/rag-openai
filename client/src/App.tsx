import React, { useEffect, useState } from 'react';
import { ask, listDocs, uploadFile, deleteDoc, fetchUrl } from './api';

type Doc = { id: string; filename: string; size: number; uploadedAt: number; chunkCount: number }

export default function App(){
  const [docs, setDocs] = useState<Doc[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [k, setK] = useState(8);

  const [sitesText, setSitesText] = useState('');
  const sites = sitesText.split(',').map(s => s.trim()).filter(Boolean);

  const [urlToIngest, setUrlToIngest] = useState('');

  async function onIngestUrl(){
    if (!urlToIngest.trim()) return;
    setBusy(true);
    const resp = await fetchUrl(urlToIngest.trim());
    if (resp.error) alert(resp.error);
    await refresh();
    setBusy(false);
  }

  async function refresh(){
    const d = await listDocs();
    setDocs(d.docs);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onUpload(){
    if (!file) return;
    setBusy(true);
    setAnswer('');
    const resp = await uploadFile(file);
    if (resp.error) alert(resp.error);
    await refresh();
    setBusy(false);
  }

  async function onAsk(){
    if (!q.trim()) return;
    setBusy(true);
    const resp = await ask(q, k, sites);
    if (resp.error) alert(resp.error);
    setAnswer(resp.answer || '');
    setBusy(false);
  }

  async function onDelete(id: string){
    setBusy(true);
    await deleteDoc(id);
    await refresh();
    setBusy(false);
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 20, maxWidth: 900, margin: '0 auto' }}>
      📚 RAG with OpenAI

      <section style={{ marginTop: 16, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <h2>Upload document</h2>
        <p>PDF, TXT, or Markdown. The server will chunk + embed.</p>
        <input type="file" accept=".pdf,.txt,.md,.markdown" onChange={e => setFile(e.target.files?.[0] || null)}/>
        <button onClick={onUpload} disabled={!file || busy} style={btn}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </section>

      <section style={{ marginTop: 16, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <h2>Documents</h2>
        {docs.length === 0 && <p>No documents yet.</p>}
        <ul>
          {docs.map(d => (
            <li key={d.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '6px 0' }}>
              <span>• {d.filename} <small>({(d.size / 1024).toFixed(1)} KB, {d.chunkCount} chunks)</small></span>
              <button onClick={() => onDelete(d.id)} disabled={busy} style={smallBtn}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      {/*<section style={{ marginTop: 16, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>*/}
      {/*  <h2>Ask</h2>*/}
      {/*  <div style={{ display: 'flex', gap: 8 }}>*/}
      {/*    <input*/}
      {/*      value={q}*/}
      {/*      onChange={e => setQ(e.target.value)}*/}
      {/*      placeholder="Ask a question based on your docs…"*/}
      {/*      style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }}*/}
      {/*    />*/}
      {/*    <input*/}
      {/*      type="number" value={k} min={1} max={20} onChange={e => setK(parseInt(e.target.value || '8'))}*/}
      {/*      style={{ width: 70 }}*/}
      {/*    />*/}
      {/*    <button onClick={onAsk} disabled={busy} style={btn}>{busy ? 'Thinking…' : 'Ask'}</button>*/}
      {/*  </div>*/}
      {/*  {answer && (*/}
      {/*    <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', background: '#fafafa', padding: 12, borderRadius: 8 }}>*/}
      {/*      {answer}*/}
      {/*    </div>*/}
      {/*  )}*/}
      {/*</section>*/}

      <section style={{ marginTop: 16, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <h2>Ingest from URL</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={urlToIngest} onChange={e => setUrlToIngest(e.target.value)}
            placeholder="https://example.com/article"
            style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
          />
          <button onClick={onIngestUrl} disabled={busy} style={btn}>
            {busy ? 'Fetching…' : 'Fetch & Index'}
          </button>
        </div>
        <p style={{ marginTop: 8 }}>The page text will be chunked & embedded with its domain saved for filtering.</p>
      </section>

      <section style={{ marginTop: 16, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <h2>Ask</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={q} onChange={e => setQ(e.target.value)} placeholder="Ask a question…"
            style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
          />
          <input
            type="number" value={k} min={1} max={20} onChange={e => setK(parseInt(e.target.value || '8'))}
            style={{ width: 70 }}
          />
          <button onClick={() => onAsk()} disabled={busy} style={btn}>{busy ? 'Thinking…' : 'Ask'}</button>
        </div>
        <input
          value={sitesText} onChange={e => setSitesText(e.target.value)}
          placeholder="Limit to sites: nytimes.com, docs.python.org"
          style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <small>Queries will only use chunks whose <code>domain</code> matches these sites.</small>
        {answer && <div
          style={{ marginTop: 12, whiteSpace: 'pre-wrap', background: '#fafafa', padding: 12, borderRadius: 8 }}
        >{answer}</div>}
      </section>
    </div>

  );
}

const btn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #ccc',
  background: '#111',
  color: 'white',
  cursor: 'pointer'
};
const smallBtn: React.CSSProperties = { ...btn, padding: '4px 8px', background: '#b21f2d' };