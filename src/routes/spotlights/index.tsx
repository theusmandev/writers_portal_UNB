import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSpotlightsList } from "@/services/portalApi";
import { PageHero } from "@/components/portal/PageHero";
import { Loader2, ArrowRight, Calendar, Star } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { FadeIn } from "@/components/portal/FadeIn";
import { SEO } from "@/components/SEO";

type SpotlightSummary = {
  id: string;
  slug: string;
  spotlight_label: string | null;
  created_at: string;
  display_name: string;
};

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
              <FadeIn 
                as="article"
                key={spotlight.id} 
                delayMs={i * 100}
                className="group relative flex flex-col items-start justify-between rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all sm:flex-row sm:items-center sm:gap-8 sm:p-8"
              >
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <time dateTime={spotlight.created_at}>{formatDate(spotlight.created_at)}</time>
                  </div>
                  
                  <h2 className="font-serif text-xl font-semibold text-foreground group-hover:text-primary transition-colors sm:text-2xl leading-[1.3]">
                    <Link to={`/spotlights/${spotlight.slug}`}>
                      <span className="absolute inset-0" />
                      {spotlight.display_name}
                    </Link>
                  </h2>
                  
                  {spotlight.spotlight_label && (
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                      {spotlight.spotlight_label}
                    </p>
                  )}
                </div>
                
                <div className="mt-4 flex shrink-0 items-center sm:mt-0">
                  <span className="flex items-center gap-1 text-sm font-medium text-primary">
                    View Spotlight <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
