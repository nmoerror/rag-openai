import React from 'react';
import { Corpus, Source } from '@/App';

type SideBarProps = {
  onDelete: (id: string) => void;
  corpus: Corpus[];
  handleSelectCorpus: (id: string) => void;
  newCorpusName: string;
  selectedCorpusName: string;
  setNewCorpusName: (name: string) => void;
  handleCreateCorpus: () => void;
  sourcesForSidebar: Source[];
  handleAssignSourceToSelectedCorpus: (sourceId: string) => void;
  openAddModal: () => void;
  openManageModal: () => void;
};

const SideBar = ({
  onDelete,
  corpus,
  handleSelectCorpus,
  newCorpusName,
  selectedCorpusName,
  setNewCorpusName,
  handleCreateCorpus,
  sourcesForSidebar,
  handleAssignSourceToSelectedCorpus,
  openAddModal,
  openManageModal,
  handleOpenDocument
}: SideBarProps) => {

  const filteredSources = selectedCorpusName
    ? sourcesForSidebar.filter(src =>
      src.corpusNames?.includes(selectedCorpusName)
    )
    : [];

  return (
    <aside className="w-80 border-r border-gray-200 bg-white flex flex-col shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-base font-semibold text-gray-800">AKIN AI</h1>
        <p className="text-xs text-gray-500"></p>
      </div>
      {/* Corpus */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase font-semibold text-gray-500 tracking-wide">
            Corpus
          </h2>
          <span className="text-[11px] text-gray-400">{corpus.length}</span>
        </div>

        <div className="space-y-1 mb-3 max-h-36 overflow-y-auto">
          {corpus.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelectCorpus(c.name)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition ${
                selectedCorpusName === c.name
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="New corpus"
            value={newCorpusName}
            onChange={e => setNewCorpusName(e.target.value)}
          />
          <button
            onClick={handleCreateCorpus}
            disabled={!newCorpusName.trim()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-default"
          >
            Add
          </button>
        </div>
      </div>

      {/* Sources */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase font-semibold text-gray-500 tracking-wide">
            Sources
          </h2>
          <button onClick={openAddModal} className="text-xs text-blue-600 hover:text-blue-700">
            + Add
          </button>
        </div>

        {filteredSources.length === 0 ? (
          <p
            className="text-xs text-gray-400"
          >{selectedCorpusName ? `No sources saved under ${selectedCorpusName}` : 'Select a Corpus to begin'}</p>
        ) : (
          <ul className="space-y-2">
            {filteredSources.map(src => {
              const isInCorpus =
                !!(selectedCorpusName && src?.corpusNames?.includes(selectedCorpusName));
              return (
                <li
                  onClick={() => handleOpenDocument(src.id)}
                  key={src.id}
                  className="cursor-pointer border border-gray-200 rounded-md p-2 text-xs bg-white hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate text-gray-700 font-medium">{src.name}</span>
                    <span
                      className={`text-[10px] uppercase rounded-full px-1.5 py-0.5 border ${
                        src.sourceType === 'document'
                          ? 'border-green-400 text-green-700 bg-green-50'
                          : 'border-amber-400 text-amber-700 bg-amber-50'
                      }`}
                    >
                      {src.sourceType}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px]">
                    {selectedCorpusName ? (
                      <button
                        disabled={isInCorpus}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAssignSourceToSelectedCorpus(src.id);
                        }}
                        className="text-blue-600 hover:underline disabled:text-gray-400"
                      >
                        {isInCorpus ? 'In corpus' : 'Add to corpus'}
                      </button>
                    ) : (
                      <span className="text-gray-400">Select a corpus</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Manage button */}
      <div className="m-3">
        <button
          key={'manage-button'}
          onClick={openManageModal}
          className="w-full text-left px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition"
        >
          Manage
        </button>
      </div>
    </aside>
  );
};

export default SideBar;