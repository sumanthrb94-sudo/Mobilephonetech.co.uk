import { ShieldCheck, RotateCcw, Package, Leaf, Truck, CheckCircle2 } from 'lucide-react';

interface PdpWhyRefurbishedBentoProps {
  brand: string;
  model: string;
}

export default function PdpWhyRefurbishedBento({ brand, model }: PdpWhyRefurbishedBentoProps) {
  return (
    <section
      aria-label="Why buy refurbished from LeHart"
      style={{
        marginTop: 'var(--spacing-32)',
        marginBottom: 'var(--spacing-32)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-24)' }}>
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
          Buying refurbished doesn't mean compromising. Here is our ironclad commitment for your {brand} {model}.
        </p>
      </div>

      {/* Bento Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
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
            Full hardware peace of mind. If anything goes wrong with the motherboard, display, camera, or charging port, we repair or replace it with priority shipping at zero charge.
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
              <span>Certified {brand} {model} (sanitized & wiped)</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
              <span>Heavy-duty braided fast-charging cable</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--color-trust-text)', flexShrink: 0 }} />
              <span>Universal SIM tray ejector tool</span>
            </li>
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
            Manufacturing one brand new smartphone emits up to 80kg of carbon and extracts 250kg of raw mineral ore. Choosing refurbished extends the circular economy and eliminates 80%+ of that footprint.
          </p>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-trust-text)' }}>
            <CheckCircle2 size={15} /> 100% recyclable, plastic-free packaging
          </div>
        </div>

        {/* Card 5: UK Fast Dispatch */}
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
            <Truck size={24} />
          </div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 800, color: 'var(--black)' }}>
            Next-Day DPD & Royal Mail
          </h3>
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-60)', lineHeight: 1.65 }}>
            Dispatched directly from our UK technical fulfillment centre. Fully tracked, signature required, with automated SMS/email delivery window updates.
          </p>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-trust-text)' }}>
            <CheckCircle2 size={15} /> Free delivery on all phone orders
          </div>
        </div>
      </div>
    </section>
  );
}
