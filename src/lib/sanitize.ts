import DOMPurify from "dompurify";

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

  // 3. Sanitize content with explicitly allowed iframe tags and attributes
  return DOMPurify.sanitize(content, {
    ADD_TAGS: ["iframe"],
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
    ],
  });
}
