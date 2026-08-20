import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface SEOProps {
  title: string;
  description: string;
  type?: 'website' | 'article';
  image?: string;
  noindex?: boolean;
}

const DEFAULT_IMAGE = "https://portal.urdunovelbanks.com/banner.png";

function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function SEO({ title, description, type = 'website', image, noindex = false }: SEOProps) {
  const location = useLocation();

  useEffect(() => {
    // Set document title
    document.title = title;

    // Base Meta
    setMetaTag('name', 'description', description);

    // Open Graph
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', type);
    
    // Use current location for canonical URL
    const canonicalUrl = `https://portal.urdunovelbanks.com${location.pathname}`;
    setMetaTag('property', 'og:url', canonicalUrl);

    const ogImage = image || DEFAULT_IMAGE;
    setMetaTag('property', 'og:image', ogImage);

    // Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // Robots (noindex)
    if (noindex) {
      setMetaTag('name', 'robots', 'noindex, nofollow');
    } else {
      const robotsMeta = document.querySelector('meta[name="robots"]');
      if (robotsMeta) {
        robotsMeta.remove();
      }
    }

  }, [title, description, type, location.pathname, image, noindex]);

  return null;
}
