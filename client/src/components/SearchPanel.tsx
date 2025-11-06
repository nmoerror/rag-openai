import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Globe2, Search, ListChecks, ChevronDown, Plus, Sparkles, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { Toaster, toast } from 'sonner';

// Types
export type DocItem = {
  id: string;
  name: string;
  sizeKB?: number;
  updatedAt?: string; // ISO
};

export type SiteItem = {
  id: string;
  url: string;
  title?: string;
  faviconUrl?: string;
};

export type SearchPanelProps = {
  documents: DocItem[];
  sites: SiteItem[];
  initialQuery?: string;
  defaultSources?: Array<'documents' | 'web'>; // default both
  onSearch: (
    query: string,
    options: {
      sources: Array<'documents' | 'web'>;
      limitToSelected: boolean;
      selectedDocumentIds: string[];
      selectedSiteIds: string[];
    }
  ) => void;
  /** Triggered when the user selects files to upload */
  onAddDocument?: (files: FileList) => void;
  /** Triggered when the user clicks Index with a URL */
  onAddWebsite?: (url: string) => void;
};

export default function SearchPanel({
  documents,
  sites,
  initialQuery = '',
  defaultSources = ['documents', 'web'],
  onSearch,
  onAddDocument,
  onAddWebsite,
}: SearchPanelProps){
  const [query, setQuery] = useState(initialQuery);
  const [sources, setSources] = useState<Array<'documents' | 'web'>>(defaultSources);
  const [limitToSelected, setLimitToSelected] = useState(false);
  const [tab, setTab] = useState<'documents' | 'web'>('documents');

  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({});
  const [selectedSites, setSelectedSites] = useState<Record<string, boolean>>({});

  const [addOpen, setAddOpen] = useState(false);
  const [showWebsiteForm, setShowWebsiteForm] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const docsSelectedCount = useMemo(() => Object.values(selectedDocs).filter(Boolean).length, [selectedDocs]);
  const sitesSelectedCount = useMemo(() => Object.values(selectedSites).filter(Boolean).length, [selectedSites]);

  const docsAllChecked = documents.length > 0 && docsSelectedCount === documents.length;
  const sitesAllChecked = sites.length > 0 && sitesSelectedCount === sites.length;
  const docsIndeterminate = docsSelectedCount > 0 && !docsAllChecked;
  const sitesIndeterminate = sitesSelectedCount > 0 && !sitesAllChecked;

  const canSearch = true; // chat can send even empty to continue context

  const visibleSources = {
    documents: sources.includes('documents'),
    web: sources.includes('web'),
  };

  function toggleSource(key: 'documents' | 'web'){
    setSources((prev) => {
      const has = prev.includes(key);
      if (has) {
        const next = prev.filter((s) => s !== key);
        return next.length ? next : [key]; // ensure at least one source
      } else {
        return [...prev, key];
      }
    });
  }

  function handleDocSelect(id: string, checked: boolean){
    setSelectedDocs((prev) => ({ ...prev, [id]: checked }));
  }

  function handleSiteSelect(id: string, checked: boolean){
    setSelectedSites((prev) => ({ ...prev, [id]: checked }));
  }

  function handleSelectAllDocuments(checked: boolean){
    if (!documents.length) return;
    const next: Record<string, boolean> = {};
    documents.forEach((d) => (next[d.id] = checked));
    setSelectedDocs(next);
  }

  function handleSelectAllSites(checked: boolean){
    if (!sites.length) return;
    const next: Record<string, boolean> = {};
    sites.forEach((s) => (next[s.id] = checked));
    setSelectedSites(next);
  }

  async function submit(){
    try {
      setIsSending(true);
      onSearch(query, {
        sources,
        limitToSelected,
        selectedDocumentIds: Object.entries(selectedDocs)
          .filter(([, v]) => v)
          .map(([k]) => k),
        selectedSiteIds: Object.entries(selectedSites)
          .filter(([, v]) => v)
          .map(([k]) => k),
      });
    } finally {
      setIsSending(false);
    }
  }

  function addDocument(){
    if (fileInputRef.current) fileInputRef.current.click();
  }

  function addWebsite(){
    setShowWebsiteForm(true);
  }

  return (
    <TooltipProvider>
      <Card
        className="w-full border border-neutral-200/70 dark:border-neutral-800/70 shadow-md rounded-2xl overflow-hidden relative"
      >
        {/* lively gradient header background */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-amber-500/10 blur-2xl"
        />
        <CardHeader className="pb-4 relative">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary"/>
              AI Chat
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Add (+) button with popout */}
              <Popover
                open={addOpen}
                onOpenChange={(v) => {
                  setAddOpen(v);
                  if (!v) {
                    setShowWebsiteForm(false);
                    setWebsiteUrl('');
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button variant="default" size="sm" className="h-9">
                    <Plus className="mr-1.5 h-4 w-4"/> Add
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[340px] p-3">
                  {!showWebsiteForm ? (
                    <div className="grid gap-2">
                      <button
                        type="button"
                        onClick={addDocument}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/70 text-left transition-colors"
                      >
                        <span
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"
                        >
                          <FileText className="h-4 w-4"/>
                        </span>
                        <div className="leading-tight">
                          <div className="font-medium">Document</div>
                          <div className="text-xs text-muted-foreground">Upload a file from your device</div>
                        </div>
                      </button>

                      <Separator/>

                      <button
                        type="button"
                        onClick={addWebsite}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/70 text-left transition-colors"
                      >
                        <span
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        >
                          <Globe2 className="h-4 w-4"/>
                        </span>
                        <div className="leading-tight">
                          <div className="font-medium">Website</div>
                          <div className="text-xs text-muted-foreground">Add a URL to index</div>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="website-url" className="text-sm">Website URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="website-url"
                          placeholder="https://example.com/article"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className="h-9"
                        />
                        <Button
                          className="h-9"
                          onClick={() => {
                            let url = websiteUrl.trim();
                            if (url && !/^https?:\/\//i.test(url)) {
                              url = `https://${url}`;
                            }
                            if (url) {
                              toast.success('Index started', { description: url });
                              onAddWebsite?.(url);
                              setAddOpen(false);
                              setShowWebsiteForm(false);
                              setWebsiteUrl('');
                            }
                          }}
                          disabled={!websiteUrl.trim()}
                        >
                          index
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">We will crawl and index this URL.</p>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <SourceToggleButton
                active={visibleSources.documents}
                onClick={() => toggleSource('documents')}
                icon={<FileText className="h-4 w-4"/>}
                label="Documents"
                count={documents.length}
              />
              <SourceToggleButton
                active={visibleSources.web}
                onClick={() => toggleSource('web')}
                icon={<Globe2 className="h-4 w-4"/>}
                label="Websites"
                count={sites.length}
              />
            </div>
          </div>

          {/* Chat composer */}
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
              <Textarea
                placeholder="Message your AI… (Shift+Enter for newline)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                className="pl-9 min-h-[44px] max-h-32 text-base resize-y"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  className="h-11 px-5"
                  onClick={submit}
                  disabled={!canSearch || isSending}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                      Sending
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4"/>
                      Send
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send message</TooltipContent>
            </Tooltip>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">Chat with your knowledge base. Toggle sources or limit to
            selections.</p>
        </CardHeader>

        <Separator/>

        <CardContent className="pt-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
            <div className="flex items-center justify-between">
              <TabsList className="grid grid-cols-2 w-[320px]">
                <TabsTrigger value="documents" disabled={!visibleSources.documents}>
                  <FileText className="mr-2 h-4 w-4"/> Documents
                </TabsTrigger>
                <TabsTrigger value="web" disabled={!visibleSources.web}>
                  <Globe2 className="mr-2 h-4 w-4"/> Websites
                </TabsTrigger>
              </TabsList>
              {tab === 'documents' ? (
                <BulkSelect
                  label="Select all documents"
                  checked={docsAllChecked}
                  indeterminate={docsIndeterminate}
                  onChange={handleSelectAllDocuments}
                />
              ) : (
                <BulkSelect
                  label="Select all websites"
                  checked={sitesAllChecked}
                  indeterminate={sitesIndeterminate}
                  onChange={handleSelectAllSites}
                />
              )}
            </div>

            <TabsContent value="documents" className="mt-3">
              <ScrollArea className="h-[280px] rounded-lg border border-border/60 p-1">
                <ul className="divide-y divide-border/60">
                  {documents.length === 0 && (
                    <li className="p-6 text-sm text-muted-foreground">No documents yet.</li>
                  )}
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg">
                      <Checkbox
                        checked={!!selectedDocs[doc.id]}
                        onCheckedChange={(v) => handleDocSelect(doc.id, Boolean(v))}
                        className="mt-0.5"
                        aria-label={`Select ${doc.name}`}
                      />
                      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary">
                        <FileText className="h-4 w-4"/>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{doc.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {doc.sizeKB ? `${Intl.NumberFormat().format(doc.sizeKB)} KB` : ''}
                          {doc.updatedAt ? ` • Updated ${new Date(doc.updatedAt).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="web" className="mt-3">
              <ScrollArea className="h-[280px] rounded-lg border border-border/60 p-1">
                <ul className="divide-y divide-border/60">
                  {sites.length === 0 && (
                    <li className="p-6 text-sm text-muted-foreground">No websites yet.</li>
                  )}
                  {sites.map((site) => (
                    <li key={site.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg">
                      <Checkbox
                        checked={!!selectedSites[site.id]}
                        onCheckedChange={(v) => handleSiteSelect(site.id, Boolean(v))}
                        className="mt-0.5"
                        aria-label={`Select ${site.title || site.url}`}
                      />
                      <div
                        className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      >
                        {site.faviconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={site.faviconUrl} alt="favicon" className="h-4 w-4"/>
                        ) : (
                          <Globe2 className="h-4 w-4"/>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{site.title || site.url}</p>
                        <p className="truncate text-xs text-muted-foreground">{site.url}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Hidden file input for Document upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            toast.success('Uploading documents…', { description: `${files.length} file${files.length > 1 ? 's' : ''}` });
            onAddDocument?.(files);
            // reset the input so the same file can be selected again later
            e.currentTarget.value = '';
          }
          setAddOpen(false);
        }}
      />

      {/* Sonner toast host (render once per app) */}
      <Toaster richColors closeButton position="bottom-right"/>
    </TooltipProvider>
  );
}

// --- Small components ---
function SourceToggleButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}){
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      className={clsx('gap-2 h-9', !active && 'bg-transparent')}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {typeof count === 'number' && (
        <Badge variant={active ? 'secondary' : 'outline'} className="rounded-full ml-1">
          {count}
        </Badge>
      )}
    </Button>
  );
}

function BulkSelect({
  label,
  checked,
  indeterminate,
  onChange,
}: {
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
}){
  return (
    <div className="flex items-center gap-2 text-sm">
      <ListChecks className="h-4 w-4 text-muted-foreground"/>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-muted/60"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <div className="relative">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border/60"
            checked={checked}
            ref={(el) => {
              if (el) el.indeterminate = Boolean(indeterminate);
            }}
            readOnly
          />
        </div>
        <span>{label}</span>
        <ChevronDown className="h-4 w-4 opacity-60"/>
      </button>
    </div>
  );
}

// --- Example usage ---
// <SearchPanel
//   documents={[
//     { id: "d1", name: "Product Spec v2.pdf", sizeKB: 842, updatedAt: "2025-10-30T10:00:00Z" },
//     { id: "d2", name: "API Design.md", sizeKB: 34, updatedAt: "2025-10-29T16:00:00Z" },
//   ]}
//   sites={[
//     { id: "s1", url: "https://openai.com", title: "OpenAI" },
//     { id: "s2", url: "https://vitejs.dev", title: "Vite" },
//   ]}
//   onSearch={(query, opts) => {
//     console.log({ query, ...opts });
//   }}
//   onAddDocument={(files) => console.log("Uploading", files)}
//   onAddWebsite={(url) => console.log("Indexing", url)}
// />
