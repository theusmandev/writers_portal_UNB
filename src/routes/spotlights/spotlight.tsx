import DOMPurify from "dompurify";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  UserRound,
  Share2,
  Check,
  Facebook,
  Twitter,
  Youtube,
  Instagram,
  Video,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { getSpotlightBySlug } from "@/services/portalApi";
import { PageHero } from "@/components/portal/PageHero";
import { SEO } from "@/components/SEO";

// ── Types ─────────────────────────────────────────────────────────────────────

type Novel = {
  novel_title: string;
  genre: string | null;
  published_url: string | null;
  public_cover_image_url: string | null;
  novel_status: string | null;
  published_episode_count: number;
  novel_published_at: string | null;
  resolved_published_url?: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function NovelCoverCard({ novel }: { novel: Novel }) {
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

// ── Page ──────────────────────────────────────────────────────────────────────

type SpotlightData = {
  spotlight_content: string | null;
  spotlight_label: string | null;
  created_at: string;
  display_name: string;
  social_media_link: string | null;
  published_novels: Novel[];
};

export default function SpotlightPage() {
  const { slug } = useParams<{ slug: string }>();
  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sanitizedContent, setSanitizedContent] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const res = await getSpotlightBySlug(slug);

      if (!res.success) {
        setFetchError(res.error);
        setLoading(false);
        return;
      }

      if (!res.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setSpotlight(res.data as SpotlightData);

      if (res.data.spotlight_content) {
        DOMPurify.addHook("afterSanitizeAttributes", (node) => {
          if ("target" in node && node.nodeName === "A") {
            node.setAttribute("target", "_blank");
            node.setAttribute("rel", "noopener noreferrer");
          }
        });
        setSanitizedContent(
          DOMPurify.sanitize(res.data.spotlight_content, {
            ADD_ATTR: ["target", "style", "data-align", "dir", "class", "id"],
          })
        );
      }

      setLoading(false);
    }
    void load();
  }, [slug]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <SEO
          title="Writer Spotlight — Urdu Novel Bank"
          description="Loading writer spotlight."
        />
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Not found / fetch error ───────────────────────────────────────────────
  if (notFound || fetchError || !spotlight) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <SEO
          noindex
          title="Spotlight Not Found — Urdu Novel Bank"
          description="The writer spotlight you're looking for could not be found."
        />

        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/60">
          <UserRound className="h-10 w-10 text-muted-foreground/50" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Spotlight Not Found
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {fetchError
              ? "Something went wrong while loading this page. Please try again later."
              : "This spotlight doesn't exist, is no longer active, or hasn't been published yet."}
          </p>
          {fetchError && (
            <p className="text-xs text-muted-foreground/60">{fetchError}</p>
          )}
        </div>

        <Link
          to="/spotlights"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Spotlights
        </Link>
      </div>
    );
  }

  // ── Found ─────────────────────────────────────────────────────────────────
  const novels = (spotlight.published_novels ?? []) as Novel[];
  const novelsWithCovers = novels.filter((n) => n.public_cover_image_url);
  const novelsWithoutCovers = novels.filter((n) => !n.public_cover_image_url);

  const socialLink = spotlight.social_media_link?.trim() || null;
  const socialHref =
    socialLink && !socialLink.includes("://")
      ? `https://${socialLink}`
      : socialLink;

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${spotlight.display_name} Spotlight — Urdu Novel Bank`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
      } catch (err) {
        // User cancelled or share failed
        console.error("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const isUrdu = /[\u0600-\u06FF]/.test(sanitizedContent || "");

  let seoDescription = `Read the featured spotlight for ${spotlight.display_name} on Urdu Novel Bank.`;
  if (spotlight.spotlight_content) {
    const plainText = spotlight.spotlight_content.replace(/<[^>]+>/g, '').trim();
    if (plainText) {
      seoDescription = plainText.length > 155 ? plainText.substring(0, 155).trim() + "..." : plainText;
    }
  }

  const seoImage = novelsWithCovers.length > 0 ? novelsWithCovers[0].public_cover_image_url || undefined : undefined;
  const pageTitle = spotlight.spotlight_label 
    ? `${spotlight.display_name} - ${spotlight.spotlight_label}`
    : spotlight.display_name;

  return (
    <div>
      <SEO
        title={`${pageTitle} — Urdu Novel Bank`}
        description={seoDescription}
        type="article"
        image={seoImage}
      />

      {/* ── Spotlight Hero ── */}
      <div className="relative overflow-hidden bg-background py-20 sm:py-28 lg:py-32 border-b border-border">
        {/* Spotlight Beam Visual */}
        <div 
          className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden"
          aria-hidden="true"
        >
          {/* Main top radial glow */}
          <div className="absolute -top-[30%] left-1/2 h-[160%] w-[150%] max-w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/20 via-primary/5 to-transparent dark:from-amber-400/10 dark:via-primary/5" />
          {/* Narrower beam overlay */}
          <div 
            className="absolute -top-[10%] left-1/2 h-[120%] w-[100%] max-w-[500px] -translate-x-1/2 opacity-30 dark:opacity-20"
            style={{
              background: "radial-gradient(circle at top, hsl(var(--primary) / 0.4) 0%, transparent 60%)"
            }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-400 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              {spotlight.spotlight_label || "Writer Spotlight"}
            </div>
          </div>
          
          <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            {spotlight.display_name}
          </h1>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto max-w-3xl px-5 py-12 md:py-16 space-y-12">

        {/* Top bar: Back link & Share */}
        <div className="flex items-center justify-between">
          <Link
            to="/spotlights"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All Spotlights
          </Link>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors rounded-md px-3 py-1.5 hover:bg-muted/50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                <span className="text-green-600 dark:text-green-500">Link copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Share
              </>
            )}
          </button>
        </div>

        {/* ── Spotlight Content ── */}
        {sanitizedContent ? (
          <section aria-label="Spotlight content" className="relative mt-8">
            <h2 className="sr-only">Spotlight Content</h2>
            
            {/* Decorative quote mark */}
            <div 
              className={`absolute -top-10 text-[10rem] text-primary/10 font-serif select-none pointer-events-none leading-none ${isUrdu ? '-right-4' : '-left-6'}`}
              aria-hidden="true"
            >
              &ldquo;
            </div>

            <div
              className={`relative z-10 urdu prose prose-lg prose-stone dark:prose-invert max-w-none prose-headings:font-urdu prose-a:text-primary hover:prose-a:text-primary/80 prose-p:leading-loose prose-headings:leading-[1.8] leading-loose ${
                !isUrdu
                  ? "[&>p:first-of-type::first-letter]:text-7xl [&>p:first-of-type::first-letter]:font-serif [&>p:first-of-type::first-letter]:text-primary [&>p:first-of-type::first-letter]:float-left [&>p:first-of-type::first-letter]:mr-4 [&>p:first-of-type::first-letter]:leading-[0.8] [&>p:first-of-type::first-letter]:mt-2"
                  : "border-r-4 border-primary/40 pr-6"
              }`}
              dir="auto"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </section>
        ) : (
          <section aria-label="Spotlight content">
            <p className="text-muted-foreground italic text-sm">
              No content provided for this spotlight.
            </p>
          </section>
        )}

        {/* ── Published novels ── */}
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

        {/* ── Social media link ── */}
        {socialHref && (() => {
          const { name, Icon, actionText, colorClass, accentClass } = getSocialPlatform(socialHref);
          const handle = extractHandle(socialHref, name);

          return (
            <section aria-label="Social media">
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
                    {spotlight.display_name}
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
      </div>
    </div>
  );
}
