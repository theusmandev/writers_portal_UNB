import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSpotlightsList } from "@/services/portalApi";
import { PageHero } from "@/components/portal/PageHero";
import { Loader2, Star } from "lucide-react";
import { SEO } from "@/components/SEO";
import { SpotlightCard, type SpotlightSummary } from "@/components/portal/SpotlightCard";

export default function SpotlightsPage() {
  const [spotlights, setSpotlights] = useState<SpotlightSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await getSpotlightsList();
      if (res.success) {
        setSpotlights(res.data);
      } else {
        setError(res.error);
      }
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div className="pb-24">
      <SEO 
        title="Writer Spotlights — Urdu Novel Bank" 
        description="Discover the standout featured writers and their spotlights on Urdu Novel Bank." 
      />
      <PageHero
        eyebrow="Writer Features"
        title="Writer Spotlights"
        titleUrdu="مصنفین کی جھلکیاں"
        description="Celebrate our standout authors and discover their stories."
      />

      <div className="mx-auto max-w-4xl px-6 py-16">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        ) : spotlights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center shadow-sm">
            <Star className="mx-auto h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground text-lg">No spotlights published yet. Check back soon.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {spotlights.map((spotlight, i) => (
              <SpotlightCard key={spotlight.id} spotlight={spotlight} delayMs={i * 100} layout="list" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
