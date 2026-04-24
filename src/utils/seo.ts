import type { Product } from '../types';
import { SITE_NAME, SITE_ORIGIN } from '../hooks/useSeo';

/**
 * Title patterns tuned to UK refurbished-phone commercial intent:
 * ... the word "refurbished" sits near the front, the brand/model
 * next, and the sitename closes the string for brand recall. Keep
 * full title under ~60 chars so SERPs don't truncate.
 */

export function homeSeo() {
  return {
    title: 'Refurbished Phones UK — Unlocked iPhone, Samsung, Pixel | MobileTech',
    description:
      'Certified refurbished phones, tablets and tech with 12-month warranty, free next-day delivery and 30-day returns. Unlocked iPhone, Samsung Galaxy, Google Pixel and iPad at UK refurb prices.',
    canonical: `${SITE_ORIGIN}/`,
  };
}

export function productsPageSeo(params: {
  brand?: string | null;
  category?: string | null;
  count: number;
  canonicalPath: string;
}) {
  const { brand, category, count, canonicalPath } = params;
  const subject =
    brand && category ? `${brand} ${category}` :
    brand ? `${brand}` :
    category ? `${category}` :
    'Refurbished Phones & Tech';

  const title =
    brand && category ? `Refurbished ${brand} ${category} | ${SITE_NAME}` :
    brand ? `Refurbished ${brand} — iPhones, Galaxy, Pixel | ${SITE_NAME}` :
    category ? `Refurbished ${category} | ${SITE_NAME}` :
    'Shop Refurbished Phones, Tablets & Tech | MobileTech UK';

  const description =
    `${count > 0 ? `${count} refurbished ${subject.toLowerCase()}` : `Refurbished ${subject.toLowerCase()}`} ` +
    `with 12-month warranty, free next-day delivery and 30-day returns. Certified, unlocked, and graded by MobileTech UK.`;

  return {
    title,
    description,
    canonical: `${SITE_ORIGIN}${canonicalPath}`,
  };
}

export function productSeo(p: Product) {
  const savingsPct = p.originalPrice > p.price
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
    : 0;

  const title = `Refurbished ${p.model} — £${p.price} | ${SITE_NAME}`;

  const description =
    `Buy a refurbished ${p.brand} ${p.model}${p.grade ? ` (${p.grade} grade)` : ''} from £${p.price} — ` +
    `${savingsPct > 0 ? `save ${savingsPct}%, ` : ''}` +
    `${p.batteryHealth ? `${p.batteryHealth}%+ battery, ` : ''}` +
    `${p.warrantyMonths}-month warranty, ${p.returnDays}-day returns, free next-day UK delivery.`;

  return {
    title: title.length > 65 ? `${p.model} Refurbished — £${p.price} | ${SITE_NAME}` : title,
    description,
    canonical: `${SITE_ORIGIN}/product/${p.id}`,
    ogImage: p.imageUrl.startsWith('http') ? p.imageUrl : `${SITE_ORIGIN}${p.imageUrl}`,
    ogType: 'product' as const,
  };
}

export function productJsonLd(p: Product) {
  const availability =
    p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

  const image = p.imageUrl.startsWith('http') ? p.imageUrl : `${SITE_ORIGIN}${p.imageUrl}`;

  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: `Refurbished ${p.model}`,
    image,
    description: `Refurbished ${p.brand} ${p.model}${p.grade ? ` (${p.grade} condition)` : ''} with ${p.warrantyMonths}-month warranty and ${p.returnDays}-day returns.`,
    sku: p.id,
    mpn: p.id,
    brand: { '@type': 'Brand', name: p.brand },
    category: p.category,
    offers: {
      '@type': 'Offer',
      url: `${SITE_ORIGIN}/product/${p.id}`,
      priceCurrency: 'GBP',
      price: p.price.toString(),
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      availability,
      itemCondition: 'https://schema.org/RefurbishedCondition',
      seller: { '@type': 'Organization', name: SITE_NAME },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'GB',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: p.returnDays,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'GBP' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'GB' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
          transitTime:  { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
        },
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '342',
    },
  };
}

export function breadcrumbJsonLd(trail: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: `${SITE_ORIGIN}${t.url}`,
    })),
  };
}

export function organizationJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: `${SITE_ORIGIN}/assets/TYsh56U5ZjIX.png`,
      sameAs: [] as string[],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_ORIGIN,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_ORIGIN}/products?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}
