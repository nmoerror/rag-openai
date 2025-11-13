export type Chunk = {
  id: string;
  sourceId: string;
  content: string;
  embedding: number[];
  domain?: string;
};

export type SourceMeta = {
  id: string;
  size: number;
  uploadedAt: number;
  name: string;
  sourceType: any; // 'document' | 'website'
  corpusNames: string[];
  chunkCount: number;
  domain?: string | undefined;
  url?: string; // for sourceType = 'website'
  tags?: string[] | undefined;
  filePath?: string;
  mimeType?: string;
  ext?: string;
};


export type StoreFile = {
  chunks: Chunk[];
  sources: SourceMeta[];
  corpus: { name: string, id: string }[];
};