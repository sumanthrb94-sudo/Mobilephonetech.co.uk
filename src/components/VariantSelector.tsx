import React from 'react';
import { Product, ProductVariant } from '../types';
import { motion } from 'motion/react';
import { Check, Zap } from 'lucide-react';

interface VariantSelectorProps {
  product: Product;
  onVariantSelect: (variant: ProductVariant) => void;
  selectedVariant: ProductVariant | null;
}

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

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--grey-60)',
  marginBottom: '12px',
  display: 'block',
};

const selectedValueStyle: React.CSSProperties = {
  color: 'var(--black)',
  marginLeft: '6px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '13px',
  letterSpacing: 0,
};

function OptionTile({
  isSelected,
  isAvailable,
  onClick,
  children,
}: {
  isSelected: boolean;
  isAvailable: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={() => isAvailable && onClick()}
      disabled={!isAvailable}
      whileHover={isAvailable ? { scale: 1.02 } : undefined}
      whileTap={isAvailable ? { scale: 0.98 } : undefined}
      aria-pressed={isSelected}
      style={{
        position: 'relative',
        padding: '14px 12px',
        borderRadius: 'var(--radius-lg)',
        border: `2px solid ${
          isSelected
            ? 'var(--brand-cyan)'
            : isAvailable
            ? 'var(--grey-20)'
            : 'var(--grey-10)'
        }`,
        background: isSelected
          ? 'var(--color-brand-subtle)'
          : isAvailable
          ? 'var(--grey-0)'
          : 'var(--grey-5)',
        color: isAvailable ? 'var(--black)' : 'var(--grey-40)',
        cursor: isAvailable ? 'pointer' : 'not-allowed',
        opacity: isAvailable ? 1 : 0.5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        fontSize: '13px',
        transition: 'border-color var(--duration-fast), background var(--duration-fast)',
      }}
    >
      {children}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'var(--brand-cyan)',
            color: 'var(--grey-0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={14} />
        </motion.div>
      )}
    </motion.button>
  );
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

  const colorOptions = [...new Set(variants.map((v) => v.color).filter((c): c is string => Boolean(c)))];
  const storageOptions = [...new Set(variants.map((v) => v.storage).filter((s): s is string => Boolean(s)))];
  const conditionOptions = [...new Set(variants.map((v) => v.condition).filter((c): c is NonNullable<ProductVariant['condition']> => Boolean(c)))];

  const getAvailableVariants = (color?: string, storage?: string, condition?: string) =>
    variants.filter((v) => {
      if (color && v.color !== color) return false;
      if (storage && v.storage !== storage) return false;
      if (condition && v.condition !== condition) return false;
      return true;
    });

  const handleVariantChange = (color?: string, storage?: string, condition?: string) => {
    const available = getAvailableVariants(color, storage, condition);
    if (available.length > 0) {
      onVariantSelect(available[0]);
    }
  };

  const inStock = selectedVariant && selectedVariant.stock > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-32)', marginBottom: 'var(--spacing-32)', paddingTop: 'var(--spacing-32)', borderTop: '1px solid var(--grey-10)' }}>
      {/* Colour */}
      {colorOptions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <label style={labelStyle}>
            Colour
            {selectedVariant?.color && <span style={selectedValueStyle}>{selectedVariant.color}</span>}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {colorOptions.map((color) => {
              const isAvailable = getAvailableVariants(color).length > 0;
              const isSelected = selectedVariant?.color === color;
              return (
                <OptionTile
                  key={color}
                  isSelected={isSelected}
                  isAvailable={isAvailable}
                  onClick={() => handleVariantChange(color, selectedVariant?.storage, selectedVariant?.condition)}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '1px solid var(--grey-20)',
                      boxShadow: 'var(--shadow-sm)',
                      background: colorSwatches[color] || '#E5E7EB',
                    }}
                  />
                  <span style={{ fontSize: '12px', textAlign: 'center', lineHeight: 1.3 }}>{color}</span>
                </OptionTile>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Storage */}
      {storageOptions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <label style={labelStyle}>
            Storage
            {selectedVariant?.storage && <span style={selectedValueStyle}>{selectedVariant.storage}</span>}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {storageOptions.map((storage) => {
              const isAvailable = getAvailableVariants(selectedVariant?.color, storage, selectedVariant?.condition).length > 0;
              const isSelected = selectedVariant?.storage === storage;
              return (
                <OptionTile
                  key={storage}
                  isSelected={isSelected}
                  isAvailable={isAvailable}
                  onClick={() => handleVariantChange(selectedVariant?.color, storage, selectedVariant?.condition)}
                >
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>{storage}</span>
                </OptionTile>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Condition */}
      {conditionOptions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <label style={labelStyle}>
            Condition
            {selectedVariant?.condition && <span style={selectedValueStyle}>{selectedVariant.condition}</span>}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {conditionOptions.map((condition) => {
              const isAvailable = getAvailableVariants(selectedVariant?.color, selectedVariant?.storage, condition).length > 0;
              const isSelected = selectedVariant?.condition === condition;
              return (
                <OptionTile
                  key={condition}
                  isSelected={isSelected}
                  isAvailable={isAvailable}
                  onClick={() => handleVariantChange(selectedVariant?.color, selectedVariant?.storage, condition)}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>{condition}</span>
                </OptionTile>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Summary — Price / Stock / Battery */}
      {selectedVariant && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--grey-5)',
            border: '1px solid var(--grey-10)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-20) var(--spacing-24)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--grey-10)' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--grey-60)' }}>Price for selection</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span className="type-price" style={{ fontSize: '22px', color: 'var(--black)' }}>£{selectedVariant.price}</span>
              {selectedVariant.originalPrice > selectedVariant.price && (
                <span style={{ fontSize: '14px', color: 'var(--grey-40)', textDecoration: 'line-through', fontFamily: 'var(--font-body)' }}>
                  £{selectedVariant.originalPrice}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--grey-60)' }}>Stock</span>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                fontWeight: 700,
                color: inStock ? 'var(--color-trust-text)' : 'var(--color-sale)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {inStock ? (
                <>
                  <Zap size={14} /> {selectedVariant.stock} in stock
                </>
              ) : (
                'Out of stock'
              )}
            </span>
          </div>

          {selectedVariant.batteryHealth && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--grey-60)' }}>Battery health</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '96px', height: '6px', background: 'var(--grey-20)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${selectedVariant.batteryHealth}%`,
                      background: 'var(--color-trust-text)',
                      transition: 'width var(--duration-slow) var(--ease-default)',
                    }}
                  />
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '13px', color: 'var(--color-trust-text)', width: '42px', textAlign: 'right' }}>
                  {selectedVariant.batteryHealth}%
                </span>
              </div>
            </div>
          )}

          {selectedVariant.originalPrice > selectedVariant.price && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px',
                color: 'var(--color-trust-text)',
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              <Zap size={14} /> Save £{selectedVariant.originalPrice - selectedVariant.price} on this configuration
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
