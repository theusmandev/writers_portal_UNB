import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, BarChart2, LinkIcon } from "lucide-react";
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
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <SEO
          noindex
          title="Loading… | Urdu Novel Bank"
          description="Loading analytics dashboard."
        />
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
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

      {/* ── Minimal header ── */}
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4">
          <BarChart2 className="h-5 w-5 text-primary shrink-0" />
          <h1 className="font-display text-base font-semibold text-foreground">
            {displayName}&rsquo;s Reader Analytics
          </h1>
        </div>
      </header>

      {/* ── Embed area ── */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {embedUrl ? (
          <div className="w-full overflow-hidden rounded-xl border border-border shadow-soft">
            <iframe
              src={embedUrl}
              title={`${displayName} — Reader Analytics`}
              className="w-full"
              style={{ minHeight: "700px", border: "none" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        ) : (
          <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-border bg-muted/20 text-center">
            <p className="text-sm text-muted-foreground">
              Your analytics dashboard is being set up. Check back soon.
            </p>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground/60">
          Analytics provided by Looker Studio. Keep this link private.
        </p>
      </main>
    </div>
  );
}
