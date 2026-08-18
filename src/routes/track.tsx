import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Search, ExternalLink, AlertCircle, Send, CheckCircle2, BookOpen, Calendar, XCircle, FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHero } from "@/components/portal/PageHero";
import { processStages, submissionStatuses, getMissingFileMessage } from "@/data/content";
import { trackSubmission, submitResponse, getSubmissionsByEmail, addEpisodesToSubmission, uploadEpisodeFile, sendNotificationEmail, type SubmissionRecord, type WriterSubmissionSummary } from "@/services/portalApi";
import { FadeIn } from "@/components/portal/FadeIn";

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

const MAX_FILE_MB = 25;
const ALLOWED_DOC = [".doc", ".docx", ".pdf", ".txt", ".rtf"];

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function simulateProgress(fileSize: number, setProgress: (p: number) => void): () => void {
  let current = 0;
  const maxFake = 85;
  const expectedSeconds = Math.max(2, Math.min(25, fileSize / (0.5 * 1024 * 1024)));
  const msPerStep = (expectedSeconds * 1000) / maxFake;

  const timer = setInterval(() => {
    current += 1;
    if (current >= maxFake) {
      current = maxFake;
      clearInterval(timer);
    }
    setProgress(current);
  }, msPerStep);

  return () => clearInterval(timer);
}

const WAITING_MESSAGES = [
  "Almost done...",
  "Finishing up...",
  "Just a moment more...",
  "Wrapping things up...",
  "Hang tight, nearly there...",
];

function RotatingWaitText() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % WAITING_MESSAGES.length);
        setFade(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={`transition-opacity duration-300 ease-in-out ${fade ? "opacity-100" : "opacity-0"}`}>
      {WAITING_MESSAGES[index]}
    </span>
  );
}

type EpisodeSlot = {
  id: string;
  file: File | null;
};

/** Form to add new episodes to an ongoing submission */
function AddNewEpisodesSection({
  record,
  submissionCode,
  email,
  onEpisodesAdded,
}: {
  record: SubmissionRecord;
  submissionCode: string;
  email: string;
  onEpisodesAdded: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [episodes, setEpisodes] = useState<EpisodeSlot[]>([
    { id: crypto.randomUUID(), file: null }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  type UploadStepState = "pending" | "uploading" | "done" | "error" | "timeout";
  const [episodeStatuses, setEpisodeStatuses] = useState<Record<string, UploadStepState>>({});
  const [episodeProgresses, setEpisodeProgresses] = useState<Record<string, number>>({});
  const [episodeRetryTriggers, setEpisodeRetryTriggers] = useState<Record<string, { resolve: (action: "retry" | "skip") => void }>>({});

  const addEpisode = () => {
    setEpisodes(prev => [...prev, { id: crypto.randomUUID(), file: null }]);
  };

  const removeEpisode = (idToRemove: string) => {
    if (episodes.length <= 1) return;
    setEpisodes(prev => prev.filter(ep => ep.id !== idToRemove));
  };

  const setEpisodeFile = (id: string, file: File | null) => {
    setEpisodes(prev => prev.map(ep => ep.id === id ? { ...ep, file } : ep));
  };

  function validateFile(file: File | null): string | undefined {
    if (!file) return "Please attach your episode file";
    const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ALLOWED_DOC.includes(ext)) return `Allowed formats: ${ALLOWED_DOC.join(", ")}`;
    if (file.size > MAX_FILE_MB * 1024 * 1024) return `File must be smaller than ${MAX_FILE_MB} MB`;
    return undefined;
  }

  async function handleAddEpisodes(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    
    // Validation
    const emptyCount = episodes.filter(ep => !ep.file).length;
    if (emptyCount > 0) {
      setFormError(`Please attach a file for all episode slots, or remove the empty slots.`);
      return;
    }
    
    for (const ep of episodes) {
      const err = validateFile(ep.file);
      if (err) {
        setFormError(err);
        return;
      }
    }

    setSubmitting(true);
    setUploadStatus("Starting upload...");
    
    const scriptUrl = import.meta.env["VITE_PORTAL_API_URL"] as string | undefined;
    const uploadedFiles: Array<{ driveUrl: string | null; driveFileId: string | null; fileName: string | null; uploadFailed: boolean; }> = [];
    const failedFiles: string[] = [];
    const baseEpisodeNumber = record.episodeCount || 0;
    let completedEps = 0;

    async function performEpisodeUpload(ep: EpisodeSlot, displayNum: number) {
      if (!ep.file) return false;
      while (true) {
        setEpisodeStatuses(prev => ({ ...prev, [ep.id]: "uploading" }));
        setEpisodeProgresses(prev => ({ ...prev, [ep.id]: 0 }));
        
        const controller = new AbortController();
        const timeoutMs = 90000 + (ep.file.size / (1024 * 1024)) * 30000;
        
        let retryResolve: ((action: "retry" | "skip") => void) | null = null;
        const retryPromise = new Promise<"retry" | "skip">((resolve) => {
          retryResolve = resolve;
        });

        const timeoutId = setTimeout(() => {
          setEpisodeStatuses(prev => ({ ...prev, [ep.id]: "timeout" }));
          setEpisodeRetryTriggers(prev => ({
            ...prev,
            [ep.id]: {
              resolve: (action) => {
                controller.abort();
                retryResolve!(action);
              }
            }
          }));
        }, timeoutMs);

        const stopSim = simulateProgress(ep.file.size, (p) => setEpisodeProgresses(prev => ({ ...prev, [ep.id]: p })));
        
        try {
          const res = await Promise.race([
            // Pass the logical display number to the Apps Script so the file name makes sense
            uploadEpisodeFile(submissionCode, displayNum, ep.file, controller.signal),
            retryPromise.then((action) => { throw new Error(action === "skip" ? "SKIP_UPLOAD" : "MANUAL_RETRY"); })
          ]);
          
          clearTimeout(timeoutId);
          stopSim();
          setEpisodeRetryTriggers(prev => { const n = {...prev}; delete n[ep.id]; return n; });

          if (res.success) {
            uploadedFiles.push({
              driveUrl: res.fileUrl || null,
              driveFileId: res.fileId || null,
              fileName: ep.file.name,
              uploadFailed: false
            });
            setEpisodeStatuses(prev => ({ ...prev, [ep.id]: "done" }));
            setEpisodeProgresses(prev => ({ ...prev, [ep.id]: 100 }));
            return true;
          } else {
            setEpisodeStatuses(prev => ({ ...prev, [ep.id]: "timeout" }));
            const action = await new Promise<"retry" | "skip">((resolve) => {
              setEpisodeRetryTriggers(prev => ({
                ...prev,
                [ep.id]: { resolve: (a) => { controller.abort(); resolve(a); } }
              }));
            });
            if (action === "skip") {
              setEpisodeStatuses(prev => ({ ...prev, [ep.id]: "error" }));
              uploadedFiles.push({ driveUrl: null, driveFileId: null, fileName: ep.file.name, uploadFailed: true });
              return false;
            }
            continue;
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          stopSim();
          setEpisodeRetryTriggers(prev => { const n = {...prev}; delete n[ep.id]; return n; });
          
          if (err.message === "MANUAL_RETRY") {
            continue;
          } else if (err.message === "SKIP_UPLOAD") {
            setEpisodeStatuses(prev => ({ ...prev, [ep.id]: "error" }));
            uploadedFiles.push({ driveUrl: null, driveFileId: null, fileName: ep.file.name, uploadFailed: true });
            return false;
          } else {
            setEpisodeStatuses(prev => ({ ...prev, [ep.id]: "timeout" }));
            const action = await new Promise<"retry" | "skip">((resolve) => {
              setEpisodeRetryTriggers(prev => ({
                ...prev,
                [ep.id]: { resolve: (a) => { controller.abort(); resolve(a); } }
              }));
            });
            if (action === "skip") {
              setEpisodeStatuses(prev => ({ ...prev, [ep.id]: "error" }));
              uploadedFiles.push({ driveUrl: null, driveFileId: null, fileName: ep.file.name, uploadFailed: true });
              return false;
            }
            continue;
          }
        }
      }
    }

    if (scriptUrl) {
      setUploadStatus("Uploading episodes...");
      
      const tasks = episodes.map((ep, i) => async () => {
        if (ep.file) {
          setEpisodeStatuses(prev => ({ ...prev, [ep.id]: "pending" }));
          const ok = await performEpisodeUpload(ep, baseEpisodeNumber + i + 1);
          if (!ok) failedFiles.push(`episode ${baseEpisodeNumber + i + 1}`);
          completedEps++;
          setUploadStatus(`${completedEps} of ${episodes.length} episodes uploaded`);
        }
      });

      const executing = new Set<Promise<void>>();
      for (const task of tasks) {
        const p = task().finally(() => executing.delete(p));
        executing.add(p);
        if (executing.size >= 3) {
          await Promise.race(executing);
        }
      }
      await Promise.all(executing);

      // Now save them to the database
      setUploadStatus("Saving to database...");
      const saveRes = await addEpisodesToSubmission(submissionCode, email, uploadedFiles);
      if (!saveRes.success) {
        setFormError(saveRes.error);
        setSubmitting(false);
        setUploadStatus(null);
        return;
      }

      setUploadStatus("Sending confirmation email...");
      const emailPayload = {
        writerEmail: email,
        writerName: record.penName,
        novelTitle: record.novelTitle,
        submissionCode: submissionCode,
        episodeCount: record.episodeCount ? record.episodeCount + episodes.length : episodes.length,
      };
      await sendNotificationEmail("episodes_added", emailPayload);
    }

    setUploadStatus(null);
    setSubmitting(false);
    setIsOpen(false);
    setEpisodes([{ id: crypto.randomUUID(), file: null }]);
    onEpisodesAdded();
  }

  if (!isOpen) {
    return (
      <div className="mt-6 flex justify-center">
        <Button onClick={() => setIsOpen(true)} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" /> Add New Episodes
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-primary">Add New Episodes</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Attach your newly completed episodes below. Max {MAX_FILE_MB} MB per file.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-muted-foreground" disabled={submitting}>
          <XCircle className="h-5 w-5" />
        </Button>
      </div>

      {formError && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      <form onSubmit={handleAddEpisodes} className="space-y-4">
        <div className="space-y-3">
          {episodes.map((ep, idx) => (
            <div key={ep.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center rounded-lg border border-border bg-card p-3">
              <div className="flex-1 w-full space-y-1.5">
                <Label htmlFor={`new-episode-${ep.id}`} className="text-xs uppercase text-muted-foreground">
                  Episode {(record.episodeCount || 0) + idx + 1}
                </Label>
                <div className="space-y-2">
                  <Input
                    id={`new-episode-${ep.id}`}
                    type="file"
                    accept={ALLOWED_DOC.join(",")}
                    onChange={(e) => setEpisodeFile(ep.id, e.target.files?.[0] ?? null)}
                    disabled={submitting}
                  />
                  {ep.file && (
                    <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                      <span className="truncate max-w-[200px]" title={ep.file.name}>{ep.file.name}</span>
                      <span className="text-xs shrink-0">({formatBytes(ep.file.size)})</span>
                    </div>
                  )}
                </div>
              </div>
              {episodes.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEpisode(ep.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0 self-end sm:self-auto sm:mt-7"
                  disabled={submitting}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={addEpisode}
            className="w-full sm:w-auto text-sm"
            disabled={submitting}
          >
            <Plus className="size-4 mr-2" /> Add Another
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
            {submitting ? uploadStatus || "Uploading..." : "Submit Episodes"}
          </Button>
        </div>

        {submitting && Object.keys(episodeStatuses).length > 0 && (
          <div className="mt-4 space-y-3">
            {episodes.map((ep, idx) => {
              const status = episodeStatuses[ep.id] || "pending";
              if (status === "pending" && !episodeProgresses[ep.id]) return null;
              const progress = episodeProgresses[ep.id] || 0;
              const retry = episodeRetryTriggers[ep.id];
              const displayNum = (record.episodeCount || 0) + idx + 1;
              
              return (
                <div key={ep.id} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      {status === "done" ? `Episode ${displayNum} uploaded`
                        : status === "error" ? `Episode ${displayNum} failed`
                        : status === "timeout" ? `Episode ${displayNum} stalled`
                        : status === "uploading" && progress >= 85 ? <RotatingWaitText />
                        : `Uploading Episode ${displayNum}...`}
                    </span>
                    <span className={`font-medium ${status === "error" || status === "timeout" ? "text-destructive" : "text-foreground"}`}>
                      {status === "error" || status === "timeout" ? "Error" : `${progress}%`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
                    <div
                      className={`h-full transition-all duration-300 ease-out ${
                        status === "error" || status === "timeout" ? "bg-destructive" : "bg-primary"
                      } ${status === "uploading" && progress >= 85 ? "progress-waiting" : ""}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {status === "timeout" && retry && (
                    <div className="mt-1 flex items-center justify-between gap-4 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                      <span className="text-muted-foreground">Connection slow.</span>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => retry.resolve("skip")} className="h-6 text-[10px]">Skip</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => retry.resolve("retry")} className="h-6 text-[10px]">Retry</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </form>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Celebratory card shown when current_status = "Published" or episodes are published */
function PublishedCard({ record }: { record: SubmissionRecord }) {
  const publishedEpisodes = record.episodes?.filter(e => e.published) || [];
  const isEpisodeAware = record.novelStatus === "Ongoing" && publishedEpisodes.length > 0;
  
  let epText = "";
  if (isEpisodeAware) {
    const count = publishedEpisodes.length;
    epText = `${count} episode${count === 1 ? '' : 's'} ${count === 1 ? 'is' : 'are'}`;
  }

  return (
    <div className="published-card-anim mt-6">
      {/* Card body */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/10 p-5 sm:p-7 text-center shadow-elegant">
        
        <div className="relative inline-flex items-center justify-center mb-3">
          {/* Confetti dots — absolute, burst outward from behind the emoji */}
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
          <div className="text-4xl icon-pop-anim relative z-10" role="img" aria-label="Celebration">🎉</div>
        </div>

        <h3 className="font-display text-xl font-semibold text-foreground">
          {isEpisodeAware 
            ? `Congratulations! ${epText} now live.`
            : "Congratulations! Your novel has been published."
          }
        </h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {isEpisodeAware
            ? (publishedEpisodes.length === 1 
                ? "Your latest episode is now available on Urdu Novel Bank and being read by our community."
                : "Your latest episodes are now available on Urdu Novel Bank and being read by our community.")
            : "Your work is now live on Urdu Novel Bank and being read by our community. Thank you for sharing your story with us."
          }
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
    <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-6">
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
      <div className="rounded-xl border border-orange-400/40 bg-orange-500/5 p-4 sm:p-5">
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"by-id" | "by-email">("by-id");

  // Tab 1: Track by ID State
  const [submissionId, setSubmissionId] = useState(searchParams.get("code") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
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

  useEffect(() => {
    const initialCode = searchParams.get("code");
    const initialEmail = searchParams.get("email");
    if (initialCode && initialEmail) {
      setSubmissionId(initialCode);
      setEmail(initialEmail);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);


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
    setTimeout(() => {
      document.getElementById("novel-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  }

  // Derive progress from current_status, not the free-text current_stage field.
  // This ensures the timeline always agrees with the status badge above it.
  const activeIndex = record
    ? (STATUS_TO_STAGE_INDEX[record.status as (typeof submissionStatuses)[number]] ?? -1)
    : -1;

  const isSpecialStatus = record
    ? (SPECIAL_STATUSES as readonly string[]).includes(record.status)
    : false;

  let missingFiles: string[] = [];
  if (record) {
    const isTerminalStatus = ["Published", "Rejected", "Withdrawn"].includes(record.status);
    const timeElapsed = new Date().getTime() - new Date(record.submittedAt).getTime();
    const beyondGracePeriod = record.status !== "Received" || timeElapsed > 15 * 60 * 1000;
    
    if (!isTerminalStatus) {
      if (!record.episodeCount && (record.manuscriptUploadFailed || (!record.manuscriptUrl && beyondGracePeriod))) {
        missingFiles.push("manuscript");
      }
      if (record.episodes) {
        record.episodes.forEach(ep => {
          if (ep.upload_failed === true) {
            missingFiles.push(`Episode ${ep.episode_number}`);
          }
        });
      }
      if (record.coverUploadFailed || (!record.coverUrl && beyondGracePeriod)) {
        missingFiles.push("cover");
      }
    }
  }

  return (
    <div>
      <PageHero
        eyebrow="Submission"
        title="Track Submission"
        titleUrdu="اپنی سبمیشن کی صورتحال دیکھیں"
        description="Enter your Submission ID, or lookup all submissions sent from your email address."
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-5 py-12 space-y-6">
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
              className="grid gap-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-soft sm:grid-cols-2"
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
              <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-soft">
                {/* Header — always shown */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id="novel-title" className="font-display text-xl font-semibold break-words [word-break:break-word]">{record.novelTitle}</h2>
                    <p className="text-sm text-muted-foreground break-words [word-break:break-word]">
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
                    <dd className="mt-1 font-medium break-words [word-break:break-word]">{record.submissionId}</dd>
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

                {record.episodes && record.episodes.length > 0 && (
                  <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 sm:p-5 text-left">
                    <p className="font-semibold text-sm mb-3">
                      Episodes: {record.episodes.filter((e: any) => e.upload_failed === false && e.drive_url).length} of {record.episodeCount} submitted
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {record.episodes.map((ep: any) => (
                        <div key={ep.episode_number} className={`flex items-center gap-1.5 text-sm ${ep.upload_failed === true ? 'text-destructive' : (ep.upload_failed === false && ep.drive_url ? 'text-green-600' : 'text-muted-foreground')}`}>
                          {ep.upload_failed === true ? <XCircle className="size-4 shrink-0" /> : (ep.upload_failed === false && ep.drive_url ? <CheckCircle2 className="size-4 shrink-0" /> : <Loader2 className="size-4 shrink-0 animate-spin" />)}
                          <span className={ep.upload_failed === true ? "line-through opacity-70" : ""}>Episode {ep.episode_number}</span>
                          {ep.upload_failed === true && <span className="text-xs ml-1 no-underline opacity-100">(failed)</span>}
                          {ep.upload_failed === null && <span className="text-xs ml-1 no-underline opacity-100">(pending)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing File Warning (shows across all statuses if files failed) */}
                {missingFiles.length > 0 && (
                  <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Missing File</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                          {getMissingFileMessage(missingFiles as any, record!.submissionId)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Published — celebration card (replaces progress timeline if status is Published, or shown alongside timeline if only episodes are published) */}
                {(record.status === "Published" || (record.novelStatus === "Ongoing" && record.episodes?.some(ep => ep.published))) && (
                  <PublishedCard record={record} />
                )}

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

                {/* Add New Episodes (Ongoing novels only) */}
                {record.novelStatus === 'Ongoing' && !isSpecialStatus && record.status !== 'Withdrawn' && (
                  <AddNewEpisodesSection
                    record={record}
                    submissionCode={submissionId}
                    email={email}
                    onEpisodesAdded={() => {
                      // Refresh the record
                      loadDetail(submissionId, email);
                    }}
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
              className="flex flex-col sm:flex-row gap-4 sm:gap-3 items-stretch sm:items-end rounded-xl border border-border bg-card p-4 sm:p-6 shadow-soft"
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
              <Button type="submit" className="w-full sm:w-auto" disabled={listLoading}>
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
              <div className="space-y-4">
                {submissionsList.length > 0 && submissionsList[0].full_name && (
                  <div className="mb-8 text-center">
                    <h2 className="font-display text-2xl font-semibold text-foreground mb-2">
                      Welcome, {submissionsList[0].full_name}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Here are all your submissions.
                    </p>
                  </div>
                )}
                
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-foreground">
                    Total Submissions ({submissionsList.length})
                  </h3>
                </div>
                {submissionsList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card">
                    <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground text-sm">
                      No submissions found for this email. Double check the spelling, or submit your first novel.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {submissionsList.map((sub, i) => (
                      <div
                        key={sub.submission_code}
                        onClick={() => void handleSelectSubmission(sub.submission_code)}
                        className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 sm:p-5 shadow-soft hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap justify-between items-start gap-2">
                            <h4 className="font-semibold group-hover:text-primary transition-colors line-clamp-2 leading-snug break-words [word-break:break-word]">
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

                        <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap justify-between items-center gap-2 text-xs">
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {sub.submission_code}
                          </span>

                          <span className="text-primary group-hover:underline font-medium">
                            Track Status →
                          </span>
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