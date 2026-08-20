import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface SEOProps {
  title: string;
  description: string;
  type?: 'website' | 'article';
  image?: string;
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

export function SEO({ title, description, type = 'website', image }: SEOProps) {
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

  }, [title, description, type, location.pathname, image]);

  return null;
}
