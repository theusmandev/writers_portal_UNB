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
  if (lowerUrl.includes("instagram.com")) return { name: "Instagram", Icon: Instagram };
  if (lowerUrl.includes("facebook.com")) return { name: "Facebook", Icon: Facebook };
  if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) return { name: "Twitter/X", Icon: Twitter };
  if (lowerUrl.includes("youtube.com")) return { name: "YouTube", Icon: Youtube };
  if (lowerUrl.includes("tiktok.com")) return { name: "TikTok", Icon: Video };
  return { name: "Social Media Profile", Icon: LinkIcon };
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
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Published Novels
            </h2>
            <ul className="space-y-3">
              {novels.map((novel, idx) => (
                <li
                  key={idx}
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
                    {novel.genre && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        · {novel.genre}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Social media link ── */}
        {socialHref && (() => {
          const { name, Icon } = getSocialPlatform(socialHref);
          return (
            <section aria-label="Social media">
              <a
                href={socialHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-md hover:border-primary/30 w-full sm:w-72"
              >
                <Icon className="h-6 w-6 text-primary mb-3" />
                <p className="text-sm font-semibold">{name}</p>
                <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  Visit Profile
                </p>
              </a>
            </section>
          );
        })()}
      </div>
    </div>
  );
}
