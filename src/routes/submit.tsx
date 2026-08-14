import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { CheckCircle2, Info, Loader2, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHero } from "@/components/portal/PageHero";
import { genres, site, getMissingFileMessage } from "@/data/content";
import { isDemoMode, submitNovel, uploadFileToScript, updateSubmissionFiles, sendNotificationEmail, type SubmissionRecord } from "@/services/portalApi";



const MAX_FILE_MB = 25;
const ALLOWED_DOC = [".doc", ".docx", ".pdf", ".txt", ".rtf"];
const ALLOWED_IMG = [".jpg", ".jpeg", ".png"];

const schema = z.object({
  fullName: z.string().trim().min(3, "Please enter your full name").max(100),
  penName: z.string().trim().min(2, "Please enter your pen name").max(100),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  whatsapp: z
    .string()
    .trim()
    .min(7, "Please enter a valid WhatsApp number")
    .max(25)
    .regex(/^[+0-9\s-]+$/, "Only digits, spaces, + and - are allowed"),
  location: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(600).optional(),
  socialMediaLink: z.string().trim().optional().transform(val => {
    if (!val) return val;
    return val.includes('://') ? val : `https://${val}`;
  }).pipe(z.string().url("Please enter a valid URL").optional().or(z.literal(""))),
  novelTitle: z.string().trim().min(2, "Please enter the novel title").max(150),
  genre: z.string().min(1, "Please choose a genre"),
  novelStatus: z.enum(["Complete", "Ongoing"]),
  language: z.string().min(1),
  synopsis: z
    .string()
    .trim()
    .min(50, "Please write at least 50 characters so we understand the story")
    .max(2000),
});

type Errors = Partial<Record<string, string>>;

const empty = {
  fullName: "",
  penName: "",
  email: "",
  whatsapp: "",
  location: "",
  bio: "",
  socialMediaLink: "",
  novelTitle: "",
  genre: "",
  novelStatus: "Complete" as "Complete" | "Ongoing",
  language: "Urdu",
  synopsis: "",
};

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
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

export default function SubmitPage() {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [manuscript, setManuscript] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [agree, setAgree] = useState({ guidelines: false, policy: false, rights: false });
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionRecord | null>(null);

  type UploadStepState = "pending" | "uploading" | "done" | "error" | "timeout";
  const [manuscriptStatus, setManuscriptStatus] = useState<UploadStepState>("pending");
  const [manuscriptProgress, setManuscriptProgress] = useState(0);
  const [coverStatus, setCoverStatus] = useState<UploadStepState>("pending");
  const [coverProgress, setCoverProgress] = useState(0);
  const [retryTrigger, setRetryTrigger] = useState<{ resolve: (action: "retry" | "skip") => void, type: "manuscript" | "cover" } | null>(null);

  const set = (key: keyof typeof empty, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function validateFile(file: File | null, allowed: string[], required: boolean, key: string) {
    if (!file) return required ? "Please attach your manuscript file" : undefined;
    const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!allowed.includes(ext)) return `Allowed formats: ${allowed.join(", ")}`;
    if (file.size > MAX_FILE_MB * 1024 * 1024) return `File must be smaller than ${MAX_FILE_MB} MB`;
    void key;
    return undefined;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse(form);
    const next: Errors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
    }
    const manuscriptError = validateFile(manuscript, ALLOWED_DOC, true, "manuscript");
    if (manuscriptError) next["manuscript"] = manuscriptError;
    const coverError = validateFile(cover, ALLOWED_IMG, false, "cover");
    if (coverError) next["cover"] = coverError;
    if (!agree.guidelines || !agree.policy || !agree.rights)
      next["agree"] = "Please confirm all three statements before submitting";

    setErrors(next);
    if (Object.keys(next).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setFormError("Some details need your attention. Please check the highlighted fields.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setUploadStatus("Creating submission record...");

    const res = await submitNovel({
      ...form,
      manuscriptName: manuscript?.name,
      coverName: cover?.name,
    });

    if (!res.success) {
      setUploadStatus(null);
      setSubmitting(false);
      setFormError(res.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const record = res.data;
    const code = record.submissionId;
    const scriptUrl = import.meta.env["VITE_PORTAL_API_URL"] as string | undefined;
    const failedFiles: string[] = [];

    async function performUpload(file: File, type: "manuscript" | "cover") {
      const setStatus = type === "manuscript" ? setManuscriptStatus : setCoverStatus;
      const setProgress = type === "manuscript" ? setManuscriptProgress : setCoverProgress;
      
      while (true) {
        setStatus("uploading");
        setProgress(0);
        setUploadStatus(`Uploading ${type === "manuscript" ? "manuscript" : "cover image"}...`);
        
        const controller = new AbortController();
        const timeoutMs = 90000 + (file.size / (1024 * 1024)) * 30000;
        
        let retryResolve: ((action: "retry" | "skip") => void) | null = null;
        const retryPromise = new Promise<"retry" | "skip">((resolve) => {
          retryResolve = resolve;
        });

        const timeoutId = setTimeout(() => {
          setStatus("timeout");
          setRetryTrigger({
            type,
            resolve: (action) => {
              controller.abort();
              retryResolve!(action);
            }
          });
        }, timeoutMs);

        const stopSim = simulateProgress(file.size, setProgress);
        
        try {
          const res = await Promise.race([
            uploadFileToScript(code, type, file, controller.signal),
            retryPromise.then((action) => { throw new Error(action === "skip" ? "SKIP_UPLOAD" : "MANUAL_RETRY"); })
          ]);
          
          clearTimeout(timeoutId);
          stopSim();
          setRetryTrigger(null);

          if (res.success) {
            await updateSubmissionFiles(code, {
              [type === "manuscript" ? "manuscriptUrl" : "coverUrl"]: res.fileUrl,
              [type === "manuscript" ? "manuscriptId" : "coverId"]: res.fileId,
            });
            setStatus("done");
            setProgress(100);
            return true;
          } else {
            setStatus("timeout");
            // Treat as timeout to allow retry
            const action = await new Promise<"retry" | "skip">((resolve) => {
              setRetryTrigger({ type, resolve: (a) => { controller.abort(); resolve(a); } });
            });
            if (action === "skip") {
              setStatus("error");
              return false;
            }
            continue;
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          stopSim();
          setRetryTrigger(null);
          
          if (err.message === "MANUAL_RETRY") {
            continue;
          } else if (err.message === "SKIP_UPLOAD") {
            setStatus("error");
            return false;
          } else {
            setStatus("timeout");
            // Treat as timeout to allow retry
            const action = await new Promise<"retry" | "skip">((resolve) => {
              setRetryTrigger({ type, resolve: (a) => { controller.abort(); resolve(a); } });
            });
            if (action === "skip") {
              setStatus("error");
              return false;
            }
            continue;
          }
        }
      }
    }

    if (scriptUrl) {
      if (manuscript) {
        const ok = await performUpload(manuscript, "manuscript");
        if (!ok) failedFiles.push("manuscript");
      }
      if (cover) {
        const ok = await performUpload(cover, "cover");
        if (!ok) failedFiles.push("cover");
      }

      setUploadStatus("Sending confirmation email...");
      const emailPayload = {
        writerEmail: form.email,
        writerName: form.penName || form.fullName,
        novelTitle: form.novelTitle,
        submissionCode: code,
        ...(failedFiles.length > 0 && { missingFiles: failedFiles.length === 2 ? "manuscript and cover" : failedFiles[0] }),
      };
      await sendNotificationEmail("received", emailPayload);
    }

    setUploadStatus(null);
    setSubmitting(false);

    setResult({
      ...record,
      note: failedFiles.length > 0
        ? `⚠️ File upload failed. ${getMissingFileMessage(failedFiles, code)}`
        : undefined,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-elegant">
          <CheckCircle2 className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold">Submission Successful</h1>
          <p className="urdu mt-1 text-xl text-muted-foreground">آپ کا ناول موصول ہو گیا ہے</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Thank you for submitting <span className="font-medium text-foreground">{result.novelTitle}</span>.
            Please save your Submission ID — you will need it to track your novel.
          </p>
          <div className="mt-6 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Submission ID</p>
            <p className="mt-1 font-display text-3xl font-semibold text-primary">
              {result.submissionId}
            </p>
          </div>
          {result.note && (
            <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive text-left">
              {result.note}
            </div>
          )}
          <p className="mt-5 text-xs text-muted-foreground">
            A confirmation email will be sent to {result.email}. Next stage: initial screening.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/track">Track Submission</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/process">See What Happens Next</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        eyebrow="Submission"
        title="Submit Your Novel"
        titleUrdu="اپنا ناول بھیجیں"
        description="It takes about five minutes. Please make sure your manuscript follows the submission guidelines before sending it."
      />
      <div className="mx-auto max-w-3xl px-5 py-12">
        {isDemoMode && (
          <div className="mb-6 flex gap-3 rounded-lg border border-border bg-primary/5 p-4 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              Preview mode: the form is fully working, but submissions are stored only in this
              browser until the Google Apps Script backend is connected (see the docs folder).
            </p>
          </div>
        )}
        {formError && (
          <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Writer Information</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field id="fullName" label="Full name" error={errors["fullName"]}>
                <Input id="fullName" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
              </Field>
              <Field id="penName" label="Pen name" hint="The name shown with your novel" error={errors["penName"]}>
                <Input id="penName" value={form.penName} onChange={(e) => set("penName", e.target.value)} />
              </Field>
              <Field id="email" label="Email address" error={errors["email"]}>
                <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field id="whatsapp" label="WhatsApp number" error={errors["whatsapp"]}>
                <Input id="whatsapp" inputMode="tel" placeholder="+92 300 0000000" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
              </Field>
              <Field id="location" label="City / country (optional)" error={errors["location"]}>
                <Input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field id="bio" label="Short writer bio (optional)" hint="2–4 lines, Urdu or English" error={errors["bio"]}>
                  <Textarea id="bio" rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field id="socialMediaLink" label="Social Media Link (optional)" error={errors["socialMediaLink"]}>
                  <Input id="socialMediaLink" placeholder="e.g. facebook.com/yourprofile or instagram.com/yourprofile" value={form.socialMediaLink} onChange={(e) => set("socialMediaLink", e.target.value)} />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Novel Information</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field id="novelTitle" label="Novel title" error={errors["novelTitle"]}>
                <Input id="novelTitle" value={form.novelTitle} onChange={(e) => set("novelTitle", e.target.value)} />
              </Field>
              <Field id="genre" label="Genre" error={errors["genre"]}>
                <select
                  id="genre"
                  value={form.genre}
                  onChange={(e) => set("genre", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">Select a genre</option>
                  {genres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="novelStatus" label="Novel status" error={errors["novelStatus"]}>
                <select
                  id="novelStatus"
                  value={form.novelStatus}
                  onChange={(e) => set("novelStatus", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="Complete">Complete</option>
                  <option value="Ongoing">Ongoing</option>
                </select>
              </Field>
              <Field id="language" label="Language" error={errors["language"]}>
                <select
                  id="language"
                  value={form.language}
                  onChange={(e) => set("language", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="Urdu">Urdu</option>
                  <option value="Urdu + English">Urdu + English</option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field
                  id="synopsis"
                  label="Short description / synopsis"
                  hint="At least 50 characters. Urdu is welcome."
                  error={errors["synopsis"]}
                >
                  <Textarea id="synopsis" rows={5} value={form.synopsis} onChange={(e) => set("synopsis", e.target.value)} />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Files</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field
                id="manuscript"
                label="Manuscript"
                hint={`${ALLOWED_DOC.join(", ")} · max ${MAX_FILE_MB} MB`}
                error={errors["manuscript"]}
              >
                <Input
                  id="manuscript"
                  type="file"
                  accept={ALLOWED_DOC.join(",")}
                  onChange={(e) => setManuscript(e.target.files?.[0] ?? null)}
                />
              </Field>
              <Field
                id="cover"
                label="Cover image (optional)"
                hint={`${ALLOWED_IMG.join(", ")} · portrait, 1200×1800 px or larger`}
                error={errors["cover"]}
              >
                <Input
                  id="cover"
                  type="file"
                  accept={ALLOWED_IMG.join(",")}
                  onChange={(e) => setCover(e.target.files?.[0] ?? null)}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Confirmation</h2>
            <div className="mt-4 space-y-3">
              {[
                { key: "guidelines" as const, label: "I have read the submission guidelines." },
                { key: "policy" as const, label: "I agree to the publication policy." },
                {
                  key: "rights" as const,
                  label: "This work is mine, or I have the rights required to submit it.",
                },
              ].map((item) => (
                <label key={item.key} className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={agree[item.key]}
                    onCheckedChange={(v) => setAgree((a) => ({ ...a, [item.key]: v === true }))}
                    className="mt-0.5"
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                </label>
              ))}
            </div>
            {errors["agree"] && <p className="mt-3 text-xs text-destructive">{errors["agree"]}</p>}

            <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? (uploadStatus || "Submitting…") : "Submit Novel"}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Submission and publication at {site.name} are completely free.
            </p>
          </section>
          
          {submitting && (manuscriptStatus !== "pending" || coverStatus !== "pending") && (
            <section className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-primary">Uploading Files</h3>
              <div className="space-y-5">
                {manuscript && (
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        {manuscriptStatus === "done" ? (
                          "Manuscript uploaded"
                        ) : manuscriptStatus === "error" ? (
                          "Upload failed"
                        ) : manuscriptStatus === "timeout" ? (
                          "Upload stalled"
                        ) : manuscriptStatus === "uploading" && manuscriptProgress >= 85 ? (
                          <RotatingWaitText />
                        ) : (
                          "Uploading manuscript..."
                        )}
                      </span>
                      <span className={`font-medium ${manuscriptStatus === "error" || manuscriptStatus === "timeout" ? "text-destructive" : "text-foreground"}`}>
                        {manuscriptStatus === "error" || manuscriptStatus === "timeout" ? "Error" : `${manuscriptProgress}%`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
                      <div
                        className={`h-full transition-all duration-300 ease-out ${
                          manuscriptStatus === "error" || manuscriptStatus === "timeout" ? "bg-destructive" : "bg-primary"
                        } ${manuscriptStatus === "uploading" && manuscriptProgress >= 85 ? "progress-waiting" : ""}`}
                        style={{ width: `${manuscriptProgress}%` }}
                      />
                    </div>
                    {manuscriptStatus === "timeout" && retryTrigger?.type === "manuscript" && (
                      <div className="mt-2 flex items-center justify-between gap-4 rounded-md bg-muted/50 px-3 py-2 text-xs">
                        <span className="text-muted-foreground">This is taking longer than expected — your connection may be slow.</span>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={() => retryTrigger.resolve("skip")} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                            Skip and submit without this file
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => retryTrigger.resolve("retry")} className="h-7 text-xs">
                            Try Again
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {cover && (
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Image className="h-3.5 w-3.5" />
                        {coverStatus === "done" ? (
                          "Cover uploaded"
                        ) : coverStatus === "error" ? (
                          "Upload failed"
                        ) : coverStatus === "timeout" ? (
                          "Upload stalled"
                        ) : coverStatus === "pending" ? (
                          "Waiting to upload cover..."
                        ) : coverStatus === "uploading" && coverProgress >= 85 ? (
                          <RotatingWaitText />
                        ) : (
                          "Uploading cover..."
                        )}
                      </span>
                      <span className={`font-medium ${coverStatus === "error" || coverStatus === "timeout" ? "text-destructive" : "text-foreground"}`}>
                        {coverStatus === "error" || coverStatus === "timeout" ? "Error" : `${coverProgress}%`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
                      <div
                        className={`h-full transition-all duration-300 ease-out ${
                          coverStatus === "error" || coverStatus === "timeout" ? "bg-destructive" : "bg-primary"
                        } ${coverStatus === "uploading" && coverProgress >= 85 ? "progress-waiting" : ""}`}
                        style={{ width: `${coverProgress}%` }}
                      />
                    </div>
                    {coverStatus === "timeout" && retryTrigger?.type === "cover" && (
                      <div className="mt-2 flex items-center justify-between gap-4 rounded-md bg-muted/50 px-3 py-2 text-xs">
                        <span className="text-muted-foreground">This is taking longer than expected — your connection may be slow.</span>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={() => retryTrigger.resolve("skip")} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                            Skip and submit without this file
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => retryTrigger.resolve("retry")} className="h-7 text-xs">
                            Try Again
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
        </form>
      </div>
    </div>
  );
}