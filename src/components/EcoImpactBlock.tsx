import { motion } from 'motion/react';
import { Leaf, Droplet, Recycle } from 'lucide-react';

/**
 * EcoImpactBlock — homepage-wide sustainability claim, the lead
 * MPM.co.uk uses to differentiate from big-box refurb sellers.
 * Three figures: CO₂e saved, water saved, raw material avoided.
 * Numbers are industry-standard rule-of-thumb averages for a
 * smartphone's embodied footprint (Apple & ADEME LCA data).
 */

const STATS = [
  {
    icon: Leaf,
    figure: '70kg',
    unit: 'CO₂e',
    label: 'Carbon avoided per device',
    blurb: 'The manufacturing footprint of a new flagship that doesn\'t need to exist when you buy refurbished.',
  },
  {
    icon: Droplet,
    figure: '12,000L',
    unit: 'water',
    label: 'Water saved per device',
    blurb: 'Mining and refining metals for a single new phone drains roughly 12,000 litres.',
  },
  {
    icon: Recycle,
    figure: '80kg',
    unit: 'raw material',
    label: 'Resources kept in the loop',
    blurb: 'Rare-earth metals, lithium and copper — refurbishing keeps them out of landfill and out of new mines.',
  },
] as const;

export default function EcoImpactBlock() {
  return (
    <section
      aria-label="Environmental impact"
      style={{
        background:
          'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 55%, #a5d6a7 100%)',
        paddingTop: 'var(--spacing-64)',
        paddingBottom: 'var(--spacing-64)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, right: 0,
          width: '45%',
          height: '100%',
          background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.3) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div className="container-bm" style={{ maxWidth: 'var(--container-max)', position: 'relative' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
          style={{ maxWidth: '680px', marginBottom: 'var(--spacing-40)' }}
        >
          <div
            className="overline"
            style={{ color: '#1b5e20', marginBottom: '8px', letterSpacing: '0.08em' }}
          >
            The greener choice
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(26px, 3.4vw, 40px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#0f3d1a',
              lineHeight: 1.1,
              margin: '0 0 12px',
            }}
          >
            Every refurb is a new phone that never had to be made.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              color: '#1b3a22',
              lineHeight: 1.6,
              margin: 0,
              maxWidth: '560px',
            }}
          >
            Buying refurbished isn't just cheaper — it's the single biggest thing you can do to cut your tech footprint. Here's what choosing one of our devices avoids, per phone, versus buying new.
          </p>
        </motion.div>

        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ gap: '16px' }}
        >
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08, duration: 0.45, ease: [0.2, 0, 0, 1] }}
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(27,94,32,0.12)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#1b5e20',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'clamp(30px, 3vw, 38px)',
                      fontWeight: 900,
                      letterSpacing: '-0.03em',
                      color: '#0f3d1a',
                      lineHeight: 1,
                    }}
                  >
                    {s.figure}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#1b5e20',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {s.unit}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0f3d1a',
                    margin: 0,
                  }}
                >
                  {s.label}
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: '#1b3a22',
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {s.blurb}
                </p>
              </motion.div>
            );
          })}
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            color: '#1b3a22',
            opacity: 0.7,
            margin: 'var(--spacing-24) 0 0',
            maxWidth: '560px',
          }}
        >
          Figures are flagship-class averages based on Apple and ADEME lifecycle-assessment data. Your exact savings vary by model.
        </p>
      </div>
    </section>
  );
}
