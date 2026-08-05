import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShieldCheck, RotateCcw, Battery, CheckCircle2,
  Heart, Share2, ChevronLeft, ChevronRight, Star, Expand, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCatalogue } from '../context/CatalogueContext';
import { useCart } from '../context/CartContext';
import ReviewsSection from './ReviewsSection';
import RelatedProductsSection from './RelatedProductsSection';
import VariantSelector from './VariantSelector';
import DeliveryPromiseComponent from './DeliveryPromise';
import ProductImage from './ProductImage';
import TechnicalSpecs from './TechnicalSpecs';
import { enrichSpecs } from '../utils/deviceSpecs';
import { ProductVariant, ProductGrade } from '../types';
import Breadcrumbs from './ui/Breadcrumbs';
import FinanceOptions from './FinanceOptions';
import GradeExplainer from './GradeExplainer';
import EcoImpact from './EcoImpact';
import UrgencyCue from './UrgencyCue';
import PriceMatchBadge from './PriceMatchBadge';
import RecentlyViewed from './RecentlyViewed';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, COL } from '../lib/firebase';
import { docToProduct } from '../lib/productMapper';
import { useSeo } from '../hooks/useSeo';
import { productSeo, productJsonLd, breadcrumbJsonLd } from '../utils/seo';
import { generateProductDescription } from '../utils/productDescription';

import type { Product } from '../types';
import CountUp from './ui/CountUp';

type Tab = 'overview' | 'specs' | 'reviews';

function TabPanel({ phone }: { phone: Product }) {
  const [tab, setTab] = React.useState<Tab>('overview');
  const [reviews, setReviews] = React.useState<import('../types').Review[]>(phone.reviews ?? []);
  const { user } = useAuth();
  const enrichedSpecs = enrichSpecs(phone.brand, phone.model, phone.specs);

  const handleAddReview = async (review: Omit<import('../types').Review, 'id' | 'date'>) => {
    const newReview: import('../types').Review = {
      ...review,
      id: Math.random().toString(36).slice(2),
      date: new Date().toISOString(),
    };
    setReviews(prev => [newReview, ...prev]);
    try {
      await addDoc(collection(db, COL.reviews), {
        productId: phone.id,
        userId: user?.id ?? null,
        rating: review.rating,
        comment: review.comment,
        userName: review.userName,
        isVerified: false,
        createdAt: serverTimestamp(),
      });
    } catch {
      // The review is already shown optimistically; a failed write should not
      // yank it back out from under the person who just typed it.
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'specs',    label: 'Specifications' },
    { id: 'reviews',  label: 'Reviews' },
  ];

  return (
    <div style={{ marginTop: 'var(--spacing-48)', borderTop: '1px solid var(--grey-10)' }}>
      {/* Tab bar */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--grey-10)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            style={{
              padding: '14px 28px',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: tab === id ? 700 : 500,
              color: tab === id ? 'var(--brand-cyan)' : 'var(--grey-50)',
              background: 'none',
              border: 'none',
              borderBottom: tab === id ? '2px solid var(--brand-cyan)' : '2px solid transparent',
              marginBottom: '-1px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: 'var(--spacing-32) 0' }}>
        {/* No inline gridTemplateColumns below: it would outrank
            lg:grid-cols-2. A bare `display: grid` is single-column anyway. */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gap: 'var(--spacing-24)' }} className="lg:grid-cols-2">
            {/* Product description — always shown */}
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-70)', lineHeight: 1.75, margin: 0 }}>
                {phone.description || generateProductDescription(phone)}
              </p>
            </div>
            {/* Condition notes */}
            {phone.conditionDescription && (
              <div>
                <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: 'var(--black)' }}>Condition notes</h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', lineHeight: 1.7 }}>{phone.conditionDescription}</p>
              </div>
            )}
            {/* Key highlights */}
            <div>
              <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: 'var(--black)' }}>What's included</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  `${phone.warrantyMonths}-month warranty`,
                  `${phone.returnDays}-day free returns`,
                  'Independently tested & verified',
                  'Unlocked — works with any UK network',
                  'Charger & cable included',
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-70)' }}>
                    <CheckCircle2 size={15} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Eco impact — compact row */}
            <div style={{ gridColumn: '1 / -1' }}>
              <EcoImpact productId={phone.id} />
            </div>
          </div>
        )}

        {tab === 'specs' && (
          <TechnicalSpecs specs={enrichedSpecs} />
        )}

        {tab === 'reviews' && (
          <ReviewsSection
            productId={phone.id}
            reviews={reviews}
            onAddReview={handleAddReview}
          />
        )}
      </div>
    </div>
  );
}

const GRADE_CLASS: Record<ProductGrade, string> = {
  Pristine: 'badge-pristine',
  Excellent: 'badge-excellent',
  Good: 'badge-good',
  Fair: 'badge-fair',
  New: 'badge-new',
};

/**
 * ProductDetail — Verified Form design philosophy
 * Optimized for Mobile-First: Stacks on small screens, grid on desktop.
 * Performance: Lazy loading images and optimized render cycles.
 */

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = React.useState(1);
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [gradeExplainerOpen, setGradeExplainerOpen] = React.useState(false);
  const { track: trackRecent } = useRecentlyViewed();
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const touchStartX = React.useRef<number | null>(null);

  // Load product: seed from the shared catalogue for an instant first paint,
  // then refresh from Supabase (which also brings variant rows).
  const { products: catalogue } = useCatalogue();
  const [phone, setPhone] = React.useState<Product | null | undefined>(undefined); // undefined = loading
  const [loadError, setLoadError] = React.useState(false);

  // Real review aggregate, derived from this product's own reviews. Zero when
  // there are none, in which case the rating row is not rendered at all.
  const productReviews = phone?.reviews ?? [];
  const reviewCount    = productReviews.length;
  const averageRating  = reviewCount
    ? productReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;

  React.useEffect(() => {
    if (!id) { setPhone(null); return; }
    // Render straight from the shared catalogue instead of showing a skeleton
    // while the per-product query is in flight. That query only adds variant
    // rows, so everything above the fold is already available here.
    const seed = catalogue.find(p => p.id === id);
    setPhone(seed ?? undefined);
    setLoadError(false);

    (async () => {
      try {
        const snap = await getDoc(doc(db, COL.products, id));
        if (snap.exists()) {
          setPhone(docToProduct(snap.id, snap.data()));
          return;
        }
      } catch {
        // Firestore unreachable — fall through to the catalogue copy.
      }

      // The query failed; keep the catalogue copy if we seeded one, otherwise
      // this id genuinely does not exist.
      setPhone(prev => prev ?? (catalogue.find(p => p.id === id) ?? null));
    })();
  }, [id, catalogue]);

  React.useEffect(() => {
    window.scrollTo(0, 0);
    if (phone?.variants && phone.variants.length > 0) {
      setSelectedVariant(phone.variants[0]);
    }
    if (phone?.id) trackRecent(phone.id);
  }, [phone?.id]);

  const isWishlisted = phone ? isInWishlist(phone.id) : false;
  const toggleWishlist = () => {
    if (!phone) return;
    isWishlisted ? removeFromWishlist(phone.id) : addToWishlist(phone);
  };

  // SEO — must be called every render (Rules of Hooks), so use safe fallbacks
  const displayPrice = selectedVariant?.price ?? phone?.price ?? 0;
  const displayOriginalPrice = selectedVariant?.originalPrice ?? phone?.originalPrice ?? 0;
  const displayBatteryHealth = selectedVariant?.batteryHealth ?? phone?.batteryHealth ?? 0;
  const displayStock = selectedVariant?.stock ?? phone?.stock ?? 0;
  const savings = displayOriginalPrice - displayPrice;
  useSeo(phone
    ? { ...productSeo({ ...phone, price: displayPrice, originalPrice: displayOriginalPrice, stock: displayStock, batteryHealth: displayBatteryHealth }),
        jsonLd: [
          productJsonLd({ ...phone, price: displayPrice, originalPrice: displayOriginalPrice, stock: displayStock, batteryHealth: displayBatteryHealth }),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'All devices', url: '/products' },
            { name: phone.brand, url: `/products?brand=${encodeURIComponent(phone.brand)}` },
            { name: phone.model, url: `/product/${phone.id}` },
          ]),
        ],
      }
    : { title: 'Product | Mobilephonetech.co.uk' }
  );

  // Loading skeleton
  if (phone === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--grey-0)', paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-80)' }}>
        <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
          <div style={{ display: 'grid', gap: 'var(--spacing-32)' }} className="lg:grid-cols-2">
            <div style={{ aspectRatio: '1/1', borderRadius: 'var(--radius-xl)', background: 'var(--grey-10)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[80, 50, 40, 100, 60].map((w, i) => (
                <div key={i} style={{ height: '20px', width: `${w}%`, borderRadius: '8px', background: 'var(--grey-10)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (!phone || loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--grey-0)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>📦</div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '12px' }}>This product is no longer available</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-50)', marginBottom: '32px', lineHeight: 1.6 }}>It may have been sold, removed, or the link might be incorrect.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate(-1)} className="btn btn-secondary">Go back</button>
            <button onClick={() => navigate('/products')} className="btn btn-primary">Browse all devices</button>
          </div>
        </div>
      </div>
    );
  }

  const galleryImages = phone.galleryImages || [phone.imageUrl];
  const activeGallery = galleryImages.length >= 6 ? galleryImages : [
    ...galleryImages,
    ...Array.from({ length: Math.max(0, 6 - galleryImages.length) }, (_, i) => galleryImages[i % galleryImages.length])
  ];

  const handleAddToCart = () => {
    if (selectedVariant) {
      const cartProduct = {
        ...phone, ...selectedVariant, price: selectedVariant.price,
        originalPrice: selectedVariant.originalPrice, stock: selectedVariant.stock,
        batteryHealth: selectedVariant.batteryHealth ?? phone.batteryHealth,
      };
      addToCart(cartProduct, quantity);
    } else {
      addToCart(phone, quantity);
    }
  };

  const nextImage = () => setSelectedImageIndex((prev) => (prev + 1) % activeGallery.length);
  const prevImage = () => setSelectedImageIndex((prev) => (prev - 1 + activeGallery.length) % activeGallery.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) nextImage(); else prevImage();
    }
    touchStartX.current = null;
  };
  const handleGalleryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); nextImage(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prevImage(); }
  };

  return (
    <div style={{ background: 'var(--grey-0)', minHeight: '100vh', paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-80)', overflowX: 'hidden' }}>
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'All devices', to: '/products' },
            { label: phone.brand, to: `/products?brand=${encodeURIComponent(phone.brand)}` },
            { label: phone.model },
          ]}
        />

        {/* Back Navigation */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
            color: 'var(--grey-50)', background: 'none', border: 'none',
            cursor: 'pointer', padding: '0', marginBottom: 'var(--spacing-32)'
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Main Grid: Mobile-First Stacking. Columns live in CSS
            (.lg:pdp-grid) — an inline gridTemplateColumns would outrank the
            Tailwind breakpoint class and flatten this back to one column. */}
        <div
          style={{ display: 'grid', gap: 'var(--spacing-32)' }}
          className="lg:pdp-grid lg:gap-16 items-start mb-16"
        >
          
          {/* ── Left Column: Claude-designed 6-frame gallery ─ */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}
            tabIndex={0}
            onKeyDown={handleGalleryKeyDown}
            aria-label="Product gallery — use arrow keys to navigate"
          >
            {/* ── 6-Image Gallery ─────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{
                position: 'relative',
                borderRadius: 'var(--radius-xl)',
                aspectRatio: '1/1',
                overflow: 'hidden',
                background: '#111827',
                touchAction: 'pan-y',
              }}
            >
              <div
                key={activeGallery[selectedImageIndex]}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: '24px',
                  boxSizing: 'border-box',
                }}
              >
                <ProductImage
                  brand={phone.brand}
                  model={phone.model}
                  color={selectedVariant?.color}
                  category={phone.category}
                  context="hero"
                  imageUrl={activeGallery[selectedImageIndex]}
                  alt={`${phone.model}${selectedVariant?.color ? ` in ${selectedVariant.color}` : ''} — view ${selectedImageIndex + 1}`}
                />
              </div>

              {savings > 0 && (
                <span
                  className="badge badge-savings"
                  style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 2 }}
                >
                  Save {Math.round((savings / phone.originalPrice) * 100)}%
                </span>
              )}

              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="View image full-screen"
                style={{ position: 'absolute', top: '12px', left: '12px', background: 'var(--grey-0)', border: '1px solid var(--grey-10)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--black)', boxShadow: 'var(--shadow-sm)', zIndex: 3 }}
              >
                <Expand size={16} />
              </button>

              <button
                onClick={prevImage}
                aria-label="Previous image"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'var(--grey-0)', border: '1px solid var(--grey-10)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--black)', boxShadow: 'var(--shadow-sm)', zIndex: 2 }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextImage}
                aria-label="Next image"
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'var(--grey-0)', border: '1px solid var(--grey-10)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--black)', boxShadow: 'var(--shadow-sm)', zIndex: 2 }}
              >
                <ChevronRight size={20} />
              </button>
            </motion.div>

            {/* 6 Thumbnails */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }} role="tablist" aria-label="Product gallery">
              {activeGallery.map((src, i) => {
                const isActive = selectedImageIndex === i;
                return (
                  <button
                    key={i}
                    role="tab"
                    onClick={() => setSelectedImageIndex(i)}
                    aria-label={`Image ${i + 1}`}
                    aria-selected={isActive}
                    style={{
                      position: 'relative',
                      aspectRatio: '1/1',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      border: isActive ? '2px solid var(--brand-cyan)' : '1px solid var(--grey-20)',
                      background: 'var(--grey-0)',
                      padding: '4px',
                      overflow: 'hidden',
                      transition: 'all var(--duration-fast) var(--ease-default)',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        opacity: isActive ? 1 : 0.65,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <ProductImage
                        brand={phone.brand}
                        model={phone.model}
                        color={selectedVariant?.color}
                        category={phone.category}
                        imageUrl={src}
                        alt=""
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right Column: Info IA ────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
            
            <div>
              <p className="overline" style={{ marginBottom: '8px', color: 'var(--grey-50)' }}>{phone.brand || 'Premium Device'}</p>
              <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(28px, 4.5vw, 40px)', fontWeight: 800, color: 'var(--brand-header)', lineHeight: 1.1, marginBottom: '12px', letterSpacing: '-0.02em' }}>
                {phone.model || 'Product Details'}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {phone.grade && (
                  <span className={`badge ${GRADE_CLASS[phone.grade]}`}>
                    {phone.grade}
                  </span>
                )}
                <button
                  onClick={() => setGradeExplainerOpen(true)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600,
                    color: 'var(--brand-cyan-hover)',
                    textDecoration: 'underline', textUnderlineOffset: '3px',
                    padding: 0,
                  }}
                >
                  How does grading work?
                </button>
                {/* Rating is derived from the product's own reviews and hidden
                    when there are none. This previously rendered five filled
                    stars and a hardcoded "4.8★ (342 reviews)" on every product,
                    which is an invented aggregate — a banned practice under the
                    DMCC Act, and misleading regardless. */}
                {reviewCount > 0 && (
                  <>
                    <div style={{ display: 'flex', gap: '2px', color: 'var(--color-star)' }} aria-hidden="true">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} fill={i < Math.round(averageRating) ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', fontWeight: 500 }}>
                      {averageRating.toFixed(1)}★ ({reviewCount} review{reviewCount === 1 ? '' : 's'})
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Price Block */}
            <div style={{ padding: 'var(--spacing-16) 0', borderBottom: '1px solid var(--grey-10)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '8px' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 900, color: 'var(--brand-header)', letterSpacing: '-0.02em' }}>£{displayPrice}</span>
                {savings > 0 && (
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(16px, 2vw, 20px)', fontWeight: 600, color: 'var(--grey-40)', textDecoration: 'line-through' }}>£{displayOriginalPrice}</span>
                )}
              </div>

              {savings > 0 && (
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 800, color: 'var(--color-trust-text)' }}>
                  {/* Keyed on the variant so switching storage re-counts to the
                      new saving rather than leaving the previous figure. */}
                  You save{' '}
                  <CountUp
                    key={`saving-${selectedVariant?.id ?? phone.id}-${savings}`}
                    to={savings}
                    prefix="£"
                    duration={900}
                  />
                </div>
              )}
            </div>

            {/* Urgency + price-match cue row */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '-8px' }}>
              <UrgencyCue productId={phone.id} stock={displayStock} />
              <PriceMatchBadge />
            </div>

            {/* Finance split-payment breakdown */}
            <FinanceOptions price={displayPrice} />

            {/* Key Value Props Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--grey-10)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Battery size={20} style={{ color: 'var(--black)' }} />
                <div style={{ minWidth: 0 }}>
                  <p className="overline" style={{ fontSize: '9px', marginBottom: '2px' }}>Battery Health</p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 800, color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayBatteryHealth}%</p>
                </div>
              </div>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--grey-10)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <ShieldCheck size={20} style={{ color: 'var(--black)' }} />
                <div style={{ minWidth: 0 }}>
                  <p className="overline" style={{ fontSize: '9px', marginBottom: '2px' }}>Warranty</p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 800, color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{phone.warrantyMonths}m</p>
                </div>
              </div>
            </div>

            {/* Variants — always render; VariantSelector derives sensible
                options when the product has no explicit variants[] matrix. */}
            <VariantSelector product={phone} onVariantSelect={setSelectedVariant} selectedVariant={selectedVariant} />

            {/* Delivery */}
            <DeliveryPromiseComponent postalCode="SW1A 1AA" orderTime={new Date()} showAllOptions={false} />

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                {/* Quantity */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid var(--grey-20)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2px',
                    flexShrink: 0,
                    height: '56px',
                  }}
                  role="group"
                  aria-label="Quantity"
                >
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                    style={{ width: '40px', height: '100%', background: 'none', border: 'none', cursor: quantity <= 1 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 700, color: 'var(--black)', opacity: quantity <= 1 ? 0.4 : 1 }}
                  >−</button>
                  <motion.span
                    key={quantity}
                    initial={{ scale: 1.3, color: 'var(--brand-cyan)' }}
                    animate={{ scale: 1, color: 'var(--black)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    style={{ width: '28px', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 700, display: 'inline-block' }}
                    aria-live="polite"
                  >
                    {quantity}
                  </motion.span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                    style={{ width: '40px', height: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 700, color: 'var(--black)' }}
                  >+</button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={displayStock === 0}
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  {displayStock > 0 ? 'Add to cart' : 'Out of stock'}
                </button>

                <motion.button
                  onClick={toggleWishlist}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  aria-pressed={isWishlisted}
                  whileTap={{ scale: 1.15 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  style={{
                    width: '56px',
                    height: '56px',
                    flexShrink: 0,
                    border: '1px solid var(--grey-20)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--grey-0)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <motion.div
                    animate={isWishlisted ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                  >
                    <Heart size={20} fill={isWishlisted ? 'var(--color-sale)' : 'none'} color={isWishlisted ? 'var(--color-sale)' : 'var(--black)'} />
                  </motion.div>
                </motion.button>

                <button
                  aria-label="Share product"
                  style={{
                    width: '56px',
                    height: '56px',
                    flexShrink: 0,
                    border: '1px solid var(--grey-20)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--grey-0)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  className="hidden sm:inline-flex"
                >
                  <Share2 size={20} />
                </button>
              </div>
            </div>

            {/* Micro-trust Strip */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: 'var(--spacing-24)', borderTop: '1px solid var(--grey-10)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--grey-40)' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)' }}>Verified by independent technicians</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <RotateCcw size={16} style={{ color: 'var(--grey-40)' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)' }}>{phone.returnDays}-day returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabbed detail panel (Amazon-style) ─────────────────── */}
        <TabPanel phone={phone} />

        <RelatedProductsSection currentProduct={phone} />
        <RecentlyViewed excludeId={phone.id} />
      </div>

      {/* Sticky mobile Add-to-cart bar removed — Amazon-style PDP keeps
          a single in-page CTA. The IntersectionObserver wiring above
          (primaryCtaRef + isPrimaryCtaInView) is dead but harmless;
          left in place to avoid churning unrelated layout. */}

      <GradeExplainer isOpen={gradeExplainerOpen} onClose={() => setGradeExplainerOpen(false)} />

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`${phone.model} — full-screen view`}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.96)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            <motion.img
              key={activeGallery[selectedImageIndex]}
              src={activeGallery[selectedImageIndex]}
              alt={`${phone.model} — view ${selectedImageIndex + 1}`}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '90vmin', height: '90vmin', maxWidth: '100%', maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close full-screen view"
              style={{
                position: 'absolute', top: '20px', right: '20px',
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white',
              }}
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
