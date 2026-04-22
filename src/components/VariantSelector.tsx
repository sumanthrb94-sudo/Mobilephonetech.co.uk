import React from 'react';
import { Product, ProductVariant } from '../types';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

interface VariantSelectorProps {
  product: Product;
  onVariantSelect: (variant: ProductVariant) => void;
  selectedVariant: ProductVariant | null;
}

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
  const colorOptions = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const storageOptions = [...new Set(variants.map((v) => v.storage).filter(Boolean))];
  const conditionOptions = [...new Set(variants.map((v) => v.condition).filter(Boolean))];

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
    <div className="space-y-6 mb-8 border-t border-slate-100 pt-8">
      {/* Color Selection */}
      {colorOptions.length > 0 && (
        <div>
          <label className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4 block">
            Color: {selectedVariant?.color || 'Select'}
          </label>
          <div className="grid grid-cols-3 gap-3">
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
                  className={`relative p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : isAvailable
                      ? 'border-slate-200 bg-white text-slate-900 hover:border-blue-300'
                      : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {color}
                  {isSelected && (
                    <Check className="absolute top-2 right-2 h-4 w-4 text-blue-600" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Storage Selection */}
      {storageOptions.length > 0 && (
        <div>
          <label className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4 block">
            Storage: {selectedVariant?.storage || 'Select'}
          </label>
          <div className="grid grid-cols-3 gap-3">
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
                  className={`relative p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : isAvailable
                      ? 'border-slate-200 bg-white text-slate-900 hover:border-blue-300'
                      : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {storage}
                  {isSelected && (
                    <Check className="absolute top-2 right-2 h-4 w-4 text-blue-600" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Condition Selection */}
      {conditionOptions.length > 0 && (
        <div>
          <label className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4 block">
            Condition: {selectedVariant?.condition || 'Select'}
          </label>
          <div className="grid grid-cols-3 gap-3">
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
                  className={`relative p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : isAvailable
                      ? 'border-slate-200 bg-white text-slate-900 hover:border-blue-300'
                      : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {condition}
                  {isSelected && (
                    <Check className="absolute top-2 right-2 h-4 w-4 text-blue-600" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Variant Info */}
      {selectedVariant && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-50 rounded-2xl p-4 space-y-2"
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600">Stock Available:</span>
            <span className={`font-black ${selectedVariant.stock > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {selectedVariant.stock > 0 ? `${selectedVariant.stock} units` : 'Out of Stock'}
            </span>
          </div>
          {selectedVariant.batteryHealth && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600">Battery Health:</span>
              <span className="font-black text-blue-600">{selectedVariant.batteryHealth}%</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
