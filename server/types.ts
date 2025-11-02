export type Chunk = {
  id: string;
  docId: string;
  content: string;
  embedding: number[];
  domain?: string;
};

export type DocMeta = {
  id: string;
  filename: string;
  size: number;
  uploadedAt: number;
  chunkCount: number;
  domain?: string | undefined;
  tags?: string[] | undefined;
};

export type StoreFile = {
  chunks: Chunk[];
  docs: DocMeta[];
};