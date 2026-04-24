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
      width={680}
      labelledBy="quick-view-title"
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'var(--spacing-24)',
        }}
        className="sm:grid-cols-2"
      >
        <div
          style={{
            aspectRatio: '1 / 1',
            background: 'var(--grey-5)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            position: 'relative',
          }}
        >
          <ProductImage brand={phone.brand} model={phone.model} storage={phone.storage} category={phone.category} imageUrl={phone.imageUrl} alt={phone.model} />
          {savingsPct > 0 && (
            <span className="badge badge-savings" style={{ position: 'absolute', top: '12px', right: '12px' }}>
              Save {savingsPct}%
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--grey-50)',
            }}
          >
            {phone.brand}
          </div>
          <h2 id="quick-view-title" style={{ fontFamily: 'var(--font-sans)', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--black)', margin: 0, lineHeight: 1.15 }}>
            {phone.model}
            {phone.storage ? <span style={{ color: 'var(--grey-50)', fontWeight: 600, fontSize: '16px' }}>{' '}· {phone.storage}</span> : null}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {phone.grade && (
              <span className={`badge ${GRADE_CLASS[phone.grade]}`}>{phone.grade}</span>
            )}
            {phone.batteryHealth && (
              <span className="badge badge-tag">Battery {phone.batteryHealth}%+</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '4px' }}>
            <span className="type-price" style={{ fontSize: '26px', color: 'var(--black)' }}>£{phone.price}</span>
            {savings > 0 && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-40)', textDecoration: 'line-through' }}>
                £{phone.originalPrice}
              </span>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', marginTop: '-2px' }}>
            or 3 payments of £{Math.ceil(phone.price / 3)} with Klarna
          </div>

          {/* Trust row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--grey-10)' }}>
            <TrustRow icon={Shield} label={`${phone.warrantyMonths}-month warranty`} />
            <TrustRow icon={Truck} label="Free next-day delivery" />
            <TrustRow icon={RotateCcw} label={`${phone.returnDays}-day returns`} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={onAddToCart}
              className="btn btn-primary btn-lg"
              style={{ flex: 1 }}
              disabled={phone.stock <= 0}
            >
              {phone.stock > 0 ? 'Add to cart' : 'Out of stock'}
            </button>
            <button onClick={onViewFull} className="btn btn-secondary btn-lg">
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Icon size={15} style={{ color: 'var(--grey-50)' }} />
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-70)' }}>{label}</span>
    </div>
  );
}
