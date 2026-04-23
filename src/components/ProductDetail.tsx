import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ShieldCheck, RotateCcw, Battery, CheckCircle2,
  Heart, Share2, ChevronLeft, ChevronRight, Star
} from 'lucide-react';
import { MOCK_PHONES } from '../data';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';
import ReviewsSection from './ReviewsSection';
import RelatedProductsSection from './RelatedProductsSection';
import VariantSelector from './VariantSelector';
import DeliveryPromiseComponent from './DeliveryPromise';
import ProductImage from './ProductImage';
import TechnicalSpecs from './TechnicalSpecs';
import { ProductVariant, ProductGrade } from '../types';

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
  const [isWishlisted, setIsWishlisted] = React.useState(false);

  const phone = MOCK_PHONES.find(p => p.id === id);

  React.useEffect(() => {
    window.scrollTo(0, 0);
    if (phone?.variants && phone.variants.length > 0) {
      setSelectedVariant(phone.variants[0]);
    }
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

  const nextImage = () => setSelectedImageIndex((prev) => (prev + 1) % galleryImages.length);
  const prevImage = () => setSelectedImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);

  return (
    <div style={{ background: 'var(--grey-0)', minHeight: '100vh', paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-80)' }}>
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        
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
          <ArrowLeft size={16} /> Back to Collection
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
          
          {/* ── Left Column: Imagery ────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
            
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
              style={{
                position: 'relative',
                background: 'var(--grey-5)',
                borderRadius: 'var(--radius-xl)',
                aspectRatio: '1/1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 'clamp(16px, 5vw, 48px)',
                overflow: 'hidden'
              }}
            >
              {/* Product Image (shared component) */}
              <ProductImage brand={phone.brand} model={phone.model} storage={phone.storage} imageUrl={phone.imageUrl} alt={phone.model} />

              {/* Savings Badge */}
              {savings > 0 && (
                <span
                  className="badge badge-savings"
                  style={{ position: 'absolute', top: '16px', right: '16px' }}
                >
                  Save {Math.round((savings / phone.originalPrice) * 100)}%
                </span>
              )}

              {/* Navigation Controls (Hidden on very small screens if not needed) */}
              {galleryImages.length > 1 && (
                <>
                  <button onClick={prevImage} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'white', border: '1px solid var(--grey-10)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--black)', boxShadow: 'var(--shadow-sm)' }}><ChevronLeft size={18} /></button>
                  <button onClick={nextImage} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'white', border: '1px solid var(--grey-10)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--black)', boxShadow: 'var(--shadow-sm)' }}><ChevronRight size={18} /></button>
                </>
              )}
            </motion.div>
            
            {/* Thumbnails */}
            {galleryImages.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    style={{
                      aspectRatio: '1/1', background: 'var(--grey-5)', borderRadius: 'var(--radius-md)', padding: '6px', cursor: 'pointer',
                      border: selectedImageIndex === i ? '1.5px solid var(--black)' : '1px solid transparent',
                      opacity: selectedImageIndex === i ? 1 : 0.6,
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <img src={img} alt={`View ${i+1}`} style={{ maxHeight: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
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
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)' }}>
                or 3 interest-free payments of £{Math.ceil(displayPrice / 3)} with Klarna
              </p>
            </div>

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

            {/* Variants */}
            {phone.variants && phone.variants.length > 0 && (
              <VariantSelector product={phone} onVariantSelect={setSelectedVariant} selectedVariant={selectedVariant} />
            )}

            {/* Delivery */}
            <DeliveryPromiseComponent postalCode="SW1A 1AA" orderTime={new Date()} showAllOptions={false} />

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              
              <div style={{ display: 'flex', gap: '12px' }} className="flex-col sm:flex-row">
                {/* Quantity */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid var(--grey-20)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2px',
                    alignSelf: 'flex-start',
                    height: '56px',
                  }}
                  role="group"
                  aria-label="Quantity"
                >
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                    style={{ width: '44px', height: '100%', background: 'none', border: 'none', cursor: quantity <= 1 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 700, color: 'var(--black)', opacity: quantity <= 1 ? 0.4 : 1 }}
                  >−</button>
                  <span style={{ width: '36px', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 700, color: 'var(--black)' }} aria-live="polite">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    aria-label="Increase quantity"
                    style={{ width: '44px', height: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 700, color: 'var(--black)' }}
                  >+</button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={displayStock === 0}
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1 }}
                >
                  {displayStock > 0 ? 'Add to cart' : 'Out of stock'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className="btn btn-secondary btn-md"
                  aria-pressed={isWishlisted}
                >
                  <Heart size={16} fill={isWishlisted ? 'var(--color-sale)' : 'none'} color={isWishlisted ? 'var(--color-sale)' : 'var(--black)'} />
                  {isWishlisted ? 'Saved' : 'Wishlist'}
                </button>
                <button className="btn btn-secondary btn-md" aria-label="Share product">
                  <Share2 size={16} /> Share
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

        {/* ── Specs Section ────────────────── */}
        <TechnicalSpecs specs={phone.specs} />

        <ReviewsSection productId={phone.id} reviews={phone.reviews || []} />
        <RelatedProductsSection currentProduct={phone} />
      </div>
    </div>
  );
}
