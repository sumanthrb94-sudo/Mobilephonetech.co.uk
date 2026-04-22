import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Battery, 
  CheckCircle2,
  Camera,
  Cpu,
  Smartphone,
  Info,
  Sparkles,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Zap,
  Award,
  Clock
 } from 'lucide-react';
import { MOCK_PHONES } from '../data';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';
import ReviewsSection from './ReviewsSection';
import RelatedProductsSection from './RelatedProductsSection';
import VariantSelector from './VariantSelector';
import DeliveryPromiseComponent from './DeliveryPromise';
import { ProductVariant } from '../types';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = React.useState(1);
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | null>(null);
  const [postalCode, setPostalCode] = React.useState('SW1A 1AA');
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const [isWishlisted, setIsWishlisted] = React.useState(false);

  const phone = MOCK_PHONES.find(p => p.id === id);

  React.useEffect(() => {
    window.scrollTo(0, 0);
    // Initialize with first variant if available
    if (phone?.variants && phone.variants.length > 0) {
      setSelectedVariant(phone.variants[0]);
    }
  }, [phone?.id]);

  if (!phone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <h2 className="text-3xl font-black mb-4 text-white">Product not found</h2>
          <button 
            onClick={() => navigate('/')}
            className="text-blue-400 font-bold hover:text-blue-300 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Use variant price if available, otherwise use product price
  const displayPrice = selectedVariant?.price ?? phone.price;
  const displayOriginalPrice = selectedVariant?.originalPrice ?? phone.originalPrice;
  const displayBatteryHealth = selectedVariant?.batteryHealth ?? phone.batteryHealth;
  const displayStock = selectedVariant?.stock ?? phone.stock;
  const savings = displayOriginalPrice - displayPrice;
  const savingsPercent = Math.round((savings / displayOriginalPrice) * 100);

  const galleryImages = phone.galleryImages || [phone.imageUrl];

  const handleAddToCart = () => {
    if (selectedVariant) {
      // Create a variant-aware product for cart
      const cartProduct = {
        ...phone,
        ...selectedVariant,
        price: selectedVariant.price,
        originalPrice: selectedVariant.originalPrice,
        stock: selectedVariant.stock,
        batteryHealth: selectedVariant.batteryHealth ?? phone.batteryHealth,
      };
      addToCart(cartProduct, quantity);
    } else {
      addToCart(phone, quantity);
    }
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  return (
    <div className="pt-24 pb-20 bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Collection
        </button>

        <div className="grid lg:grid-cols-2 gap-12 items-start mb-16">
          {/* Enhanced Image Gallery */}
          <div className="space-y-6">
            {/* Main Image with Enhanced Design */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-8 aspect-square flex items-center justify-center overflow-hidden group"
            >
              {/* Background gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Main Image */}
              <motion.img 
                key={selectedImageIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                src={galleryImages[selectedImageIndex]} 
                alt={phone.model} 
                className="max-h-full object-contain mix-blend-multiply relative z-10"
              />

              {/* Condition Badge */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-lg border border-slate-100 z-20 flex items-center gap-2"
              >
                <Award size={14} className="text-emerald-600" />
                {selectedVariant?.condition || phone.grade} Condition
              </motion.div>

              {/* Savings Badge */}
              {savings > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-6 right-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-lg z-20 flex items-center gap-2"
                >
                  <Zap size={14} />
                  Save {savingsPercent}%
                </motion.div>
              )}

              {/* Navigation Arrows */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-900 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-20"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-900 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-20"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              {/* Image Counter */}
              {galleryImages.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-bold z-20">
                  {selectedImageIndex + 1} / {galleryImages.length}
                </div>
              )}
            </motion.div>
            
            {/* Thumbnail Gallery - Enhanced */}
            {galleryImages.length > 1 && (
              <div className="grid grid-cols-6 gap-3">
                {galleryImages.map((img, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`relative bg-slate-50 rounded-2xl p-3 aspect-square flex items-center justify-center cursor-pointer transition-all border-2 ${
                      selectedImageIndex === i 
                        ? 'border-blue-600 ring-2 ring-blue-400/30 bg-blue-50' 
                        : 'border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    <img src={img} alt={`View ${i+1}`} className="max-h-full object-contain mix-blend-multiply" />
                    {selectedImageIndex === i && (
                      <div className="absolute inset-0 rounded-2xl bg-blue-600/5" />
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Enhanced Product Info Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Header Section */}
            <div className="mb-8">
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-blue-600 font-black uppercase tracking-[0.2em] text-sm mb-3 flex items-center gap-2"
              >
                <Smartphone size={16} />
                {phone.brand}
              </motion.p>
              <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
                {phone.model}
              </h1>
              
              {/* Rating */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => <CheckCircle2 key={i} size={18} fill="currentColor" />)}
                </div>
                <span className="text-slate-500 font-bold text-sm">Verified Refurbished • 4.8★ (342 reviews)</span>
              </div>
            </div>

            {/* Price Section - Enhanced */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-8 mb-8 border border-slate-200 shadow-lg"
            >
              <div className="flex items-baseline gap-4 mb-3">
                <span className="text-6xl font-black text-slate-900">£{displayPrice}</span>
                <span className="text-3xl text-slate-400 line-through font-bold">£{displayOriginalPrice}</span>
              </div>
              <p className="text-emerald-600 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <Zap size={16} />
                You save £{savings} vs buying new
              </p>
            </motion.div>

            {/* Key Features Grid */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-2 gap-4 mb-8"
            >
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-emerald-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <Battery size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Battery Health</p>
                  <p className="text-lg font-black text-emerald-900">{displayBatteryHealth}%</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Warranty</p>
                  <p className="text-lg font-black text-blue-900">{phone.warrantyMonths} Months</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <RotateCcw size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest">Returns</p>
                  <p className="text-lg font-black text-purple-900">{phone.returnDays} Days</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <Truck size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Fast Delivery</p>
                  <p className="text-lg font-black text-orange-900">Next Day</p>
                </div>
              </div>
            </motion.div>

            {/* Variant Selector */}
            {phone.variants && phone.variants.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <VariantSelector
                  product={phone}
                  onVariantSelect={setSelectedVariant}
                  selectedVariant={selectedVariant}
                />
              </motion.div>
            )}

            {/* Delivery Promises */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-10"
            >
              <DeliveryPromiseComponent
                postalCode={postalCode}
                orderTime={new Date()}
                showAllOptions={true}
              />
            </motion.div>

            {/* Stock Status - Enhanced */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`mb-8 p-5 rounded-2xl font-bold text-base flex items-center gap-3 border-2 ${
                displayStock > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-red-50 text-red-700 border-red-300'
              }`}
            >
              {displayStock > 0 ? (
                <>
                  <CheckCircle2 size={24} />
                  <span>{displayStock} units in stock • Order now for next-day delivery</span>
                </>
              ) : (
                <>
                  <Clock size={24} />
                  <span>Out of Stock • Join waitlist to be notified</span>
                </>
              )}
            </motion.div>

            {/* CTA Buttons - Enhanced */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex flex-col gap-4 mb-12"
            >
              <div className="flex gap-4">
                <div className="flex items-center bg-slate-100 rounded-2xl px-2 border border-slate-200">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                    className="p-3 font-black text-xl text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-black text-lg">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)} 
                    className="p-3 font-black text-xl text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    +
                  </button>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  disabled={displayStock === 0}
                  className={`flex-grow py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all text-lg ${
                    displayStock > 0
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-2xl hover:from-blue-700 hover:to-blue-800'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {displayStock > 0 ? '🛒 Add to Cart' : 'Out of Stock'}
                </motion.button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-widest transition-all border-2 ${
                    isWishlisted
                      ? 'bg-red-50 text-red-600 border-red-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-red-300'
                  }`}
                >
                  <Heart size={20} fill={isWishlisted ? 'currentColor' : 'none'} />
                  Wishlist
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-colors border-2 border-slate-900"
                >
                  <Share2 size={20} />
                  Share
                </motion.button>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const aiButton = document.querySelector('button.fixed.bottom-8.right-8') as HTMLButtonElement;
                  if (aiButton) aiButton.click();
                }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:shadow-xl transition-all border border-white/10"
              >
                <Sparkles className="h-5 w-5 text-blue-400" />
                Ask AI about this {phone.model}
              </motion.button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 pt-8 border-t border-slate-200"
            >
              <div className="flex items-center gap-3 text-slate-600 font-medium">
                <ShieldCheck size={20} className="text-blue-600 flex-shrink-0" />
                <span>Certified Refurbished - Full Quality Guarantee</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 font-medium">
                <RotateCcw size={20} className="text-purple-600 flex-shrink-0" />
                <span>{phone.returnDays}-Day No-Quibble Returns</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 font-medium">
                <Info size={20} className="text-emerald-600 flex-shrink-0" />
                <span>{phone.conditionDescription}</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Specs Section - Enhanced */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-10 mb-16 border border-slate-200"
        >
          <h3 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-widest flex items-center gap-3">
            <Cpu size={32} className="text-blue-600" />
            Technical Specifications
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            {Object.entries(phone.specs).map(([key, value]) => (
              <motion.div 
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow"
              >
                <span className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-sm font-bold text-slate-700 leading-relaxed">
                  {value}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Reviews Section */}
        <ReviewsSection productId={phone.id} reviews={phone.reviews || []} />

        {/* Related Products */}
        <RelatedProductsSection currentProduct={phone} />
      </div>
    </div>
  );
}
