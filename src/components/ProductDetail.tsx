import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShieldCheck, RotateCcw, Battery, CheckCircle2,
  Heart, Share2, ChevronLeft, ChevronRight, Star
} from 'lucide-react';
import { MOCK_PHONES } from '../data';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import ReviewsSection from './ReviewsSection';
import RelatedProductsSection from './RelatedProductsSection';
import VariantSelector from './VariantSelector';
import DeliveryPromiseComponent from './DeliveryPromise';
import ProductImage from './ProductImage';
import TechnicalSpecs from './TechnicalSpecs';
import { ProductVariant, ProductGrade } from '../types';
import { useBreakpoint } from '../hooks/useBreakpoint';
import Breadcrumbs from './ui/Breadcrumbs';
import FinanceOptions from './FinanceOptions';
import GradeExplainer from './GradeExplainer';
import PriceHistoryChart from './PriceHistoryChart';
import EcoImpact from './EcoImpact';
import UrgencyCue from './UrgencyCue';
import PriceMatchBadge from './PriceMatchBadge';
import RecentlyViewed from './RecentlyViewed';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import ProductGalleryFrame, { FRAMES } from './ProductGalleryFrame';

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
  const { isMobile } = useBreakpoint();
  const [quantity, setQuantity] = React.useState(1);
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const [isWishlisted, setIsWishlisted] = React.useState(false);
  const primaryCtaRef = React.useRef<HTMLButtonElement>(null);
  const [isPrimaryCtaInView, setIsPrimaryCtaInView] = React.useState(true);
  const [gradeExplainerOpen, setGradeExplainerOpen] = React.useState(false);
  const { track: trackRecent } = useRecentlyViewed();

  const phone = MOCK_PHONES.find(p => p.id === id);

  // Sticky mobile CTA: show the bottom bar only when the main Add-to-cart
  // button is off-screen. Using IntersectionObserver instead of scroll math
  // avoids layout-thrash and stays correct as the button position shifts
  // (variant picker expanding, etc.).
  React.useEffect(() => {
    const node = primaryCtaRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setIsPrimaryCtaInView(entry.isIntersecting),
      { rootMargin: '0px 0px -40px 0px', threshold: 0 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [phone?.id]);

  React.useEffect(() => {
    window.scrollTo(0, 0);
    if (phone?.variants && phone.variants.length > 0) {
      setSelectedVariant(phone.variants[0]);
    }
    if (phone?.id) trackRecent(phone.id);
  }, [phone?.id]);

  if (!phone) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--grey-0)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>Product not found</h2>
          <button onClick={() => navigate('/')} className="btn btn-secondary">Back to Home</button>
        </div>
      </div>
    );
  }

  const displayPrice = selectedVariant?.price ?? phone.price;
  const displayOriginalPrice = selectedVariant?.originalPrice ?? phone.originalPrice;
  const displayBatteryHealth = selectedVariant?.batteryHealth ?? phone.batteryHealth;
  const displayStock = selectedVariant?.stock ?? phone.stock;
  const savings = displayOriginalPrice - displayPrice;


  const galleryImages = phone.galleryImages || [phone.imageUrl];

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

  const nextImage = () => setSelectedImageIndex((prev) => (prev + 1) % FRAMES.length);
  const prevImage = () => setSelectedImageIndex((prev) => (prev - 1 + FRAMES.length) % FRAMES.length);

  return (
    <div style={{ background: 'var(--grey-0)', minHeight: '100vh', paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-80)' }}>
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

        {/* Main Grid: Mobile-First Stacking */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: 'var(--spacing-32)' 
          }} 
          className="lg:grid-cols-2 lg:gap-16 items-start mb-16"
        >
          
          {/* ── Left Column: Claude-designed 6-frame gallery ─ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
              style={{
                position: 'relative',
                borderRadius: 'var(--radius-xl)',
                aspectRatio: '1/1',
                overflow: 'hidden',
                background: 'var(--grey-5)',
              }}
            >
              <ProductGalleryFrame product={phone} kind={FRAMES[selectedImageIndex % FRAMES.length].kind} />

              {savings > 0 && (
                <span
                  className="badge badge-savings"
                  style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 2 }}
                >
                  Save {Math.round((savings / phone.originalPrice) * 100)}%
                </span>
              )}

              <button
                onClick={prevImage}
                aria-label="Previous view"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'var(--grey-0)', border: '1px solid var(--grey-10)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--black)', boxShadow: 'var(--shadow-sm)', zIndex: 2 }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextImage}
                aria-label="Next view"
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'var(--grey-0)', border: '1px solid var(--grey-10)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--black)', boxShadow: 'var(--shadow-sm)', zIndex: 2 }}
              >
                <ChevronRight size={18} />
              </button>
            </motion.div>

            {/* 5 tabs — icon + label, each opens a distinct gallery view */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${FRAMES.length}, 1fr)`, gap: '6px' }} role="tablist" aria-label="Product gallery views">
              {FRAMES.map((f, i) => {
                const isActive = selectedImageIndex === i;
                const Icon = f.icon;
                return (
                  <button
                    key={f.kind}
                    role="tab"
                    onClick={() => setSelectedImageIndex(i)}
                    aria-label={`Show ${f.label.toLowerCase()}`}
                    aria-selected={isActive}
                    title={f.label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      border: isActive ? '2px solid var(--brand-cyan)' : '1px solid var(--grey-20)',
                      background: isActive ? 'var(--color-brand-subtle)' : 'var(--grey-0)',
                      color: isActive ? 'var(--brand-header)' : 'var(--grey-60)',
                      transition: 'all var(--duration-fast) var(--ease-default)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '11px',
                      fontWeight: isActive ? 700 : 600,
                      lineHeight: 1.1,
                    }}
                  >
                    <Icon size={18} />
                    <span style={{ textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {f.label}
                    </span>
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
                <div style={{ display: 'flex', gap: '2px', color: 'var(--color-star)' }}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', fontWeight: 500 }}>
                  4.8★ (342 reviews)
                </span>
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
            </div>

            {/* Urgency + price-match cue row */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '-8px' }}>
              <UrgencyCue productId={phone.id} stock={displayStock} />
              <PriceMatchBadge />
            </div>

            {/* Finance split-payment breakdown */}
            <FinanceOptions price={displayPrice} />

            {/* 90-day price history */}
            <PriceHistoryChart productId={phone.id} currentPrice={displayPrice} />

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
                  <span style={{ width: '28px', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 700, color: 'var(--black)' }} aria-live="polite">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                    style={{ width: '40px', height: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 700, color: 'var(--black)' }}
                  >+</button>
                </div>

                <button
                  ref={primaryCtaRef}
                  onClick={handleAddToCart}
                  disabled={displayStock === 0}
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  {displayStock > 0 ? 'Add to cart' : 'Out of stock'}
                </button>

                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  aria-pressed={isWishlisted}
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
                  <Heart size={20} fill={isWishlisted ? 'var(--color-sale)' : 'none'} color={isWishlisted ? 'var(--color-sale)' : 'var(--black)'} />
                </button>

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

        {/* Environmental impact */}
        <div style={{ marginTop: 'var(--spacing-32)' }}>
          <EcoImpact productId={phone.id} />
        </div>

        {/* ── Specs Section ────────────────── */}
        <TechnicalSpecs specs={phone.specs} />

        <ReviewsSection productId={phone.id} reviews={phone.reviews || []} />
        <RelatedProductsSection currentProduct={phone} />
        <RecentlyViewed excludeId={phone.id} />
      </div>

      {/* ── Sticky mobile Add-to-cart bar ─────────────────────
          Only mounts on mobile and only renders when the primary
          CTA is scrolled out of view. Leaves a matching spacer so
          the page content isn't hidden under the fixed bar. */}
      <AnimatePresence>
        {isMobile && !isPrimaryCtaInView && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            role="region"
            aria-label="Add to cart"
            style={{
              position: 'fixed',
              bottom: 'calc(64px + 30px + env(safe-area-inset-bottom, 0px))',
              left: 0,
              right: 0,
              background: 'var(--grey-0)',
              borderTop: '1px solid var(--grey-10)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 -8px 24px rgba(0,0,0,0.08)',
              zIndex: 35,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--grey-50)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {phone.brand} {phone.model}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span className="type-price" style={{ fontSize: '20px', color: 'var(--black)' }}>
                  £{displayPrice}
                </span>
                {savings > 0 && (
                  <span style={{ fontSize: '13px', color: 'var(--grey-40)', textDecoration: 'line-through', fontFamily: 'var(--font-body)' }}>
                    £{displayOriginalPrice}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={displayStock === 0}
              className="btn btn-primary btn-lg"
              style={{ flexShrink: 0 }}
              aria-label={displayStock > 0 ? `Add ${phone.model} to cart` : 'Out of stock'}
            >
              {displayStock > 0 ? 'Add to cart' : 'Out of stock'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <GradeExplainer isOpen={gradeExplainerOpen} onClose={() => setGradeExplainerOpen(false)} />
    </div>
  );
}
