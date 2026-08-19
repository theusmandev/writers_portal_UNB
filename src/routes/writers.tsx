import { useEffect, useState } from "react";
import { ExternalLink, BookOpen, User, AlertCircle } from "lucide-react";
import { PageHero } from "@/components/portal/PageHero";
import { supabase } from "@/lib/supabase";
import type { PublicWriterRow } from "@/lib/supabase.types";
import { SEO } from "@/components/SEO";

export default function WritersPage() {
  const [writers, setWriters] = useState<PublicWriterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase.rpc("get_public_writers");
      if (err) {
        setError("Could not load the writers directory. Please try again later.");
      } else {
        setWriters((data ?? []) as PublicWriterRow[]);
      }
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div>
      <SEO 
        title="Our Published Writers | Urdu Novel Bank" 
        description="Explore the directory of talented writers published by Urdu Novel Bank. Discover the authors behind your favorite Urdu stories and novels." 
      />
      <PageHero
        eyebrow="Published Authors"
        title="Our Writers"
        titleUrdu="ہمارے ادیب"
        description="Talented authors who have shared their work with Urdu Novel Bank readers."
      />

      <div className="mx-auto max-w-5xl px-5 py-12">
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
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">
              No published writers yet — check back soon.
            </p>
          </div>
        )}

        {!loading && writers.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {writers.map((writer) => (
              <WriterCard key={writer.id} writer={writer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WriterCard({ writer }: { writer: PublicWriterRow }) {
  const novels = (writer.published_novels ?? []) as Array<{
    id: string;
    novel_title: string;
    genre: string | null;
    published_url: string | null;
  }>;

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card shadow-soft overflow-hidden transition-shadow hover:shadow-elegant">
      {/* Avatar area */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-semibold leading-tight">{writer.full_name}</h2>
          {writer.pen_name && writer.pen_name !== writer.full_name && (
            <p className="truncate text-xs text-muted-foreground">{writer.pen_name}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      <div className="flex-1 px-5 py-4 flex flex-col">
        {writer.bio ? (
          <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed break-words">{writer.bio}</p>
        ) : (
          <p className="text-sm text-muted-foreground/50 italic">No bio available.</p>
        )}
        
        {writer.social_media_link && (
          <div className="mt-auto pt-4">
            <a
              href={writer.social_media_link.includes('://') ? writer.social_media_link : `https://${writer.social_media_link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Social Media Profile
            </a>
          </div>
        )}
      </div>

      {/* Published novels */}
      {novels.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Published Novels
          </p>
          <ul className="space-y-1.5">
            {novels.map((novel) => (
              <li key={novel.id} className="flex items-start gap-2 text-sm">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="flex-1 leading-snug">
                  {novel.published_url ? (
                    <a
                      href={novel.published_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline underline-offset-2 inline-flex items-center gap-1"
                    >
                      {novel.novel_title}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="font-medium">{novel.novel_title}</span>
                  )}
                  {novel.genre && (
                    <span className="ml-1.5 text-xs text-muted-foreground">· {novel.genre}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
