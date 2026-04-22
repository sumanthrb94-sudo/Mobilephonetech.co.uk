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
  Sparkles
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product not found</h2>
          <button 
            onClick={() => navigate('/')}
            className="text-blue-600 font-bold hover:underline"
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

  return (
    <div className="pt-24 pb-20 bg-white">
      <div className="container mx-auto px-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Collection
        </button>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Image Gallery */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 rounded-[3rem] p-12 aspect-square flex items-center justify-center relative overflow-hidden"
            >
              <img 
                src={selectedVariant?.imageUrl || phone.imageUrl} 
                alt={phone.model} 
                className="max-h-full object-contain mix-blend-multiply"
              />
              <div className="absolute top-8 left-8 bg-white px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-sm border border-slate-100">
                {selectedVariant?.condition || phone.grade} Condition
              </div>
            </motion.div>
            
            <div className="grid grid-cols-4 gap-4">
              {(selectedVariant?.galleryImages || phone.galleryImages || [phone.imageUrl]).map((img, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-4 aspect-square flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-600 transition-all">
                  <img src={img} alt={`${phone.model} view ${i+1}`} className="max-h-full object-contain mix-blend-multiply" />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-8">
              <p className="text-blue-600 font-black uppercase tracking-[0.2em] text-sm mb-2">{phone.brand}</p>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">{phone.model}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => <CheckCircle2 key={i} size={16} fill="currentColor" />)}
                </div>
                <span className="text-slate-400 font-bold text-sm">Verified Refurbished</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-8 mb-8">
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-5xl font-black text-slate-900">£{displayPrice}</span>
                <span className="text-2xl text-slate-400 line-through font-bold">£{displayOriginalPrice}</span>
              </div>
              <p className="text-emerald-600 font-black text-sm uppercase tracking-widest">
                You save £{savings} vs buying new
              </p>
            </div>

            {/* Refurbished Transparency Features */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Battery size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Battery Health</p>
                  <p className="text-sm font-bold text-slate-900">{displayBatteryHealth}% Guaranteed</p>
                </div>
              </div>
              <div className="border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Warranty</p>
                  <p className="text-sm font-bold text-slate-900">{phone.warrantyMonths} Months</p>
                </div>
              </div>
            </div>

            {/* Variant Selector */}
            {phone.variants && phone.variants.length > 0 && (
              <VariantSelector
                product={phone}
                onVariantSelect={setSelectedVariant}
                selectedVariant={selectedVariant}
              />
            )}

            {/* Delivery Promises */}
            <div className="mb-10">
              <DeliveryPromiseComponent
                postalCode={postalCode}
                orderTime={new Date()}
                showAllOptions={true}
              />
            </div>

            <div className="space-y-4 mb-10">
              <div className="flex items-center gap-3 text-slate-600">
                <RotateCcw size={20} className="text-slate-400" />
                <span className="font-medium">{phone.returnDays}-Day No-Quibble Returns</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Info size={20} className="text-slate-400" />
                <span className="font-medium">{phone.conditionDescription}</span>
              </div>
            </div>

            {/* Stock Status */}
            <div className={`mb-6 p-4 rounded-xl font-bold text-sm ${
              displayStock > 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {displayStock > 0 ? `${displayStock} units in stock` : 'Out of Stock'}
            </div>

            <div className="flex flex-col gap-4 mb-12">
              <div className="flex gap-4">
                <div className="flex items-center bg-slate-100 rounded-2xl px-4">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 font-black text-xl">-</button>
                  <span className="w-12 text-center font-black">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-2 font-black text-xl">+</button>
                </div>
                <button 
                  onClick={handleAddToCart}
                  disabled={displayStock === 0}
                  className={`flex-grow py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                    displayStock > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {displayStock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
              <button 
                onClick={() => {
                  const aiButton = document.querySelector('button.fixed.bottom-8.right-8') as HTMLButtonElement;
                  if (aiButton) aiButton.click();
                }}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-colors border border-white/10"
              >
                <Sparkles className="h-4 w-4 text-blue-400" />
                Ask AI about this {phone.model}
              </button>
            </div>

            {/* Specs Grid */}
            <div className="border-t border-slate-100 pt-10">
              <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-widest">Technical Specifications</h3>
              
              <div className="space-y-4">
                {Object.entries(phone.specs).map(([key, value]) => (
                  <div key={key} className="flex flex-col sm:flex-row border-b border-slate-50 pb-4">
                    <span className="w-full sm:w-1/3 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 sm:mb-0">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="w-full sm:w-2/3 text-sm font-bold text-slate-700 leading-relaxed">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews Section */}
            <ReviewsSection productId={phone.id} reviews={phone.reviews || []} />
          </div>
        </div>

        {/* Related Products */}
        <RelatedProductsSection currentProduct={phone} />
      </div>
    </div>
  );
}
