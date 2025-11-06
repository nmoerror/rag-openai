import React, { useEffect, useState } from 'react';
import { Corpus, Source } from '@/App';

type ManageModalProps = {
  open: boolean;
  busy: boolean;
  corpus: Corpus[];
  sources: Source[];
  selectedCorpusName: string;
  onClose: () => void;
  onBulkAssign: (sourceIds: string[], targetCorpusName: string) => Promise<void>;
  onBulkDeleteSources: (sourceIds: string[]) => Promise<void>;
  onCreateCorpus: (name: string) => void;
  onRenameCorpus: (corpusId: string, newName: string) => void;
  onDeleteCorpus: (corpusId: string) => void;
};

const ManageModal: React.FC<ManageModalProps> = ({
  open,
  busy,
  corpus,
  sources,
  selectedCorpusName,
  onClose,
  onBulkAssign,
  onBulkDeleteSources,
  onCreateCorpus,
  onRenameCorpus,
  onDeleteCorpus,
}) => {
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [targetCorpusName, setTargetCorpusName] = useState<string>('');
  const [newCorpusName, setNewCorpusName] = useState('');
  const [editingCorpusId, setEditingCorpusId] = useState<string | null>(null);
  const [editingCorpusName, setEditingCorpusName] = useState('');

  // Reset / initialise when opened
  useEffect(() => {
    if (!open) {
      setSelectedSourceIds([]);
      setNewCorpusName('');
      setEditingCorpusId(null);
      setEditingCorpusName('');
      return;
    }
    const defaultTarget =
      selectedCorpusName ||
      (corpus.length > 0 ? corpus[0].name : '');
    setTargetCorpusName(defaultTarget);
  }, [open, selectedCorpusName, corpus]);

  if (!open) return null;

  const toggleSourceSelection = (id: string) => {
    setSelectedSourceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const allSelected = selectedSourceIds.length === sources.length && sources.length > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(sources.map(s => s.id));
    }
  };

  const handleAssignClick = async () => {
    if (!targetCorpusName || selectedSourceIds.length === 0) return;
    await onBulkAssign(selectedSourceIds, targetCorpusName);
  };

  const handleDeleteSourcesClick = async () => {
    if (selectedSourceIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedSourceIds.length} source(s)? This cannot be undone.`)) {
      return;
    }
    await onBulkDeleteSources(selectedSourceIds);
    setSelectedSourceIds([]);
  };

  const handleCreateCorpusClick = () => {
    if (!newCorpusName.trim()) return;
    onCreateCorpus(newCorpusName);
    setNewCorpusName('');
  };

  const startEditCorpus = (c: Corpus) => {
    setEditingCorpusId(c.id);
    setEditingCorpusName(c.name);
  };

  const handleConfirmRename = () => {
    if (!editingCorpusId || !editingCorpusName.trim()) return;
    onRenameCorpus(editingCorpusId, editingCorpusName);
    setEditingCorpusId(null);
    setEditingCorpusName('');
  };

  const handleDeleteCorpusClick = (id: string) => {
    if (!window.confirm('Delete this corpus? This will remove it from all sources in the UI.')) {
      return;
    }
    onDeleteCorpus(id);
    setEditingCorpusId(prev => (prev === id ? null : prev));
  };

  const sourcesCountForCorpus = (name: string) =>
    sources.filter(s => s.corpusNames?.includes(name)).length;

  return (
    <div className="fixed inset-0 z-40 flex pt-20 justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[80vh] flex flex-col p-2">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Manage corpus & sources
            </h3>
            <p className="text-xs text-gray-500">
              Bulk assign or delete sources, and organise corpus.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex divide-x">
          {/* Sources side */}
          <div className="w-1/2 p-4 flex-1 flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                Sources
              </h4>
              <span className="text-[11px] text-gray-400">
                {sources.length} total
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Select multiple sources to assign them to a corpus or delete them.
            </p>

            <div className="flex items-center gap-2 mb-3">
              <select
                value={targetCorpusName}
                onChange={e => setTargetCorpusName(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Assign to corpus…</option>
                {corpus.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignClick}
                disabled={
                  busy ||
                  !targetCorpusName ||
                  selectedSourceIds.length === 0
                }
                className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-default"
              >
                Assign
              </button>
              <button
                onClick={handleDeleteSourcesClick}
                disabled={busy || selectedSourceIds.length === 0}
                className="px-3 py-1.5 text-xs rounded-md bg-red-600 text-white disabled:bg-gray-300 disabled:cursor-default"
              >
                Delete
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-1 text-left w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-2 py-1 text-left">Name</th>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-left">Corpus</th>
                </tr>
                </thead>
                <tbody>
                {sources.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-4 text-center text-gray-400"
                    >
                      No sources yet.
                    </td>
                  </tr>
                ) : (
                  sources.map(s => {
                    const checked = selectedSourceIds.includes(s.id);
                    return (
                      <tr
                        key={s.id}
                        className={`border-b last:border-b-0 ${
                          checked ? 'bg-blue-50' : 'bg-white'
                        }`}
                      >
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSourceSelection(s.id)}
                          />
                        </td>
                        <td className="px-2 py-1 max-w-[10rem] truncate">
                          {s.name}
                        </td>
                        <td className="px-2 py-1 capitalize text-[11px] text-gray-600">
                          {s.sourceType}
                        </td>
                        <td className="px-2 py-1 text-[11px] text-gray-500 max-w-[8rem] truncate">
                          {s.corpusNames?.length
                            ? s.corpusNames.join(', ')
                            : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Corpus side */}
          <div className="w-2/1 p-4 flex-1 flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                Corpus
              </h4>
              <span className="text-[11px] text-gray-400">
                {corpus.length} total
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Create, rename or delete corpus. Deleting a corpus will not delete its sources.
            </p>

            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="New corpus name"
                value={newCorpusName}
                onChange={e => setNewCorpusName(e.target.value)}
              />
              <button
                onClick={handleCreateCorpusClick}
                disabled={!newCorpusName.trim()}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-default"
              >
                Create
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-1 text-left">Name</th>
                  <th className="px-2 py-1 text-left">Sources</th>
                  <th className="px-2 py-1 text-right">Actions</th>
                </tr>
                </thead>
                <tbody>
                {corpus.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-2 py-4 text-center text-gray-400"
                    >
                      No corpus yet.
                    </td>
                  </tr>
                ) : (
                  corpus.map(c => {
                    const isEditing = editingCorpusId === c.id;
                    return (
                      <tr
                        key={c.id}
                        className="border-b last:border-b-0 bg-white"
                      >
                        <td className="px-2 py-1 max-w-[10rem]">
                          {isEditing ? (
                            <input
                              className="w-full border border-gray-300 rounded-md px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                              value={editingCorpusName}
                              onChange={e =>
                                setEditingCorpusName(e.target.value)
                              }
                            />
                          ) : (
                            <span className="truncate">{c.name}</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-[11px] text-gray-500">
                          {sourcesCountForCorpus(c.name)} source(s)
                        </td>
                        <td className="px-2 py-1 text-right space-x-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={handleConfirmRename}
                                className="px-2 py-0.5 text-[11px] rounded-md bg-blue-600 text-white"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCorpusId(null);
                                  setEditingCorpusName('');
                                }}
                                className="px-2 py-0.5 text-[11px] rounded-md border border-gray-300 text-gray-600"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditCorpus(c)}
                                className="px-2 py-0.5 text-[11px] rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => handleDeleteCorpusClick(c.id)}
                                className="px-2 py-0.5 text-[11px] rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex justify-between items-center">
          <p className="text-[11px] text-gray-400">
            {selectedSourceIds.length} source(s) selected
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageModal;