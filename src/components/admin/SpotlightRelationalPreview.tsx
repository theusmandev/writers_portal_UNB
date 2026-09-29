import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, Link as LinkIcon, Instagram, Facebook, Twitter, Youtube, Video, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

function getSocialPlatform(url: string) {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("instagram.com")) return { 
    name: "Instagram", 
    Icon: Instagram, 
    actionText: "Follow on Instagram", 
    colorClass: "bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white",
    accentClass: "bg-gradient-to-b from-amber-500 via-pink-500 to-purple-600"
  };
  if (lowerUrl.includes("facebook.com")) return { 
    name: "Facebook", 
    Icon: Facebook, 
    actionText: "Follow on Facebook", 
    colorClass: "bg-[#1877F2] text-white hover:bg-[#1877F2]/90",
    accentClass: "bg-[#1877F2]"
  };
  if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) return { 
    name: "Twitter/X", 
    Icon: Twitter, 
    actionText: "Follow on X", 
    colorClass: "bg-black text-white dark:bg-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90",
    accentClass: "bg-black dark:bg-white"
  };
  if (lowerUrl.includes("youtube.com")) return { 
    name: "YouTube", 
    Icon: Youtube, 
    actionText: "Subscribe on YouTube", 
    colorClass: "bg-[#FF0000] text-white hover:bg-[#FF0000]/90",
    accentClass: "bg-[#FF0000]"
  };
  if (lowerUrl.includes("tiktok.com")) return { 
    name: "TikTok", 
    Icon: Video, 
    actionText: "Follow on TikTok", 
    colorClass: "bg-black text-white dark:bg-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90",
    accentClass: "bg-black dark:bg-white"
  };
  return { 
    name: "Social Media Profile", 
    Icon: LinkIcon, 
    actionText: "Visit Profile", 
    colorClass: "bg-primary text-primary-foreground hover:bg-primary/90",
    accentClass: "bg-primary"
  };
}

function extractHandle(url: string, platformName: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    let pathname = urlObj.pathname;
    if (pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    const parts = pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    
    if (!lastPart) return null;
    
    if (platformName === 'YouTube' || platformName === 'TikTok') {
      const username = parts.find(p => p.startsWith('@'));
      if (username) return username;
      if (platformName === 'YouTube' && parts[0] === 'c') return `@${lastPart}`;
      return `@${lastPart}`;
    }
    
    if (['Instagram', 'Twitter/X', 'Facebook'].includes(platformName)) {
      if (lastPart.toLowerCase() === 'profile.php' || lastPart.toLowerCase() === 'pages') return null;
      return lastPart.startsWith('@') ? lastPart : `@${lastPart}`;
    }
    return null;
  } catch(e) {
    return null;
  }
}

function NovelCoverCard({ novel }: { novel: any }) {
  const [imageError, setImageError] = useState(false);
  const isNew = novel.novel_status === 'Ongoing' || (novel.novel_status === 'Complete' && novel.novel_published_at ? (new Date().getTime() - new Date(novel.novel_published_at).getTime()) <= 7 * 24 * 60 * 60 * 1000 : false);

  const resolvedUrl = novel.resolved_published_url || novel.published_url;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted/40">
        {!imageError && novel.public_cover_image_url ? (
          <img
            src={novel.public_cover_image_url}
            alt={`Cover of ${novel.novel_title}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-muted/20">
            <BookOpen className="mb-3 h-8 w-8 text-muted-foreground/30" />
            <span className="font-serif text-sm font-medium text-muted-foreground line-clamp-3">{novel.novel_title}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2 sm:p-3 md:p-4">
        <h3 className="font-serif text-xs sm:text-sm md:text-base font-semibold leading-snug text-foreground line-clamp-2">
          {novel.novel_title}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1 sm:gap-2">
          {isNew && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-emerald-600">
              New
            </span>
          )}
          {novel.novel_status === 'Ongoing' && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-primary">
              Ongoing • {novel.published_episode_count} {novel.published_episode_count === 1 ? 'ep' : 'eps'}
            </span>
          )}
          {novel.genre && (
            <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {novel.genre}
            </span>
          )}
        </div>
        <div className="mt-auto pt-3 sm:pt-4">
          {resolvedUrl ? (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl bg-primary/10 px-2 py-1.5 sm:px-3 sm:py-2 text-[9px] sm:text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              Read <span className="hidden sm:inline">&nbsp;Novel</span> <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </a>
          ) : (
            <span className="inline-flex w-full items-center justify-center rounded-lg sm:rounded-xl bg-muted px-2 py-1.5 sm:px-3 sm:py-2 text-[9px] sm:text-[10px] font-semibold text-muted-foreground">
              Soon
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function SpotlightRelationalPreview({ writerId }: { writerId: string }) {
  const [novels, setNovels] = useState<any[]>([]);
  const [socialLink, setSocialLink] = useState<string | null>(null);
  const [writerName, setWriterName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!writerId) {
      setLoading(false);
      return;
    }
    
    let isMounted = true;

    async function load() {
      setLoading(true);
      try {
        const [wRes, nRes] = await Promise.all([
          supabase.from('writers').select('full_name, pen_name, social_media_link').eq('id', writerId).single(),
          supabase.from('published_novels').select('*').eq('writer_id', writerId).order('novel_published_at', { ascending: false })
        ]);

        if (!isMounted) return;

        if (wRes.data) {
          setSocialLink(wRes.data.social_media_link);
          setWriterName(wRes.data.pen_name || wRes.data.full_name);
        }
        if (nRes.data) {
          setNovels(nRes.data);
        }
      } catch (err) {
        console.error("Failed to load spotlight relational data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();

    return () => {
      isMounted = false;
    };
  }, [writerId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const novelsWithCovers = novels.filter((n) => n.public_cover_image_url);
  const novelsWithoutCovers = novels.filter((n) => !n.public_cover_image_url);
  const socialHref = socialLink && !socialLink.includes("://") ? `https://${socialLink}` : socialLink;

  return (
    <>
      {novels.length > 0 && (
        <section aria-label="Published novels">
          <h2 className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Published Novels
          </h2>
          
          {novelsWithCovers.length > 0 && (
            <div className="mb-6 grid grid-cols-3 gap-3 md:grid-cols-4 md:gap-4">
              {novelsWithCovers.map((novel, idx) => (
                <NovelCoverCard key={`cover-${idx}`} novel={novel} />
              ))}
            </div>
          )}

          {novelsWithoutCovers.length > 0 && (
            <ul className="space-y-3">
              {novelsWithoutCovers.map((novel, idx) => {
                const isNew = novel.novel_status === 'Ongoing' || (novel.novel_status === 'Complete' && novel.novel_published_at ? (new Date().getTime() - new Date(novel.novel_published_at).getTime()) <= 7 * 24 * 60 * 60 * 1000 : false);
                const resolvedUrl = novel.resolved_published_url || novel.published_url;
                
                return (
                <li
                  key={`list-${idx}`}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-soft"
                >
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    {resolvedUrl ? (
                      <a
                        href={resolvedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary hover:underline underline-offset-2 inline-flex items-center gap-1"
                      >
                        {novel.novel_title}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="font-semibold">{novel.novel_title}</span>
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
                      <span className="ml-1.5 text-xs text-muted-foreground align-middle">
                        · {novel.genre}
                      </span>
                    )}
                  </div>
                </li>
              )})}
            </ul>
          )}
        </section>
      )}

      {socialHref && (() => {
        const { name, Icon, actionText, colorClass, accentClass } = getSocialPlatform(socialHref);
        const handle = extractHandle(socialHref, name);

        return (
          <section aria-label="Social media" className="mt-12">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft w-full">
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentClass}`} />
              
              <div className="p-6 pl-8">
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Connect With
                  </span>
                </div>

                <h3 className="font-serif italic text-3xl font-medium text-foreground mb-1">
                  {writerName}
                </h3>

                {handle && (
                  <p className="text-sm font-medium text-primary mb-4">
                    {handle}
                  </p>
                )}

                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Stay in touch with the writer for exclusive novel updates and new releases.
                </p>

                <a
                  href={socialHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98] ${colorClass}`}
                >
                  {actionText}
                </a>
              </div>
            </div>
          </section>
        );
      })()}
    </>
  );
}
