import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAdminSpotlightById, createSpotlight, updateSpotlight } from "@/services/portalApi";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Loader2, ArrowLeft, Save, Search, X } from "lucide-react";
import { slugify } from "@/lib/utils";
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
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving..." : "Save Spotlight"}
          </Button>
        </div>
      </form>
    </div>
  );
}
