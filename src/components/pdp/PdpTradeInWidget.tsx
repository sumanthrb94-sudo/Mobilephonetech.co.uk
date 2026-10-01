import { ArrowRightLeft, Sparkles, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PdpTradeInWidgetProps {
  model: string;
}

export default function PdpTradeInWidget({ model }: PdpTradeInWidgetProps) {
  const navigate = useNavigate();

  const handleTradeInClick = () => {
    navigate('/#trade-in');
    // smooth scroll to trade-in section
    setTimeout(() => {
      const el = document.getElementById('trade-in');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(6, 182, 212, 0.04) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.22)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        marginTop: '6px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-trust-text)',
            flexShrink: 0,
          }}
        >
          <ArrowRightLeft size={16} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--black)' }}>
            Trade in an old device & save up to £280
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-60)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={11} style={{ color: 'var(--color-trust-text)' }} /> Fast payment straight to your bank account
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleTradeInClick}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          fontFamily: 'var(--font-sans)',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--color-trust-text)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Value phone <ChevronRight size={14} />
      </button>
    </div>
  );
}
