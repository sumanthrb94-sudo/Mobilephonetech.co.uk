import { useState } from 'react';
import Modal from '../ui/Modal';
import { CreditCard, Calendar, CheckCircle2, ShieldCheck, ChevronRight } from 'lucide-react';

interface PdpFinanceCalculatorProps {
  price: number;
}

export default function PdpFinanceCalculator({ price }: PdpFinanceCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (price < 30) return null;

  const installment = (price / 3).toFixed(2);
  const today = new Date();
  const date30 = new Date(today);
  date30.setDate(date30.getDate() + 30);
  const date60 = new Date(today);
  date60.setDate(date60.getDate() + 60);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 14px',
          background: 'var(--grey-5)',
          border: '1px solid var(--grey-15)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          textAlign: 'left',
          marginTop: '6px',
        }}
        className="hover:border-cyan-500 hover:bg-white"
        aria-label="View 0% interest-free payment options"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: '#003087',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '11px',
              letterSpacing: '-0.5px',
            }}
          >
            P3
          </div>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--grey-80)', fontWeight: 500 }}>
            Or 3 interest-free payments of <strong style={{ color: 'var(--black)', fontWeight: 800 }}>£{installment}</strong>
          </span>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600, color: 'var(--brand-cyan)' }}>
          Learn more <ChevronRight size={14} />
        </span>
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Spread the cost — 0% Interest Free" width={540}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-70)', margin: 0, lineHeight: 1.6 }}>
            Pay in 3 equal installments with zero interest and zero fees. Backed by PayPal and Klarna for transparent shopping.
          </p>

          {/* Payment timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--grey-5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--grey-15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--grey-15)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} style={{ color: 'var(--brand-cyan)' }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--black)' }}>Today at checkout</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)' }}>First payment taken</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, color: 'var(--black)' }}>£{installment}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--grey-15)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} style={{ color: 'var(--grey-40)' }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--black)' }}>In 30 days ({formatDate(date30)})</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)' }}>Second payment auto-debited</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, color: 'var(--black)' }}>£{installment}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} style={{ color: 'var(--grey-40)' }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--black)' }}>In 60 days ({formatDate(date60)})</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)' }}>Final payment — all paid off</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, color: 'var(--black)' }}>£{installment}</div>
            </div>
          </div>

          {/* Guarantees */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--grey-70)' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
              <span><strong>0% APR Interest:</strong> No interest, no extra costs, no hidden fees ever.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--grey-70)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
              <span><strong>Buyer Protection:</strong> Fully covered by standard 12-month LeHart warranty.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--grey-70)' }}>
              <CreditCard size={16} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
              <span><strong>Instant Approval:</strong> Soft search that does not affect your credit score.</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
