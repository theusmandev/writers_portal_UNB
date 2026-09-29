import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAdminSpotlightById, createSpotlight, updateSpotlight } from "@/services/portalApi";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Loader2, ArrowLeft, Save, Search, X, Eye, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { slugify } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import type { WriterSpotlightRow, WriterRow } from "@/lib/supabase.types";

export default function AdminSpotlightEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [writerId, setWriterId] = useState("");
  const [spotlightLabel, setSpotlightLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(true);

  // Writers list for dropdown
  const [writers, setWriters] = useState<Pick<WriterRow, "id" | "full_name" | "pen_name" | "email">[]>([]);
  const [writerSearch, setWriterSearch] = useState("");
  const [isWriterDropdownOpen, setIsWriterDropdownOpen] = useState(false);

  // Stable token for Google Drive folder linking (images in rich text)
  const [folderToken] = useState(() => {
    if (!isNew && id) return id;
    return crypto.randomUUID();
  });

  useEffect(() => {
    async function load() {
      try {
        // Fetch writers for the select picker
        const { data: wData, error: wErr } = await supabase
          .from("writers")
          .select("id, full_name, pen_name, email")
          .order("full_name");
        
        if (wErr) throw wErr;
        setWriters(wData ?? []);

        if (isNew) {
          setLoading(false);
          return;
        }

        // Fetch existing spotlight
        const res = await getAdminSpotlightById(id!);
        if (res.success && res.data) {
          setWriterId(res.data.writer_id);
          setSpotlightLabel(res.data.spotlight_label || "");
          setSlug(res.data.slug);
          setContent(res.data.spotlight_content || "");
          setPublished(res.data.is_published);
        } else {
          setError(res.error || "Failed to load spotlight.");
        }
      } catch (err: any) {
        setError(err.message || "Could not load data.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id, isNew]);

  function handleLabelChange(val: string) {
    setSpotlightLabel(val);
    if (isNew) {
      // Auto-generate slug
      setSlug(slugify(val));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!writerId || !slug.trim()) {
      setError("Writer and Slug are required.");
      return;
    }

    setSaving(true);
    setError(null);

    const spotlightData: Partial<WriterSpotlightRow> = {
      writer_id: writerId,
      spotlight_label: spotlightLabel.trim() || null,
      slug: slug.trim(),
      spotlight_content: content.trim() || null,
      is_published: published,
    };

    if (isNew) {
      spotlightData.id = folderToken; // ensure PK matches the Drive folder token
      const res = await createSpotlight(spotlightData);
      if (res.success) {
        navigate("/admin/spotlights");
      } else {
        setError(res.error);
        setSaving(false);
      }
    } else {
      const res = await updateSpotlight(id!, spotlightData);
      if (res.success) {
        navigate("/admin/spotlights");
      } else {
        setError(res.error);
        setSaving(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/spotlights")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? "Create Spotlight" : "Edit Spotlight"}
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          
          <div className="space-y-2">
            <Label htmlFor="writer">Writer <span className="text-destructive">*</span></Label>
            
            {writerId ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
                <div>
                  <div className="font-medium">
                    {writers.find((w) => w.id === writerId)?.full_name || "Unknown Writer"}
                    {writers.find((w) => w.id === writerId)?.pen_name && ` (pen: ${writers.find((w) => w.id === writerId)?.pen_name})`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {writers.find((w) => w.id === writerId)?.email}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setWriterId("");
                    setWriterSearch("");
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name or email..."
                    value={writerSearch}
                    onChange={(e) => {
                      setWriterSearch(e.target.value);
                      setIsWriterDropdownOpen(true);
                    }}
                    onFocus={() => setIsWriterDropdownOpen(true)}
                    className="pl-9"
                  />
                </div>
                
                {isWriterDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-0" 
                      onClick={() => setIsWriterDropdownOpen(false)} 
                    />
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none">
                      {writers.filter(w => 
                        w.full_name.toLowerCase().includes(writerSearch.toLowerCase()) || 
                        (w.pen_name && w.pen_name.toLowerCase().includes(writerSearch.toLowerCase())) ||
                        w.email.toLowerCase().includes(writerSearch.toLowerCase())
                      ).length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No writers found.</div>
                      ) : (
                        writers.filter(w => 
                          w.full_name.toLowerCase().includes(writerSearch.toLowerCase()) || 
                          (w.pen_name && w.pen_name.toLowerCase().includes(writerSearch.toLowerCase())) ||
                          w.email.toLowerCase().includes(writerSearch.toLowerCase())
                        ).map((w) => (
                          <div
                            key={w.id}
                            className="flex cursor-pointer flex-col p-2 px-3 text-sm hover:bg-muted"
                            onClick={() => {
                              setWriterId(w.id);
                              setIsWriterDropdownOpen(false);
                            }}
                          >
                            <div className="font-medium">
                              {w.full_name} {w.pen_name && <span className="text-muted-foreground font-normal">(pen: {w.pen_name})</span>}
                            </div>
                            <div className="text-xs text-muted-foreground">{w.email}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Spotlight Label</Label>
            <Input 
              id="label"
              value={spotlightLabel} 
              onChange={(e) => handleLabelChange(e.target.value)} 
              placeholder="e.g. Featured Author: Jane Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug <span className="text-destructive">*</span></Label>
            <Input 
              id="slug"
              value={slug} 
              onChange={(e) => setSlug(e.target.value)} 
              placeholder="author-jane-doe"
              required
            />
            <p className="text-xs text-muted-foreground">
              This will be used in the URL: /spotlight/<strong>{slug || "..."}</strong>
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="content">Spotlight Content (Rich Text)</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              postFolderToken={folderToken}
            />
          </div>

        </div>

        {/* Publishing Status */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-0.5">
            <Label htmlFor="published" className="text-base">Published</Label>
            <p className="text-sm text-muted-foreground">
              Make this spotlight visible to the public.
            </p>
          </div>
          <Switch 
            id="published" 
            checked={published} 
            onCheckedChange={setPublished} 
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate("/admin/spotlights")}>
            Cancel
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" type="button">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
              <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border p-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Preview — Unsaved Changes</h2>
              </div>
              <div className="relative">
                {/* ── Spotlight Hero ── */}
                <div className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-32 border-b border-border">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden flex justify-center" aria-hidden="true">
                    <svg viewBox="0 0 800 600" className="absolute top-0 w-full max-w-[800px] h-[600px] opacity-80 dark:opacity-60" preserveAspectRatio="xMidYMin slice">
                      <defs>
                        <linearGradient id="spotlight-beam" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="spotlight-beam-core" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <g transform="translate(520, 0)">
                        <rect x="-12" y="-5" width="24" height="15" rx="2" className="fill-primary" />
                        <rect x="-3" y="10" width="6" height="25" className="fill-primary" />
                        <circle cx="0" cy="35" r="5" className="fill-primary" />
                      </g>
                      <g transform="translate(520, 35) rotate(15)">
                        <path d="M-22,27 L-400,600 L400,600 L22,27 Z" fill="url(#spotlight-beam)" />
                        <path d="M-12,27 L-160,600 L160,600 L12,27 Z" fill="url(#spotlight-beam-core)" />
                        <path d="M-6,0 L6,0 L12,8 L-12,8 Z" className="fill-primary" />
                        <path d="M-16,8 L16,8 L22,22 L-22,22 Z" className="fill-primary" />
                        <path d="M-18,12 L18,12" stroke="currentColor" strokeWidth="1.5" className="text-background" opacity="0.6" />
                        <path d="M-20,17 L20,17" stroke="currentColor" strokeWidth="1.5" className="text-background" opacity="0.6" />
                        <rect x="-24" y="22" width="48" height="5" rx="1.5" className="fill-primary" />
                        <ellipse cx="0" cy="27" rx="20" ry="4" fill="#fde68a" opacity="0.8" />
                      </g>
                    </svg>
                  </div>
                  <div className="relative mx-auto max-w-4xl px-6 text-center">
                    <div className="mb-6 flex justify-center">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold tracking-[0.15em] text-amber-700 dark:text-amber-400 shadow-sm backdrop-blur-sm uppercase">
                        <Sparkles className="h-4 w-4" />
                        {spotlightLabel || "Writer Spotlight"}
                      </div>
                    </div>
                    <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                      {writerId ? writers.find((w) => w.id === writerId)?.full_name || "Writer Name" : "Writer Name"}
                    </h1>
                  </div>
                </div>
                <div className="mx-auto max-w-3xl px-5 py-12 md:py-16 space-y-12">
                  {content ? (
                    <section aria-label="Spotlight content" className="relative mt-8">
                      <div 
                        className={`absolute -top-10 text-[10rem] text-primary/10 font-serif select-none pointer-events-none leading-none ${/[\u0600-\u06FF]/.test(content) ? '-right-4' : '-left-6'}`}
                        aria-hidden="true"
                      >
                        &ldquo;
                      </div>
                      <div
                        className={`relative z-10 urdu prose prose-lg prose-stone dark:prose-invert max-w-none prose-headings:font-urdu prose-a:text-primary hover:prose-a:text-primary/80 prose-p:leading-loose prose-headings:leading-[1.8] leading-loose ${
                          !/[\u0600-\u06FF]/.test(content)
                            ? "[&>p:first-of-type::first-letter]:text-7xl [&>p:first-of-type::first-letter]:font-serif [&>p:first-of-type::first-letter]:text-primary [&>p:first-of-type::first-letter]:float-left [&>p:first-of-type::first-letter]:mr-4 [&>p:first-of-type::first-letter]:leading-[0.8] [&>p:first-of-type::first-letter]:mt-2"
                            : "border-r-4 border-primary/40 pr-6"
                        }`}
                        dir="auto"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
                      />
                    </section>
                  ) : (
                    <section aria-label="Spotlight content">
                      <p className="text-muted-foreground italic text-sm">
                        No content provided for this spotlight.
                      </p>
                    </section>
                  )}
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                    Published novels and social card will also appear here based on the writer's profile.
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving..." : "Save Spotlight"}
          </Button>
        </div>
      </form>
    </div>
  );
}
