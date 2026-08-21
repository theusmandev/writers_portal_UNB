import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Save, AlertCircle, CheckCircle2, Clock, MessageSquare, FileText, Image, XCircle, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { submissionStatuses, getMissingFileMessage } from "@/data/content";
import type { SubmissionRow, StatusHistoryRow, WriterRow, SubmissionResponseRow, EpisodeRow } from "@/lib/supabase.types";
import { sendNotificationEmail, updateSubmissionFiles, publishEpisodes, deleteSubmission } from "@/services/portalApi";

/**
 * Canonical stage name for each status value.
 * Written alongside current_status so the DB stays consistent.
 */
const STATUS_TO_STAGE: Record<string, string> = {
  Received:                      "Submission Confirmation",
  "Under Initial Review":        "Initial Screening",
  "Under Editorial Review":      "Editorial Review",
  "Action Required":             "Corrections / Information Required",
  Approved:                      "Approval",
  Formatting:                    "Formatting & Preparation",
  "Scheduled for Publication":   "Publication Scheduling",
  Published:                     "Publication",
  Rejected:                      "Rejected",
  Withdrawn:                     "Withdrawn",
};

/** Statuses where admin can write a public note for the writer */
const STATUSES_WITH_NOTE = ["Rejected", "Action Required"] as const;
/** Whether the status requires a note (shows the note textarea) */
const needsNote = (s: string) =>
  (STATUSES_WITH_NOTE as readonly string[]).includes(s);

type Detail = SubmissionRow & {
  writers: WriterRow | null;
};

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

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoRow({ label, value }: { label: string; value?: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

function groupEpisodesByDate(episodes: EpisodeRow[]) {
  const groups: Record<string, EpisodeRow[]> = {};
  for (const ep of episodes) {
    // Extract date part (YYYY-MM-DD)
    const date = ep.created_at.split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(ep);
  }
  return Object.entries(groups).sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
}
function formatToDatetimeLocal(isoString: string | null) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminSubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [history, setHistory] = useState<StatusHistoryRow[]>([]);
  const [writerResponses, setWriterResponses] = useState<SubmissionResponseRow[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Editable fields ──────────────────────────────────────────────────────────
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");          // admin_notes (internal / writer-facing update)
  const [statusNote, setStatusNote] = useState(""); // status_note (visible on Rejected / Action Required cards)
  const [publishedUrl, setPublishedUrl] = useState(""); // published_url (visible on Published card)
  const [estimatedPublishAt, setEstimatedPublishAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
  const [publishingEps, setPublishingEps] = useState(false);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCodeInput, setDeleteCodeInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const [manuscriptResolveUrl, setManuscriptResolveUrl] = useState("");
  const [coverResolveUrl, setCoverResolveUrl] = useState("");
  const [copiedTracking, setCopiedTracking] = useState(false);

  const isTerminalStatus = ["Published", "Rejected", "Withdrawn"].includes(detail?.current_status || "");

  async function handleResolveFile(type: "manuscript" | "cover", url?: string) {
    if (!detail) return;
    const finalUrl = url || "resolved";
    
    // Optimistic update
    setDetail(prev => prev ? {
      ...prev,
      [type === "manuscript" ? "manuscript_upload_failed" : "cover_upload_failed"]: false,
      [type === "manuscript" ? "manuscript_drive_url" : "cover_drive_url"]: finalUrl
    } : prev);

    await updateSubmissionFiles(detail.submission_code, {
      [type === "manuscript" ? "manuscriptUploadFailed" : "coverUploadFailed"]: false,
      [type === "manuscript" ? "manuscriptUrl" : "coverUrl"]: finalUrl
    });
  }

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const [detailRes, historyRes, responsesRes, episodesRes] = await Promise.all([
        supabase.from("submissions").select("*, writers(*)").eq("id", id!).single(),
        supabase
          .from("status_history")
          .select("*")
          .eq("submission_id", id!)
          .order("changed_at", { ascending: false }),
        supabase
          .from("submission_responses")
          .select("*")
          .eq("submission_id", id!)
          .order("submitted_at", { ascending: false }),
        supabase
          .from("episodes")
          .select("*")
          .eq("submission_id", id!)
          .order("episode_number", { ascending: true }),
      ]);

      if (detailRes.error) {
        setError("Submission not found.");
      } else {
        const d = detailRes.data as Detail;
        setDetail(d);
        setNewStatus(d.current_status);
        setNotes(d.admin_notes ?? "");
        setStatusNote(d.status_note ?? "");
        setPublishedUrl(d.published_url ?? "");
        setEstimatedPublishAt(d.estimated_publish_at ? formatToDatetimeLocal(d.estimated_publish_at) : "");
      }
      setHistory((historyRes.data ?? []) as StatusHistoryRow[]);
      setWriterResponses((responsesRes.data ?? []) as SubmissionResponseRow[]);
      setEpisodes((episodesRes.data ?? []) as EpisodeRow[]);
      setLoading(false);
    }
    void load();
  }, [id]);

  async function handleSave() {
    if (!detail || !id) return;
    setSaving(true);
    setSaveMsg(null);

    const isEarlyPublishEligible = detail.novel_status === "Complete" && 
      ["Approved", "Formatting", "Scheduled for Publication"].includes(newStatus);
    const isPublishedOnly = newStatus === "Published";

    // Validate published_url if eligible for editing
    if ((isEarlyPublishEligible || isPublishedOnly) && publishedUrl.trim()) {
      if (!/^https?:\/\/.+\..+/.test(publishedUrl.trim())) {
        setSaveMsg("❌ Published URL must start with https://");
        setSaving(false);
        return;
      }
    }

    const updates: Partial<SubmissionRow> = { admin_notes: notes };

    if (newStatus !== detail.current_status) {
      updates.current_status = newStatus;
      // Keep current_stage in sync so any code reading it stays accurate
      updates.current_stage = STATUS_TO_STAGE[newStatus] ?? newStatus;
    }

    // Status-specific public fields
    // Always save the field relevant to the current status;
    // preserve the other field's existing value from DB state.
    if (needsNote(newStatus)) {
      updates.status_note = statusNote.trim() || null;
    }
    if (isEarlyPublishEligible || isPublishedOnly) {
      updates.published_url = publishedUrl.trim() || null;
    }
    updates.estimated_publish_at = estimatedPublishAt ? new Date(estimatedPublishAt).toISOString() : null;

    const { error: err } = await supabase.from("submissions").update(updates).eq("id", id);

    if (err) {
      setSaveMsg("❌ Save failed: " + err.message);
    } else {
      setSaveMsg("✓ Saved");
      setDetail((prev) => (prev ? { ...prev, ...updates } : prev));
      // Reload history if status changed
      if (newStatus !== detail.current_status) {
        // Trigger email notification in background (non-blocking)
        const isTargetStatus = ["Action Required", "Rejected", "Published"].includes(newStatus);
        if (isTargetStatus && w?.email) {
          const emailType =
            newStatus === "Action Required" ? "action_required" :
            newStatus === "Rejected" ? "rejected" : "published";

          const emailPayload: any = {
            writerEmail: w.email,
            writerName: w.pen_name || w.full_name,
            novelTitle: detail.novel_title,
            submissionCode: detail.submission_code,
            statusNote: statusNote.trim() || undefined,
            publishedUrl: publishedUrl.trim() || undefined,
          };

          sendNotificationEmail(emailType as any, emailPayload)
            .then((emailRes) => {
              if (emailRes.success) {
                setSaveMsg("✓ Saved. Notification email sent.");
              } else {
                setSaveMsg("✓ Saved (email notification failed — verify writer was notified)");
              }
            })
            .catch(() => {
              setSaveMsg("✓ Saved (email notification failed — verify writer was notified)");
            });
        }

        const { data } = await supabase
          .from("status_history")
          .select("*")
          .eq("submission_id", id)
          .order("changed_at", { ascending: false });
        setHistory((data ?? []) as StatusHistoryRow[]);
      }
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  }

  async function handlePublishEpisodes() {
    if (!detail || !id || selectedEpisodes.length === 0) return;
    
    // Sort selected episodes numerically for better display
    const sortedToPublish = [...selectedEpisodes].sort((a, b) => a - b);
    
    setPublishingEps(true);
    setSaveMsg(null);
    
    // Publish in DB
    const res = await publishEpisodes(detail.id, sortedToPublish);
    if (!res.success) {
      setSaveMsg("❌ Failed to publish episodes: " + res.error);
      setPublishingEps(false);
      return;
    }

    // Send email notification
    if (detail.writers?.email) {
      const emailPayload = {
        writerEmail: detail.writers.email,
        writerName: detail.writers.pen_name || detail.writers.full_name,
        novelTitle: detail.novel_title,
        submissionCode: detail.submission_code,
        episodeNumbers: sortedToPublish.join(", "),
        publishedUrl: detail.published_url || undefined,
      };
      
      const emailRes = await sendNotificationEmail("episodes_published", emailPayload);
      if (!emailRes.success) {
        console.error("Failed to send episodes published email", emailRes.error);
        // Note: we continue even if email fails, as DB is already updated
      }
    }

    // Refresh episodes list locally
    setEpisodes(prev => prev.map(ep => 
      sortedToPublish.includes(ep.episode_number) 
        ? { ...ep, published: true } 
        : ep
    ));
    setSelectedEpisodes([]);
    setSaveMsg("✓ Episodes published successfully.");
    setPublishingEps(false);
    setTimeout(() => setSaveMsg(null), 3000);
  }

  async function handleDelete() {
    if (!detail) return;
    setIsDeleting(true);
    setDeleteError(null);
    const res = await deleteSubmission(detail.id, detail.submission_code);
    if (!res.success) {
      setDeleteError(res.error);
      setIsDeleting(false);
    } else {
      navigate("/admin/submissions", { state: { message: `Submission ${detail.submission_code} deleted permanently.` } });
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-8 flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" /> {error ?? "Submission not found"}
      </div>
    );
  }

  const w = detail.writers;

  const trackingUrl = detail && w?.email
    ? `https://portal.urdunovelbanks.com/track?code=${detail.submission_code}&email=${encodeURIComponent(w.email)}`
    : null;

  async function copyTrackingUrl() {
    if (!trackingUrl) return;
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 1500);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <Link
          to="/admin/submissions"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back to submissions
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{detail.novel_title}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">{detail.submission_code}</p>
            {trackingUrl && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs w-max">
                <span className="text-muted-foreground font-medium">Tracking Link:</span>
                <span className="font-mono text-muted-foreground truncate max-w-[200px] sm:max-w-sm">{trackingUrl}</span>
                <div className="flex items-center gap-1 ml-2 pl-3 border-l border-border/50">
                  <button
                    onClick={copyTrackingUrl}
                    title="Copy Link"
                    className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {copiedTracking ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in new tab"
                    className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[detail.current_status] ?? "bg-muted text-muted-foreground"}`}
          >
            {detail.current_status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT — Info panels */}
        <div className="space-y-4">
          {/* Writer info */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">Writer Information</h2>
            <dl className="grid grid-cols-2 gap-3">
              <InfoRow label="Full name" value={w?.full_name} />
              <InfoRow label="Pen name" value={w?.pen_name} />
              <InfoRow label="Email" value={w?.email} />
              <InfoRow label="WhatsApp" value={w?.whatsapp} />
              {w?.social_media_link && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">Social Media</dt>
                  <dd className="mt-1 text-sm">
                    <a
                      href={w.social_media_link.includes('://') ? w.social_media_link : `https://${w.social_media_link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline underline-offset-2"
                    >
                      {w.social_media_link}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {w?.bio && (
              <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3.5">
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Bio</dt>
                <dd className="text-sm text-muted-foreground break-words">{w.bio}</dd>
              </div>
            )}
            {w && (
              <div className="pt-3 border-t border-border/50 flex justify-end">
                <Link
                  id="view-all-by-writer-link"
                  to={`/admin/writers/${w.id}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  View all submissions by this writer →
                </Link>
              </div>
            )}
          </section>

          {/* Novel info */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">Novel Information</h2>
            <dl className="grid grid-cols-2 gap-3">
              <InfoRow label="Genre" value={detail.genre} />
              <InfoRow label="Novel status" value={detail.novel_status} />
              <InfoRow label="Submitted" value={fmt(detail.submission_date)} />
              <InfoRow label="Last updated" value={fmt(detail.last_updated)} />
            </dl>
            {detail.description && (
              <div className="mt-4">
                <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Description</dt>
                <dd className="text-sm text-muted-foreground break-words">{detail.description}</dd>
              </div>
            )}
          </section>

          {/* Drive files */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">Files on Google Drive</h2>
            <div className="flex flex-col items-start gap-2">
              {detail.novel_status === "Complete" && (
                !isTerminalStatus && (detail.manuscript_upload_failed || !detail.manuscript_drive_url) ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span><strong>Missing File:</strong> {getMissingFileMessage(["manuscript"], detail.submission_code)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        placeholder="Paste Drive URL (optional)" 
                        className="h-7 text-xs bg-background w-48 px-2"
                        value={manuscriptResolveUrl}
                        onChange={(e) => setManuscriptResolveUrl(e.target.value)}
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs border-destructive/50 hover:bg-destructive/10"
                        onClick={() => void handleResolveFile("manuscript", manuscriptResolveUrl.trim())}
                      >
                        Mark as Resolved
                      </Button>
                    </div>
                  </div>
                ) : detail.manuscript_drive_url && detail.manuscript_drive_url !== "resolved" ? (
                  <a
                    href={detail.manuscript_drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" /> Manuscript
                  </a>
                ) : detail.manuscript_drive_url === "resolved" ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 px-3 py-1">
                    <FileText className="h-3.5 w-3.5" /> Manuscript resolved (no URL)
                  </span>
                ) : null
              )}
              
              {!isTerminalStatus && (detail.cover_upload_failed || (!detail.cover_drive_url && detail.current_status !== "Received")) ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span><strong>Missing File:</strong> {getMissingFileMessage(["cover"], detail.submission_code)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Input 
                      placeholder="Paste Drive URL (optional)" 
                      className="h-7 text-xs bg-background w-48 px-2"
                      value={coverResolveUrl}
                      onChange={(e) => setCoverResolveUrl(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs border-destructive/50 hover:bg-destructive/10"
                      onClick={() => void handleResolveFile("cover", coverResolveUrl.trim())}
                    >
                      Mark as Resolved
                    </Button>
                  </div>
                </div>
              ) : detail.cover_drive_url && detail.cover_drive_url !== "resolved" ? (
                <a
                  href={detail.cover_drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  <Image className="h-3.5 w-3.5" /> Cover Image
                </a>
              ) : detail.cover_drive_url === "resolved" ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 px-3 py-1">
                  <Image className="h-3.5 w-3.5" /> Cover resolved (no URL)
                </span>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 px-3 py-1">
                  <Image className="h-3.5 w-3.5" /> No cover image attached
                </span>
              )}
            </div>
          </section>

          {/* Episodes (Ongoing only) */}
          {detail.novel_status === "Ongoing" && (
            <section className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Episodes</h2>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground font-medium">
                    {episodes.filter(e => !e.upload_failed && e.drive_url).length} of {detail.episode_count || episodes.length} uploaded
                  </span>
                  {selectedEpisodes.length > 0 && (
                    <Button 
                      size="sm" 
                      onClick={handlePublishEpisodes}
                      disabled={publishingEps}
                      className="h-7 text-[11px] px-3"
                    >
                      {publishingEps ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3 w-3" />
                      )}
                      Publish Selected ({selectedEpisodes.length})
                    </Button>
                  )}
                </div>
              </div>
              
              {episodes.some(ep => ep.upload_failed) && !isTerminalStatus && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>Missing Files:</strong> Episodes {episodes.filter(ep => ep.upload_failed).map(ep => ep.episode_number).join(", ")} failed to upload.
                    </span>
                  </div>
                </div>
              )}

              {episodes.length > 0 ? (
                <div className="space-y-4">
                  {groupEpisodesByDate(episodes).map(([date, eps]) => (
                    <div key={date} className="space-y-2">
                      <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Added on {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </h3>
                      <div className="flex flex-col gap-2">
                        {eps.map(ep => (
                          <div key={ep.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                            <div className="flex items-center gap-3">
                              {/* Checkbox for unpublished, successful uploads */}
                              {!ep.upload_failed && ep.drive_url && !ep.published && (
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                                  checked={selectedEpisodes.includes(ep.episode_number)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedEpisodes(prev => [...prev, ep.episode_number]);
                                    } else {
                                      setSelectedEpisodes(prev => prev.filter(n => n !== ep.episode_number));
                                    }
                                  }}
                                  title="Select to publish"
                                />
                              )}
                              <div className={`flex items-center gap-2 text-xs ${ep.upload_failed ? 'text-destructive' : (ep.drive_url ? (ep.published ? 'text-primary font-bold' : 'text-green-600') : 'text-muted-foreground')}`}>
                                {ep.upload_failed ? <XCircle className="size-4 shrink-0" /> : (ep.drive_url ? <CheckCircle2 className="size-4 shrink-0" /> : <Loader2 className="size-4 shrink-0 animate-spin" />)}
                                <span className={ep.upload_failed ? "line-through opacity-70 font-medium" : "font-medium"}>
                                  Episode {ep.episode_number}
                                </span>
                                {ep.upload_failed && <span className="text-[10px] ml-1 no-underline opacity-100">(failed)</span>}
                                {!ep.upload_failed && !ep.drive_url && <span className="text-[10px] ml-1 no-underline opacity-100">(pending)</span>}
                                {ep.published && <span className="text-[10px] ml-1 no-underline opacity-100 rounded bg-primary/10 text-primary px-1.5 py-0.5 border border-primary/20 uppercase tracking-wider">Published</span>}
                              </div>
                            </div>
                            
                            {ep.drive_url && (
                              <a
                                href={ep.drive_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium hover:bg-muted/80 transition-colors"
                              >
                                <FileText className="h-3 w-3" /> View
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No episodes submitted yet.</div>
              )}
            </section>
          )}

          {/* Published URL display (read-only info; editable via right panel) */}
          {detail.published_url && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold mb-2">Published Link</h2>
              <a
                href={detail.published_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
              >
                {detail.published_url} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </section>
          )}

          {/* Writer responses */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Writer's Response</h2>
              {writerResponses.length > 0 && (
                <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-600">
                  {writerResponses.length}
                </span>
              )}
            </div>
            {writerResponses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No response submitted yet.</p>
            ) : (
              <ul className="space-y-3">
                {writerResponses.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                    <p className="text-sm leading-relaxed">{r.response_text}</p>
                    <p className="text-[11px] text-muted-foreground">{fmt(r.submitted_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* RIGHT — Admin controls */}
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold">Status &amp; Notes</h2>

            {/* Status dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="status-select">Current status</Label>
              <select
                id="status-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {submissionStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {newStatus !== detail.current_status && (
                <p className="text-xs text-primary">
                  ⚠ Changing from &quot;{detail.current_status}&quot; → &quot;{newStatus}&quot; (auto-logs to history)
                </p>
              )}
            </div>

            {/* Conditional: Note for writer (Rejected / Action Required) */}
            {needsNote(newStatus) && (
              <div className="space-y-1.5">
                <Label htmlFor="status-note">
                  Note for writer{" "}
                  <span className="text-muted-foreground font-normal">(visible on their tracking page)</span>
                </Label>
                <Textarea
                  id="status-note"
                  rows={4}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder={
                    newStatus === "Rejected"
                      ? "Explain briefly why this submission wasn't approved…"
                      : "Describe what the writer needs to do or provide…"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  This note is shown publicly on the writer's tracking page under the{" "}
                  <strong>{newStatus}</strong> card.
                </p>
              </div>
            )}

            {/* Conditional: Published URL */}
            {(() => {
              const isEarlyPublishEligible = detail.novel_status === "Complete" && 
                ["Approved", "Formatting", "Scheduled for Publication"].includes(newStatus);
              const isPublishedOnly = newStatus === "Published";
              
              if (!isEarlyPublishEligible && !isPublishedOnly) return null;

              return (
                <div className="space-y-1.5">
                  <Label htmlFor="published-url">
                    Published novel URL{" "}
                    <span className="text-muted-foreground font-normal">
                      {isPublishedOnly ? "(shown on tracking page)" : "(early publish link)"}
                    </span>
                  </Label>
                  <Input
                    id="published-url"
                    type="url"
                    value={publishedUrl}
                    onChange={(e) => setPublishedUrl(e.target.value)}
                    placeholder="https://urdunovelbanks.com/novel/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    {isPublishedOnly 
                      ? "A \"View Your Novel\" button appears on the writer's tracking page linking here."
                      : "Add this early to have the novel auto-publish when its Estimated Publish Date arrives. Leave blank if not ready yet."}
                  </p>
                </div>
              );
            })()}

            {/* Estimated Publish Date */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-4">
                <Label htmlFor="estimated-publish-at">Estimated Publish Date</Label>
                {estimatedPublishAt && (
                  <button
                    type="button"
                    onClick={() => setEstimatedPublishAt("")}
                    className="text-xs text-muted-foreground hover:text-destructive underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Input
                id="estimated-publish-at"
                type="datetime-local"
                value={estimatedPublishAt}
                onChange={(e) => setEstimatedPublishAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Writers will see a countdown to this date/time on their tracking page while the submission is Approved, in Formatting, or Scheduled for Publication.
              </p>
            </div>

            {/* Admin notes (internal / writer-facing update) */}
            <div className="space-y-1.5">
              <Label htmlFor="admin-notes">Admin notes</Label>
              <Textarea
                id="admin-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes or general writer-facing update message…"
              />
              <p className="text-xs text-muted-foreground">
                Shown in the general note area on the tracking page (all statuses).
              </p>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3">
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save changes
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

          {/* Status history */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4">Status History</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((h, i) => (
                  <li key={h.id} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                      {i === 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{h.old_status ?? "—"}</span>
                        <span className="mx-1.5 text-muted-foreground">→</span>
                        <span className="font-medium">{h.new_status ?? "—"}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{fmt(h.changed_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      {/* Danger Zone */}
      <section className="mt-8 rounded-xl border border-destructive/20 bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold text-destructive mb-2 flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Danger Zone
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground max-w-2xl">
            Permanently delete this submission and all its data. This action cannot be undone and will also attempt to move the associated Google Drive folder to the trash.
          </p>
          <Button 
            variant="destructive" 
            onClick={() => {
              setDeleteCodeInput("");
              setDeleteError(null);
              setDeleteModalOpen(true);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Submission
          </Button>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg p-6 space-y-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight">Delete Submission?</h3>
              <p className="text-sm text-muted-foreground">
                This will permanently delete <strong>{detail.novel_title}</strong> ({detail.submission_code}), all its data, and its files from Google Drive. This cannot be undone.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delete-confirm" className="text-sm font-medium">
                To confirm, type <strong>{detail.submission_code}</strong> below:
              </Label>
              <Input
                id="delete-confirm"
                value={deleteCodeInput}
                onChange={(e) => setDeleteCodeInput(e.target.value)}
                placeholder={detail.submission_code}
                className="font-mono text-center"
              />
            </div>
            
            {deleteError && (
              <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {deleteError}
              </div>
            )}
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => void handleDelete()}
                disabled={deleteCodeInput !== detail.submission_code || isDeleting}
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
