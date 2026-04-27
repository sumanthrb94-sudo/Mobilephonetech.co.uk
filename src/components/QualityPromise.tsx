import { motion } from 'motion/react';
import { Search, Wrench, Sparkles } from 'lucide-react';

/**
 * QualityPromise — MobilePhoneMarket's signature triple-claim
 * (Inspected / Tested / Cleaned) translated into our tokens.
 * Sits directly under the Hero so it's the first content promise
 * a visitor reads after the billboard, reinforcing refurb trust
 * before they scroll into product.
 */

const STEPS = [
  {
    icon: Search,
    label: 'Inspected',
    blurb: 'Every device passes a 30-point visual and functional check by a certified technician.',
  },
  {
    icon: Wrench,
    label: 'Tested',
    blurb: 'Battery health, speakers, cameras, biometrics and every port — verified on the bench.',
  },
  {
    icon: Sparkles,
    label: 'Cleaned',
    blurb: 'Factory-reset, sanitised and re-packaged so your phone arrives looking and feeling new.',
  },
] as const;

export default function QualityPromise() {
  return (
    <section
      aria-label="Our quality promise"
      style={{
        background: 'var(--grey-0)',
        borderBottom: '1px solid var(--grey-10)',
        paddingTop: 'var(--spacing-48)',
        paddingBottom: 'var(--spacing-48)',
      }}
    >
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        <div style={{ maxWidth: '620px', marginBottom: 'var(--spacing-32)' }}>
          <div className="overline" style={{ marginBottom: '8px' }}>
            The MobilePhoneMarket promise
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(22px, 2.6vw, 30px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--brand-header)',
              lineHeight: 1.15,
              margin: '0 0 8px',
            }}
          >
            Inspected. Tested. Cleaned.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              color: 'var(--grey-60)',
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            Three checks every device clears before it ships. Same reason your refurb arrives feeling like new.
          </p>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ gap: '14px' }}
        >
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.06, duration: 0.35, ease: [0.2, 0, 0, 1] }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '20px 18px',
                  background: 'var(--grey-5)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--grey-10)',
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'var(--color-brand-subtle)',
                    color: 'var(--brand-cyan-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '16px',
                        fontWeight: 800,
                        color: 'var(--black)',
                        letterSpacing: '-0.01em',
                        margin: 0,
                      }}
                    >
                      {s.label}
                    </h3>
                    <span
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'var(--grey-40)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      0{i + 1}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      color: 'var(--grey-60)',
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {s.blurb}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
