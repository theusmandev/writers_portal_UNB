import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHero } from "@/components/portal/PageHero";
import { processStages } from "@/data/content";
import { trackSubmission, type SubmissionRecord } from "@/services/portalApi";



function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TrackPage() {
  const [submissionId, setSubmissionId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<SubmissionRecord | null>(null);

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
    setLoading(true);
    const res = await trackSubmission(submissionId, email);
    setLoading(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setRecord(res.data);
  }

  const activeIndex = record ? processStages.findIndex((s) => s.title === record.stage) : -1;

  return (
    <div>
      <PageHero
        eyebrow="Submission"
        title="Track Submission"
        titleUrdu="اپنی سبمیشن کی صورتحال دیکھیں"
        description="Enter the Submission ID we sent you along with the email address you used when submitting."
      />
      <div className="mx-auto max-w-3xl px-5 py-12">
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

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {record && (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold">{record.novelTitle}</h2>
                <p className="text-sm text-muted-foreground">
                  {record.penName} · {record.genre}
                </p>
              </div>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                {record.status}
              </span>
            </div>

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

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Progress</p>
              <ol className="mt-4 space-y-3">
                {processStages.map((stage, i) => {
                  const done = activeIndex >= 0 && i <= activeIndex;
                  return (
                    <li key={stage.key} className="flex items-center gap-3 text-sm">
                      <span
                        className={`size-2.5 rounded-full ${done ? "bg-primary" : "bg-border"}`}
                      />
                      <span className={done ? "font-medium" : "text-muted-foreground"}>
                        {stage.title}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {record.note && (
              <p className="mt-5 rounded-lg bg-primary/5 p-4 text-sm text-muted-foreground">
                {record.note}
              </p>
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