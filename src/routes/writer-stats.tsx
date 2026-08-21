import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, BarChart2, LinkIcon, Lock } from "lucide-react";
import { getWriterDashboardByToken } from "@/services/portalApi";
import type { WriterDashboardData } from "@/lib/supabase.types";
import { SEO } from "@/components/SEO";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Every failure mode resolves to this exact string — no variation. */
const INVALID_MSG = "This link isn't valid or has expired.";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WriterStatsPage() {
  const { token } = useParams<{ token: string }>();
  const [dashboard, setDashboard] = useState<WriterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  // Single boolean: valid or not. No third state that leaks information.
  const [valid, setValid] = useState(false);

  useEffect(() => {
    async function load() {
      // Treat missing / empty token identically to a bad token.
      if (!token?.trim()) {
        setLoading(false);
        return;
      }

      const res = await getWriterDashboardByToken(token);
      // Both res.success=false (network error swallowed) and res.data=null
      // (unrecognised token) map to the same invalid state.
      if (res.success && res.data) {
        setDashboard(res.data);
        setValid(true);
      }
      setLoading(false);
    }
    void load();
  }, [token]);

  // Display name: pen_name first, fallback to full_name
  const displayName =
    dashboard?.pen_name?.trim() || dashboard?.full_name || "Writer";

  // ── Loading ────────────────────────────────────────────────────────────────
  // Structured skeleton — mirrors the valid-state layout so the transition
  // feels intentional, not like a blank flash.
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SEO
          noindex
          title="Loading… | Urdu Novel Bank"
          description="Loading analytics dashboard."
        />

        {/* Skeleton header — same shape as the real header */}
        <header className="border-b border-border/60 bg-background">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-5 sm:px-8">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
          </div>
        </header>

        {/* Skeleton iframe card */}
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
          <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
            <div className="flex items-center justify-center" style={{ minHeight: "700px" }}>
              <div className="flex flex-col items-center gap-4 text-muted-foreground/50">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading your dashboard…</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Invalid / not found ───────────────────────────────────────────────────
  // Identical DOM structure and wording regardless of why the token failed.
  if (!valid || !dashboard) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16">
        <SEO
          noindex
          title="Link Unavailable | Urdu Novel Bank"
          description="The analytics link you followed is not available."
        />

        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60 mb-6">
          <LinkIcon className="h-7 w-7 text-muted-foreground/50" />
        </div>

        <h1 className="font-display text-xl font-semibold text-foreground">
          Link Unavailable
        </h1>
        <p className="mt-3 max-w-xs text-center text-sm text-muted-foreground">
          {INVALID_MSG}
        </p>
      </div>
    );
  }

  // ── Valid dashboard ───────────────────────────────────────────────────────
  const embedUrl = dashboard.looker_studio_embed_url;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        noindex
        title={`${displayName}'s Analytics | Urdu Novel Bank`}
        description="Private reader analytics dashboard."
      />

      {/* ── Header ── */}
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-5 sm:px-8">
          {/* Icon badge */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BarChart2 className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold leading-tight text-foreground sm:text-xl">
              {displayName}&rsquo;s Reader Analytics
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Private dashboard — do not share this link
            </p>
          </div>
        </div>
      </header>

      {/* ── Dashboard card ── */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
        {embedUrl ? (
          <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
            {/* Subtle warm accent bar at the top of the card */}
            <div
              className="h-1 w-full"
              style={{ background: "var(--gradient-hero)" }}
              aria-hidden="true"
            />
            <iframe
              src={embedUrl}
              title={`${displayName} — Reader Analytics`}
              className="w-full"
              style={{ minHeight: "700px", border: "none", display: "block" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        ) : (
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-border bg-card shadow-soft text-center">
            <p className="text-sm text-muted-foreground px-6">
              Your analytics dashboard is being set up. Check back soon.
            </p>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/50">
          <Lock className="h-3 w-3 shrink-0" />
          <span>Analytics provided by Looker Studio. Keep this link private.</span>
        </div>
      </main>
    </div>
  );
}
