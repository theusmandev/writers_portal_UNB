import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, ExternalLink, Loader2, Save, AlertCircle, Globe, EyeOff,
  Calendar, FileText, Star, ChevronDown, ChevronRight, CheckCircle2, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { supabase } from "@/lib/supabase";
import { getWriterWithSubmissions, setFeaturedWriter, type WriterDetailWithSubmissions } from "@/services/portalApi";

const statusColors: Record<string, string> = {
  Received: "bg-blue-500/10 text-blue-600",
  "Under Initial Review": "bg-yellow-500/10 text-yellow-600",
  "Under Editorial Review": "bg-purple-500/10 text-purple-600",
  "Action Required": "bg-orange-500/10 text-orange-600",
  Approved: "bg-green-500/10 text-green-600",
  Formatting: "bg-teal-500/10 text-teal-600",
  "Scheduled for Publication": "bg-indigo-500/10 text-indigo-600",
  Published: "bg-primary/10 text-primary",
  Rejected: "bg-destructive/10 text-destructive",
  Withdrawn: "bg-muted text-muted-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Converts a display name to a URL-friendly slug */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")   // strip special chars
    .replace(/\s+/g, "-")        // spaces → hyphens
    .replace(/-+/g, "-");        // collapse consecutive hyphens
}

export default function AdminWriterDetail() {
  const { id } = useParams<{ id: string }>();
  const [writer, setWriter] = useState<WriterDetailWithSubmissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Profile form state ───────────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [penName, setPenName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [socialMediaLink, setSocialMediaLink] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // ── Featured Writer section state ────────────────────────────────────────────
  const [featuredOpen, setFeaturedOpen] = useState(false);

  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredBio, setFeaturedBio] = useState("");
  const [featuredSlug, setFeaturedSlug] = useState("");
  const [lookerUrl, setLookerUrl] = useState("");

  // Tracks whether this writer already had a slug when the page loaded
  const [hadExistingSlug, setHadExistingSlug] = useState(false);

  const [featuredSaving, setFeaturedSaving] = useState(false);
  const [featuredSaveMsg, setFeaturedSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // ── Load ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    void loadWriterData();
  }, [id]);

  async function loadWriterData() {
    setLoading(true);
    setError(null);
    const res = await getWriterWithSubmissions(id!);
    if (!res.success) {
      setError(res.error);
    } else {
      const w = res.data;
      setWriter(w);

      // Profile fields
      setFullName(w.full_name);
      setPenName(w.pen_name ?? "");
      setEmail(w.email);
      setWhatsapp(w.whatsapp ?? "");
      setBio(w.bio ?? "");
      setSocialMediaLink(w.social_media_link ?? "");
      setIsPublic(w.is_public);

      // Featured Writer fields
      setIsFeatured(w.is_featured ?? false);
      setFeaturedBio(w.featured_bio ?? "");
      setFeaturedSlug(w.featured_slug ?? "");
      setLookerUrl(w.looker_studio_embed_url ?? "");
      setHadExistingSlug(!!w.featured_slug);

      // Auto-expand if already featured
      if (w.is_featured) setFeaturedOpen(true);
    }
    setLoading(false);
  }

  // ── Profile save ─────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!writer || !id) return;
    setSaving(true);
    setSaveMsg(null);

    const { error: err } = await supabase
      .from("writers")
      .update({
        full_name: fullName.trim(),
        pen_name: penName.trim() || null,
        email: email.trim(),
        whatsapp: whatsapp.trim() || null,
        bio: bio.trim() || null,
        social_media_link: socialMediaLink.trim() || null,
        is_public: isPublic,
      })
      .eq("id", id);

    if (err) {
      setSaveMsg("❌ Save failed: " + err.message);
    } else {
      setSaveMsg("✓ Saved successfully");
      setWriter((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName.trim(),
              pen_name: penName.trim() || null,
              email: email.trim(),
              whatsapp: whatsapp.trim() || null,
              bio: bio.trim() || null,
              social_media_link: socialMediaLink.trim() || null,
              is_public: isPublic,
            }
          : null,
      );
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  }

  // ── Featured toggle handler ───────────────────────────────────────────────────

  function handleFeaturedToggle(val: boolean) {
    setIsFeatured(val);
    setSlugError(null);

    // Auto-populate slug only when turning ON and no slug existed when page loaded
    if (val && !hadExistingSlug && !featuredSlug) {
      const displayName = penName.trim() || fullName.trim();
      setFeaturedSlug(slugify(displayName));
    }
  }

  // ── Featured Writer save ──────────────────────────────────────────────────────

  async function handleFeaturedSave() {
    if (!id) return;
    setFeaturedSaving(true);
    setFeaturedSaveMsg(null);
    setSlugError(null);

    const res = await setFeaturedWriter(
      id,
      isFeatured,
      featuredBio,
      featuredSlug,
      lookerUrl,
    );

    if (res.success) {
      setFeaturedSaveMsg({ type: "success", text: "Featured writer settings saved." });
      // Keep hadExistingSlug in sync so future toggles don't re-auto-populate
      if (featuredSlug.trim()) setHadExistingSlug(true);
      // Fetch fresh data from DB to get the server-generated dashboard_token (if any)
      const freshRes = await getWriterWithSubmissions(id);
      if (freshRes.success) {
        setWriter(freshRes.data);
      }
      setTimeout(() => setFeaturedSaveMsg(null), 4000);
    } else if (res.error === "__SLUG_COLLISION__") {
      setSlugError("This slug is already in use by another writer. Please choose a different one.");
    } else {
      setFeaturedSaveMsg({ type: "error", text: res.error });
    }

    setFeaturedSaving(false);
  }

  // ── Origin for public links ───────────────────────────────────────────────────
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // ── Render guards ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !writer) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" /> {error ?? "Writer not found"}
      </div>
    );
  }

  const publicPageUrl = `${origin}/writers/featured/${featuredSlug.trim()}`;
  const showPublicLinks = writer.is_featured && !!writer.featured_slug;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <Link
          to="/admin/writers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to writers list
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{writer.full_name}</h1>
            {writer.pen_name && writer.pen_name !== writer.full_name && (
              <p className="text-sm text-muted-foreground mt-1">Pen Name: {writer.pen_name}</p>
            )}
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isPublic
                ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {isPublic ? (
              <>
                <Globe className="h-3.5 w-3.5" /> Public on /writers
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" /> Private Directory Only
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT/MID — Writer Profile form + Featured Writer section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Writer Profile */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-soft">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Writer Profile
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="writer-name">Full Name</Label>
                <Input
                  id="writer-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="writer-penname">Pen Name</Label>
                <Input
                  id="writer-penname"
                  value={penName}
                  onChange={(e) => setPenName(e.target.value)}
                  placeholder="Leave empty if same as full name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="writer-email">Email address</Label>
                <Input
                  id="writer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="writer-whatsapp">WhatsApp Number</Label>
                <Input
                  id="writer-whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+92 300 1234567"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="writer-bio">Author Bio</Label>
              <Textarea
                id="writer-bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Author biography..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="writer-social">Social Media Link</Label>
              <Input
                id="writer-social"
                value={socialMediaLink}
                onChange={(e) => setSocialMediaLink(e.target.value)}
                placeholder="https://facebook.com/yourprofile"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save profile changes
              </Button>
              {saveMsg && (
                <span
                  className={`text-xs ${saveMsg.startsWith("✓") ? "text-green-600" : "text-destructive"}`}
                >
                  {saveMsg}
                </span>
              )}
            </div>
          </section>

          {/* ── Featured Writer Section ─────────────────────────────────── */}
          <section className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            {/* Collapsible header */}
            <button
              id="featured-writer-toggle"
              type="button"
              onClick={() => setFeaturedOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Star
                  className={`h-4 w-4 flex-shrink-0 transition-colors ${
                    writer.is_featured ? "text-amber-500 fill-amber-400" : "text-muted-foreground"
                  }`}
                />
                <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Featured Writer
                </span>
                {writer.is_featured && (
                  <span className="rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium px-2 py-0.5">
                    Active
                  </span>
                )}
              </div>
              {featuredOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </button>

            {/* Collapsible body */}
            {featuredOpen && (
              <div className="px-5 pb-5 space-y-5 border-t border-border/60">
                {/* Toggle */}
                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="is-featured-switch"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Feature this writer
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Enables a public profile page at{" "}
                      <code className="font-mono">/writers/featured/[slug]</code>
                    </p>
                  </div>
                  <Switch
                    id="is-featured-switch"
                    checked={isFeatured}
                    onCheckedChange={handleFeaturedToggle}
                    disabled={featuredSaving}
                  />
                </div>

                {/* Revealed fields when featured is ON */}
                {isFeatured && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Featured bio */}
                    <div className="space-y-1.5">
                      <Label htmlFor="featured-bio-editor">Featured Bio</Label>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Rich HTML bio shown on the public featured writer page.
                      </p>
                      <RichTextEditor
                        content={featuredBio}
                        onChange={setFeaturedBio}
                        size="compact"
                      />
                    </div>

                    {/* Featured slug */}
                    <div className="space-y-1.5">
                      <Label htmlFor="featured-slug">Featured Slug</Label>
                      <Input
                        id="featured-slug"
                        value={featuredSlug}
                        onChange={(e) => {
                          setFeaturedSlug(e.target.value);
                          setSlugError(null);
                        }}
                        placeholder="e.g. fatima-malik"
                        className={slugError ? "border-destructive focus-visible:ring-destructive/30" : ""}
                      />
                      {slugError ? (
                        <p className="text-xs text-destructive flex items-center gap-1.5 mt-1">
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          {slugError}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Public URL will be:{" "}
                          <code className="font-mono">
                            /writers/featured/{featuredSlug.trim() || "[slug]"}
                          </code>
                        </p>
                      )}
                    </div>

                    {/* Looker Studio embed URL */}
                    <div className="space-y-1.5">
                      <Label htmlFor="looker-url">Looker Studio Embed URL</Label>
                      <Input
                        id="looker-url"
                        value={lookerUrl}
                        onChange={(e) => setLookerUrl(e.target.value)}
                        placeholder="https://lookerstudio.google.com/embed/reporting/..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste the embed URL from Looker Studio's{" "}
                        <span className="font-medium">Share &gt; Embed report</span> option.
                      </p>
                    </div>
                  </div>
                )}

                {/* Save button row */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    id="featured-save-btn"
                    onClick={() => void handleFeaturedSave()}
                    disabled={featuredSaving}
                    variant="default"
                  >
                    {featuredSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Featured Writer Settings
                  </Button>
                  {featuredSaveMsg && (
                    <span
                      className={`flex items-center gap-1.5 text-xs ${
                        featuredSaveMsg.type === "success" ? "text-green-600" : "text-destructive"
                      }`}
                    >
                      {featuredSaveMsg.type === "success" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5" />
                      )}
                      {featuredSaveMsg.text}
                    </span>
                  )}
                </div>

                {/* Read-only links — shown after a successful save where is_featured=true and slug exists */}
                {showPublicLinks && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Active Links
                    </p>

                    {/* Public page */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Public profile page</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono bg-background border border-border rounded-md px-2.5 py-1.5 truncate">
                          {publicPageUrl}
                        </code>
                        <a
                          href={publicPageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => void navigator.clipboard.writeText(publicPageUrl)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Copy URL"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dashboard link — only shown if a dashboard_token exists */}
                    {writer.dashboard_token && (
                      <div className="space-y-1 mt-4 pt-3 border-t border-border/40">
                        <p className="text-xs text-muted-foreground">
                          Analytics dashboard (private)
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono bg-background border border-border rounded-md px-2.5 py-1.5 truncate">
                            {`${origin}/writer-stats/${writer.dashboard_token}`}
                          </code>
                          <a
                            href={`${origin}/writer-stats/${writer.dashboard_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Open in new tab"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => void navigator.clipboard.writeText(`${origin}/writer-stats/${writer.dashboard_token}`)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Copy URL"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-amber-600 font-medium mt-1">
                          Share this link only with {writer.pen_name || writer.full_name} — do not post it publicly.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Submissions History list */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-soft">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Submission History ({writer.submissions.length})
            </h2>

            {writer.submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4">No submissions found for this writer.</p>
            ) : (
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
                      <th className="px-4 py-2.5">Code</th>
                      <th className="px-4 py-2.5">Novel Title</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Submitted</th>
                      <th className="px-4 py-2.5">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {writer.submissions.map((sub) => (
                      <tr
                        key={sub.id}
                        className="border-b border-border/40 hover:bg-muted/10 transition-colors last:border-b-0 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-primary">
                          <Link to={`/admin/submissions/${sub.id}`} className="hover:underline">
                            {sub.submission_code}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <Link to={`/admin/submissions/${sub.id}`} className="hover:underline">
                            {sub.novel_title}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              statusColors[sub.current_status] ?? "bg-muted text-muted-foreground"
                            }`}
                          >
                            {sub.current_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatDate(sub.submission_date)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs font-medium">
                          {formatDate(sub.last_updated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT — Summary sidebar */}
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-soft">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Registration Info
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs">{writer.id}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <dt className="text-muted-foreground">Registered</dt>
                <dd className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDate(writer.registration_date)}
                </dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-muted-foreground">Submissions count</dt>
                <dd className="font-semibold">{writer.submissions.length}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
