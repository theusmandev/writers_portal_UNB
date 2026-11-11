import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export interface SEOProps {
  title: string;
  description: string;
  type?: "website" | "article";
  image?: string;
  noindex?: boolean;
  canonical?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_IMAGE = "https://portal.urdunovelbanks.com/banner.png";

function setMetaTag(attrName: "name" | "property", attrValue: string, content: string) {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function SEO({
  title,
  description,
  type = "website",
  image,
  noindex = false,
  canonical,
  jsonLd,
}: SEOProps) {
  const location = useLocation();

  useEffect(() => {
    // 1. Set document title
    document.title = title;

    // 2. Base Description
    setMetaTag("name", "description", description);

    // 3. Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    const normalizedPath = location.pathname === "/" ? "/" : location.pathname.replace(/\/+$/, "");
    const canonicalUrl = canonical || `https://portal.urdunovelbanks.com${normalizedPath}`;
    canonicalLink.setAttribute("href", canonicalUrl);

    // 4. Open Graph
    setMetaTag("property", "og:site_name", "Urdu Novel Bank");
    setMetaTag("property", "og:title", title);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:type", type);
    setMetaTag("property", "og:url", canonicalUrl);

    const ogImage = image || DEFAULT_IMAGE;
    setMetaTag("property", "og:image", ogImage);

    // 5. Twitter Card
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", title);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", ogImage);

    // 6. Robots (noindex)
    if (noindex) {
      setMetaTag("name", "robots", "noindex, nofollow");
    } else {
      const robotsMeta = document.querySelector('meta[name="robots"]');
      if (robotsMeta) {
        robotsMeta.remove();
      }
    }

    // 7. Dynamic Route JSON-LD
    let pageJsonLdScript = document.getElementById("seo-page-json-ld");
    if (jsonLd) {
      if (!pageJsonLdScript) {
        pageJsonLdScript = document.createElement("script");
        pageJsonLdScript.id = "seo-page-json-ld";
        pageJsonLdScript.setAttribute("type", "application/ld+json");
        document.head.appendChild(pageJsonLdScript);
      }
      pageJsonLdScript.textContent = JSON.stringify(jsonLd);
    } else if (pageJsonLdScript) {
      pageJsonLdScript.remove();
    }

    return () => {
      // Clean up route-specific JSON-LD when component unmounts / route transitions
      const script = document.getElementById("seo-page-json-ld");
      if (script) {
        script.remove();
      }
    };
  }, [title, description, type, location.pathname, image, noindex, canonical, jsonLd]);

  return null;
}
