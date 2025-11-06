import React from 'react';
import type { SourceType } from '@/App';

interface AddSourceModalProps {
  open: boolean;
  busy?: boolean;
  addType: SourceType | null;
  urlToIngest: string;
  file: File | null;
  setAddType: (t: SourceType | null) => void;
  setUrlToIngest: (v: string) => void;
  setFile: (f: File | null) => void;
  onConfirmWebsite: () => Promise<void>;
  onConfirmDocument: () => Promise<void>;
  onClose: () => void;
}

export const AddSourceModal: React.FC<AddSourceModalProps> = ({
  open,
  busy = false,
  addType,
  urlToIngest,
  file,
  setAddType,
  setUrlToIngest,
  setFile,
  onConfirmWebsite,
  onConfirmDocument,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Add Source</h3>
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Step 1: Choose type */}
          {!addType && (
            <>
              <p className="text-sm text-gray-600">
                What would you like to add to this workspace?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAddType('website')}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                >
                  <span className="block font-medium">Website</span>
                  <span className="block text-xs text-gray-500">
                    Crawl a URL and make it searchable.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddType('document')}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                >
                  <span className="block font-medium">Document</span>
                  <span className="block text-xs text-gray-500">
                    Upload a PDF, DOCX, or text file.
                  </span>
                </button>
              </div>
            </>
          )}

          {/* Step 2: Website form */}
          {addType === 'website' && (
            <>
              <p className="text-sm text-gray-600 mb-1">
                Enter the website URL you want to ingest.
              </p>
              <input
                type="url"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="https://example.com/sources"
                value={urlToIngest}
                onChange={e => setUrlToIngest(e.target.value)}
              />
            </>
          )}

          {/* Step 2: Document form */}
          {addType === 'document' && (
            <>
              <p className="text-sm text-gray-600 mb-1">Choose a document to upload.</p>
              <input
                type="file"
                className="w-full text-sm"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="mt-1 text-xs text-gray-500">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <div className="flex items-center gap-2">
            {addType && (
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={() => setAddType(null)}
              >
                ← Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            {addType === 'website' && (
              <button
                type="button"
                onClick={onConfirmWebsite}
                disabled={!urlToIngest.trim() || busy}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
              >
                {busy ? 'Ingesting…' : 'Add Website'}
              </button>
            )}
            {addType === 'document' && (
              <button
                type="button"
                onClick={onConfirmDocument}
                disabled={!file || busy}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
              >
                {busy ? 'Uploading…' : 'Upload Document'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSourceModal;