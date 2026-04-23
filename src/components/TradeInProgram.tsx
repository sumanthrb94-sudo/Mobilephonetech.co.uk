import { motion } from 'motion/react';
import { ArrowRight, Smartphone, Banknote, PackageCheck } from 'lucide-react';

const STEPS = [
  {
    num: '01',
    icon: Smartphone,
    title: 'Tell us about your device',
    body: 'Choose your phone model and condition. Get an instant estimate — no forms, no waiting.',
  },
  {
    num: '02',
    icon: Banknote,
    title: 'Accept our offer',
    body: "Happy with the price? Lock it in. We'll email a free prepaid return label immediately.",
  },
  {
    num: '03',
    icon: PackageCheck,
    title: 'Get paid within 24 hours',
    body: 'We inspect your device and transfer the full agreed amount to your bank. No surprises.',
  },
];

const VALUATIONS = [
  { model: 'iPhone 15 Pro Max', storage: '256 GB',  price: '£650' },
  { model: 'iPhone 14 Pro',     storage: '128 GB',  price: '£450' },
  { model: 'Galaxy S24 Ultra',  storage: '256 GB',  price: '£520' },
  { model: 'iPhone 13',         storage: '128 GB',  price: '£280' },
  { model: 'Pixel 8 Pro',       storage: '128 GB',  price: '£310' },
];

export default function TradeInProgram() {
  return (
    <section
      className="section-y"
      style={{ background: 'var(--grey-95)' }}
      id="trade-in"
    >
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: Copy + Steps ──────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.2, 0, 0, 1] }}
          >
            {/* Overline */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(37,99,235,0.18)',
                border: '1px solid rgba(59,130,246,0.3)',
                fontFamily: 'var(--font-sans)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--blue-30)',
                marginBottom: 'var(--spacing-20)',
              }}
            >
              Trade-In Programme
            </div>

            {/* Headline — Playfair serif (your brand's display voice) */}
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(34px, 4.5vw, 56px)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
                color: 'white',
                marginBottom: 'var(--spacing-16)',
              }}
            >
              Turn your old phone<br />
              into <span style={{ color: 'var(--blue-40)' }}>cash today.</span>
            </h2>

            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '17px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.65,
                maxWidth: '420px',
                marginBottom: 'var(--spacing-40)',
              }}
            >
              Ready for an upgrade? We give you a fair, instant valuation and
              fast bank transfer. No haggling, no hidden deductions.
            </p>

            {/* Numbered steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)', marginBottom: 'var(--spacing-40)' }}>
              {STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  style={{ display: 'flex', gap: 'var(--spacing-16)', alignItems: 'flex-start' }}
                >
                  {/* Step number */}
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(37,99,235,0.2)',
                      border: '1px solid rgba(59,130,246,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <step.icon size={18} style={{ color: 'var(--blue-40)' }} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--blue-40)',
                        marginBottom: '4px',
                      }}
                    >
                      Step {step.num}
                    </div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: '4px',
                        letterSpacing: '-0.015em',
                      }}
                    >
                      {step.title}
                    </h3>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                      {step.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTAs — black primary per spec + ghost */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-12)' }}>
              <button
                className="btn btn-md"
                id="tradein-quote-btn"
                style={{
                  background: 'white',
                  color: 'var(--black)',
                  border: '1px solid white',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Get a free quote <ArrowRight size={16} />
              </button>
              <button
                className="btn btn-md"
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                }}
              >
                How it works
              </button>
            </div>
          </motion.div>

          {/* ── Right: Valuation card ───────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.15 }}
          >
            <div
              style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Card header */}
              <div
                style={{
                  padding: 'var(--spacing-16) var(--spacing-24)',
                  background: 'rgba(37,99,235,0.15)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '14px', color: 'white' }}>
                  Example valuations
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--blue-40)',
                  }}
                >
                  Live prices
                </span>
              </div>

              {/* Price rows */}
              <div style={{ background: 'rgba(255,255,255,0.03)' }}>
                {VALUATIONS.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--spacing-16) var(--spacing-24)',
                      borderBottom: i < VALUATIONS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '14px', color: 'white' }}>
                        {v.model}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                        {v.storage}
                      </div>
                    </div>
                    <div
                      className="type-price"
                      style={{ fontSize: '18px', color: 'var(--blue-40)' }}
                    >
                      {v.price}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tip footer */}
              <div
                style={{
                  padding: 'var(--spacing-16) var(--spacing-24)',
                  background: 'rgba(37,99,235,0.08)',
                  borderTop: '1px solid rgba(37,99,235,0.2)',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>
                  <span style={{ fontWeight: 700, color: 'var(--blue-30)' }}>Tip: </span>
                  Trade in when buying refurbished and combine the savings. Your upgrade can cost surprisingly little.
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
