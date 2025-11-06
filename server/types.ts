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
  sourceType: any;
  corpusNames: string[];
  chunkCount: number;
  domain?: string | undefined;
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