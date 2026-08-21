import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Star, ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/portal/PageHero";
import { WriterCard } from "@/components/portal/WriterCard";
import { supabase } from "@/lib/supabase";
import type { PublicWriterRow } from "@/lib/supabase.types";
import { SEO } from "@/components/SEO";

export default function FeaturedWritersList() {
  const [writers, setWriters] = useState<PublicWriterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase.rpc("get_public_writers");
      if (err) {
        setError("Could not load the featured writers. Please try again later.");
      } else {
        const allWriters = (data ?? []) as PublicWriterRow[];
        setWriters(allWriters.filter(w => w.is_featured));
      }
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div>
      <SEO 
        title="Featured Writers | Urdu Novel Bank" 
        description="Discover the featured writers at Urdu Novel Bank. Explore profiles of our standout authors." 
      />
      <PageHero
        eyebrow="Standout Authors"
        title="Featured Writers"
        titleUrdu="نمایاں ادیب"
        description="Our standout authors who bring exceptional stories to Urdu Novel Bank readers."
      />

      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="mb-8">
          <Link
            to="/writers"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Writers
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && writers.length === 0 && (
          <div className="py-16 text-center">
            <Star className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">
              No featured writers yet. Check back soon.
            </p>
          </div>
        )}

        {!loading && writers.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {writers.map((writer) => (
              <WriterCard key={writer.id} writer={writer} hideFeaturedBadge />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
