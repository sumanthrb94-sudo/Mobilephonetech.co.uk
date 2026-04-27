import { useEffect } from 'react';

/**
 * useSeo — lightweight per-route SEO without a runtime dep.
 *
 * Mutates <head> directly on mount and restores on unmount so
 * back-navigation doesn't leave stale tags. Googlebot renders JS,
 * so dynamic meta still shows up in SERPs; OG consumers (Slack,
 * WhatsApp) that don't render JS fall back to the static defaults
 * baked into index.html, which is the correct behaviour for an
 * SPA without SSR.
 */

export const SITE_ORIGIN = 'https://mobilephonetech.co.uk';
export const SITE_NAME = 'MobilePhoneMarket';

type JsonLd = Record<string, unknown> | Record<string, unknown>[];

export interface SeoOptions {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'product' | 'article';
  noindex?: boolean;
  jsonLd?: JsonLd;
}

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const SEO_JSONLD_ID = 'seo-jsonld';

export function useSeo(opts: SeoOptions) {
  const {
    title,
    description,
    canonical,
    ogImage = `${SITE_ORIGIN}/assets/TYsh56U5ZjIX.png`,
    ogType = 'website',
    noindex = false,
    jsonLd,
  } = opts;

  useEffect(() => {
    const prev = {
      title: document.title,
      description: document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? '',
      canonical: document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? '',
      robots: document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content ?? '',
      ogTitle: document.head.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ?? '',
      ogDesc: document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content ?? '',
      ogUrl: document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content ?? '',
      ogImg: document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content ?? '',
      ogType: document.head.querySelector<HTMLMetaElement>('meta[property="og:type"]')?.content ?? '',
      twTitle: document.head.querySelector<HTMLMetaElement>('meta[property="twitter:title"]')?.content ?? '',
      twDesc: document.head.querySelector<HTMLMetaElement>('meta[property="twitter:description"]')?.content ?? '',
      twImg: document.head.querySelector<HTMLMetaElement>('meta[property="twitter:image"]')?.content ?? '',
    };

    const url = canonical ?? (typeof window !== 'undefined' ? window.location.href : SITE_ORIGIN);

    document.title = title;
    if (description) setMeta('name', 'description', description);
    setLink('canonical', url);
    setMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large');

    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:title', title);
    if (description) setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:site_name', SITE_NAME);

    setMeta('property', 'twitter:card', 'summary_large_image');
    setMeta('property', 'twitter:title', title);
    if (description) setMeta('property', 'twitter:description', description);
    setMeta('property', 'twitter:image', ogImage);

    // JSON-LD — remove any previous route-level blob, inject new one
    const existing = document.getElementById(SEO_JSONLD_ID);
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = SEO_JSONLD_ID;
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.title = prev.title;
      if (prev.description) setMeta('name', 'description', prev.description);
      if (prev.canonical) setLink('canonical', prev.canonical);
      if (prev.robots) setMeta('name', 'robots', prev.robots);
      else document.head.querySelector('meta[name="robots"]')?.remove();
      if (prev.ogTitle) setMeta('property', 'og:title', prev.ogTitle);
      if (prev.ogDesc) setMeta('property', 'og:description', prev.ogDesc);
      if (prev.ogUrl) setMeta('property', 'og:url', prev.ogUrl);
      if (prev.ogImg) setMeta('property', 'og:image', prev.ogImg);
      if (prev.ogType) setMeta('property', 'og:type', prev.ogType);
      if (prev.twTitle) setMeta('property', 'twitter:title', prev.twTitle);
      if (prev.twDesc) setMeta('property', 'twitter:description', prev.twDesc);
      if (prev.twImg) setMeta('property', 'twitter:image', prev.twImg);
      document.getElementById(SEO_JSONLD_ID)?.remove();
    };
  }, [title, description, canonical, ogImage, ogType, noindex, JSON.stringify(jsonLd)]);
}
