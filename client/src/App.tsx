import React, { useEffect, useState } from 'react';
import { ask, listDocs, uploadFile, deleteDoc, fetchUrl } from './api';
import SearchPanel from '@/components/SearchPanel';

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
      {/*📚 RAG with OpenAI*/}

      {/*<section style={{ marginTop: 16, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>*/}
      {/*  <h2>Upload document</h2>*/}
      {/*  <p>PDF, TXT, or Markdown. The server will chunk + embed.</p>*/}
      {/*  <input type="file" accept=".pdf,.txt,.md,.markdown" onChange={e => setFile(e.target.files?.[0] || null)}/>*/}
      {/*  <button onClick={onUpload} disabled={!file || busy} style={btn}>*/}
      {/*    {busy ? 'Uploading…' : 'Upload'}*/}
      {/*  </button>*/}
      {/*</section>*/}

      {/*<section style={{ marginTop: 16, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>*/}
      {/*  <h2>Ingest from URL</h2>*/}
      {/*  <div style={{ display: 'flex', gap: 8 }}>*/}
      {/*    <input*/}
      {/*      value={urlToIngest} onChange={e => setUrlToIngest(e.target.value)}*/}
      {/*      placeholder="https://example.com/article"*/}
      {/*      style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }}*/}
      {/*    />*/}
      {/*    <button onClick={onIngestUrl} disabled={busy} style={btn}>*/}
      {/*      {busy ? 'Fetching…' : 'Fetch & Index'}*/}
      {/*    </button>*/}
      {/*  </div>*/}
      {/*  <p style={{ marginTop: 8 }}>The page text will be chunked & embedded with its domain saved for filtering.</p>*/}
      {/*</section>*/}
      {/*<br/>*/}

      <SearchPanel
        documents={[
          { id: 'd1', name: 'Product Spec v2.pdf', sizeKB: 842, updatedAt: '2025-10-30T10:00:00Z' },
          { id: 'd2', name: 'API Design.md', sizeKB: 34, updatedAt: '2025-10-29T16:00:00Z' },
        ]}
        sites={[
          { id: 's1', url: 'https://openai.com', title: 'OpenAI' },
          { id: 's2', url: 'https://vitejs.dev', title: 'Vite' },
        ]}
        onSearch={onAsk}
        onAddDocument={onUpload}
        onAddWebsite={onIngestUrl}
      />
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