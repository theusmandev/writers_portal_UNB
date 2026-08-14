import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAdminPostById, createPost, updatePost } from "@/services/portalApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import type { PostRow } from "@/lib/supabase.types";

export default function AdminPostEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [published, setPublished] = useState(true);

  useEffect(() => {
    if (isNew) return;
    async function load() {
      const res = await getAdminPostById(id!);
      if (res.success && res.data) {
        setTitle(res.data.title);
        setSlug(res.data.slug);
        setContent(res.data.content);
        setMetaTitle(res.data.meta_title || "");
        setMetaDesc(res.data.meta_description || "");
        setPublished(res.data.published);
      } else {
        setError("Failed to load post.");
      }
      setLoading(false);
    }
    void load();
  }, [id, isNew]);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (isNew) {
      // Auto-generate slug
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      setSlug(generatedSlug);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !slug.trim()) {
      setError("Title, Slug, and Content are required.");
      return;
    }

    setSaving(true);
    setError(null);

    const postData: Partial<PostRow> = {
      title,
      slug,
      content,
      published,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDesc.trim() || null,
    };

    if (isNew) {
      const res = await createPost(postData);
      if (res.success) {
        navigate("/admin/posts");
      } else {
        setError(res.error);
        setSaving(false);
      }
    } else {
      const res = await updatePost(id!, postData);
      if (res.success) {
        navigate("/admin/posts");
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
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/posts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? "Create Post" : "Edit Post"}
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
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input 
              id="title"
              value={title} 
              onChange={(e) => handleTitleChange(e.target.value)} 
              placeholder="Post title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug <span className="text-destructive">*</span></Label>
            <Input 
              id="slug"
              value={slug} 
              onChange={(e) => setSlug(e.target.value)} 
              placeholder="post-url-slug"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content (supports Urdu text) <span className="text-destructive">*</span></Label>
            <Textarea 
              id="content"
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="Write your post content here..."
              className="urdu min-h-[300px] font-sans"
              dir="auto"
              required
            />
          </div>

        </div>

        {/* SEO Settings */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">SEO Settings (Optional)</h2>
          
          <div className="space-y-2">
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input 
              id="metaTitle"
              value={metaTitle} 
              onChange={(e) => setMetaTitle(e.target.value)} 
              placeholder="Defaults to post title if left blank"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <Label htmlFor="metaDesc">Meta Description</Label>
              <span className={`text-xs ${metaDesc.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                {metaDesc.length} / 160 characters
              </span>
            </div>
            <Textarea 
              id="metaDesc"
              value={metaDesc} 
              onChange={(e) => setMetaDesc(e.target.value)} 
              placeholder="A short summary of the post for search engines..."
              className="h-20"
              dir="auto"
            />
          </div>
        </div>

        {/* Publishing Status */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-0.5">
            <Label htmlFor="published" className="text-base">Published</Label>
            <p className="text-sm text-muted-foreground">
              Make this post visible to the public.
            </p>
          </div>
          <Switch 
            id="published" 
            checked={published} 
            onCheckedChange={setPublished} 
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate("/admin/posts")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving..." : "Save Post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
