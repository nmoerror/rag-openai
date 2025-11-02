// Simple character-based chunking with overlap
export function chunkText(text: string, chunkSize = 1200, overlap = 150): string[] {
  const clean = text.replace(/\s+$/g, '').replace(/\r/g, '')
  const chunks: string[] = []
  let i = 0
  while (i < clean.length) {
    const end = Math.min(i + chunkSize, clean.length)
    chunks.push(clean.slice(i, end))
    if (end === clean.length) break
    i = end - overlap
  }
  return chunks
}