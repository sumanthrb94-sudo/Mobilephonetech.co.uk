import React from 'react';
import { Truck, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { calculateDeliveryPromises, isNextDayDeliveryAvailable } from '../utils/deliveryCalculator';

interface DeliveryPromiseProps {
  postalCode?: string;
  orderTime?: Date;
  showAllOptions?: boolean;
}

const CONFIDENCE_STYLE: Record<string, React.CSSProperties> = {
  high:   { background: 'var(--green-5)',         color: 'var(--color-trust-text)', border: '1px solid var(--green-20)' },
  medium: { background: 'var(--color-warn-subtle)', color: '#92400e',                border: '1px solid #fde68a' },
  low:    { background: 'var(--grey-5)',          color: 'var(--grey-70)',          border: '1px solid var(--grey-20)' },
};

export default function DeliveryPromiseComponent({
  postalCode = 'SW1A 1AA',
  orderTime = new Date(),
  showAllOptions = false,
}: DeliveryPromiseProps) {
  const promises = calculateDeliveryPromises(postalCode, orderTime);
  const isNextDayAvailable = isNextDayDeliveryAvailable(orderTime);
  const fastestPromise = promises[0];

  if (!fastestPromise) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--color-brand-subtle)',
          border: '1px solid rgba(0, 186, 219, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-20) var(--spacing-24)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--grey-0)',
            color: 'var(--brand-cyan-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Truck size={22} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--brand-cyan-hover)',
              margin: '0 0 4px 0',
            }}
          >
            {isNextDayAvailable ? 'Fastest delivery' : 'Standard delivery'}
          </p>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 800, color: 'var(--black)', margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>
            {fastestPromise.label}
          </h3>
          {fastestPromise.time && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)', margin: 0 }}>
              Delivery {fastestPromise.time}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)' }}>
            <MapPin size={12} />
            <span>Postcode: {postalCode}</span>
          </div>
        </div>

        <span
          className="badge"
          style={{ ...CONFIDENCE_STYLE[fastestPromise.confidence], flexShrink: 0 }}
        >
          {fastestPromise.confidence} confidence
        </span>
      </motion.div>

      {showAllOptions && promises.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--grey-50)',
              padding: '0 4px',
              margin: 0,
            }}
          >
            Other options
          </p>
          {promises.slice(1).map((promise, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--grey-5)',
                border: '1px solid var(--grey-10)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'border-color var(--duration-fast)',
              }}
            >
              <div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 700, color: 'var(--black)', margin: 0 }}>
                  {promise.label}
                </p>
                {promise.time && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', margin: '2px 0 0 0' }}>
                    {promise.time}
                  </p>
                )}
              </div>
              <span className="badge" style={CONFIDENCE_STYLE[promise.confidence]}>
                {promise.confidence}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
