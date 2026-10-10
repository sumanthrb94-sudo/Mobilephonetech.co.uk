import React from 'react';
import { Product, ProductGrade } from '../types';
import Modal from './ui/Modal';
import ProductImage from './ProductImage';
import { Shield, Truck, RotateCcw, ArrowRight } from 'lucide-react';

const GRADE_CLASS: Record<ProductGrade, string> = {
  Pristine: 'badge-pristine',
  Excellent: 'badge-excellent',
  Good: 'badge-good',
  Fair: 'badge-fair',
  New: 'badge-new',
};

/**
 * QuickViewModal — opens from a ProductCard so a shopper can see essentials
 * (gallery image, price, grade, trust row) and add-to-cart without leaving
 * the listing.
 */
export default function QuickViewModal({
  phone,
  isOpen,
  onClose,
  onAddToCart,
  onViewFull,
}: {
  phone: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: () => void;
  onViewFull: () => void;
}) {
  if (!isOpen) return null;
  const savings = phone.originalPrice - phone.price;
  const savingsPct = savings > 0 ? Math.round((savings / phone.originalPrice) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width={720}
      labelledBy="quick-view-title"
    >
      {/* Layout lives in index.css (.qv): an inline grid-template-columns
          here used to override the two-column class, leaving a full-width
          square photo that pushed the price and buttons below the fold. */}
      <div className="qv">
        <div className="qv-media">
          <ProductImage brand={phone.brand} model={phone.model} storage={phone.storage} category={phone.category} color={phone.colorOptions?.[0] ?? phone.variants?.[0]?.color} imageUrl={phone.imageUrl} alt={phone.model} context="card" />
          {savingsPct > 0 && (
            <span className="badge badge-savings" style={{ position: 'absolute', top: '10px', left: '10px' }}>
              Save {savingsPct}%
            </span>
          )}
        </div>

        <div className="qv-body">
          <div className="qv-brand">{phone.brand}</div>
          <h2 id="quick-view-title" className="qv-title">
            {phone.model}
            {phone.storage ? <span className="qv-storage">{' '}· {phone.storage}</span> : null}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {phone.grade && (
              <span className={`badge ${GRADE_CLASS[phone.grade]}`}>{phone.grade}</span>
            )}
            {phone.batteryHealth && (
              <span className="badge badge-tag">Battery {phone.batteryHealth}%{phone.brand.trim().toLowerCase() === 'apple' ? '+' : ''}</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="type-price" style={{ fontSize: '24px', color: 'var(--black)' }}>£{phone.price}</span>
            {savings > 0 && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-40)', textDecoration: 'line-through' }}>
                £{phone.originalPrice}
              </span>
            )}
          </div>

          {/* Trust points on one line, not three stacked rows. */}
          <div className="qv-trust">
            <TrustRow icon={Truck} label="Free next-day delivery" />
            <TrustRow icon={Shield} label={`${phone.warrantyMonths}-month warranty`} />
            <TrustRow icon={RotateCcw} label={`${phone.returnDays}-day returns`} />
          </div>

          <div className="qv-actions">
            <button
              onClick={onAddToCart}
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={phone.stock <= 0}
            >
              {phone.stock > 0 ? 'Add to cart' : 'Out of stock'}
            </button>
            <button onClick={onViewFull} className="btn btn-secondary">
              Full details <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function TrustRow({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <Icon size={13} style={{ color: 'var(--grey-50)', flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-70)', whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  );
}
