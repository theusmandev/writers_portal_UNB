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
} from "lucide-react";
import { getFeaturedWriterBySlug } from "@/services/portalApi";
import type { FeaturedWriterPublic } from "@/lib/supabase.types";
import { PageHero } from "@/components/portal/PageHero";
import { SEO } from "@/components/SEO";

// ── Types ─────────────────────────────────────────────────────────────────────

type Novel = FeaturedWriterPublic["published_novels"][number];

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
          {novel.published_url ? (
            <a
              href={novel.published_url}
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

export default function FeaturedWriterPage() {
  const { slug } = useParams<{ slug: string }>();
  const [writer, setWriter] = useState<FeaturedWriterPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sanitizedBio, setSanitizedBio] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const res = await getFeaturedWriterBySlug(slug);

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

      setWriter(res.data);

      // Sanitize featured_bio HTML — same pattern as post-detail.tsx and the
      // Pause Message: allow target/_blank on links, strip everything unsafe.
      if (res.data.featured_bio) {
        DOMPurify.addHook("afterSanitizeAttributes", (node) => {
          if ("target" in node && node.nodeName === "A") {
            node.setAttribute("target", "_blank");
            node.setAttribute("rel", "noopener noreferrer");
          }
        });
        setSanitizedBio(
          DOMPurify.sanitize(res.data.featured_bio, {
            ADD_ATTR: ["target", "style", "data-align", "dir"],
          })
        );
      }

      setLoading(false);
    }
    void load();
  }, [slug]);

  // Display name: pen_name if set, otherwise full_name
  const displayName =
    writer?.pen_name?.trim() || writer?.full_name || "Featured Writer";

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <SEO
          title="Featured Writer — Urdu Novel Bank"
          description="Loading featured writer profile."
        />
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Not found / fetch error ───────────────────────────────────────────────
  if (notFound || fetchError || !writer) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <SEO
          noindex
          title="Writer Not Found — Urdu Novel Bank"
          description="The featured writer you're looking for could not be found."
        />

        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/60">
          <UserRound className="h-10 w-10 text-muted-foreground/50" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Writer Not Found
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {fetchError
              ? "Something went wrong while loading this page. Please try again later."
              : "This featured writer profile doesn't exist or is no longer active."}
          </p>
          {fetchError && (
            <p className="text-xs text-muted-foreground/60">{fetchError}</p>
          )}
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  // ── Found ─────────────────────────────────────────────────────────────────
  const novels = (writer.published_novels ?? []) as Novel[];
  const novelsWithCovers = novels.filter((n) => n.public_cover_image_url);
  const novelsWithoutCovers = novels.filter((n) => !n.public_cover_image_url);

  const socialLink = writer.social_media_link?.trim() || null;
  const socialHref =
    socialLink && !socialLink.includes("://")
      ? `https://${socialLink}`
      : socialLink;

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${displayName} — Urdu Novel Bank`;

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

  const isUrdu = /[\u0600-\u06FF]/.test(sanitizedBio || "");

  return (
    <div>
      <SEO
        title={`${displayName} — Urdu Novel Bank`}
        description={`Read the featured writer profile of ${displayName} on Urdu Novel Bank — discover their published novels and biography.`}
        type="website"
      />

      {/* ── Hero ── */}
      <PageHero
        eyebrow="Featured Writer"
        title={displayName}
        {...(writer.pen_name && writer.pen_name.trim() !== writer.full_name
          ? { description: writer.full_name }
          : {})}
      />

      {/* ── Body ── */}
      <div className="mx-auto max-w-3xl px-5 py-12 md:py-16 space-y-12">

        {/* Top bar: Back link & Share */}
        <div className="flex items-center justify-between">
          <Link
            to="/writers"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All writers
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
                Share profile
              </>
            )}
          </button>
        </div>

        {/* ── Featured bio ── */}
        {sanitizedBio ? (
          <section aria-label="Writer biography" className="relative mt-8">
            <h2 className="sr-only">Biography</h2>
            
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
              dangerouslySetInnerHTML={{ __html: sanitizedBio }}
            />
          </section>
        ) : (
          <section aria-label="Writer biography">
            <p className="text-muted-foreground italic text-sm">
              No biography available yet.
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
                {novelsWithoutCovers.map((novel, idx) => (
                  <li
                    key={`list-${idx}`}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-soft"
                  >
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      {novel.published_url ? (
                        <a
                          href={novel.published_url}
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
                ))}
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
                    {displayName}
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
