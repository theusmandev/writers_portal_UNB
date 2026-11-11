import { useState, useEffect, useRef, useMemo } from "react";
import {
  Mail,
  Send,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Eye,
  Check,
  Copy,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Pause,
  RotateCcw,
  BookOpen,
  Paperclip,
  FileText,
  UploadCloud,
  HardDrive,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SEO } from "@/components/SEO";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import {
  checkEmailQuota,
  sendBroadcastEmailToRecipient,
  getBroadcastRecipients,
  getBroadcastLogs,
  createBroadcastLog,
  type BroadcastRecipient,
  type BroadcastAttachment,
} from "@/services/portalApi";
import type { EmailBroadcastLogRow } from "@/lib/supabase.types";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SUBMISSION_STATUSES = [
  "Published",
  "Received",
  "Under Initial Review",
  "Under Editorial Review",
  "Action Required",
  "Accepted",
  "Rejected",
];

export default function AdminBroadcastPage() {
  const { session } = useAdminAuth();

  // ── Quota & Recipients Data ───────────────────────────────────
  const [quota, setQuota] = useState<number | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  const [recipients, setRecipients] = useState<BroadcastRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);

  // ── Filter & Selection State ─────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<
    "all" | "ongoing" | "completed" | "status" | "manual"
  >("all");
  const [selectedStatus, setSelectedStatus] = useState("Published");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // ── Composer Form State ──────────────────────────────────────
  const [subject, setSubject] = useState("");
  const [headingEn, setHeadingEn] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [headingUr, setHeadingUr] = useState("");
  const [bodyUr, setBodyUr] = useState("");
  const [duaUr, setDuaUr] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<BroadcastAttachment[]>([]);
  const [driveInput, setDriveInput] = useState("");
  const [isReadingFiles, setIsReadingFiles] = useState(false);

  // ── Preview & Test State ─────────────────────────────────────
  const [previewRecipientEmail, setPreviewRecipientEmail] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // ── Batch Dispatcher State ───────────────────────────────────
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchStatus, setBatchStatus] = useState<"sending" | "paused" | "done">("sending");
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentEmail: "" });
  const [batchSuccessList, setBatchSuccessList] = useState<string[]>([]);
  const [batchFailedList, setBatchFailedList] = useState<
    Array<{ email: string; error: string; recipient: BroadcastRecipient }>
  >([]);
  const isPausedRef = useRef(false);

  // ── History Logs State ───────────────────────────────────────
  const [logs, setLogs] = useState<EmailBroadcastLogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ── Initial Load ─────────────────────────────────────────────
  useEffect(() => {
    void refreshQuota();
    void loadRecipients();
    void loadLogs();
    if (session?.user?.email) {
      setTestEmail(session.user.email);
    } else {
      setTestEmail("bankurdunovel@gmail.com");
    }
  }, [session]);

  async function refreshQuota() {
    setLoadingQuota(true);
    const res = await checkEmailQuota();
    setLoadingQuota(false);
    if (typeof res.remainingQuota === "number") {
      setQuota(res.remainingQuota);
    } else if (res.error) {
      toast.error(res.error);
    }
  }

  async function loadRecipients() {
    setLoadingRecipients(true);
    const res = await getBroadcastRecipients();
    setLoadingRecipients(false);
    if (res.success && res.data) {
      setRecipients(res.data);
      // Default: select all
      setSelectedEmails(new Set(res.data.map((r) => r.email)));
      if (res.data.length > 0) {
        setPreviewRecipientEmail(res.data[0].email);
      }
    } else if (res.error) {
      toast.error(res.error);
    }
  }

  async function loadLogs() {
    setLoadingLogs(true);
    const res = await getBroadcastLogs();
    setLoadingLogs(false);
    if (res.success && res.data) {
      setLogs(res.data);
    }
  }

  // ── Filter Recipients ─────────────────────────────────────────
  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      // 1. Category Filter
      if (activeFilter === "ongoing" && !r.hasActiveOngoing) return false;
      if (activeFilter === "completed" && !r.hasCompleted) return false;
      if (activeFilter === "status" && !r.statuses.includes(selectedStatus)) return false;

      // 2. Search Query
      if (recipientSearch.trim()) {
        const query = recipientSearch.toLowerCase().trim();
        const matchesName =
          r.fullName.toLowerCase().includes(query) ||
          (r.penName && r.penName.toLowerCase().includes(query));
        const matchesEmail = r.email.toLowerCase().includes(query);
        const matchesNovel = r.latestNovelTitle.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesNovel) return false;
      }

      return true;
    });
  }, [recipients, activeFilter, selectedStatus, recipientSearch]);

  // When switching audience filter, automatically select the filtered recipients
  function handleFilterChange(newFilter: typeof activeFilter) {
    setActiveFilter(newFilter);
    let target = recipients;
    if (newFilter === "ongoing") target = recipients.filter((r) => r.hasActiveOngoing);
    if (newFilter === "completed") target = recipients.filter((r) => r.hasCompleted);
    if (newFilter === "status")
      target = recipients.filter((r) => r.statuses.includes(selectedStatus));
    setSelectedEmails(new Set(target.map((r) => r.email)));
  }

  function handleStatusChange(newStatus: string) {
    setSelectedStatus(newStatus);
    const target = recipients.filter((r) => r.statuses.includes(newStatus));
    setSelectedEmails(new Set(target.map((r) => r.email)));
  }

  function selectAllFiltered() {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      filteredRecipients.forEach((r) => next.add(r.email));
      return next;
    });
  }

  function deselectAllFiltered() {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      filteredRecipients.forEach((r) => next.delete(r.email));
      return next;
    });
  }

  function toggleRecipient(email: string) {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  // ── Selected Recipients Array ─────────────────────────────────
  const selectedRecipients = useMemo(() => {
    return recipients.filter((r) => selectedEmails.has(r.email));
  }, [recipients, selectedEmails]);

  // Preview Recipient Object
  const currentPreviewRecipient = useMemo(() => {
    return (
      recipients.find((r) => r.email === previewRecipientEmail) ||
      selectedRecipients[0] ||
      recipients[0] || {
        writerId: "test",
        email: "writer@example.com",
        displayName: "فاطمہ خان",
        fullName: "Fatima Khan",
        penName: "فاطمہ خان",
        latestNovelTitle: "محبت اور منزل",
        statuses: ["Published"],
        hasActiveOngoing: false,
        hasCompleted: true,
        submissionCount: 1,
      }
    );
  }, [recipients, selectedRecipients, previewRecipientEmail]);

  // ── Tag Substitution Engine ───────────────────────────────────
  function replaceTags(text: string, recipient: BroadcastRecipient): string {
    if (!text) return "";
    const name = recipient.penName || recipient.fullName || "Writer";
    const novel = recipient.latestNovelTitle || "your novel";
    const portal = "https://portal.urdunovelbanks.com";

    return text
      .replace(/\{\{\s*writer_name\s*\}\}/gi, name)
      .replace(/\{\{\s*novel_title\s*\}\}/gi, novel)
      .replace(/\{\{\s*portal_url\s*\}\}/gi, portal);
  }

  function copyTag(tag: string) {
    void navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    toast.success(`Copied ${tag} to clipboard`);
    setTimeout(() => setCopiedTag(null), 2000);
  }

  // ── Attachment Handlers ───────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsReadingFiles(true);
    const currentTotalBytes = attachments.reduce((acc, a) => acc + (a.sizeBytes || 0), 0);
    let runningBytes = currentTotalBytes;
    const newAttachments: BroadcastAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 8 * 1024 * 1024) {
        toast.error(
          `"${file.name}" is over 8 MB. Please attach large files via Google Drive link.`,
        );
        continue;
      }
      if (runningBytes + file.size > 8 * 1024 * 1024) {
        toast.error(
          `Cannot add "${file.name}". Total attachment size would exceed the 8 MB limit.`,
        );
        break;
      }

      try {
        const base64Data = await readFileAsBase64(file);
        runningBytes += file.size;
        newAttachments.push({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          base64Data,
          sizeBytes: file.size,
        });
      } catch {
        toast.error(`Failed to read "${file.name}".`);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
      toast.success(
        `Added ${newAttachments.length} attachment${newAttachments.length > 1 ? "s" : ""}`,
      );
    }
    setIsReadingFiles(false);
    e.target.value = "";
  }

  function handleAddDriveFile() {
    const input = driveInput.trim();
    if (!input) return;

    const match = input.match(/[-\w]{25,}/);
    if (!match) {
      toast.error("Please enter a valid Google Drive file link or file ID.");
      return;
    }

    const driveId = match[0];
    if (attachments.some((a) => a.driveFileId === driveId)) {
      toast.error("This Google Drive file is already attached.");
      return;
    }

    const shortId = driveId.length > 10 ? `${driveId.slice(0, 5)}...${driveId.slice(-4)}` : driveId;
    const fileName = `Drive File (${shortId})`;

    setAttachments((prev) => [
      ...prev,
      {
        fileName,
        mimeType: "application/octet-stream",
        driveFileId: driveId,
      },
    ]);
    setDriveInput("");
    toast.success("Google Drive file attached!");
  }

  function handleRemoveAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Send Test Email ───────────────────────────────────────────
  async function handleSendTest() {
    if (!testEmail.trim() || !testEmail.includes("@")) {
      toast.error("Please enter a valid test recipient email.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Please enter an email subject.");
      return;
    }
    if (!bodyEn.trim() && !bodyUr.trim()) {
      toast.error("Please enter at least an English body or an Urdu body.");
      return;
    }

    setSendingTest(true);
    const resolvedSubject = replaceTags(subject, currentPreviewRecipient);
    const resolvedHeadingEn = headingEn.trim()
      ? replaceTags(headingEn, currentPreviewRecipient)
      : resolvedSubject;
    const resolvedBodyEn = replaceTags(bodyEn, currentPreviewRecipient);
    const resolvedHeadingUr = replaceTags(headingUr, currentPreviewRecipient);
    const resolvedBodyUr = replaceTags(bodyUr, currentPreviewRecipient);
    const resolvedDuaUr = replaceTags(duaUr, currentPreviewRecipient);

    const res = await sendBroadcastEmailToRecipient({
      writerEmail: testEmail.trim(),
      writerName: currentPreviewRecipient.displayName,
      subject: resolvedSubject,
      headingEn: resolvedHeadingEn,
      bodyEn: resolvedBodyEn,
      headingUr: resolvedHeadingUr,
      bodyUr: resolvedBodyUr,
      duaUr: resolvedDuaUr,
      ctaText: ctaText.trim() || undefined,
      ctaUrl: ctaUrl.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    setSendingTest(false);
    if (res.success) {
      toast.success(`Test email sent successfully to ${testEmail}!`);
      if (typeof res.remainingQuota === "number") {
        setQuota(res.remainingQuota);
      }
    } else {
      toast.error(res.error || "Failed to send test email.");
    }
  }

  // ── Batch Dispatcher ─────────────────────────────────────────
  async function startBatchSending(recipientsToSend: BroadcastRecipient[]) {
    setConfirmModalOpen(false);
    setBatchModalOpen(true);
    setBatchStatus("sending");
    isPausedRef.current = false;

    setBatchProgress({ current: 0, total: recipientsToSend.length, currentEmail: "" });
    setBatchSuccessList([]);
    setBatchFailedList([]);

    const successes: string[] = [];
    const failures: Array<{ email: string; error: string; recipient: BroadcastRecipient }> = [];
    let latestQuota = quota;

    for (let i = 0; i < recipientsToSend.length; i++) {
      if (isPausedRef.current) {
        setBatchStatus("paused");
        break;
      }

      const recipient = recipientsToSend[i];
      setBatchProgress({
        current: i + 1,
        total: recipientsToSend.length,
        currentEmail: recipient.email,
      });

      const resolvedSubject = replaceTags(subject, recipient);
      const resolvedHeadingEn = headingEn.trim()
        ? replaceTags(headingEn, recipient)
        : resolvedSubject;
      const resolvedBodyEn = replaceTags(bodyEn, recipient);
      const resolvedHeadingUr = replaceTags(headingUr, recipient);
      const resolvedBodyUr = replaceTags(bodyUr, recipient);
      const resolvedDuaUr = replaceTags(duaUr, recipient);

      const res = await sendBroadcastEmailToRecipient({
        writerEmail: recipient.email,
        writerName: recipient.displayName,
        subject: resolvedSubject,
        headingEn: resolvedHeadingEn,
        bodyEn: resolvedBodyEn,
        headingUr: resolvedHeadingUr,
        bodyUr: resolvedBodyUr,
        duaUr: resolvedDuaUr,
        ctaText: ctaText.trim() || undefined,
        ctaUrl: ctaUrl.trim() || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (typeof res.remainingQuota === "number") {
        latestQuota = res.remainingQuota;
        setQuota(res.remainingQuota);
      }

      if (res.success) {
        successes.push(recipient.email);
        setBatchSuccessList([...successes]);
      } else {
        failures.push({ email: recipient.email, error: res.error || "Unknown error", recipient });
        setBatchFailedList([...failures]);
      }

      // 600ms delay to prevent Google Apps Script rate limiting
      if (i < recipientsToSend.length - 1 && !isPausedRef.current) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setBatchStatus("done");

    // Save summary log to database
    let filterLabel = activeFilter as string;
    if (activeFilter === "status") filterLabel = `status:${selectedStatus}`;

    void createBroadcastLog({
      subject,
      heading_en: headingEn || null,
      heading_ur: headingUr || null,
      body_en: bodyEn || null,
      body_ur: bodyUr || null,
      audience_filter: filterLabel,
      total_targeted: recipientsToSend.length,
      sent_count: successes.length,
      failed_count: failures.length,
      remaining_quota: latestQuota,
    }).then(() => void loadLogs());
  }

  function handlePauseBatch() {
    isPausedRef.current = true;
    setBatchStatus("paused");
  }

  function handleResumeBatch() {
    const remainingRecipients = selectedRecipients.filter(
      (r) =>
        !batchSuccessList.includes(r.email) && !batchFailedList.some((f) => f.email === r.email),
    );
    void startBatchSending(remainingRecipients);
  }

  function handleRetryFailed() {
    const failedRecipients = batchFailedList.map((f) => f.recipient);
    void startBatchSending(failedRecipients);
  }

  // Quota Status Calculations
  const quotaLimit = Math.max(100, quota || 100);
  const quotaPercent =
    quota !== null ? Math.min(100, Math.max(0, Math.round((quota / quotaLimit) * 100))) : 0;
  const isQuotaSafe = quota !== null && quota > 30;
  const isQuotaMedium = quota !== null && quota >= 15 && quota <= 30;
  const isQuotaCritical = quota !== null && quota < 15;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <SEO
        noindex
        title="Broadcast Emails | UNB Admin"
        description="Internal admin broadcast email center"
      />

      {/* ── TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
                Broadcast Email Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Compose, preview, and send branded emails to writers with personalized tags.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshQuota()}
            disabled={loadingQuota}
            className="gap-2 border-border"
          >
            <RefreshCw className={`h-4 w-4 ${loadingQuota ? "animate-spin" : ""}`} />
            Refresh Quota
          </Button>
        </div>
      </div>

      {/* ── DAILY EMAIL QUOTA METER CARD ── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gmail Daily Sending Quota
              </span>
              {quota !== null ? (
                isQuotaSafe ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="h-3 w-3" /> Healthy ({quota} remaining)
                  </span>
                ) : isQuotaMedium ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="h-3 w-3" /> Moderate ({quota} remaining)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/15 text-destructive border border-destructive/30">
                    <ShieldAlert className="h-3 w-3" /> Low Quota ({quota} remaining)
                  </span>
                )
              ) : (
                <span className="text-xs text-muted-foreground">Fetching…</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ Recommended: Keep at least 15–20 quota reserved for automated submission
              confirmations &amp; tracking notifications.
            </p>
          </div>

          <div className="w-full md:w-72 space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-foreground">
                {quota !== null ? quota : "—"} / {quotaLimit} available today
              </span>
              <span className="text-muted-foreground">{quotaPercent}%</span>
            </div>
            <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isQuotaSafe ? "bg-emerald-500" : isQuotaMedium ? "bg-amber-500" : "bg-destructive"
                }`}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN: AUDIENCE SELECTION (5 cols) ── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Target Audience</h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {selectedRecipients.length} Selected
              </span>
            </div>

            {/* Filter Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleFilterChange("all")}
                className={`p-2.5 rounded-lg border text-left font-medium transition-colors ${
                  activeFilter === "all"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background border-border hover:bg-muted text-foreground"
                }`}
              >
                <div className="font-semibold">All Writers</div>
                <div
                  className={`text-[11px] ${activeFilter === "all" ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {recipients.length} unique writers
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleFilterChange("ongoing")}
                className={`p-2.5 rounded-lg border text-left font-medium transition-colors ${
                  activeFilter === "ongoing"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background border-border hover:bg-muted text-foreground"
                }`}
              >
                <div className="font-semibold">Ongoing Writers</div>
                <div
                  className={`text-[11px] ${activeFilter === "ongoing" ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {recipients.filter((r) => r.hasActiveOngoing).length} with active serials
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleFilterChange("completed")}
                className={`p-2.5 rounded-lg border text-left font-medium transition-colors ${
                  activeFilter === "completed"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background border-border hover:bg-muted text-foreground"
                }`}
              >
                <div className="font-semibold">Completed Novels</div>
                <div
                  className={`text-[11px] ${activeFilter === "completed" ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {recipients.filter((r) => r.hasCompleted).length} writers finished
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleFilterChange("status")}
                className={`p-2.5 rounded-lg border text-left font-medium transition-colors ${
                  activeFilter === "status"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background border-border hover:bg-muted text-foreground"
                }`}
              >
                <div className="font-semibold">By Status</div>
                <div
                  className={`text-[11px] ${activeFilter === "status" ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  Filter by workflow state
                </div>
              </button>
            </div>

            {/* Sub-selector for Status */}
            {activeFilter === "status" && (
              <div className="pt-2 border-t border-border/60">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Select Submission Status:
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full text-xs rounded-md border border-input bg-background p-2"
                >
                  {SUBMISSION_STATUSES.map((status) => {
                    const count = recipients.filter((r) => r.statuses.includes(status)).length;
                    return (
                      <option key={status} value={status}>
                        {status} ({count} writers)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Search within filtered list */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search writer name, email, novel…"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            {/* Select/Deselect Actions */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50 text-muted-foreground">
              <span>Showing {filteredRecipients.length} writers</span>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-primary hover:underline font-medium"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={deselectAllFiltered}
                  className="text-muted-foreground hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Scrollable Recipient Checklist */}
            <div className="max-h-80 overflow-y-auto space-y-1 rounded-lg border border-border/60 p-1.5 divide-y divide-border/40">
              {loadingRecipients ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Loading writers from database…
                </div>
              ) : filteredRecipients.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No writers found matching this filter.
                </div>
              ) : (
                filteredRecipients.map((r) => {
                  const isChecked = selectedEmails.has(r.email);
                  return (
                    <label
                      key={r.email}
                      className={`flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRecipient(r.email)}
                        className="mt-1 h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {r.displayName}
                          </p>
                          {r.hasActiveOngoing && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium">
                              Ongoing
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
                        <p className="text-[10px] text-muted-foreground/80 truncate italic">
                          📖 {r.latestNovelTitle}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Test Email Box */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Send Test Email First</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Always test your email layout, Urdu Nastaliq styling, and personalization tags before
              sending to the whole list.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="text-xs h-9"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleSendTest()}
                disabled={sendingTest || !testEmail}
                className="shrink-0 text-xs gap-1.5"
              >
                {sendingTest ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send Test
              </Button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: COMPOSER & PREVIEW (7 cols) ── */}
        <div className="lg:col-span-7 space-y-5">
          {/* Personalization Tag Helper Chips */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Dynamic Personalization Tags
              </span>
              <span className="text-[11px] text-muted-foreground">Click to copy</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyTag("{{writer_name}}")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
              >
                {copiedTag === "{{writer_name}}" ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3 opacity-60" />
                )}
                {"{{writer_name}}"}
              </button>
              <button
                type="button"
                onClick={() => copyTag("{{novel_title}}")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
              >
                {copiedTag === "{{novel_title}}" ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3 opacity-60" />
                )}
                {"{{novel_title}}"}
              </button>
              <button
                type="button"
                onClick={() => copyTag("{{portal_url}}")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
              >
                {copiedTag === "{{portal_url}}" ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3 opacity-60" />
                )}
                {"{{portal_url}}"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              These tags will automatically be replaced with each writer's real name and novel title
              when the email sends.
            </p>
          </div>

          {/* Email Composer Fields */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
            <h2 className="font-semibold text-foreground">Email Composer</h2>

            {/* Subject */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Email Subject <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Important Announcement regarding your novel {{novel_title}}"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-sm font-medium"
              />
            </div>

            {/* English Section */}
            <div className="grid grid-cols-1 gap-3 p-3.5 rounded-lg bg-muted/30 border border-border/60">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  English Heading{" "}
                  <span className="text-muted-foreground text-[11px]">
                    (Optional — defaults to Subject)
                  </span>
                </label>
                <Input
                  placeholder="Writer Portal Updates"
                  value={headingEn}
                  onChange={(e) => setHeadingEn(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  English Body (Multi-line paragraphs)
                </label>
                <Textarea
                  rows={4}
                  placeholder={`Dear {{writer_name}},\n\nWe are pleased to inform you about our new editorial schedule for {{novel_title}}.\n\nWarm regards,\nUrdu Novel Bank Team`}
                  value={bodyEn}
                  onChange={(e) => setBodyEn(e.target.value)}
                  className="text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Urdu Section */}
            <div className="grid grid-cols-1 gap-3 p-3.5 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground flex justify-between">
                  <span>Urdu Heading (RTL)</span>
                  <span className="text-muted-foreground text-[11px]">اختیاری</span>
                </label>
                <Input
                  dir="rtl"
                  placeholder="اردو ناول بینک کی جانب سے اہم پیغام"
                  value={headingUr}
                  onChange={(e) => setHeadingUr(e.target.value)}
                  className="text-sm urdu leading-loose"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground flex justify-between">
                  <span>Urdu Body (Multi-line RTL paragraphs)</span>
                  <span className="text-muted-foreground text-[11px]">اختیاری</span>
                </label>
                <Textarea
                  dir="rtl"
                  rows={4}
                  placeholder={`محترم {{writer_name}}،\n\nامید ہے آپ خیریت سے ہوں گے۔ آپ کے ناول "{{novel_title}}" کے حوالے سے یہ اپڈیٹ فراہم کی جا رہی ہے۔\n\nشکریہ،\nاردو ناول بینک ٹیم`}
                  value={bodyUr}
                  onChange={(e) => setBodyUr(e.target.value)}
                  className="text-sm urdu leading-loose"
                />
              </div>
            </div>

            {/* Collapsible Enhancements (Dua + CTA Button) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                {showOptionalFields
                  ? "− Hide Optional Enhancements (Dua & CTA Button)"
                  : "+ Show Optional Enhancements (Dua & CTA Button)"}
              </button>

              {showOptionalFields && (
                <div className="mt-3 space-y-3 p-3.5 rounded-lg border border-border bg-background">
                  {/* Dua Box */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground flex justify-between">
                      <span>Urdu Dua / Blessing Box (🤲)</span>
                      <span className="text-muted-foreground text-[11px]">اختیاری</span>
                    </label>
                    <Input
                      dir="rtl"
                      placeholder="اللہ تعالیٰ آپ کے قلم اور کاوشوں میں مزید برکت عطا فرمائے۔ آمین"
                      value={duaUr}
                      onChange={(e) => setDuaUr(e.target.value)}
                      className="text-sm urdu leading-loose"
                    />
                  </div>

                  {/* CTA Button */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        CTA Button Label
                      </label>
                      <Input
                        placeholder="Visit Writer Portal"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">CTA Button URL</label>
                      <Input
                        placeholder="https://portal.urdunovelbanks.com"
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div className="space-y-2.5 p-3.5 rounded-lg border border-border/70 bg-muted/20">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-primary" />
                  Email Attachments
                  <span className="text-[11px] text-muted-foreground font-normal">
                    (PDF, Word, Images, Guidelines — max 8 MB total)
                  </span>
                </label>
                {attachments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAttachments([])}
                    className="text-[11px] text-destructive hover:underline"
                  >
                    Remove All
                  </button>
                )}
              </div>

              {/* Upload from Device + Google Drive Link inputs */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Device Upload */}
                <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-dashed border-border hover:border-primary/50 bg-background text-xs cursor-pointer transition-colors shrink-0">
                  <UploadCloud className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {isReadingFiles ? "Reading files…" : "Upload from Device"}
                  </span>
                  <input
                    type="file"
                    multiple
                    disabled={isReadingFiles}
                    onChange={(e) => void handleFileUpload(e)}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.epub,.txt,.png,.jpg,.jpeg,.zip"
                  />
                </label>

                {/* Google Drive Link input */}
                <div className="flex flex-1 gap-1.5">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder="Or paste Google Drive link / file ID"
                      value={driveInput}
                      onChange={(e) => setDriveInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddDriveFile();
                        }
                      }}
                      className="text-xs h-9 pl-7"
                    />
                    <HardDrive className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDriveFile}
                    disabled={!driveInput.trim()}
                    className="text-xs shrink-0 h-9 px-3"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Attach Drive
                  </Button>
                </div>
              </div>

              {/* Attached File Chips */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {attachments.map((att, idx) => (
                    <div
                      key={`${att.fileName}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-secondary/80 text-foreground border border-border shadow-2xs"
                    >
                      {att.driveFileId ? (
                        <HardDrive className="h-3 w-3 text-amber-600 shrink-0" />
                      ) : (
                        <FileText className="h-3 w-3 text-primary shrink-0" />
                      )}
                      <span
                        className="font-medium max-w-[180px] sm:max-w-[220px] truncate"
                        title={att.fileName}
                      >
                        {att.fileName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {att.driveFileId ? "(Google Drive)" : `(${formatFileSize(att.sizeBytes)})`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="ml-1 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove attachment"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PRIMARY BROADCAST DISPATCH BUTTON */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Targeting:{" "}
                <strong className="text-foreground">{selectedRecipients.length} writers</strong>
              </span>

              <Button
                size="lg"
                onClick={() => setConfirmModalOpen(true)}
                disabled={
                  selectedRecipients.length === 0 ||
                  !subject.trim() ||
                  (!bodyEn.trim() && !bodyUr.trim())
                }
                className="gap-2 font-semibold shadow-md"
              >
                <Send className="h-4 w-4" />
                Send Broadcast to {selectedRecipients.length} Writers
              </Button>
            </div>
          </div>

          {/* ── LIVE BRANDED EMAIL PREVIEW ── */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Live Branded Email Preview
                </h3>
              </div>

              {/* Preview As selector */}
              {selectedRecipients.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Previewing as:</span>
                  <select
                    value={currentPreviewRecipient.email}
                    onChange={(e) => setPreviewRecipientEmail(e.target.value)}
                    className="rounded-md border border-input bg-background p-1 text-xs max-w-[200px] truncate"
                  >
                    {selectedRecipients.slice(0, 30).map((r) => (
                      <option key={r.email} value={r.email}>
                        {r.displayName} ({r.latestNovelTitle})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Email Card Representation */}
            <div className="p-4 sm:p-6 rounded-lg bg-[#FDF6E9] text-[#2E1F0F] border border-[#E8D9BE] font-serif max-w-lg mx-auto shadow-sm">
              {/* Email Header */}
              <div className="bg-[#9F5405] text-white p-4 sm:p-5 rounded-t-lg -m-4 sm:-m-6 mb-5">
                <div className="text-lg font-bold">📖 Urdu Novel Bank</div>
                <div className="text-xs text-[#D4A24C] mt-0.5 font-sans">
                  Writer &amp; Publication Portal
                </div>
              </div>

              {/* Subject Bar */}
              <div className="text-xs font-sans text-muted-foreground pb-3 mb-4 border-b border-[#E8D9BE]">
                <strong>Subject:</strong>{" "}
                {replaceTags(subject, currentPreviewRecipient) || "(No Subject Yet)"}
              </div>

              {/* Heading EN */}
              {(headingEn || subject) && (
                <h1 className="text-xl font-bold text-[#2E1F0F] mb-1 leading-snug">
                  {replaceTags(headingEn || subject, currentPreviewRecipient)}
                </h1>
              )}

              {/* Heading UR */}
              {headingUr && (
                <div dir="rtl" className="text-base text-[#9F5405] mb-4 urdu leading-loose">
                  {replaceTags(headingUr, currentPreviewRecipient)}
                </div>
              )}

              {/* Body EN */}
              {bodyEn && (
                <div className="text-sm leading-relaxed whitespace-pre-line mb-4 font-sans text-[#2E1F0F]">
                  {replaceTags(bodyEn, currentPreviewRecipient)}
                </div>
              )}

              {/* Body UR */}
              {bodyUr && (
                <div
                  dir="rtl"
                  className="text-sm leading-loose whitespace-pre-line mb-4 urdu text-[#6B5842]"
                >
                  {replaceTags(bodyUr, currentPreviewRecipient)}
                </div>
              )}

              {/* Dua Box */}
              {duaUr && (
                <div
                  dir="rtl"
                  className="my-4 p-3 rounded-lg bg-[#FFF7EC] border border-[#E8D9BE] text-[#5C3A1E] text-sm urdu leading-loose"
                >
                  🤲 {replaceTags(duaUr, currentPreviewRecipient)}
                </div>
              )}

              {/* CTA Button */}
              {ctaText && (
                <div className="text-center my-6">
                  <span className="inline-block px-6 py-2.5 bg-[#9F5405] text-white font-sans font-bold text-xs rounded-md shadow-sm">
                    {ctaText} →
                  </span>
                </div>
              )}

              {/* Attachments Section in Preview */}
              {attachments.length > 0 && (
                <div className="my-4 p-3 rounded-lg bg-[#F5ECDC] border border-[#E8D9BE] font-sans">
                  <div className="text-[11px] font-semibold text-[#6B5842] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-[#9F5405]" /> Attachments (
                    {attachments.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FFF7EC] border border-[#D9C4A1] text-xs text-[#2E1F0F]"
                      >
                        {att.driveFileId ? (
                          <HardDrive className="h-3 w-3 text-[#9F5405]" />
                        ) : (
                          <FileText className="h-3 w-3 text-[#9F5405]" />
                        )}
                        <span className="max-w-[180px] truncate">{att.fileName}</span>
                        {att.sizeBytes ? (
                          <span className="text-[10px] text-[#8C7359]">
                            {formatFileSize(att.sizeBytes)}
                          </span>
                        ) : att.driveFileId ? (
                          <span className="text-[10px] text-[#8C7359]">Drive</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Social / Support Footer */}
              <div className="pt-4 border-t border-[#E8D9BE] text-center font-sans text-xs text-[#6B5842] space-y-2">
                <p>Have a question? Message us on Instagram — we're happy to help.</p>
                <div className="text-[11px] text-[#8C7359]">
                  © {new Date().getFullYear()} Urdu Novel Bank • urdunovelbanks.com
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONFIRMATION MODAL ── */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xl max-w-md w-full space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  Confirm Broadcast Dispatch
                </h3>
                <p className="text-xs text-muted-foreground">
                  Please review before sending to writers
                </p>
              </div>
            </div>

            <div className="space-y-2.5 p-3.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipients:</span>
                <strong className="text-foreground">{selectedRecipients.length} writers</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audience Filter:</span>
                <span className="capitalize text-foreground font-medium">{activeFilter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Quota:</span>
                <span className="font-medium text-foreground">
                  {quota !== null ? `${quota} emails` : "Unknown"}
                </span>
              </div>
              {attachments.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Attachments:</span>
                  <span className="font-medium text-foreground">
                    {attachments.length} file{attachments.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Quota Warnings */}
            {quota !== null && selectedRecipients.length > quota ? (
              <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="h-4 w-4" /> Quota Exceeded
                </div>
                <p>
                  You are targeting {selectedRecipients.length} writers, but only {quota} emails
                  remain in your daily quota. Please reduce your batch size or select fewer writers.
                </p>
              </div>
            ) : quota !== null && quota - selectedRecipients.length < 15 ? (
              <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4" /> Low Quota Warning
                </div>
                <p>
                  Sending this broadcast will leave less than 15 emails reserved for automated novel
                  submissions today.
                </p>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void startBatchSending(selectedRecipients)}
                disabled={quota !== null && selectedRecipients.length > quota}
                className="gap-1.5"
              >
                <Send className="h-4 w-4" /> Confirm &amp; Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── BATCH PROGRESS MODAL ── */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xl max-w-lg w-full space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RefreshCw
                  className={`h-5 w-5 text-primary ${batchStatus === "sending" ? "animate-spin" : ""}`}
                />
                <h3 className="font-semibold text-lg text-foreground">
                  {batchStatus === "sending"
                    ? "Sending Broadcast…"
                    : batchStatus === "paused"
                      ? "Broadcast Paused"
                      : "Broadcast Completed"}
                </h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary font-mono">
                {batchProgress.current} / {batchProgress.total}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{
                    width: `${batchProgress.total > 0 ? Math.round((batchProgress.current / batchProgress.total) * 100) : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {batchProgress.currentEmail
                    ? `Sending to: ${batchProgress.currentEmail}`
                    : "Done"}
                </span>
                <span>
                  {batchProgress.total > 0
                    ? Math.round((batchProgress.current / batchProgress.total) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Counters Row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-xl font-bold text-emerald-600">{batchSuccessList.length}</div>
                <div className="text-[11px] text-muted-foreground font-medium">Delivered</div>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="text-xl font-bold text-destructive">{batchFailedList.length}</div>
                <div className="text-[11px] text-muted-foreground font-medium">Failed</div>
              </div>
              <div className="p-3 rounded-lg bg-secondary border border-border">
                <div className="text-xl font-bold text-foreground">
                  {quota !== null ? quota : "—"}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Quota Left</div>
              </div>
            </div>

            {/* Failed items list if any */}
            {batchFailedList.length > 0 && (
              <div className="max-h-36 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1">
                <strong className="text-destructive font-semibold">
                  Failed Deliveries ({batchFailedList.length}):
                </strong>
                {batchFailedList.map((f, i) => (
                  <div key={i} className="text-destructive/90 flex justify-between">
                    <span>{f.email}</span>
                    <span className="italic">{f.error}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              {batchStatus === "sending" && (
                <Button variant="outline" size="sm" onClick={handlePauseBatch} className="gap-1.5">
                  <Pause className="h-4 w-4" /> Pause
                </Button>
              )}

              {batchStatus === "paused" && (
                <Button size="sm" onClick={handleResumeBatch} className="gap-1.5">
                  <ArrowRight className="h-4 w-4" /> Resume
                </Button>
              )}

              {batchStatus === "done" && batchFailedList.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleRetryFailed} className="gap-1.5">
                  <RotateCcw className="h-4 w-4" /> Retry Failed ({batchFailedList.length})
                </Button>
              )}

              {batchStatus === "done" && (
                <Button size="sm" onClick={() => setBatchModalOpen(false)}>
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BROADCAST HISTORY TABLE ── */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Recent Broadcast History</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void loadLogs()} className="text-xs">
            Refresh History
          </Button>
        </div>

        {loadingLogs ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Loading broadcast logs…
          </div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No broadcast emails sent yet. Records will automatically appear here once dispatched.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                  <th className="pb-2.5">Date &amp; Time</th>
                  <th className="pb-2.5">Subject</th>
                  <th className="pb-2.5">Audience Filter</th>
                  <th className="pb-2.5 text-center">Delivered / Target</th>
                  <th className="pb-2.5 text-right">Remaining Quota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {logs.map((log) => {
                  const dateStr = new Date(log.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 text-muted-foreground font-mono">{dateStr}</td>
                      <td className="py-3 font-medium text-foreground max-w-xs truncate">
                        {log.subject}
                      </td>
                      <td className="py-3">
                        <span className="capitalize px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                          {log.audience_filter}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          {log.sent_count} / {log.total_targeted}
                        </span>
                        {log.failed_count > 0 && (
                          <span className="ml-1.5 text-destructive font-medium">
                            ({log.failed_count} failed)
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono text-muted-foreground">
                        {log.remaining_quota !== null ? `${log.remaining_quota} left` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
