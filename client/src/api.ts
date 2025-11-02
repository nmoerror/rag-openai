const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function listDocs(){
  const r = await fetch(`${API}/docs`);
  return r.json();
}

export async function uploadFile(file: File){
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(`${API}/upload`, { method: 'POST', body: fd });
  return r.json();
}

export async function ask(question: string, k = 8){
  const r = await fetch(`${API}/ask`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, k })
  });
  return r.json();
}

export async function deleteDoc(id: string){
  const r = await fetch(`${API}/docs/${id}`, { method: 'DELETE' });
  return r.json();
}