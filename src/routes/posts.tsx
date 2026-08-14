import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublishedPosts } from "@/services/portalApi";
import type { PostRow } from "@/lib/supabase.types";
import { PageHero } from "@/components/portal/PageHero";
import { Loader2, ArrowRight, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function PostsPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await getPublishedPosts();
      if (res.success) {
        setPosts(res.data);
      } else {
        setError(res.error);
      }
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div className="pb-24">
      <PageHero
        eyebrow="News & Updates"
        title="Portal Updates"
        titleUrdu="تازہ ترین خبریں"
        description="Stay updated with the latest announcements, guidelines, and community news from Umera Ahmed Novel Bank."
      />

      <div className="mx-auto max-w-4xl px-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center shadow-sm">
            <p className="text-muted-foreground text-lg">No updates published yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <article 
                key={post.id} 
                className="group relative flex flex-col items-start justify-between rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all sm:flex-row sm:items-center sm:gap-8 sm:p-8"
              >
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
                  </div>
                  
                  <h2 className="urdu font-display text-xl font-semibold text-foreground group-hover:text-primary transition-colors sm:text-2xl" dir="auto">
                    <Link to={`/updates/${post.slug}`}>
                      <span className="absolute inset-0" />
                      {post.title}
                    </Link>
                  </h2>
                  
                  <p className="urdu line-clamp-2 text-sm text-muted-foreground leading-relaxed" dir="auto">
                    {post.content}
                  </p>
                </div>
                
                <div className="mt-4 flex shrink-0 items-center sm:mt-0">
                  <span className="flex items-center gap-1 text-sm font-medium text-primary">
                    Read more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
