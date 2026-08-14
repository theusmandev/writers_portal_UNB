import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Save, AlertCircle, CheckCircle2, Clock, MessageSquare, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { submissionStatuses, getMissingFileMessage } from "@/data/content";
import type { SubmissionRow, StatusHistoryRow, WriterRow, SubmissionResponseRow } from "@/lib/supabase.types";
import { sendNotificationEmail } from "@/services/portalApi";

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

export default function AdminSubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [history, setHistory] = useState<StatusHistoryRow[]>([]);
  const [writerResponses, setWriterResponses] = useState<SubmissionResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Editable fields ──────────────────────────────────────────────────────────
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");          // admin_notes (internal / writer-facing update)
  const [statusNote, setStatusNote] = useState(""); // status_note (visible on Rejected / Action Required cards)
  const [publishedUrl, setPublishedUrl] = useState(""); // published_url (visible on Published card)
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const [detailRes, historyRes, responsesRes] = await Promise.all([
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
      }
      setHistory((historyRes.data ?? []) as StatusHistoryRow[]);
      setWriterResponses((responsesRes.data ?? []) as SubmissionResponseRow[]);
      setLoading(false);
    }
    void load();
  }, [id]);

  async function handleSave() {
    if (!detail || !id) return;
    setSaving(true);
    setSaveMsg(null);

    // Validate published_url if status is Published
    if (newStatus === "Published" && publishedUrl.trim()) {
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
    if (newStatus === "Published") {
      updates.published_url = publishedUrl.trim() || null;
    }

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
              {detail.manuscript_upload_failed || !detail.manuscript_drive_url ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span><strong>Missing File:</strong> {getMissingFileMessage(["manuscript"], detail.submission_code)}</span>
                </div>
              ) : (
                <a
                  href={detail.manuscript_drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" /> Manuscript
                </a>
              )}
              
              {detail.cover_upload_failed ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span><strong>Missing File:</strong> {getMissingFileMessage(["cover"], detail.submission_code)}</span>
                </div>
              ) : detail.cover_drive_url ? (
                <a
                  href={detail.cover_drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  <Image className="h-3.5 w-3.5" /> Cover Image
                </a>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 px-3 py-1">
                  <Image className="h-3.5 w-3.5" /> No cover image attached
                </span>
              )}
            </div>
          </section>

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
            {newStatus === "Published" && (
              <div className="space-y-1.5">
                <Label htmlFor="published-url">
                  Published novel URL{" "}
                  <span className="text-muted-foreground font-normal">(shown on tracking page)</span>
                </Label>
                <Input
                  id="published-url"
                  type="url"
                  value={publishedUrl}
                  onChange={(e) => setPublishedUrl(e.target.value)}
                  placeholder="https://urdunovelbanks.com/novel/..."
                />
                <p className="text-xs text-muted-foreground">
                  A "View Your Novel" button appears on the writer's tracking page linking here.
                </p>
              </div>
            )}

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
    </div>
  );
}
