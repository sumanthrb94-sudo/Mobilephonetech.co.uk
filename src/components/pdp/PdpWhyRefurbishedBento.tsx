import { displayName } from '../../utils/displayName';
import { COMPANY, SUPPORT_REPLY_TIME } from '../../config/company';
import { DELIVERY_CUTOFF } from '../../lib/deliveryCopy';
import { ShieldCheck, RotateCcw, Package, Leaf, Truck, Headset, CheckCircle2 } from 'lucide-react';

interface PdpWhyRefurbishedBentoProps {
  brand: string;
  model: string;
  category?: string;
  /** Inside a collapsible section, whose title row replaces this header. */
  bare?: boolean;
}

export default function PdpWhyRefurbishedBento({ brand, model, category = 'Phones', bare = false }: PdpWhyRefurbishedBentoProps) {
  const name = displayName(brand, model);
  const isWatch = category === 'Smartwatches' || /watch/i.test(model);
  const isPhone = category === 'Phones' && !isWatch;
  return (
    <section
      aria-label="Why buy refurbished from LeHart"
      style={{
        marginTop: bare ? 0 : 'var(--spacing-32)',
        marginBottom: bare ? 0 : 'var(--spacing-32)',
      }}
    >
      {!bare && <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-24)' }}>
        <p className="overline" style={{ color: 'var(--brand-cyan)', marginBottom: '6px' }}>
          The LeHart Difference
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(22px, 3.5vw, 28px)',
            fontWeight: 800,
            color: 'var(--black)',
            letterSpacing: '-0.02em',
            margin: '0 0 8px 0',
          }}
        >
          Everything you expect from new. At half the price.
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            color: 'var(--grey-60)',
            maxWidth: '580px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Buying refurbished doesn't mean compromising. Here is our ironclad commitment for your {name}.
        </p>
      </div>}

      {/* Bento Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Free next-day delivery is the shop's headline promise, so it
            leads the grid and is the one tile in the gold accent. */}
        <div
          style={{
            background: 'linear-gradient(145deg, var(--accent-amber-bg) 0%, var(--color-brand-subtle) 100%)',
            border: '1px solid var(--brand-cyan)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(161, 98, 7, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-cyan)',
            }}
          >
            <Truck size={24} />
          </div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)' }}>
            Free Next-Day Delivery
          </h3>
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-70)', lineHeight: 1.65 }}>
            {DELIVERY_CUTOFF}, free on every order. Sent from our UK centre by DPD or Royal Mail: fully tracked, signature required, with SMS and email updates on your delivery window.
          </p>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--brand-cyan-hover)' }}>
            <CheckCircle2 size={15} /> Free on all orders across mainland UK
          </div>
        </div>

        {/* Card 1: 12-Month Warranty */}
        <div
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, var(--grey-5) 100%)',
            border: '1px solid var(--grey-15)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(6, 182, 212, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-cyan)',
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)' }}>
            12-Month Free Warranty
          </h3>
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', lineHeight: 1.65 }}>
            Full hardware peace of mind. If anything goes wrong with the internals, display{isWatch ? ', sensors' : ', camera'} or charging, we repair or replace it with priority shipping at zero charge.
          </p>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-trust-text)' }}>
            <CheckCircle2 size={15} /> 100% parts & labor covered
          </div>
        </div>

        {/* Card 2: 30-Day Money Back */}
        <div
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, var(--grey-5) 100%)',
            border: '1px solid var(--grey-15)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-trust-text)',
            }}
          >
            <RotateCcw size={24} />
          </div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)' }}>
            30-Day Risk-Free Trial
          </h3>
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', lineHeight: 1.65 }}>
            Test drive your device in real life. Take photos, test battery life, and make sure it fits your daily routine. If you don't love it, return it free for a prompt 100% refund.
          </p>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-trust-text)' }}>
            <CheckCircle2 size={15} /> Prepaid Royal Mail return label
          </div>
        </div>

        {/* Card 3: What's in the Box */}
        <div
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, var(--grey-5) 100%)',
            border: '1px solid var(--grey-15)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-header)',
            }}
          >
            <Package size={24} />
          </div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)' }}>
            Unboxing Experience
          </h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--grey-70)' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
              <span>Certified {name} (sanitized & wiped)</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
              <span>{isWatch ? 'Magnetic charging cable' : 'Charging cable (wall charger sold separately)'}</span>
            </li>
            {isPhone && <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
              <span>SIM tray ejector tool</span>
            </li>}
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
              <span>Official 70-point diagnostic inspection card</span>
            </li>
          </ul>
        </div>

        {/* Card 4: Eco Impact & Carbon Reduction */}
        <div
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, var(--grey-5) 100%)',
            border: '1px solid var(--grey-15)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-trust-text)',
            }}
          >
            <Leaf size={24} />
          </div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)' }}>
            Planet Friendly
          </h3>
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', lineHeight: 1.65 }}>
            Manufacturing one brand new smartphone emits around 70kg of carbon and uses around 80kg of raw materials and 12,000 litres of water. Choosing refurbished extends the circular economy and eliminates 80%+ of that footprint.
          </p>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-trust-text)' }}>
            <CheckCircle2 size={15} /> 100% recyclable, plastic-free packaging
          </div>
        </div>

        {/* Card 5: Customer Service — completes the 3 × 2 grid */}
        <div
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, var(--grey-5) 100%)',
            border: '1px solid var(--grey-15)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-header)',
            }}
          >
            <Headset size={24} />
          </div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)' }}>
            Impeccable Customer Service
          </h3>
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', lineHeight: 1.65 }}>
            Questions about your order, grading, warranty or a return? Message our UK team from the chat on any page or email{' '}
            <a href={`mailto:${COMPANY.supportEmail}`} style={{ color: 'var(--brand-header)', fontWeight: 600 }}>{COMPANY.supportEmail}</a>, and we reply {SUPPORT_REPLY_TIME}.
          </p>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-trust-text)' }}>
            <CheckCircle2 size={15} /> UK-based support team
          </div>
        </div>
      </div>
    </section>
  );
}
