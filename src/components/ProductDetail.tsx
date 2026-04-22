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
  Info
 } from 'lucide-react';
import { MOCK_PHONES } from '../data';
import { useCart } from '../context/CartContext';
import { motion } from 'motion/react';
import ReviewsSection from './ReviewsSection';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = React.useState(1);

  const phone = MOCK_PHONES.find(p => p.id === id);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  const savings = phone.originalPrice - phone.price;

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
                src={phone.imageUrl} 
                alt={phone.model} 
                className="max-h-full object-contain mix-blend-multiply"
              />
              <div className="absolute top-8 left-8 bg-white px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-sm border border-slate-100">
                {phone.grade} Condition
              </div>
            </motion.div>
            
            <div className="grid grid-cols-4 gap-4">
              {(phone.galleryImages || [phone.imageUrl]).map((img, i) => (
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
                <span className="text-5xl font-black text-slate-900">£{phone.price}</span>
                <span className="text-2xl text-slate-400 line-through font-bold">£{phone.originalPrice}</span>
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
                  <p className="text-sm font-bold text-slate-900">{phone.batteryHealth}% Guaranteed</p>
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

            <div className="space-y-4 mb-10">
              <div className="flex items-center gap-3 text-slate-600">
                <Truck size={20} className="text-slate-400" />
                <span className="font-medium">Free Next-Day UK Delivery</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <RotateCcw size={20} className="text-slate-400" />
                <span className="font-medium">{phone.returnDays}-Day No-Quibble Returns</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Info size={20} className="text-slate-400" />
                <span className="font-medium">{phone.conditionDescription}</span>
              </div>
            </div>

            <div className="flex gap-4 mb-12">
              <div className="flex items-center bg-slate-100 rounded-2xl px-4">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 font-black text-xl">-</button>
                <span className="w-12 text-center font-black">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-2 font-black text-xl">+</button>
              </div>
              <button 
                onClick={() => addToCart(phone, quantity)}
                className="flex-grow bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
              >
                Add to Cart
              </button>
            </div>

            {/* Specs Grid */}
            <div className="border-t border-slate-100 pt-10">
              <h3 className="text-xl font-black text-slate-900 mb-6">Technical Specifications</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="flex gap-4">
                  <Smartphone className="text-slate-400" size={20} />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display</p>
                    <p className="text-sm font-bold text-slate-900">{phone.specs.display}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Cpu className="text-slate-400" size={20} />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processor</p>
                    <p className="text-sm font-bold text-slate-900">{phone.specs.processor}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Camera className="text-slate-400" size={20} />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Camera</p>
                    <p className="text-sm font-bold text-slate-900">{phone.specs.camera}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Battery className="text-slate-400" size={20} />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Battery</p>
                    <p className="text-sm font-bold text-slate-900">{phone.specs.battery}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <ReviewsSection productId={phone.id} reviews={phone.reviews || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
