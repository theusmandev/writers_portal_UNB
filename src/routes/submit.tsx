import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { z } from "zod";
import { CheckCircle2, Info, Loader2, FileText, Image, Copy, Check, Plus, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHero } from "@/components/portal/PageHero";
import { genres, site, getMissingFileMessage } from "@/data/content";
import { isDemoMode, submitNovel, uploadFileToScript, updateSubmissionFiles, sendNotificationEmail, getWriterInfoByEmail, uploadEpisodeFile, saveEpisodeRecord, getSubmissionSettings, checkEpisodeMinimumException, type SubmissionRecord } from "@/services/portalApi";
import { SEO } from "@/components/SEO";
import { supabase } from "@/lib/supabase";



const MAX_FILE_MB = 25;
const ALLOWED_DOC = [".doc", ".docx", ".pdf", ".txt", ".rtf", ".inp", ".ipf"];
const ALLOWED_IMG = [".jpg", ".jpeg", ".png"];

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

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
  label: React.ReactNode;
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
  
  type EpisodeSlot = {
    id: string;
    file: File | null;
    number: number;
  };
  const [minEpisodes, setMinEpisodes] = useState(5);
  const [episodes, setEpisodes] = useState<EpisodeSlot[]>(
    Array.from({ length: 5 }, (_, i) => ({ id: crypto.randomUUID(), file: null, number: i + 1 }))
  );

  // Check minimum episodes based on email and novel status
  useEffect(() => {
    let active = true;

    const adjustEpisodes = (prev: EpisodeSlot[], targetMin: number) => {
      if (prev.length < targetMin) {
        const diff = targetMin - prev.length;
        return [...prev, ...Array.from({ length: diff }, (_, i) => ({ id: crypto.randomUUID(), file: null, number: prev.length + i + 1 }))];
      } else if (prev.length > targetMin) {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0 && next.length > targetMin; i--) {
          if (next[i].file === null) {
            next.splice(i, 1);
          }
        }
        return next.map((ep, idx) => ({ ...ep, number: idx + 1 }));
      }
      return prev;
    };

    const checkMin = async () => {
      if (form.novelStatus !== "Ongoing") return;
      if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
        if (minEpisodes !== 5) {
          setMinEpisodes(5);
          setEpisodes(prev => adjustEpisodes(prev, 5));
        }
        return;
      }
      const isExempt = await checkEpisodeMinimumException(form.email);
      if (!active) return;
      const newMin = isExempt ? 1 : 5;
      if (newMin !== minEpisodes) {
        setMinEpisodes(newMin);
        setEpisodes(prev => adjustEpisodes(prev, newMin));
      }
    };
    
    // Simple debounce
    const timer = setTimeout(checkMin, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.email, form.novelStatus, minEpisodes]);

  const addEpisode = () => {
    setEpisodes(prev => [...prev, { id: crypto.randomUUID(), file: null, number: prev.length + 1 }]);
  };

  const removeEpisode = (idToRemove: string) => {
    if (episodes.length <= minEpisodes) return;
    setEpisodes(prev => {
      const next = prev.filter(ep => ep.id !== idToRemove);
      return next.map((ep, idx) => ({ ...ep, number: idx + 1 }));
    });
  };

  const setEpisodeFile = (id: string, file: File | null) => {
    setEpisodes(prev => prev.map(ep => ep.id === id ? { ...ep, file } : ep));
  };

  const [agree, setAgree] = useState({ guidelines: false, policy: false, rights: false });
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionRecord | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-fill state
  const [autoFillEmail, setAutoFillEmail] = useState("");
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [autoFillMessage, setAutoFillMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  // Settings state
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseMessage, setPauseMessage] = useState("");

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [gateEmail, setGateEmail] = useState("");
  const [gateLoading, setGateLoading] = useState(false);
  const [gateMessage, setGateMessage] = useState<{text: string, type: "error"|"success"} | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const res = await getSubmissionSettings();
      if (res.success) {
        setIsPaused(res.data.submissions_paused);
        setPauseMessage(res.data.pause_message || "");
      }
      setSettingsLoading(false);
    }
    void loadSettings();
  }, []);

  async function handleAutoFill() {
    if (!autoFillEmail || !/^\S+@\S+\.\S+$/.test(autoFillEmail)) {
      setAutoFillMessage({ text: "Please enter a valid email address.", type: "error" });
      return;
    }
    
    setAutoFillLoading(true);
    setAutoFillMessage(null);
    
    const res = await getWriterInfoByEmail(autoFillEmail);
    if (res.success && res.data) {
      setForm((prev) => ({
        ...prev,
        email: autoFillEmail,
        fullName: res.data.full_name || prev.fullName,
        penName: res.data.pen_name || prev.penName,
        whatsapp: res.data.whatsapp || prev.whatsapp,
        bio: res.data.bio || prev.bio,
        socialMediaLink: res.data.social_media_link || prev.socialMediaLink,
      }));
      setAutoFillMessage({ text: "Your info has been auto-filled! You can still edit it below if needed.", type: "success" });
    } else {
      setAutoFillMessage({ 
        text: "We couldn't find a previous submission with this email — no problem, just fill in your details below.", 
        type: "info" 
      });
    }
    setAutoFillLoading(false);
  }

  async function handleGateCheck() {
    if (!gateEmail || !/^\S+@\S+\.\S+$/.test(gateEmail)) {
      setGateMessage({ text: "براہ کرم ایک درست ای میل ایڈریس درج کریں۔", type: "error" });
      return;
    }
    setGateLoading(true);
    setGateMessage(null);
    try {
      const { data, error } = await supabase.rpc("is_existing_writer", { p_email: gateEmail.trim() });
      if (error) throw error;
      if (data) {
        setAutoFillEmail(gateEmail.trim());
        setIsUnlocked(true);
      } else {
        setGateMessage({ 
          text: "اس ای میل سے کوئی پرانا ریکارڈ نہیں ملا۔ نئی بھرتیاں فی الحال بند ہیں، براہ کرم بعد میں دوبارہ چیک کریں۔", 
          type: "error" 
        });
      }
    } catch (err: any) {
      setGateMessage({ text: "ای میل چیک کرنے میں مسئلہ ہوا۔ براہ کرم دوبارہ کوشش کریں۔", type: "error" });
    } finally {
      setGateLoading(false);
    }
  }


  const copyToClipboard = () => {
    if (result?.submissionId) {
      navigator.clipboard.writeText(result.submissionId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // Fallback for browsers without Clipboard API
      });
    }
  };

  type UploadStepState = "pending" | "uploading" | "done" | "error" | "timeout";
  const [manuscriptStatus, setManuscriptStatus] = useState<UploadStepState>("pending");
  const [manuscriptProgress, setManuscriptProgress] = useState(0);
  const [coverStatus, setCoverStatus] = useState<UploadStepState>("pending");
  const [coverProgress, setCoverProgress] = useState(0);
  const [retryTrigger, setRetryTrigger] = useState<{ resolve: (action: "retry" | "skip") => void, type: "manuscript" | "cover" } | null>(null);

  const [episodeStatuses, setEpisodeStatuses] = useState<Record<string, UploadStepState>>({});
  const [episodeProgresses, setEpisodeProgresses] = useState<Record<string, number>>({});
  const [episodeRetryTriggers, setEpisodeRetryTriggers] = useState<Record<string, { resolve: (action: "retry" | "skip") => void }>>({});

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
    
    if (form.novelStatus === "Ongoing") {
      let epError = false;
      const nextEps = [...episodes];
      for (let i = 0; i < nextEps.length; i++) {
        const ep = nextEps[i];
        const err = validateFile(ep.file, ALLOWED_DOC, true, `episode`);
        if (err) {
          next[`episode_${ep.id}`] = `Episode ${ep.number}: ${err}`;
          epError = true;
        }
      }
      if (epError) {
        next["episodes"] = "Please check your attached episodes.";
      }
    } else {
      const manuscriptError = validateFile(manuscript, ALLOWED_DOC, true, "manuscript");
      if (manuscriptError) next["manuscript"] = manuscriptError;
    }
    
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

    // Smoothly scroll down slightly to ensure the upcoming progress UI is visible
    setTimeout(() => {
      window.scrollBy({ top: 350, behavior: "smooth" });
    }, 50);

    const res = await submitNovel({
      ...form,
      manuscriptName: form.novelStatus === "Complete" ? manuscript?.name : undefined,
      coverName: cover?.name,
      episodeCount: form.novelStatus === "Ongoing" ? episodes.length : undefined,
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
              await updateSubmissionFiles(code, {
                [type === "manuscript" ? "manuscriptUploadFailed" : "coverUploadFailed"]: true
              });
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
            await updateSubmissionFiles(code, {
              [type === "manuscript" ? "manuscriptUploadFailed" : "coverUploadFailed"]: true
            });
            return false;
          } else {
            setStatus("timeout");
            // Treat as timeout to allow retry
            const action = await new Promise<"retry" | "skip">((resolve) => {
              setRetryTrigger({ type, resolve: (a) => { controller.abort(); resolve(a); } });
            });
            if (action === "skip") {
              setStatus("error");
              await updateSubmissionFiles(code, {
                [type === "manuscript" ? "manuscriptUploadFailed" : "coverUploadFailed"]: true
              });
              return false;
            }
            continue;
          }
        }
      }
    }

    async function performEpisodeUpload(ep: EpisodeSlot) {
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
            uploadEpisodeFile(code, ep.number, ep.file, controller.signal),
            retryPromise.then((action) => { throw new Error(action === "skip" ? "SKIP_UPLOAD" : "MANUAL_RETRY"); })
          ]);
          
          clearTimeout(timeoutId);
          stopSim();
          setEpisodeRetryTriggers(prev => { const n = {...prev}; delete n[ep.id]; return n; });

          if (res.success) {
            await saveEpisodeRecord(code, ep.number, res.fileUrl || null, res.fileId || null, ep.file.name, false);
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
              await saveEpisodeRecord(code, ep.number, null, null, ep.file.name, true);
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
            await saveEpisodeRecord(code, ep.number, null, null, ep.file.name, true);
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
              await saveEpisodeRecord(code, ep.number, null, null, ep.file.name, true);
              return false;
            }
            continue;
          }
        }
      }
    }

    if (scriptUrl) {
      if (form.novelStatus === "Complete" && manuscript) {
        const ok = await performUpload(manuscript, "manuscript");
        if (!ok) failedFiles.push("manuscript");
      } else if (form.novelStatus === "Ongoing") {
        setUploadStatus("Uploading episodes...");
        let completedEps = 0;
        
        const tasks = episodes.map(ep => async () => {
          if (ep.file) {
            setEpisodeStatuses(prev => ({ ...prev, [ep.id]: "pending" }));
            const ok = await performEpisodeUpload(ep);
            if (!ok) failedFiles.push(`episode ${ep.number}`);
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
        ...(form.novelStatus === "Ongoing" && { episodeCount: episodes.length }),
      };
      await sendNotificationEmail("received", emailPayload);
    }

    setUploadStatus(null);
    setSubmitting(false);

    setResult({
      ...record,
      episodeCount: form.novelStatus === "Ongoing" ? episodes.length : undefined,
      episodes: form.novelStatus === "Ongoing" 
        ? episodes.map(ep => ({ episode_number: ep.number, upload_failed: failedFiles.includes(`episode ${ep.number}`) }))
        : undefined,
      note: failedFiles.length > 0
        ? `⚠️ File upload failed. ${getMissingFileMessage(failedFiles, code)}`
        : undefined,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-5 py-20">
        <SEO 
          title="Submit Your Novel | Urdu Novel Bank Writer Portal" 
          description="Ready to publish? Submit your Urdu novel manuscript through our secure writer portal. Share your stories with a growing community of readers." 
        />
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-8 text-center shadow-elegant">
          <CheckCircle2 className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold">Submission Successful</h1>
          <p className="urdu mt-1 text-xl text-muted-foreground">
            {result.episodeCount && result.episodeCount > 0 
              ? `آپ کے ناول کی ${result.episodeCount} اقساط موصول ہو گئی ہیں` 
              : "آپ کا ناول موصول ہو گیا ہے"}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Thank you for submitting <span className="font-medium text-foreground break-words [word-break:break-word]">{result.novelTitle}</span>.
            Please save your Submission ID — you will need it to track your novel.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 sm:p-5 relative">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Submission ID</p>
            <div className="mt-1 flex items-center gap-2 sm:gap-3">
              <p className="font-display text-2xl sm:text-3xl tracking-tight sm:tracking-normal font-semibold text-primary">
                {result.submissionId}
              </p>
              <button
                onClick={copyToClipboard}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                title="Copy Submission ID"
              >
                {copied ? <Check className="size-5 text-green-500" /> : <Copy className="size-5" />}
              </button>
            </div>
          </div>
          {result.episodes && result.episodes.length > 0 && (
            <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4 sm:p-5 text-left">
              <p className="font-semibold text-sm mb-3">
                Episodes Submitted: {result.episodes.filter(e => !e.upload_failed).length} of {result.episodeCount}
              </p>
              <div className="flex flex-wrap gap-3">
                {result.episodes.map(ep => (
                  <div key={ep.episode_number} className={`flex items-center gap-1.5 text-sm ${ep.upload_failed ? 'text-destructive' : 'text-green-600'}`}>
                    {ep.upload_failed ? <XCircle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
                    <span className={ep.upload_failed ? "line-through opacity-70" : ""}>Episode {ep.episode_number}</span>
                    {ep.upload_failed && <span className="text-xs ml-1 no-underline opacity-100">(failed)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.note && (
            <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive text-left">
              {result.note}
            </div>
          )}
          <p className="mt-6 text-sm text-muted-foreground leading-relaxed break-words px-2 sm:px-0">
            A confirmation email will be sent to <span className="font-medium text-foreground">{result.email}</span>.<br className="hidden sm:inline" /> Next stage: initial screening.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to={`/track?code=${result.submissionId}&email=${encodeURIComponent(result.email)}`}>Track Submission</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/process">See What Happens Next</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (settingsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <SEO 
          title="Submit Your Novel | Urdu Novel Bank Writer Portal" 
          description="Ready to publish? Submit your Urdu novel manuscript through our secure writer portal. Share your stories with a growing community of readers." 
        />
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isPaused && !isUnlocked) {
    return (
      <div>
        <SEO 
          title="Submit Your Novel | Urdu Novel Bank Writer Portal" 
          description="Ready to publish? Submit your Urdu novel manuscript through our secure writer portal. Share your stories with a growing community of readers." 
        />
        <PageHero
          eyebrow="Notice"
          title="Submissions Temporarily Paused"
          titleUrdu="نئی بھرتیاں فی الحال بند ہیں"
          description="Please read the message below for more information."
        />
        <div className="mx-auto max-w-2xl px-4 sm:px-5 py-20">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-elegant">
            <Info className="mx-auto size-10 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold">We are not accepting new submissions at this time</h2>
            <div 
              className="prose prose-stone prose-lg max-w-none dark:prose-invert mx-auto mt-4 text-left leading-loose text-muted-foreground urdu"
              dir="auto"
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(pauseMessage, { ADD_ATTR: ['target', 'style', 'data-align', 'dir', 'class', 'id'] }) 
              }}
            />
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/">Return to Home</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/track">Track Submission</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/updates">Check Updates</Link>
              </Button>
            </div>

            <div className="mt-12 pt-8 border-t border-border flex flex-col items-center text-center">
              <h3 className="text-xl font-semibold mb-2 urdu" dir="rtl">کیا آپ پہلے بھی ناول جمع کروا چکے ہیں؟</h3>
              <p className="text-base text-muted-foreground mb-5 urdu" dir="rtl">نیا ناول سبمٹ کرنے کے لئے نیچے اپنی ای میل درج کریں۔</p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 w-full max-w-sm">
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={gateEmail}
                  onChange={(e) => setGateEmail(e.target.value)}
                  className="bg-background w-full"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleGateCheck())}
                />
                <Button 
                  onClick={handleGateCheck}
                  disabled={gateLoading}
                  className="w-full sm:w-auto shrink-0"
                >
                  {gateLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Check
                </Button>
              </div>
              {gateMessage && (
                <p className={`mt-4 text-base font-medium urdu ${gateMessage.type === "error" ? "text-destructive" : "text-primary"}`} dir="rtl">
                  {gateMessage.text}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SEO 
        title="Submit Your Novel | Urdu Novel Bank Writer Portal" 
        description="Ready to publish? Submit your Urdu novel manuscript through our secure writer portal. Share your stories with a growing community of readers." 
      />
      <PageHero
        eyebrow="Submission"
        title="Submit Your Novel"
        titleUrdu="اپنا ناول بھیجیں"
        description="It takes about five minutes. Please make sure your manuscript follows the submission guidelines before sending it."
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-5 py-12">
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
          <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Writer Information</h2>
              <span className="text-xs text-muted-foreground"><span className="text-red-500">*</span> Required field</span>
            </div>
            
            {/* Auto-fill Prompt */}
            <div className="mt-4 mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5">
              <Label htmlFor="autoFillEmail" className="text-sm font-medium text-foreground">
                Submitted before? Enter your email to auto-fill your info
              </Label>
              <div className="mt-2 flex flex-col sm:flex-row gap-3">
                <Input
                  id="autoFillEmail"
                  type="email"
                  placeholder="writer@example.com"
                  value={autoFillEmail}
                  onChange={(e) => setAutoFillEmail(e.target.value)}
                  className="bg-background max-w-sm"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAutoFill())}
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleAutoFill}
                  disabled={autoFillLoading}
                  className="sm:w-auto"
                >
                  {autoFillLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Auto-fill My Info
                </Button>
              </div>
              {autoFillMessage && (
                <p className={`mt-3 text-sm ${
                  autoFillMessage.type === 'success' ? 'text-primary font-medium' :
                  autoFillMessage.type === 'error' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {autoFillMessage.text}
                </p>
              )}
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field id="fullName" label={<>Full name <span className="text-red-500">*</span></>} error={errors["fullName"]}>
                <Input id="fullName" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
              </Field>
              <Field id="penName" label={<>Pen name <span className="text-red-500">*</span></>} hint="The name shown with your novel" error={errors["penName"]}>
                <Input id="penName" value={form.penName} onChange={(e) => set("penName", e.target.value)} />
              </Field>
              <Field id="email" label={<>Email address <span className="text-red-500">*</span></>} error={errors["email"]}>
                <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field id="whatsapp" label={<>WhatsApp number <span className="text-red-500">*</span></>} hint="Kept private — visible only to our team" error={errors["whatsapp"]}>
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

          <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Novel Information</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field id="novelTitle" label={<>Novel title <span className="text-red-500">*</span></>} error={errors["novelTitle"]}>
                <Input id="novelTitle" value={form.novelTitle} onChange={(e) => set("novelTitle", e.target.value)} />
              </Field>
              <Field id="genre" label={<>Genre <span className="text-red-500">*</span></>} error={errors["genre"]}>
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
              <Field id="novelStatus" label={<>Novel status <span className="text-red-500">*</span></>} error={errors["novelStatus"]}>
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
              <Field id="language" label={<>Language <span className="text-red-500">*</span></>} error={errors["language"]}>
                <select
                  id="language"
                  value={form.language}
                  onChange={(e) => set("language", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="Urdu">Urdu</option>
                  <option value="Urdu + English">English</option>
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field
                  id="synopsis"
                  label={<>Short description / synopsis <span className="text-red-500">*</span></>}
                  hint="At least 50 characters. Urdu is welcome."
                  error={errors["synopsis"]}
                >
                  <Textarea id="synopsis" rows={5} value={form.synopsis} onChange={(e) => set("synopsis", e.target.value)} />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Files</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {form.novelStatus === "Complete" ? (
                <Field
                  id="manuscript"
                  label={<>Manuscript <span className="text-red-500">*</span></>}
                  hint={`Preferred formats: .doc or .docx (editable) — .pdf, .txt, and InPage (.inp/.ipf) also accepted. Max ${MAX_FILE_MB} MB.`}
                  error={errors["manuscript"]}
                >
                  <div className="space-y-2">
                    <Input
                      id="manuscript"
                      type="file"
                      accept={ALLOWED_DOC.join(",")}
                      onChange={(e) => setManuscript(e.target.files?.[0] ?? null)}
                    />
                    {manuscript && (
                      <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        <span className="truncate max-w-[200px]" title={manuscript.name}>{manuscript.name}</span>
                        <span className="text-xs shrink-0">({formatBytes(manuscript.size)})</span>
                      </div>
                    )}
                  </div>
                </Field>
              ) : (
                <div className="sm:col-span-2 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Episodes (Minimum {minEpisodes}) <span className="text-red-500">*</span></Label>
                    <p className="text-xs text-muted-foreground">
                      {minEpisodes === 1 
                        ? "You're approved to submit with 1 or more episodes. Attach each episode as a separate file below." 
                        : `At least ${minEpisodes} episodes are required to submit an ongoing novel. Attach each episode as a separate file below.`}
                      {" "}Formats: .docx, .pdf, .txt, InPage. Max {MAX_FILE_MB} MB per file.
                    </p>
                    {errors["episodes"] && <p className="text-xs text-destructive">{errors["episodes"]}</p>}
                  </div>
                  
                  <div className="space-y-4">
                    {episodes.map((ep) => (
                      <div key={ep.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center rounded-lg border border-border p-4">
                        <div className="flex-1 w-full">
                          <Field
                            id={`episode-${ep.id}`}
                            label={<>Episode {ep.number} <span className="text-red-500">*</span></>}
                            error={errors[`episode_${ep.id}`]}
                          >
                            <Input
                              id={`episode-${ep.id}`}
                              type="file"
                              accept={ALLOWED_DOC.join(",")}
                              onChange={(e) => setEpisodeFile(ep.id, e.target.files?.[0] ?? null)}
                            />
                            {ep.file && (
                              <div className="mt-2 flex items-center gap-2 rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                                <span className="truncate max-w-[200px]" title={ep.file.name}>{ep.file.name}</span>
                                <span className="text-xs shrink-0">({formatBytes(ep.file.size)})</span>
                              </div>
                            )}
                          </Field>
                        </div>
                        {episodes.length > minEpisodes && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEpisode(ep.id)}
                            className="text-muted-foreground hover:text-destructive shrink-0 self-end sm:self-auto sm:mt-7"
                            title="Remove episode"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addEpisode}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="size-4 mr-2" />
                    Add Another Episode
                  </Button>
                </div>
              )}
              <Field
                id="cover"
                label="Cover image (optional)"
                hint={`${ALLOWED_IMG.join(", ")} · portrait, 1200×1800 px or larger`}
                error={errors["cover"]}
              >
                <div className="space-y-2">
                  <Input
                    id="cover"
                    type="file"
                    accept={ALLOWED_IMG.join(",")}
                    onChange={(e) => setCover(e.target.files?.[0] ?? null)}
                  />
                  {cover && (
                    <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                      <span className="truncate max-w-[200px]" title={cover.name}>{cover.name}</span>
                      <span className="text-xs shrink-0">({formatBytes(cover.size)})</span>
                    </div>
                  )}
                </div>
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-soft">
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
                  <span className="text-muted-foreground">{item.label} <span className="text-red-500">*</span></span>
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
          
          {submitting && (manuscriptStatus !== "pending" || coverStatus !== "pending" || Object.keys(episodeStatuses).length > 0) && (
            <section className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-primary">Uploading Files</h3>
              <div className="space-y-5">
                {form.novelStatus === "Complete" && manuscript && (
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
                      <div className="mt-2 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4 rounded-md bg-muted/50 px-3 py-3 lg:py-2 text-xs">
                        <span className="text-muted-foreground">This is taking longer than expected — your connection may be slow.</span>
                        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                          <Button type="button" size="sm" variant="outline" onClick={() => retryTrigger.resolve("skip")} className="h-auto py-2 sm:h-7 sm:py-0 text-xs border-muted text-muted-foreground hover:bg-muted/50 hover:text-foreground w-full sm:w-auto">
                            Skip and submit without this file
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => retryTrigger.resolve("retry")} className="h-auto py-2 sm:h-7 sm:py-0 text-xs w-full sm:w-auto">
                            Try Again
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {form.novelStatus === "Ongoing" && episodes.length > 0 && (
                  <div className="space-y-4">
                    {episodes.map(ep => {
                      const status = episodeStatuses[ep.id] || "pending";
                      if (status === "pending" && !episodeProgresses[ep.id]) return null;
                      const progress = episodeProgresses[ep.id] || 0;
                      const retry = episodeRetryTriggers[ep.id];
                      
                      return (
                        <div key={ep.id} className="space-y-2.5">
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <FileText className="h-3.5 w-3.5" />
                              {status === "done" ? (
                                `Episode ${ep.number} uploaded`
                              ) : status === "error" ? (
                                `Episode ${ep.number} failed`
                              ) : status === "timeout" ? (
                                `Episode ${ep.number} stalled`
                              ) : status === "uploading" && progress >= 85 ? (
                                <RotatingWaitText />
                              ) : (
                                `Uploading Episode ${ep.number}...`
                              )}
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
                            <div className="mt-2 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4 rounded-md bg-muted/50 px-3 py-3 lg:py-2 text-xs">
                              <span className="text-muted-foreground">This is taking longer than expected — your connection may be slow.</span>
                              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                <Button type="button" size="sm" variant="outline" onClick={() => {
                                  retry.resolve("skip");
                                  setEpisodeRetryTriggers(prev => { const n = {...prev}; delete n[ep.id]; return n; });
                                }} className="h-auto py-2 sm:h-7 sm:py-0 text-xs border-muted text-muted-foreground hover:bg-muted/50 hover:text-foreground w-full sm:w-auto">
                                  Skip and submit without this file
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => {
                                  retry.resolve("retry");
                                  setEpisodeRetryTriggers(prev => { const n = {...prev}; delete n[ep.id]; return n; });
                                }} className="h-auto py-2 sm:h-7 sm:py-0 text-xs w-full sm:w-auto">
                                  Try Again
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                      <div className="mt-2 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4 rounded-md bg-muted/50 px-3 py-3 lg:py-2 text-xs">
                        <span className="text-muted-foreground">This is taking longer than expected — your connection may be slow.</span>
                        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                          <Button type="button" size="sm" variant="outline" onClick={() => retryTrigger.resolve("skip")} className="h-auto py-2 sm:h-7 sm:py-0 text-xs border-muted text-muted-foreground hover:bg-muted/50 hover:text-foreground w-full sm:w-auto">
                            Skip and submit without this file
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => retryTrigger.resolve("retry")} className="h-auto py-2 sm:h-7 sm:py-0 text-xs w-full sm:w-auto">
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