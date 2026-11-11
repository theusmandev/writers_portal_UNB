import DOMPurify from "dompurify";

/**
 * Rewrites Google Blogger / Google UserContent CDN image URLs to target a specific
 * width (e.g. /s400/ or /s420/) instead of full-resolution (~1537px) original files,
 * drastically reducing byte payload and boosting Core Web Vitals (LCP/FCP).
 */
export function optimizeCoverImageUrl(url: string | null | undefined, targetWidth = 400): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Check for Google Blogger / Google UserContent URLs (e.g. blogger.googleusercontent.com, bp.blogspot.com, lh3.googleusercontent.com)
  if (/(?:googleusercontent\.com|blogspot\.com)/i.test(trimmed)) {
    // Match sizing path segments like /s1537/, /s1600/, /s320/, /w1200-h800/, etc.
    return trimmed.replace(
      /\/(s\d+(?:-[a-z0-9]+)*|w\d+-h\d+(?:-[a-z0-9]+)*)\//i,
      `/s${targetWidth}/`,
    );
  }

  return trimmed;
}

export function sanitizeHtml(content: string): string {
  // 1. Clear previous hooks to prevent duplicates
  DOMPurify.removeAllHooks();

  // 2. Add secure sanitization hooks
  DOMPurify.addHook("afterSanitizeAttributes", function (node) {
    // Enforce secure external links
    if ("target" in node && node.nodeName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }

    // Optimize rich text images for performance & Core Web Vitals
    if (node.nodeName === "IMG") {
      node.setAttribute("loading", "lazy");
      node.setAttribute("decoding", "async");
    }

    // Strict security hook for video iframes
    if (node.nodeName === "IFRAME") {
      const src = node.getAttribute("src") || "";
      const isTrustedYouTube = src.startsWith("https://www.youtube.com/embed/");
      const isTrustedVimeo = src.startsWith("https://player.vimeo.com/video/");

      // If the iframe source is not an exact match for our trusted platforms, destroy it
      if (!isTrustedYouTube && !isTrustedVimeo) {
        node.remove();
      }
    }
  });

  // 3. Sanitize content with explicitly allowed iframe and image attributes
  return DOMPurify.sanitize(content, {
    ADD_TAGS: ["iframe", "style"],
    ADD_ATTR: [
      "target",
      "style",
      "data-align",
      "dir",
      "class",
      "id",
      "data-video-embed",
      "data-video-src",
      "data-video-platform",
      "allow",
      "allowfullscreen",
      "frameborder",
      "title",
      "src",
      "loading",
      "decoding",
    ],
  });
}
