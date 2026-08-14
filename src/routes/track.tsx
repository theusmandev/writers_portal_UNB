import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, ExternalLink, AlertCircle, Send, CheckCircle2, BookOpen, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHero } from "@/components/portal/PageHero";
import { processStages, submissionStatuses, getMissingFileMessage } from "@/data/content";
import { trackSubmission, submitResponse, getSubmissionsByEmail, type SubmissionRecord, type WriterSubmissionSummary } from "@/services/portalApi";

/**
 * Maps every possible admin-set current_status value to its 0-based index
 * in the processStages array. This is the single source of truth for
 * how far along the progress timeline should show as complete.
 *
 * NOTE: "Rejected" and "Withdrawn" are terminal states — no progress steps
 * are highlighted (-1) so the timeline doesn't imply a publication path.
 */
const STATUS_TO_STAGE_INDEX: Partial<Record<(typeof submissionStatuses)[number], number>> = {
  Received: 1,                        // Submission Confirmation
  "Under Initial Review": 2,          // Initial Screening
  "Under Editorial Review": 3,        // Editorial Review
  "Action Required": 4,               // Corrections / Information Required
  Approved: 5,                        // Approval
  Formatting: 6,                      // Formatting & Preparation
  "Scheduled for Publication": 7,     // Publication Scheduling
  Published: 8,                       // Publication
  // Rejected / Withdrawn intentionally omitted → resolves to undefined → -1
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

/** Statuses that replace the progress timeline with a special card */
const SPECIAL_STATUSES = ["Published", "Rejected"] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Confetti dot definitions — hardcoded positions for pure-CSS burst ──────────
const CONFETTI_PIECES: Array<{
  cx: string; cy: string; cr: string;
  color: string; size: number; shape: "circle" | "square"; delay: number;
}> = [
  { cx: "-95px",  cy: "-65px",  cr: "40deg",  color: "#818cf8", size: 8,  shape: "circle", delay: 0   },
  { cx: "80px",   cy: "-85px",  cr: "-25deg", color: "#f472b6", size: 6,  shape: "square", delay: 50  },
  { cx: "-65px",  cy: "-105px", cr: "70deg",  color: "#fb923c", size: 7,  shape: "circle", delay: 30  },
  { cx: "105px",  cy: "-50px",  cr: "-50deg", color: "#4ade80", size: 5,  shape: "square", delay: 80  },
  { cx: "-120px", cy: "-25px",  cr: "15deg",  color: "#facc15", size: 9,  shape: "circle", delay: 20  },
  { cx: "65px",   cy: "-115px", cr: "35deg",  color: "#60a5fa", size: 6,  shape: "square", delay: 60  },
  { cx: "-45px",  cy: "-130px", cr: "-60deg", color: "#e879f9", size: 8,  shape: "circle", delay: 40  },
  { cx: "115px",  cy: "-80px",  cr: "55deg",  color: "#34d399", size: 5,  shape: "square", delay: 10  },
  { cx: "-105px", cy: "-80px",  cr: "-35deg", color: "#f87171", size: 7,  shape: "circle", delay: 70  },
  { cx: "45px",   cy: "-140px", cr: "25deg",  color: "#a78bfa", size: 6,  shape: "square", delay: 35  },
  { cx: "-75px",  cy: "-115px", cr: "80deg",  color: "#fbbf24", size: 8,  shape: "circle", delay: 55  },
  { cx: "95px",   cy: "-120px", cr: "-45deg", color: "#38bdf8", size: 5,  shape: "circle", delay: 25  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Celebratory card shown when current_status = "Published" */
function PublishedCard({ record }: { record: SubmissionRecord }) {
  return (
    <div className="published-card-anim mt-6 relative overflow-visible">
      {/* Confetti dots — absolute, burst outward from card centre */}
      <div className="absolute left-1/2 top-1/2 pointer-events-none" aria-hidden>
        {CONFETTI_PIECES.map((p, i) => (
          <div
            key={i}
            className={`confetti-dot${p.shape === "square" ? " confetti-dot-square" : ""}`}
            style={{
              "--cx": p.cx,
              "--cy": p.cy,
              "--cr": p.cr,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animationDelay: `${p.delay}ms`,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Card body */}
      <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/10 p-7 text-center shadow-elegant">
        <div className="text-4xl mb-3" role="img" aria-label="Celebration">🎉</div>
        <h3 className="font-display text-xl font-semibold text-foreground">
          Congratulations! Your novel has been published.
        </h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Your work is now live on Urdu Novel Bank and being read by our community.
          Thank you for sharing your story with us.
        </p>

        {record.publishedUrl && (
          <a
            id="view-your-novel-btn"
            href={record.publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-95"
          >
            View Your Novel <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

/** Rejection card shown when current_status = "Rejected" */
function RejectedCard({ record }: { record: SubmissionRecord }) {
  return (
    <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            This submission wasn't approved this time
          </h3>
          {record.statusNote && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {record.statusNote}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            We appreciate you submitting your work. You're welcome to revise and resubmit
            as a new submission in the future.{" "}
            <Link to="/contact" className="text-primary hover:underline underline-offset-2">
              Contact us
            </Link>{" "}
            if you have questions.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Action required card + response form shown when current_status = "Action Required" */
function ActionRequiredSection({
  record,
  submissionCode,
  email,
  onResponseSent,
}: {
  record: SubmissionRecord;
  submissionCode: string;
  email: string;
  onResponseSent: () => void;
}) {
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [sent, setSent] = useState(record.hasResponse ?? false);

  async function handleSubmitResponse(e: React.FormEvent) {
    e.preventDefault();
    if (!responseText.trim()) {
      setResponseError("Please write your response before submitting.");
      return;
    }
    setResponseError(null);
    setSubmitting(true);
    const res = await submitResponse(submissionCode, email, responseText);
    setSubmitting(false);
    if (!res.success) {
      setResponseError(res.error);
    } else {
      setSent(true);
      onResponseSent();
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Action required card */}
      <div className="rounded-xl border border-orange-400/40 bg-orange-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Action needed on your submission</h3>
            {record.statusNote ? (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {record.statusNote}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Our team needs something from you to continue reviewing your submission.
                Please use the form below to send your response.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Response form or confirmation */}
      {sent ? (
        <div className="flex items-start gap-3 rounded-xl border border-green-400/30 bg-green-500/5 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-green-700">Your response has been sent.</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              We'll review it and be in touch. No further action is needed from you right now.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitResponse} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="response-text">Your response</Label>
            <Textarea
              id="response-text"
              rows={5}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Write your response here…"
              disabled={submitting}
            />
          </div>
          {responseError && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {responseError}
            </p>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {submitting ? "Sending…" : "Submit Response"}
          </Button>
        </form>
      )}
    </div>
  );
}

/** Normal progress timeline — shown for all standard statuses */
function ProgressTimeline({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="mt-6 border-t border-border pt-5">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Progress</p>
      <ol className="mt-4 space-y-3">
        {processStages.map((stage, i) => {
          const done = activeIndex >= 0 && i <= activeIndex;
          return (
            <li key={stage.key} className="flex items-center gap-3 text-sm">
              <span className={`size-2.5 rounded-full ${done ? "bg-primary" : "bg-border"}`} />
              <span className={done ? "font-medium" : "text-muted-foreground"}>
                {stage.title}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TrackPage() {
  const [activeTab, setActiveTab] = useState<"by-id" | "by-email">("by-id");

  // Tab 1: Track by ID State
  const [submissionId, setSubmissionId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<SubmissionRecord | null>(null);

  // Tab 2: View All My Submissions State
  const [emailForList, setEmailForList] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [submissionsList, setSubmissionsList] = useState<WriterSubmissionSummary[] | null>(null);

  async function loadDetail(code: string, userEmail: string) {
    setError(null);
    setLoading(true);
    const res = await trackSubmission(code, userEmail);
    setLoading(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setRecord(res.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRecord(null);
    if (!submissionId.trim() || !email.trim()) {
      setError("Please enter both your Submission ID and your email address.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    await loadDetail(submissionId, email);
  }

  async function handleFindSubmissions(e: React.FormEvent) {
    e.preventDefault();
    setListError(null);
    setSubmissionsList(null);
    if (!emailForList.trim()) {
      setListError("Please enter your email address.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(emailForList.trim())) {
      setListError("Please enter a valid email address.");
      return;
    }
    setListLoading(true);
    const res = await getSubmissionsByEmail(emailForList);
    setListLoading(false);
    if (!res.success) {
      setListError(res.error);
      return;
    }
    setSubmissionsList(res.data);
  }

  async function handleSelectSubmission(code: string) {
    // Sync states, switch tabs, and trigger lookup directly
    setSubmissionId(code);
    setEmail(emailForList);
    setActiveTab("by-id");
    await loadDetail(code, emailForList);
  }

  // Derive progress from current_status, not the free-text current_stage field.
  // This ensures the timeline always agrees with the status badge above it.
  const activeIndex = record
    ? (STATUS_TO_STAGE_INDEX[record.status as (typeof submissionStatuses)[number]] ?? -1)
    : -1;

  const isSpecialStatus = record
    ? (SPECIAL_STATUSES as readonly string[]).includes(record.status)
    : false;

  const isMissingManuscript = record
    ? !record.manuscriptUrl && (
        record.status !== "Received" || 
        (new Date().getTime() - new Date(record.submittedAt).getTime() > 15 * 60 * 1000)
      )
    : false;

  return (
    <div>
      <PageHero
        eyebrow="Submission"
        title="Track Submission"
        titleUrdu="اپنی سبمیشن کی صورتحال دیکھیں"
        description="Enter your Submission ID, or lookup all submissions sent from your email address."
      />
      <div className="mx-auto max-w-3xl px-5 py-12 space-y-6">
        {/* Toggle tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => {
              setActiveTab("by-id");
              setError(null);
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "by-id"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Track by Submission ID
          </button>
          <button
            onClick={() => {
              setActiveTab("by-email");
              setListError(null);
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "by-email"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            View All My Submissions
          </button>
        </div>

        {/* Tab 1: Track by Submission ID */}
        {activeTab === "by-id" && (
          <div className="space-y-6">
            {/* Lookup form */}
            <form
              onSubmit={handleSubmit}
              className="grid gap-5 rounded-xl border border-border bg-card p-6 shadow-soft sm:grid-cols-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="sid">Submission ID</Label>
                <Input
                  id="sid"
                  placeholder="UNB-2026-0001"
                  value={submissionId}
                  onChange={(e) => setSubmissionId(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="temail">Email address</Label>
                <Input
                  id="temail"
                  type="email"
                  placeholder="writer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  {loading ? "Checking…" : "Track Submission"}
                </Button>
              </div>
            </form>

            {/* Lookup error */}
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Result card */}
            {record && (
              <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
                {/* Header — always shown */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold">{record.novelTitle}</h2>
                    <p className="text-sm text-muted-foreground">
                      {record.penName} · {record.genre}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[record.status] ?? "bg-muted text-muted-foreground"}`}>
                    {record.status}
                  </span>
                </div>

                {/* Metadata row — always shown */}
                <dl className="mt-5 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Submission ID</dt>
                    <dd className="mt-1 font-medium">{record.submissionId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Submitted</dt>
                    <dd className="mt-1 font-medium">{formatDate(record.submittedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase">Last updated</dt>
                    <dd className="mt-1 font-medium">{formatDate(record.lastUpdated)}</dd>
                  </div>
                </dl>

                {/* ── Status-specific content ── */}

                {/* Missing Manuscript Warning (shows across all statuses if manuscript failed) */}
                {isMissingManuscript && (
                  <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Missing File</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                          {getMissingFileMessage(["manuscript"], record!.submissionId)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Published — celebration card (replaces progress timeline) */}
                {record.status === "Published" && <PublishedCard record={record} />}

                {/* Rejected — rejection card (replaces progress timeline) */}
                {record.status === "Rejected" && <RejectedCard record={record} />}

                {/* Action Required — attention card + response form (shown above timeline) */}
                {record.status === "Action Required" && (
                  <ActionRequiredSection
                    record={record}
                    submissionCode={submissionId}
                    email={email}
                    onResponseSent={() =>
                      setRecord((r) => (r ? { ...r, hasResponse: true } : r))
                    }
                  />
                )}

                {/* Progress timeline — shown for all non-terminal statuses */}
                {!isSpecialStatus && record.status !== "Withdrawn" && (
                  <ProgressTimeline activeIndex={activeIndex} />
                )}

                {/* Withdrawn — simple terminal message */}
                {record.status === "Withdrawn" && (
                  <div className="mt-6 border-t border-border pt-5">
                    <p className="text-sm text-muted-foreground">
                      This submission has been withdrawn.{" "}
                      <Link to="/contact" className="text-primary hover:underline underline-offset-2">
                        Contact us
                      </Link>{" "}
                      if you have questions.
                    </p>
                  </div>
                )}

                {/* General admin note — shown for all non-special statuses (under progress timeline) */}
                {record.note && !isSpecialStatus && (
                  <p className="mt-5 rounded-lg bg-primary/5 p-4 text-sm text-muted-foreground">
                    {record.note}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: View All My Submissions */}
        {activeTab === "by-email" && (
          <div className="space-y-6">
            {/* Search form */}
            <form
              onSubmit={handleFindSubmissions}
              className="flex gap-3 items-end rounded-xl border border-border bg-card p-6 shadow-soft"
            >
              <div className="flex-1 space-y-1.5 text-left">
                <Label htmlFor="search-email">Email address</Label>
                <Input
                  id="search-email"
                  type="email"
                  placeholder="writer@example.com"
                  value={emailForList}
                  onChange={(e) => setEmailForList(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={listLoading}>
                {listLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                {listLoading ? "Searching…" : "Find My Novels"}
              </Button>
            </form>

            {/* List lookup error */}
            {listError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {listError}
              </div>
            )}

            {/* List results */}
            {submissionsList && (
              <div className="space-y-4 text-left">
                <h3 className="font-semibold text-lg">My Submissions ({submissionsList.length})</h3>
                {submissionsList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card">
                    <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground text-sm">
                      No submissions found for this email. Double check the spelling, or submit your first novel.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {submissionsList.map((sub) => (
                      <div
                        key={sub.submission_code}
                        onClick={() => void handleSelectSubmission(sub.submission_code)}
                        className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-soft hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-semibold group-hover:text-primary transition-colors line-clamp-1 leading-snug">
                              {sub.novel_title}
                            </h4>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[sub.current_status] ?? "bg-muted text-muted-foreground"}`}>
                              {sub.current_status}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {sub.genre && <span>{sub.genre}</span>}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(sub.submission_date)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-xs">
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {sub.submission_code}
                          </span>

                          {sub.current_status === "Published" && sub.published_url ? (
                            <a
                              href={sub.published_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                            >
                              View Novel <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-primary group-hover:underline font-medium">
                              Track Status →
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="mt-8 text-sm text-muted-foreground">
          Lost your Submission ID?{" "}
          <Link to="/contact" className="text-primary underline-offset-4 hover:underline">
            Contact us
          </Link>{" "}
          from the email address you submitted with.
        </p>
      </div>
    </div>
  );
}