#!/usr/bin/env node
/**
 * scripts/prerender-seo.mjs
 *
 * Post-build Static Pre-Renderer & Dynamic Sitemap Generator for Urdu Novel Bank Portal.
 *
 * Generates physical `dist/<route>/index.html` files with:
 * 1. Accurate <title>, <meta name="description">, <link rel="canonical">, Open Graph & Twitter tags.
 * 2. Crawlable semantic HTML inside <div id="root"> for search engine crawlers (Googlebot, Bingbot).
 *    (React 18's createRoot completely replaces this markup as soon as client JS mounts).
 * 3. Rich JSON-LD Structured Data (Organization, WebSite, Article, ProfilePage, FAQPage, Breadcrumbs).
 * 4. Comprehensive sitemap.xml covering all static and Supabase dynamic pages.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const BASE_URL = "https://portal.urdunovelbanks.com";
const DEFAULT_IMAGE = `${BASE_URL}/banner.png`;

// ── 1. Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(str, max = 155) {
  const clean = stripHtml(str);
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trim() + "...";
}

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ── 2. Load Environment Variables (Local .env fallback) ───────────────────────

function getEnvCredentials() {
  let supabaseUrl = process.env.VITE_SUPABASE_URL;
  let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const envPaths = [path.join(ROOT_DIR, ".env"), path.join(ROOT_DIR, ".env.local")];
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const raw = fs.readFileSync(envPath, "utf8");
        const urlMatch = raw.match(/^\s*VITE_SUPABASE_URL\s*=\s*(.*?)\s*$/m);
        const keyMatch = raw.match(/^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(.*?)\s*$/m);
        if (!supabaseUrl && urlMatch) supabaseUrl = urlMatch[1].replace(/^["']|["']$/g, "");
        if (!supabaseAnonKey && keyMatch) supabaseAnonKey = keyMatch[1].replace(/^["']|["']$/g, "");
      }
    }
  }

  return { supabaseUrl, supabaseAnonKey };
}

// ── 3. Static Route Definitions ───────────────────────────────────────────────

const STATIC_ROUTES = [
  {
    path: "/",
    title: "Urdu Novel Bank — Writer & Publication Portal",
    description:
      "Submit, review and track Urdu novels with Urdu Novel Bank's official writer portal.",
    changefreq: "weekly",
    priority: "1.0",
    fallbackHtml: `
      <header>
        <h1>Urdu Novel Bank — Writer &amp; Publication Portal</h1>
        <p>Submit, review and track Urdu novels with Urdu Novel Bank's official writer portal. A dedicated, structured, and transparent publishing platform for Urdu writers and readers.</p>
      </header>
      <nav aria-label="Portal Navigation" style="margin-top: 1.5rem;">
        <ul>
          <li><a href="/submit">Submit Your Novel</a> — Send your Urdu novel manuscript for editorial review.</li>
          <li><a href="/track">Track Submission</a> — Check live editorial status with your Submission Code.</li>
          <li><a href="/guidelines">Submission Guidelines</a> — Length, language, format, and content standards.</li>
          <li><a href="/process">Publication Process</a> — Editorial timeline and steps from submission to release.</li>
          <li><a href="/timeline">Publishing Timeline</a> — Expected turnaround times.</li>
          <li><a href="/writers">Writers Directory</a> — Explore published writers and their novels.</li>
          <li><a href="/writers/featured">Featured Writers</a> — Standout authors on Urdu Novel Bank.</li>
          <li><a href="/spotlights">Monthly Spotlights</a> — Discover author stories and spotlight interviews.</li>
          <li><a href="/updates">Latest Updates</a> — Announcements and writing guidance.</li>
          <li><a href="/faq">Frequently Asked Questions</a> — Clarifications on submissions, royalties, and rights.</li>
          <li><a href="/policy">Writer Policy</a> — Terms of service and intellectual property protection.</li>
          <li><a href="/contact">Contact Editorial Support</a> — Reach our team directly.</li>
        </ul>
      </nav>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${BASE_URL}/#organization`,
          name: "Urdu Novel Bank",
          url: `${BASE_URL}/`,
          logo: `${BASE_URL}/unb-logo.svg`,
          sameAs: [
            "https://urdunovelbanks.com",
            "https://www.facebook.com/UrduNovelBank",
            "https://www.instagram.com/urdunovelbank",
          ],
        },
        {
          "@type": "WebSite",
          "@id": `${BASE_URL}/#website`,
          url: `${BASE_URL}/`,
          name: "Urdu Novel Bank Portal",
          description:
            "Submit, review and track Urdu novels with Urdu Novel Bank's official writer portal.",
          publisher: {
            "@id": `${BASE_URL}/#organization`,
          },
        },
      ],
    },
  },
  {
    path: "/submit",
    title: "Submit Your Novel — Urdu Novel Bank",
    description:
      "Submit your Urdu novel manuscript for professional publication, editing, and distribution on Urdu Novel Bank.",
    changefreq: "weekly",
    priority: "0.9",
    fallbackHtml: `
      <article>
        <h1>Submit Your Urdu Novel Manuscript</h1>
        <p>Send your novel manuscript to Urdu Novel Bank for professional editorial review, digital publication, and distribution to thousands of Urdu novel readers worldwide.</p>
        <h2>Submission Requirements</h2>
        <ul>
          <li>Manuscript in Urdu language (Word doc, PDF, or typed InPage/Unicode text).</li>
          <li>Synopsis summarizing characters, main conflict, and plot.</li>
          <li>Writer pen name, email, and WhatsApp contact for editorial communication.</li>
          <li>Both Complete novels and Ongoing serialized novels are welcomed.</li>
        </ul>
        <p>Please review our <a href="/guidelines">Submission Guidelines</a> before sending your novel.</p>
      </article>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Submit Your Novel — Urdu Novel Bank",
      description:
        "Submit your Urdu novel manuscript for professional publication, editing, and distribution on Urdu Novel Bank.",
      url: `${BASE_URL}/submit`,
    },
  },
  {
    path: "/track",
    title: "Track Your Submission — Urdu Novel Bank",
    description:
      "Check your novel's submission status, review progress, and editorial notes on Urdu Novel Bank.",
    changefreq: "weekly",
    priority: "0.9",
    fallbackHtml: `
      <article>
        <h1>Track Your Urdu Novel Submission Status</h1>
        <p>Check the live progress of your novel submission with your Submission Code (e.g. UNB-1234) and registered email address.</p>
        <h2>Editorial Stages</h2>
        <ul>
          <li><strong>Submitted:</strong> Your manuscript has been received and queued for review.</li>
          <li><strong>Under Review:</strong> Our editorial team is evaluating the manuscript, plot, and language.</li>
          <li><strong>Approved:</strong> Your novel has been accepted for publication.</li>
          <li><strong>Scheduled / Published:</strong> Publication dates are set or your novel is live on Urdu Novel Bank.</li>
        </ul>
      </article>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Track Your Submission — Urdu Novel Bank",
      description:
        "Check your novel's submission status, review progress, and editorial notes on Urdu Novel Bank.",
      url: `${BASE_URL}/track`,
    },
  },
  {
    path: "/updates",
    title: "Latest Updates & Announcements — Urdu Novel Bank",
    description:
      "Stay updated with publishing news, writing advice, and writer announcements from Urdu Novel Bank.",
    changefreq: "weekly",
    priority: "0.8",
    fallbackHtml: `
      <article>
        <h1>Latest Updates &amp; Announcements</h1>
        <p>Official announcements, writer guidance, editorial advice, and portal release notes from Urdu Novel Bank.</p>
        <p>Browse our articles below or check out our <a href="/spotlights">Monthly Writer Spotlights</a>.</p>
      </article>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Latest Updates & Announcements — Urdu Novel Bank",
      description:
        "Stay updated with publishing news, writing advice, and writer announcements from Urdu Novel Bank.",
      url: `${BASE_URL}/updates`,
    },
  },
  {
    path: "/spotlights",
    title: "Monthly Writer Spotlights — Urdu Novel Bank",
    description:
      "Read exclusive interviews, novel highlights, and profiles of featured Urdu authors every month.",
    changefreq: "weekly",
    priority: "0.8",
    fallbackHtml: `
      <article>
        <h1>Monthly Writer Spotlights</h1>
        <p>Every month, Urdu Novel Bank highlights standout Urdu novelists, celebrating their literary journeys, published works, and creative voices.</p>
        <p>Discover our featured authors and read their full profiles and published novels.</p>
      </article>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Monthly Writer Spotlights — Urdu Novel Bank",
      description:
        "Read exclusive interviews, novel highlights, and profiles of featured Urdu authors every month.",
      url: `${BASE_URL}/spotlights`,
    },
  },
  {
    path: "/writers",
    title: "Urdu Novel Writers Directory — Urdu Novel Bank",
    description:
      "Explore published Urdu novel authors, browse writers and their novels on Urdu Novel Bank.",
    changefreq: "monthly",
    priority: "0.7",
    fallbackHtml: `
      <article>
        <h1>Urdu Novel Writers Directory</h1>
        <p>Browse talented Urdu novelists published on Urdu Novel Bank. Explore their biographies, serials, and complete novels.</p>
        <p>Looking for our highlighted authors? Visit our <a href="/writers/featured">Featured Writers</a> section.</p>
      </article>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Urdu Novel Writers Directory — Urdu Novel Bank",
      description:
        "Explore published Urdu novel authors, browse writers and their novels on Urdu Novel Bank.",
      url: `${BASE_URL}/writers`,
    },
  },
  {
    path: "/writers/featured",
    title: "Featured Writers — Urdu Novel Bank",
    description:
      "Discover standout Urdu novel authors who bring exceptional stories to Urdu Novel Bank readers.",
    changefreq: "monthly",
    priority: "0.7",
    fallbackHtml: `
      <article>
        <h1>Featured Urdu Novel Writers</h1>
        <p>Explore standout authors on Urdu Novel Bank whose storytelling, emotional depth, and unique literary voice captivate thousands of readers.</p>
      </article>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Featured Writers — Urdu Novel Bank",
      description:
        "Discover standout Urdu novel authors who bring exceptional stories to Urdu Novel Bank readers.",
      url: `${BASE_URL}/writers/featured`,
    },
  },
  {
    path: "/guidelines",
    title: "Submission Guidelines — Urdu Novel Bank",
    description:
      "Essential formatting, novel length, language, and content standards for publishing Urdu novels with Urdu Novel Bank.",
    changefreq: "monthly",
    priority: "0.7",
    fallbackHtml: `
      <article>
        <h1>Urdu Novel Submission Guidelines</h1>
        <p>To ensure high literary standards and a smooth editorial process, please review these guidelines before submitting your manuscript.</p>
        <h2>Key Guidelines</h2>
        <ul>
          <li><strong>Language:</strong> Novels must be written in Urdu (Unicode / InPage / typed text).</li>
          <li><strong>Originality:</strong> Submissions must be your original work. Plagiarism is strictly prohibited.</li>
          <li><strong>Formatting:</strong> Submit clean, readable text files with clear chapter divisions.</li>
          <li><strong>Ongoing Novels:</strong> Minimum 5-10 prepared episodes before submitting ongoing serials.</li>
        </ul>
      </article>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Submission Guidelines — Urdu Novel Bank",
      description:
        "Essential formatting, novel length, language, and content standards for publishing Urdu novels with Urdu Novel Bank.",
      url: `${BASE_URL}/guidelines`,
    },
  },
  {
    path: "/process",
    title: "Publication Process — Urdu Novel Bank",
    description:
      "Learn the step-by-step editorial, proofreading, and publication process for Urdu novels.",
    changefreq: "monthly",
    priority: "0.6",
    fallbackHtml: `
      <article>
        <h1>Our Publication Process</h1>
        <p>From the moment you submit your novel to the day it reaches readers, here is how our editorial pipeline works:</p>
        <ol>
          <li><strong>Manuscript Submission:</strong> Upload your novel and synopsis via our online portal.</li>
          <li><strong>Editorial Evaluation:</strong> Our editors assess language, pacing, and storytelling quality.</li>
          <li><strong>Proofreading &amp; Formatting:</strong> Approved manuscripts undergo typographic and visual formatting.</li>
          <li><strong>Cover Design &amp; Release:</strong> Branded artwork is prepared and the novel is launched across our digital library.</li>
        </ol>
      </article>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Publication Process — Urdu Novel Bank",
      description:
        "Learn the step-by-step editorial, proofreading, and publication process for Urdu novels.",
      url: `${BASE_URL}/process`,
    },
  },
  {
    path: "/timeline",
    title: "Publishing Timeline — Urdu Novel Bank",
    description:
      "Expected turnaround times from initial submission review to final online publication.",
    changefreq: "monthly",
    priority: "0.6",
    fallbackHtml: `
      <article>
        <h1>Publishing Timeline &amp; Review Schedule</h1>
        <p>We value every writer's time and effort. Here are our standard review turnaround times:</p>
        <ul>
          <li><strong>Initial Review:</strong> 5–7 working days for manuscript review.</li>
          <li><strong>Editorial Feedback:</strong> Provided via email / WhatsApp if revisions are recommended.</li>
          <li><strong>Scheduling:</strong> Accepted complete novels are scheduled within 2–4 weeks. Ongoing novel episodes are scheduled on a weekly or bi-weekly cadence.</li>
        </ul>
      </article>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Publishing Timeline — Urdu Novel Bank",
      description:
        "Expected turnaround times from initial submission review to final online publication.",
      url: `${BASE_URL}/timeline`,
    },
  },
  {
    path: "/faq",
    title: "Frequently Asked Questions — Urdu Novel Bank",
    description:
      "Find answers to frequently asked questions about novel submissions, publishing terms, rights, and formats.",
    changefreq: "monthly",
    priority: "0.6",
    fallbackHtml: `
      <article>
        <h1>Frequently Asked Questions (FAQs)</h1>
        <section>
          <h2>How do I submit my novel?</h2>
          <p>You can submit your novel through our online <a href="/submit">submission form</a>. Simply enter your writer details, synopsis, and manuscript file.</p>
        </section>
        <section>
          <h2>Do you accept ongoing / episodic novels?</h2>
          <p>Yes! We welcome both completed novels and ongoing episodic stories. For ongoing novels, we recommend having at least 5 completed episodes ready before submitting.</p>
        </section>
        <section>
          <h2>Who owns the rights to my novel?</h2>
          <p>You retain 100% intellectual property rights to your novel. Urdu Novel Bank is granted a non-exclusive digital publishing license to distribute your novel to our readership.</p>
        </section>
        <section>
          <h2>Is there any fee to publish on Urdu Novel Bank?</h2>
          <p>No, submitting and publishing your novel on Urdu Novel Bank is completely free for writers.</p>
        </section>
      </article>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How do I submit my novel?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can submit your novel through our online submission form at https://portal.urdunovelbanks.com/submit. Simply enter your writer details, synopsis, and manuscript file.",
          },
        },
        {
          "@type": "Question",
          name: "Do you accept ongoing / episodic novels?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! We welcome both completed novels and ongoing episodic stories. For ongoing novels, we recommend having at least 5 completed episodes ready before submitting.",
          },
        },
        {
          "@type": "Question",
          name: "Who owns the rights to my novel?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You retain 100% intellectual property rights to your novel. Urdu Novel Bank is granted a non-exclusive digital publishing license to distribute your novel to our readership.",
          },
        },
        {
          "@type": "Question",
          name: "Is there any fee to publish on Urdu Novel Bank?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No, submitting and publishing your novel on Urdu Novel Bank is completely free for writers.",
          },
        },
      ],
    },
  },
  {
    path: "/policy",
    title: "Writer Policy & Terms — Urdu Novel Bank",
    description:
      "Read Urdu Novel Bank's writer terms, copyright protection, royalties, and content rights policies.",
    changefreq: "yearly",
    priority: "0.4",
    fallbackHtml: `
      <article>
        <h1>Writer Terms, Rights &amp; Policy</h1>
        <p>Urdu Novel Bank is committed to creating a transparent, respectful, and legally sound ecosystem for Urdu authors.</p>
        <h2>Copyright &amp; Ownership</h2>
        <p>Writers retain full ownership and copyright of their creative work. Submitting your work grants Urdu Novel Bank a non-exclusive license to format, display, and distribute the work digitally across our official website, applications, and promotional media.</p>
        <h2>Content Standards</h2>
        <p>Writers must guarantee that the work submitted is original and does not violate copyright, trademark, or applicable laws.</p>
      </article>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Writer Policy & Terms — Urdu Novel Bank",
      description:
        "Read Urdu Novel Bank's writer terms, copyright protection, royalties, and content rights policies.",
      url: `${BASE_URL}/policy`,
    },
  },
  {
    path: "/contact",
    title: "Contact Editorial Support — Urdu Novel Bank",
    description: "Get in touch with the Urdu Novel Bank editorial and writer support team.",
    changefreq: "monthly",
    priority: "0.6",
    fallbackHtml: `
      <article>
        <h1>Contact Editorial Support</h1>
        <p>Have a question about your submission, need help with your manuscript, or wish to connect with our editorial board?</p>
        <ul>
          <li><strong>Website:</strong> <a href="https://urdunovelbanks.com">urdunovelbanks.com</a></li>
          <li><strong>Support Portal:</strong> <a href="${BASE_URL}">${BASE_URL}</a></li>
          <li><strong>Facebook:</strong> <a href="https://www.facebook.com/UrduNovelBank">facebook.com/UrduNovelBank</a></li>
          <li><strong>Instagram:</strong> <a href="https://www.instagram.com/urdunovelbank">instagram.com/urdunovelbank</a></li>
        </ul>
      </article>
    `,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Contact Editorial Support — Urdu Novel Bank",
      description: "Get in touch with the Urdu Novel Bank editorial and writer support team.",
      url: `${BASE_URL}/contact`,
    },
  },
];

// ── 4. Supabase Dynamic Routes Fetcher ─────────────────────────────────────────

async function fetchDynamicRoutes(supabaseUrl, supabaseAnonKey) {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[prerender-seo] Supabase credentials not found. Skipping dynamic route pre-rendering.",
    );
    return [];
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const dynamicRoutes = [];

    console.log("[prerender-seo] Fetching dynamic content from Supabase...");

    // ── 4A. Spotlights ────────────────────────────────────────────────────────
    try {
      const { data: spotlightsList, error: sErr } = await supabase.rpc("get_spotlights_list");
      if (sErr) throw sErr;

      if (Array.isArray(spotlightsList)) {
        console.log(`[prerender-seo] Found ${spotlightsList.length} spotlights.`);
        for (const item of spotlightsList) {
          if (!item.slug) continue;

          // Fetch full spotlight detail
          const { data: detailData } = await supabase.rpc("get_spotlight_by_slug", {
            p_slug: item.slug,
          });
          const spotlight = detailData && detailData[0] ? detailData[0] : item;

          const displayName = spotlight.display_name || item.display_name || "Writer";
          const label = spotlight.spotlight_label || item.spotlight_label || "Writer Spotlight";
          const title = `${displayName} - ${label} — Urdu Novel Bank`;
          const content = spotlight.spotlight_content || "";
          const description =
            truncate(content, 155) ||
            `Read the featured writer spotlight for ${displayName} on Urdu Novel Bank.`;

          let coverImage = DEFAULT_IMAGE;
          const novels = spotlight.published_novels || item.published_novels || [];
          if (novels.length > 0 && novels[0].public_cover_image_url) {
            coverImage = novels[0].public_cover_image_url;
          } else if (item.first_cover_url) {
            coverImage = item.first_cover_url;
          }

          const novelsListHtml =
            novels.length > 0
              ? `<h2>Published Novels</h2><ul>${novels.map((n) => `<li>${escapeHtml(n.novel_title)} ${n.genre ? `(${escapeHtml(n.genre)})` : ""}</li>`).join("")}</ul>`
              : "";

          dynamicRoutes.push({
            path: `/spotlights/${item.slug}`,
            title,
            description,
            image: coverImage,
            type: "article",
            changefreq: "monthly",
            priority: "0.8",
            lastmod: spotlight.created_at || item.published_at || new Date().toISOString(),
            fallbackHtml: `
              <article>
                <header>
                  <p style="text-transform: uppercase; letter-spacing: 0.1em; color: #b45309; font-weight: bold;">${escapeHtml(label)}</p>
                  <h1>${escapeHtml(displayName)}</h1>
                </header>
                <div class="content" style="margin: 1.5rem 0; line-height: 1.8;">
                  ${content || `<p>${escapeHtml(description)}</p>`}
                </div>
                ${novelsListHtml}
                <p><a href="/spotlights">&larr; Back to all spotlights</a></p>
              </article>
            `,
            jsonLd: {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: title,
              description,
              image: [coverImage],
              datePublished: spotlight.created_at || item.published_at || new Date().toISOString(),
              author: {
                "@type": "Organization",
                name: "Urdu Novel Bank",
                url: BASE_URL,
              },
              publisher: {
                "@type": "Organization",
                name: "Urdu Novel Bank",
                url: BASE_URL,
                logo: {
                  "@type": "ImageObject",
                  url: `${BASE_URL}/unb-logo.svg`,
                },
              },
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id": `${BASE_URL}/spotlights/${item.slug}`,
              },
            },
          });
        }
      }
    } catch (err) {
      console.error("[prerender-seo] Error fetching spotlights:", err.message);
    }

    // ── 4B. Posts / Updates ───────────────────────────────────────────────────
    try {
      const { data: posts, error: pErr } = await supabase
        .from("posts")
        .select("id, slug, title, content, meta_title, meta_description, created_at, updated_at")
        .eq("published", true);

      if (pErr) throw pErr;

      if (Array.isArray(posts)) {
        console.log(`[prerender-seo] Found ${posts.length} published updates/posts.`);
        for (const post of posts) {
          if (!post.slug) continue;

          const title = post.meta_title || `${post.title} — Urdu Novel Bank`;
          const description =
            post.meta_description ||
            truncate(post.content, 155) ||
            "Read the latest update from Urdu Novel Bank.";

          // Check for image in content
          let image = DEFAULT_IMAGE;
          const imgMatch = post.content?.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch && imgMatch[1]) {
            image = imgMatch[1];
          }

          dynamicRoutes.push({
            path: `/updates/${post.slug}`,
            title,
            description,
            image,
            type: "article",
            changefreq: "weekly",
            priority: "0.8",
            lastmod: post.updated_at || post.created_at || new Date().toISOString(),
            fallbackHtml: `
              <article>
                <header>
                  <time datetime="${escapeHtml(post.created_at)}">${new Date(post.created_at).toLocaleDateString()}</time>
                  <h1>${escapeHtml(post.title)}</h1>
                </header>
                <div class="content" style="margin: 1.5rem 0; line-height: 1.8;">
                  ${post.content || `<p>${escapeHtml(description)}</p>`}
                </div>
                <p><a href="/updates">&larr; Back to all updates</a></p>
              </article>
            `,
            jsonLd: {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: post.title,
              description,
              image: [image],
              datePublished: post.created_at,
              dateModified: post.updated_at || post.created_at,
              author: {
                "@type": "Organization",
                name: "Urdu Novel Bank",
                url: BASE_URL,
              },
              publisher: {
                "@type": "Organization",
                name: "Urdu Novel Bank",
                url: BASE_URL,
                logo: {
                  "@type": "ImageObject",
                  url: `${BASE_URL}/unb-logo.svg`,
                },
              },
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id": `${BASE_URL}/updates/${post.slug}`,
              },
            },
          });
        }
      }
    } catch (err) {
      console.error("[prerender-seo] Error fetching posts:", err.message);
    }

    // ── 4C. Featured Writers ──────────────────────────────────────────────────
    try {
      const { data: writers, error: wErr } = await supabase.rpc("get_public_writers");
      if (wErr) throw wErr;

      const featuredList = (writers || []).filter((w) => w.is_featured && w.featured_slug);
      console.log(`[prerender-seo] Found ${featuredList.length} featured writers.`);

      for (const w of featuredList) {
        // Fetch detailed featured writer profile
        const { data: writerData } = await supabase.rpc("get_featured_writer_public", {
          p_slug: w.featured_slug,
        });
        const writer = writerData && writerData[0] ? writerData[0] : w;

        const displayName = writer.pen_name || writer.full_name || "Featured Writer";
        const title = `${displayName} — Featured Writer — Urdu Novel Bank`;
        const bio = writer.featured_bio || w.bio || "";
        const description =
          truncate(bio, 155) ||
          `Read the featured writer profile of ${displayName} on Urdu Novel Bank.`;

        let coverImage = DEFAULT_IMAGE;
        const novels = writer.published_novels || [];
        if (novels.length > 0 && novels[0].public_cover_image_url) {
          coverImage = novels[0].public_cover_image_url;
        }

        const novelsListHtml =
          novels.length > 0
            ? `<h2>Published Novels</h2><ul>${novels.map((n) => `<li>${escapeHtml(n.novel_title)} ${n.genre ? `(${escapeHtml(n.genre)})` : ""}</li>`).join("")}</ul>`
            : "";

        dynamicRoutes.push({
          path: `/writers/featured/${w.featured_slug}`,
          title,
          description,
          image: coverImage,
          type: "profile",
          changefreq: "monthly",
          priority: "0.8",
          fallbackHtml: `
            <article>
              <header>
                <p style="text-transform: uppercase; letter-spacing: 0.1em; color: #b45309; font-weight: bold;">Featured Writer</p>
                <h1>${escapeHtml(displayName)}</h1>
                ${writer.full_name && writer.full_name !== displayName ? `<p>${escapeHtml(writer.full_name)}</p>` : ""}
              </header>
              <div class="bio" style="margin: 1.5rem 0; line-height: 1.8;">
                ${bio || `<p>${escapeHtml(description)}</p>`}
              </div>
              ${novelsListHtml}
              <p><a href="/writers/featured">&larr; Back to featured writers</a></p>
            </article>
          `,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            name: title,
            description,
            image: coverImage,
            mainEntity: {
              "@type": "Person",
              name: displayName,
              description,
              jobTitle: "Urdu Novelist / Author",
              worksFor: {
                "@type": "Organization",
                name: "Urdu Novel Bank",
                url: BASE_URL,
              },
              ...(writer.social_media_link ? { sameAs: [writer.social_media_link] } : {}),
            },
          },
        });
      }
    } catch (err) {
      console.error("[prerender-seo] Error fetching featured writers:", err.message);
    }

    return dynamicRoutes;
  } catch (err) {
    console.error("[prerender-seo] Unexpected error in dynamic route fetching:", err.message);
    return [];
  }
}

// ── 5. HTML Pre-Rendering Engine ──────────────────────────────────────────────

function renderHtmlForRoute(baseTemplate, route) {
  let html = baseTemplate;
  const canonicalUrl = `${BASE_URL}${route.path === "/" ? "/" : route.path.replace(/\/+$/, "")}`;
  const pageTitle = route.title;
  const pageDescription = route.description;
  const pageImage = route.image || DEFAULT_IMAGE;
  const pageType = route.type || "website";

  // 1. Update <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

  // 2. Update <link rel="canonical">
  if (/<link rel="canonical"[^>]*>/i.test(html)) {
    html = html.replace(
      /<link rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${canonicalUrl}" />`,
    );
  } else {
    html = html.replace(
      "</head>",
      `    <link rel="canonical" href="${canonicalUrl}" />\n  </head>`,
    );
  }

  // 3. Update or inject <meta name="description">
  if (/<meta name="description"[^>]*>/i.test(html)) {
    html = html.replace(
      /<meta name="description"[^>]*>/i,
      `<meta name="description" content="${escapeHtml(pageDescription)}" />`,
    );
  } else {
    html = html.replace(
      "</head>",
      `    <meta name="description" content="${escapeHtml(pageDescription)}" />\n  </head>`,
    );
  }

  // 4. Update Open Graph tags
  const ogTags = [
    { property: "og:site_name", content: "Urdu Novel Bank" },
    { property: "og:type", content: pageType },
    { property: "og:title", content: pageTitle },
    { property: "og:description", content: pageDescription },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: pageImage },
  ];

  for (const tag of ogTags) {
    const regex = new RegExp(`<meta property="${tag.property}"[^>]*>`, "i");
    if (regex.test(html)) {
      html = html.replace(
        regex,
        `<meta property="${tag.property}" content="${escapeHtml(tag.content)}" />`,
      );
    } else {
      html = html.replace(
        "</head>",
        `    <meta property="${tag.property}" content="${escapeHtml(tag.content)}" />\n  </head>`,
      );
    }
  }

  // 5. Update Twitter tags
  const twitterTags = [
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: pageTitle },
    { name: "twitter:description", content: pageDescription },
    { name: "twitter:image", content: pageImage },
  ];

  for (const tag of twitterTags) {
    const regex = new RegExp(`<meta name="${tag.name}"[^>]*>`, "i");
    if (regex.test(html)) {
      html = html.replace(
        regex,
        `<meta name="${tag.name}" content="${escapeHtml(tag.content)}" />`,
      );
    } else {
      html = html.replace(
        "</head>",
        `    <meta name="${tag.name}" content="${escapeHtml(tag.content)}" />\n  </head>`,
      );
    }
  }

  // 6. Update JSON-LD structured data
  if (route.jsonLd) {
    const jsonLdString = JSON.stringify(route.jsonLd, null, 2);
    const scriptRegex = /<script id="seo-json-ld" type="application\/ld\+json">[\s\S]*?<\/script>/i;
    if (scriptRegex.test(html)) {
      html = html.replace(
        scriptRegex,
        `<script id="seo-json-ld" type="application/ld+json">\n${jsonLdString}\n    </script>`,
      );
    } else {
      html = html.replace(
        "</head>",
        `    <script id="seo-json-ld" type="application/ld+json">\n${jsonLdString}\n    </script>\n  </head>`,
      );
    }
  }

  // 7. Inject crawler semantic HTML into <div id="root">
  // Styled with accessible visually-hidden CSS (sr-only) so search engines & screen readers parse
  // all semantic content & links immediately, while human users see zero flash of unstyled text before React mounts.
  if (route.fallbackHtml) {
    const semanticFallback = `
      <div id="root">
        <main class="seo-crawler-content" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: normal; border: 0;">
          ${route.fallbackHtml}
        </main>
      </div>`;
    html = html.replace(/<div id="root"><\/div>/i, semanticFallback.trim());
  }

  return html;
}

// ── 6. Sitemap.xml Generator ──────────────────────────────────────────────────

function generateSitemapXml(allRoutes) {
  const dateStr = new Date().toISOString().split("T")[0];
  const urlEntries = allRoutes.map((r) => {
    const loc = `${BASE_URL}${r.path === "/" ? "/" : r.path.replace(/\/+$/, "")}`;
    const lastmod = r.lastmod ? r.lastmod.split("T")[0] : dateStr;
    const changefreq = r.changefreq || "monthly";
    const priority = r.priority || "0.7";

    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n\n")}
</urlset>
`;
}

// ── 7. Main Execution ─────────────────────────────────────────────────────────

async function main() {
  console.log("\n🚀 [prerender-seo] Starting Next.js-grade static pre-rendering...");

  const indexPath = path.join(DIST_DIR, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error('❌ [prerender-seo] dist/index.html not found! Run "vite build" first.');
    process.exit(1);
  }

  const baseTemplate = fs.readFileSync(indexPath, "utf-8");

  // Load env & fetch dynamic routes
  const { supabaseUrl, supabaseAnonKey } = getEnvCredentials();
  const dynamicRoutes = await fetchDynamicRoutes(supabaseUrl, supabaseAnonKey);
  const allRoutes = [...STATIC_ROUTES, ...dynamicRoutes];

  console.log(
    `[prerender-seo] Pre-rendering ${allRoutes.length} total routes (${STATIC_ROUTES.length} static + ${dynamicRoutes.length} dynamic)...`,
  );

  let successCount = 0;

  for (const route of allRoutes) {
    const renderedHtml = renderHtmlForRoute(baseTemplate, route);

    let targetFilePath;
    if (route.path === "/" || route.path === "") {
      targetFilePath = path.join(DIST_DIR, "index.html");
    } else {
      const cleanPath = route.path.replace(/^\/+|\/+$/g, "");
      const routeDir = path.join(DIST_DIR, cleanPath);
      ensureDirSync(routeDir);
      targetFilePath = path.join(routeDir, "index.html");
    }

    fs.writeFileSync(targetFilePath, renderedHtml, "utf-8");
    successCount++;
  }

  console.log(`✅ [prerender-seo] Pre-rendered ${successCount} routes successfully.`);

  // Generate & write sitemap.xml
  const sitemapXml = generateSitemapXml(allRoutes);
  const distSitemapPath = path.join(DIST_DIR, "sitemap.xml");
  const publicSitemapPath = path.join(ROOT_DIR, "public", "sitemap.xml");

  fs.writeFileSync(distSitemapPath, sitemapXml, "utf-8");
  fs.writeFileSync(publicSitemapPath, sitemapXml, "utf-8");

  console.log(
    `✅ [prerender-seo] Generated sitemap.xml with ${allRoutes.length} URLs (written to dist/sitemap.xml & public/sitemap.xml).`,
  );
  console.log("🎉 [prerender-seo] SEO Pre-rendering & Sitemap generation complete!\n");
}

main().catch((err) => {
  console.error("❌ [prerender-seo] Fatal error:", err);
  process.exit(1);
});
