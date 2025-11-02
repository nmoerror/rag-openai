export type Chunk = {
  id: string;
  docId: string;
  content: string;
  embedding: number[];
};

export type DocMeta = {
  id: string;
  filename: string;
  size: number;
  uploadedAt: number;
  chunkCount: number;
};

export type StoreFile = {
  chunks: Chunk[];
  docs: DocMeta[];
};