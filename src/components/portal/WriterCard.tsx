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
  }>;

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card shadow-soft overflow-hidden transition-shadow hover:shadow-elegant">
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
