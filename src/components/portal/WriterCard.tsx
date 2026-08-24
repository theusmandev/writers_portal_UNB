import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, BookOpen, User, Star } from "lucide-react";
import type { PublicWriterRow } from "@/lib/supabase.types";

interface WriterCardProps {
  writer: PublicWriterRow;
  hideFeaturedBadge?: boolean;
}

export function WriterCard({ writer, hideFeaturedBadge }: WriterCardProps) {
  const novels = (writer.published_novels ?? []) as Array<{
    id: string;
    novel_title: string;
    genre: string | null;
    published_url: string | null;
    novel_status: string | null;
    published_episode_count: number;
  }>;

  // Bio Truncation State
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [showBioToggle, setShowBioToggle] = useState(false);
  const bioRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (bioRef.current) {
      // If scrollHeight is greater than clientHeight, text is being truncated
      if (bioRef.current.scrollHeight > bioRef.current.clientHeight) {
        setShowBioToggle(true);
      }
    }
  }, [writer.bio]);

  // Novels Truncation State
  const [isNovelsExpanded, setIsNovelsExpanded] = useState(false);
  const displayedNovels = isNovelsExpanded ? novels : novels.slice(0, 3);
  const hiddenNovelsCount = novels.length - 3;

  return (
    <article className="flex flex-col h-full rounded-2xl border border-border bg-card shadow-soft overflow-hidden transition-shadow hover:shadow-elegant">
      {/* Avatar area */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          {/* Name — links to the featured page for featured writers, plain text otherwise */}
          {writer.is_featured && writer.featured_slug ? (
            <Link
              to={`/writers/featured/${writer.featured_slug}`}
              className="truncate font-semibold leading-tight hover:text-primary hover:underline underline-offset-2 transition-colors block"
            >
              {writer.full_name}
            </Link>
          ) : (
            <h2 className="truncate font-semibold leading-tight">{writer.full_name}</h2>
          )}
          {writer.pen_name && writer.pen_name !== writer.full_name && (
            <p className="truncate text-xs text-muted-foreground">{writer.pen_name}</p>
          )}
        </div>
        {/* Featured badge — only for featured writers (and when not explicitly hidden) */}
        {writer.is_featured && !hideFeaturedBadge && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
            Featured
          </span>
        )}
      </div>

      {/* Bio */}
      <div className="flex-1 px-5 py-4 flex flex-col">
        {writer.bio ? (
          <div>
            <p 
              ref={bioRef}
              className={`text-sm text-muted-foreground leading-relaxed break-words ${isBioExpanded ? "" : "line-clamp-4"}`}
            >
              {writer.bio}
            </p>
            {showBioToggle && (
              <button
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="mt-2 text-[11px] font-semibold text-primary hover:underline focus:outline-none"
              >
                {isBioExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/50 italic">No bio available.</p>
        )}
      </div>

      {/* Published novels */}
      {novels.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Published Novels
          </p>
          <ul className="space-y-1.5">
            {displayedNovels.map((novel) => {
              const isNew = novel.novel_status === 'Ongoing' || (novel.novel_status === 'Complete' && novel.novel_published_at ? (new Date().getTime() - new Date(novel.novel_published_at).getTime()) <= 7 * 24 * 60 * 60 * 1000 : false);
              return (
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
                  {isNew && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 align-middle">
                      New
                    </span>
                  )}
                  {novel.novel_status === 'Ongoing' && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary align-middle">
                      Ongoing • {novel.published_episode_count} {novel.published_episode_count === 1 ? 'episode' : 'episodes'}
                    </span>
                  )}
                  {novel.genre && (
                    <span className="ml-1.5 text-xs text-muted-foreground align-middle">· {novel.genre}</span>
                  )}
                </span>
              </li>
            )})}
          </ul>
          {hiddenNovelsCount > 0 && (
            <button
              onClick={() => setIsNovelsExpanded(!isNovelsExpanded)}
              className="mt-2.5 text-[11px] font-semibold text-primary hover:underline focus:outline-none"
            >
              {isNovelsExpanded ? "Show less" : `+${hiddenNovelsCount} more`}
            </button>
          )}
        </div>
      )}

      {/* Social Media Footer */}
      {writer.social_media_link && (
        <div className="border-t border-border/50 px-5 py-3 mt-auto bg-muted/10">
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
    </article>
  );
}
