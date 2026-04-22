import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ShieldCheck, RotateCcw, Battery, CheckCircle2,
  Award, Zap, Heart, Share2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { MOCK_PHONES } from '../data';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import ReviewsSection from './ReviewsSection';
import RelatedProductsSection from './RelatedProductsSection';
import VariantSelector from './VariantSelector';
import DeliveryPromiseComponent from './DeliveryPromise';
import { ProductVariant } from '../types';

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
  const savingsPercent = Math.round((savings / displayOriginalPrice) * 100);

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
              {/* Product Image */}
              <AnimatePresence mode="wait">
                <motion.img 
                  key={selectedImageIndex}
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  src={galleryImages[selectedImageIndex]} 
                  alt={phone.model} 
                  loading="lazy"
                  decoding="async"
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }}
                />
              </AnimatePresence>

              {/* Condition Badge */}
              <div 
                className="badge-pristine"
                style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid var(--grey-10)', color: 'var(--black)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 700 }}
              >
                <Award size={12} style={{ color: 'var(--trust-green)' }} />
                {selectedVariant?.condition || phone.grade}
              </div>

              {/* Savings Badge */}
              {savings > 0 && (
                <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--black)', color: 'white', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Save {savingsPercent}%
                </div>
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
              <p className="overline" style={{ marginBottom: '8px' }}>{phone.brand || 'Premium Device'}</p>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 4.5vw, 56px)', fontWeight: 700, color: 'var(--black)', lineHeight: 1.1, marginBottom: '12px', letterSpacing: '-0.02em' }}>
                {phone.model || 'Product Details'}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                  {[...Array(5)].map((_, i) => <CheckCircle2 key={i} size={16} fill="currentColor" />)}
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)', fontWeight: 500 }}>
                  Verified Refurbished • 4.8★ (342 reviews)
                </span>
              </div>
            </div>

            {/* Price Block */}
            <div style={{ padding: 'var(--spacing-24)', background: 'var(--grey-5)', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '8px' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(36px, 4vw, 48px)', fontWeight: 900, color: 'var(--black)', letterSpacing: '-0.04em' }}>£{displayPrice}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(16px, 2vw, 20px)', fontWeight: 600, color: 'var(--grey-40)', textDecoration: 'line-through' }}>£{displayOriginalPrice}</span>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--trust-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} /> You save £{savings} vs buying new
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
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-md)', padding: '4px', alignSelf: 'flex-start' }}>
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: '40px', height: '40px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 700, color: 'var(--black)' }}>−</button>
                  <span style={{ width: '32px', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 700, color: 'var(--black)' }}>{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} style={{ width: '40px', height: '40px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 700, color: 'var(--black)' }}>+</button>
                </div>

                <button 
                  onClick={handleAddToCart}
                  disabled={displayStock === 0}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0 32px', height: '52px', fontSize: '15px', borderRadius: 'var(--radius-md)' }}
                >
                  {displayStock > 0 ? 'Add to cart' : 'Out of Stock'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button 
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className="btn btn-secondary"
                  style={{ height: '44px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Heart size={16} fill={isWishlisted ? 'var(--black)' : 'none'} color="var(--black)" /> Wishlist
                </button>
                <button 
                  className="btn btn-secondary"
                  style={{ height: '44px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
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
        <div style={{ paddingTop: 'var(--spacing-48)', borderTop: '1px solid var(--grey-10)', marginBottom: 'var(--spacing-64)' }}>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: 'var(--spacing-32)' }}>
            Technical specifications
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-20)' }}>
            {Object.entries(phone.specs).map(([key, value]) => (
              <div key={key} style={{ paddingBottom: '16px', borderBottom: '1px solid var(--grey-10)' }}>
                <p className="overline" style={{ marginBottom: '4px', fontSize: '9px' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--black)', lineHeight: 1.4 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        <ReviewsSection productId={phone.id} reviews={phone.reviews || []} />
        <RelatedProductsSection currentProduct={phone} />
      </div>
    </div>
  );
}
