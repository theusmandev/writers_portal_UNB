import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHero } from "@/components/portal/PageHero";
import { genres, site } from "@/data/content";
import { isDemoMode, submitNovel, type SubmissionRecord } from "@/services/portalApi";



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
  novelTitle: z.string().trim().min(2, "Please enter the novel title").max(150),
  genre: z.string().min(1, "Please choose a genre"),
  novelStatus: z.enum(["Complete", "Ongoing"]),
  wordCount: z.string().trim().max(20).optional(),
  pages: z.string().trim().max(20).optional(),
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
  novelTitle: "",
  genre: "",
  novelStatus: "Complete" as "Complete" | "Ongoing",
  wordCount: "",
  pages: "",
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

export default function SubmitPage() {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [manuscript, setManuscript] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [agree, setAgree] = useState({ guidelines: false, policy: false, rights: false });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionRecord | null>(null);

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
    const res = await submitNovel({
      ...form,
      manuscriptName: manuscript?.name,
      coverName: cover?.name,
    });
    setSubmitting(false);
    if (!res.success) {
      setFormError(res.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setResult(res.data);
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
              <Field id="wordCount" label="Approx. word count (optional)" error={errors["wordCount"]}>
                <Input id="wordCount" inputMode="numeric" value={form.wordCount} onChange={(e) => set("wordCount", e.target.value)} />
              </Field>
              <Field id="pages" label="Number of pages (optional)" error={errors["pages"]}>
                <Input id="pages" inputMode="numeric" value={form.pages} onChange={(e) => set("pages", e.target.value)} />
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
              {submitting ? "Submitting…" : "Submit Novel"}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Submission and publication at {site.name} are completely free.
            </p>
          </section>
        </form>
      </div>
    </div>
  );
}