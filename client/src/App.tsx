import React, { useEffect, useState } from 'react';
import {
  ask,
  listSources,
  listCorpus,
  uploadFile,
  deleteSource,
  fetchUrl,
  addSourceToCorpus,
  postCorpus, removeCorpus, getFile
} from './api';
import SideBar from '@/components/SideBar';
import AddSourceModal from '@/components/AddSourceModal';
import ManageModal from '@/components/ManageModal';

export type Corpus = { id: string; name: string };
export type SourceType = 'document' | 'website';
export type Source = { id: string; name: string; sourceType: SourceType; url?: string; corpusNames: string[] };
export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

const initialCorpus: Corpus[] = [];
const initialSources: Source[] = [];

export const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [k, setK] = useState(8);
  // TODO
  const [sitesText, setSitesText] = useState('');
  const sites = sitesText.split(',').map(s => s.trim()).filter(Boolean);
  const [urlToIngest, setUrlToIngest] = useState('');

  const [corpus, setCorpus] = useState<Corpus[]>(initialCorpus);
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [selectedCorpusName, setSelectedCorpusName] = useState<string>('');
  const [newCorpusName, setNewCorpusName] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const selectedCorpus = corpus.find(l => l.name === selectedCorpusName) || null;
  const isChatDisabled = !selectedCorpusName;

  // ADD MODALS
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addType, setAddType] = useState<SourceType | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  async function onIngestUrl(){
    if (!urlToIngest.trim() || !selectedCorpusName) return;
    setBusy(true);
    const resp = await fetchUrl(urlToIngest.trim(), selectedCorpusName);
    if (resp.error) alert(resp.error);
    await refresh();
    setBusy(false);
  }

  async function refresh(){
    const d = await listSources();
    const s = await listCorpus();
    setSources(d.sources);
    setCorpus(s.corpus);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onUpload(){
    if (!file) return;
    setBusy(true);
    const resp = await uploadFile(file, selectedCorpusName);
    if (resp.error) alert(resp.error);
    await refresh();
    setBusy(false);
  }

  async function onDelete(id: string){
    setBusy(true);
    await deleteSource(id);
    await refresh();
    setBusy(false);
  }

  // --- Corpus helpers ---
  const createCorpus = async (name: string, options?: { select?: boolean }) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = trimmed; // for now we treat id === name
    await postCorpus({ id, name: trimmed });

    setCorpus(prev => {
      if (prev.some(c => c.id === id)) return prev; // avoid duplicates
      return [...prev, { id, name: trimmed }];
    });
    if (options?.select) {
      setSelectedCorpusName(trimmed);
    }
  };

  const handleCreateCorpus = () => {
    if (!newCorpusName.trim()) return;
    createCorpus(newCorpusName, { select: true });
    setNewCorpusName('');
  };

  const handleRenameCorpus = (corpusId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // corpusId currently equals the old name
    const oldName = corpusId;

    setCorpus(prev =>
      prev.map(c =>
        c.id === corpusId ? { id: trimmed, name: trimmed } : c
      )
    );

    // Update corpus names inside sources
    setSources(prev =>
      prev.map(s => ({
        ...s,
        corpusNames: s.corpusNames.map(cn => (cn === oldName ? trimmed : cn)),
      }))
    );

    // Fix selection if we were on the renamed corpus
    setSelectedCorpusName(prev => (prev === oldName ? trimmed : prev));
  };

  const handleDeleteCorpus = async (corpusId: string) => {
    const nameToRemove = corpusId; // currently equivalent

    await removeCorpus(corpusId);
    setCorpus(prev => prev.filter(c => c.id !== corpusId));

    // Remove that corpus label from all sources
    setSources(prev =>
      prev.map(s => ({
        ...s,
        corpusNames: s.corpusNames.filter(cn => cn !== nameToRemove),
      }))
    );

    // Clear selection if we were on it
    setSelectedCorpusName(prev => (prev === nameToRemove ? '' : prev));
  };

  const handleAssignSourceToSelectedCorpus = async (sourceId: string) => {
    if (!selectedCorpusName) return;

    const resp = await addSourceToCorpus(sourceId, selectedCorpus?.name!);

    if (resp.error) {
      alert(resp.error);
      return;
    }

    setSources(prev =>
      prev.map(s =>
        s.id === sourceId && !s.corpusNames.includes(selectedCorpusName)
          ? { ...s, corpusNames: [...s.corpusNames, selectedCorpusName] }
          : s
      )
    );
  };

  const handleSelectCorpus = (id: string) => setSelectedCorpusName(id);

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedCorpusName) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input };
    setChatMessages(prev => [...prev, userMsg]);
    setInput('');
    setBusy(true);

    const resp = await ask(input, k, sites);
    if (resp.error) alert(resp.error);

    setBusy(false);

    const fakeReply: ChatMessage = {
      id: `${Date.now()}-a`,
      role: 'assistant',
      content: `${resp.answer}`,
    };

    setChatMessages(prev => [...prev, fakeReply]);
  };

  const sourcesForSidebar = sources;

  // --- "+ Add" modal handlers ---
  const openAddModal = () => {
    setAddType(null); // reset to first step (choose type)
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setAddType(null);
  };

  const handleConfirmWebsite = async () => {
    if (!urlToIngest.trim()) return;
    await onIngestUrl();
    closeAddModal();
  };

  const handleConfirmDocument = async () => {
    if (!file) return;
    await onUpload();
    closeAddModal();
  };

  // --- Manage modal handlers ---
  const openManageModal = () => {
    setIsManageModalOpen(true);
  };

  const closeManageModal = () => {
    setIsManageModalOpen(false);
  };

  const bulkAssignSourcesToCorpus = async (sourceIds: string[], corpusName: string) => {
    if (!corpusName || sourceIds.length === 0) return;
    setBusy(true);
    for (const sourceId of sourceIds) {
      const resp = await addSourceToCorpus(sourceId, corpusName);
      if (resp.error) {
        alert(resp.error);
        break;
      }
    }
    await refresh();
    setBusy(false);
  };

  const bulkDeleteSources = async (sourceIds: string[]) => {
    if (sourceIds.length === 0) return;
    setBusy(true);
    for (const id of sourceIds) {
      await deleteSource(id);
    }
    await refresh();
    setBusy(false);
  };

  console.log(sourcesForSidebar);

  const handleOpenDocument = async (sourceId: string) => {
    console.log(sourceId);
    const blob = await getFile(sourceId);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <SideBar
        handleOpenDocument={handleOpenDocument}
        onDelete={onDelete}
        openAddModal={openAddModal}
        openManageModal={openManageModal}
        corpus={corpus}
        selectedCorpusName={selectedCorpusName}
        handleSelectCorpus={handleSelectCorpus}
        newCorpusName={newCorpusName}
        setNewCorpusName={setNewCorpusName}
        handleCreateCorpus={handleCreateCorpus}
        sourcesForSidebar={sourcesForSidebar}
        handleAssignSourceToSelectedCorpus={handleAssignSourceToSelectedCorpus}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold">
              {`Chat to Corpus`}
            </h2>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-gray-50">
          {chatMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              {selectedCorpus
                ? `Ask a question about "${selectedCorpus.name}"...`
                : 'Select a corpus to begin chatting'}
            </div>
          ) : (
            chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`max-w-xl px-4 py-2 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'ml-auto bg-blue-600 text-white'
                    : 'mr-auto bg-gray-200 text-gray-800'
                }`}
              >
                {msg.content}
              </div>
            ))
          )}
        </section>

        {/* Input */}
        <footer className="border-t border-gray-200 bg-white px-6 py-3">
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!isChatDisabled) handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
              placeholder={
                selectedCorpus
                  ? `Ask a question about "${selectedCorpus.name}"...`
                  : 'Select a corpus to chat'
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isChatDisabled}
            />
            <button
              type="submit"
              disabled={isChatDisabled || !input.trim() || busy}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-default`}
            >
              {busy ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <span>Thinking...</span>
                </>
              ) : (
                'Send'
              )}
            </button>
          </form>
          {isChatDisabled && (
            <p className="mt-1 text-xs text-red-500">
              You must select a corpus before sending queries.
            </p>
          )}
        </footer>
      </main>

      <AddSourceModal
        open={isAddModalOpen}
        busy={busy}
        addType={addType}
        urlToIngest={urlToIngest}
        file={file}
        setAddType={setAddType}
        setUrlToIngest={setUrlToIngest}
        setFile={setFile}
        onConfirmWebsite={handleConfirmWebsite}
        onConfirmDocument={handleConfirmDocument}
        onClose={closeAddModal}
      />

      <ManageModal
        open={isManageModalOpen}
        busy={busy}
        corpus={corpus}
        sources={sources}
        selectedCorpusName={selectedCorpusName}
        onClose={closeManageModal}
        onBulkAssign={bulkAssignSourcesToCorpus}
        onBulkDeleteSources={bulkDeleteSources}
        onCreateCorpus={name => createCorpus(name)}
        onRenameCorpus={handleRenameCorpus}
        onDeleteCorpus={handleDeleteCorpus}
      />
    </div>
  );
};

export default App;