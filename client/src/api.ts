const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function listSources(){
  const r = await fetch(`${API}/sources`);
  return r.json();
}

export async function listCorpus(){
  const r = await fetch(`${API}/corpus`);
  return r.json();
}

export async function uploadFile(file: File, corpusName: string){
  const fd = new FormData();
  fd.append('file', file);
  fd.append('corpusName', corpusName ?? '');

  const r = await fetch(`${API}/upload`, {
    method: 'POST',
    body: fd,
  });

  return r.json();
}

export async function addSourceToCorpus(sourceId: string, corpusName: string){
  const r = await fetch(`${API}/sources/${sourceId}/corpus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ corpusName }),
  });

  return r.json();
}


export async function postCorpus(corpus: { id: string, name: string }){
  const r = await fetch(`${API}/corpus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ corpus }),
  });

  return r.json();
}

export async function removeCorpus(corpusName: string){
  const r = await fetch(`${API}/corpus/${corpusName}`, { method: 'DELETE' });
  return r.json();
}

export async function fetchUrl(url: string, selectedCorpusName: string){
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const r = await fetch(`${API}/fetch-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, selectedCorpusName }),
  });

  return r.json();
}

export async function ask(question: string, k = 8, sites?: string[]){
  const r = await fetch(`${API}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, k, sites })
  });
  return r.json();
}

export async function deleteSource(id: string){
  const r = await fetch(`${API}/sources/${id}`, { method: 'DELETE' });
  return r.json();
}

export async function getFile(sourceId: string){
  const r = await fetch(`${API}/sources/${sourceId}/file`);
  if (!r.ok) throw new Error(`Failed to fetch file (${r.status})`);
  const blob = await r.blob();
  return blob;
}