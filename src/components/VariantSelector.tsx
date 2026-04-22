import { Product, ProductVariant } from '../types';
import { motion } from 'motion/react';
import { Check, Zap } from 'lucide-react';

interface VariantSelectorProps {
  product: Product;
  onVariantSelect: (variant: ProductVariant) => void;
  selectedVariant: ProductVariant | null;
}

// Color mapping for visual representation
const colorSwatches: Record<string, string> = {
  'Natural Titanium': '#C0C0C0',
  'Blue Titanium': '#4A90E2',
  'White Titanium': '#F5F5F5',
  'Black Titanium': '#1A1A1A',
  'Space Black': '#0D0D0D',
  'Silver': '#E8E8E8',
  'Gold': '#FFD700',
  'Pacific Blue': '#0066CC',
  'Midnight': '#1A1A2E',
  'Starlight': '#F0E68C',
  'Blue': '#4A90E2',
};

export default function VariantSelector({
  product,
  onVariantSelect,
  selectedVariant,
}: VariantSelectorProps) {
  const variants = product.variants || [];

  if (variants.length === 0) {
    return null;
  }

  // Group variants by attribute
  const colorOptions = [...new Set(variants.map((v) => v.color).filter((color): color is string => Boolean(color)))];
  const storageOptions = [...new Set(variants.map((v) => v.storage).filter((storage): storage is string => Boolean(storage)))];
  const conditionOptions = [...new Set(variants.map((v) => v.condition).filter((condition): condition is NonNullable<ProductVariant['condition']> => Boolean(condition)))];

  // Find available variants based on current selections
  const getAvailableVariants = (color?: string, storage?: string, condition?: string) => {
    return variants.filter((v) => {
      if (color && v.color !== color) return false;
      if (storage && v.storage !== storage) return false;
      if (condition && v.condition !== condition) return false;
      return true;
    });
  };

  const handleVariantChange = (color?: string, storage?: string, condition?: string) => {
    const available = getAvailableVariants(color, storage, condition);
    if (available.length > 0) {
      onVariantSelect(available[0]);
    }
  };

  return (
    <div className="space-y-8 mb-10 border-t border-slate-200 pt-10">
      {/* Color Selection */}
      {colorOptions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="text-sm font-black uppercase tracking-widest text-slate-900 mb-5 block flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
            Choose Colour: {selectedVariant?.color || 'Select'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {colorOptions.map((color) => {
              const available = getAvailableVariants(color);
              const isSelected = selectedVariant?.color === color;
              const isAvailable = available.length > 0;

              return (
                <motion.button
                  key={color}
                  onClick={() => {
                    if (isAvailable) {
                      handleVariantChange(
                        color,
                        selectedVariant?.storage,
                        selectedVariant?.condition
                      );
                    }
                  }}
                  disabled={!isAvailable}
                  whileHover={isAvailable ? { scale: 1.05 } : {}}
                  whileTap={isAvailable ? { scale: 0.95 } : {}}
                  className={`relative p-4 rounded-2xl border-3 transition-all font-bold text-sm flex flex-col items-center gap-3 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-lg ring-2 ring-blue-400/30'
                      : isAvailable
                      ? 'border-slate-200 bg-white text-slate-900 hover:border-blue-400 hover:shadow-md'
                      : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  {/* Color Swatch */}
                  <div className="w-10 h-10 rounded-full border-2 border-slate-300 shadow-md" style={{ backgroundColor: colorSwatches[color] || '#E5E7EB' }} />
                  
                  {/* Color Name */}
                  <span className="text-xs leading-tight text-center">{color}</span>
                  
                  {/* Selection Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded-full"
                    >
                      <Check className="h-4 w-4" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Storage Selection */}
      {storageOptions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <label className="text-sm font-black uppercase tracking-widest text-slate-900 mb-5 block flex items-center gap-2">
            <span className="w-3 h-3 bg-purple-600 rounded-full"></span>
            Storage Capacity: {selectedVariant?.storage || 'Select'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {storageOptions.map((storage) => {
              const available = getAvailableVariants(
                selectedVariant?.color,
                storage,
                selectedVariant?.condition
              );
              const isSelected = selectedVariant?.storage === storage;
              const isAvailable = available.length > 0;

              return (
                <motion.button
                  key={storage}
                  onClick={() => {
                    if (isAvailable) {
                      handleVariantChange(
                        selectedVariant?.color,
                        storage,
                        selectedVariant?.condition
                      );
                    }
                  }}
                  disabled={!isAvailable}
                  whileHover={isAvailable ? { scale: 1.05 } : {}}
                  whileTap={isAvailable ? { scale: 0.95 } : {}}
                  className={`relative p-5 rounded-2xl border-3 transition-all font-bold text-base flex flex-col items-center gap-2 ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-lg ring-2 ring-purple-400/30'
                      : isAvailable
                      ? 'border-slate-200 bg-white text-slate-900 hover:border-purple-400 hover:shadow-md'
                      : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span>{storage}</span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 bg-purple-600 text-white p-1 rounded-full"
                    >
                      <Check className="h-4 w-4" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Condition Selection */}
      {conditionOptions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="text-sm font-black uppercase tracking-widest text-slate-900 mb-5 block flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-600 rounded-full"></span>
            Condition: {selectedVariant?.condition || 'Select'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {conditionOptions.map((condition) => {
              const available = getAvailableVariants(
                selectedVariant?.color,
                selectedVariant?.storage,
                condition
              );
              const isSelected = selectedVariant?.condition === condition;
              const isAvailable = available.length > 0;

              return (
                <motion.button
                  key={condition}
                  onClick={() => {
                    if (isAvailable) {
                      handleVariantChange(
                        selectedVariant?.color,
                        selectedVariant?.storage,
                        condition
                      );
                    }
                  }}
                  disabled={!isAvailable}
                  whileHover={isAvailable ? { scale: 1.05 } : {}}
                  whileTap={isAvailable ? { scale: 0.95 } : {}}
                  className={`relative p-5 rounded-2xl border-3 transition-all font-bold text-base flex flex-col items-center gap-2 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-lg ring-2 ring-emerald-400/30'
                      : isAvailable
                      ? 'border-slate-200 bg-white text-slate-900 hover:border-emerald-400 hover:shadow-md'
                      : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span>{condition}</span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 bg-emerald-600 text-white p-1 rounded-full"
                    >
                      <Check className="h-4 w-4" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Variant Info & Pricing */}
      {selectedVariant && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 space-y-4 border border-slate-200"
        >
          {/* Price Update */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-200">
            <span className="text-sm font-bold text-slate-600">Price for Selected:</span>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-black text-slate-900">£{selectedVariant.price}</span>
              <span className="text-lg text-slate-400 line-through font-bold">£{selectedVariant.originalPrice}</span>
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600">Stock Available:</span>
            <span className={`font-black text-base flex items-center gap-2 ${selectedVariant.stock > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {selectedVariant.stock > 0 ? (
                <>
                  <Zap size={18} />
                  {selectedVariant.stock} units
                </>
              ) : (
                'Out of Stock'
              )}
            </span>
          </div>

          {/* Battery Health */}
          {selectedVariant.batteryHealth && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600">Battery Health:</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-300 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all" 
                    style={{ width: `${selectedVariant.batteryHealth}%` }}
                  />
                </div>
                <span className="font-black text-blue-600 w-12 text-right">{selectedVariant.batteryHealth}%</span>
              </div>
            </div>
          )}

          {/* Savings Badge */}
          {selectedVariant.originalPrice > selectedVariant.price && (
            <div className="flex items-center gap-2 pt-2 text-emerald-600 font-black text-sm">
              <Zap size={16} />
              Save £{selectedVariant.originalPrice - selectedVariant.price} on this configuration
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
