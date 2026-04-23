import { ShieldCheck, Battery, RefreshCw, Truck, Star, Users, BadgeCheck } from 'lucide-react';
import { motion } from 'motion/react';

/**
 * TrustSection — BM spec Section 5 "Value Proposition"
 * Your DNA: Blue brand, clean white bg, DM Sans + Playfair
 * "Tech better with us." centred headline
 * 3-col icon grid + inspection visual + Trustpilot badge
 */

const PILLARS = [
  {
    icon: ShieldCheck,
    accentColor: 'var(--blue-60)',
    accentBg: 'var(--blue-10)',
    title: '12-Month Warranty',
    body: 'Full technical cover on every certified device. Backed by our in-house engineering team, no third-party exceptions.',
  },
  {
    icon: Battery,
    accentColor: '#10b981',
    accentBg: '#d1fae5',
    title: '90%+ Battery Health',
    body: 'We test and guarantee battery capacity on every device. Your phone lasts all day — we promise that in writing.',
  },
  {
    icon: RefreshCw,
    accentColor: '#f59e0b',
    accentBg: '#fef3c7',
    title: '30-Day Free Returns',
    body: 'Changed your mind? Return it free within 30 days. No restocking fees. No awkward questions. Just a refund.',
  },
  {
    icon: Truck,
    accentColor: '#8b5cf6',
    accentBg: '#ede9fe',
    title: 'Free Next-Day Delivery',
    body: 'Order before 4pm, get it tomorrow. Free tracked delivery across the UK. Every single order, no minimum.',
  },
  {
    icon: BadgeCheck,
    accentColor: 'var(--blue-60)',
    accentBg: 'var(--blue-10)',
    title: '90-Point Inspection',
    body: 'Every device passes a rigorous 90-point diagnostic check before it ships. Cameras, speakers, connectors — all tested.',
  },
  {
    icon: Users,
    accentColor: '#0d9488',
    accentBg: '#ccfbf1',
    title: 'Trusted by 1.2M Customers',
    body: 'Over 1.2 million customers across the UK have chosen our certified refurbished devices. Rated 4.9/5 on Trustpilot.',
  },
];

const STATS = [
  { value: '1.2M+', label: 'Happy customers' },
  { value: '4.9★',  label: 'Trustpilot average' },
  { value: '90pt',  label: 'Inspection standard' },
  { value: '30d',   label: 'Free returns window' },
];

export default function TrustSection() {
  return (
    <section
      style={{ background: 'var(--grey-0)', padding: 'var(--spacing-80) 0' }}
      id="why-us"
    >
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>

        {/* ── Value Prop heading — BM spec "Tech better with us." ─── */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-64)' }}>
          <div className="overline mb-4" style={{ display: 'block' }}>Why choose us</div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(32px, 4.5vw, 52px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--black)',
              lineHeight: 1.1,
              marginBottom: '16px',
            }}
          >
            Tech better with us.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '17px',
              color: 'var(--grey-50)',
              maxWidth: '520px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            We don't just resell phones. Every device is meticulously inspected, tested and certified
            to our own standard — then backed by real warranties, not fine print.
          </p>
        </div>

        {/* ── Stat strip ─── */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16"
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              style={{
                background: 'var(--grey-5)',
                border: '1px solid var(--grey-10)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-20) var(--spacing-24)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'clamp(28px, 3vw, 36px)',
                  fontWeight: 900,
                  letterSpacing: '-0.04em',
                  color: 'var(--black)',
                  lineHeight: 1,
                  marginBottom: '4px',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--grey-50)',
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── 2-col: pillars + image ─────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left: 3-col icon grid (BM spec) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PILLARS.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex gap-4"
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    background: p.accentBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <p.icon size={20} style={{ color: p.accentColor }} />
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--black)',
                      marginBottom: '4px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {p.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      color: 'var(--grey-50)',
                      lineHeight: 1.6,
                    }}
                  >
                    {p.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right: Inspection image + Trustpilot badge */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.2, 0, 0, 1] }}
            className="relative"
          >
            <div
              style={{
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                border: '1px solid var(--grey-20)',
                boxShadow: 'var(--shadow-lg)',
                aspectRatio: '4 / 3',
                position: 'relative',
              }}
            >
              <img
                src="/assets/quality-inspection.png"
                alt="Our quality inspection process"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                referrerPolicy="no-referrer"
              />
              {/* Gradient overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(13,13,13,0.85) 0%, transparent 55%)',
                }}
              />
              {/* Text */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'var(--spacing-32)' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(26px, 3vw, 38px)',
                    fontWeight: 700,
                    color: 'white',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                    marginBottom: '6px',
                  }}
                >
                  90-Point Inspection
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Every device. Before every shipment.
                </div>
              </div>
            </div>

            {/* Trustpilot badge — floating */}
            <div
              style={{
                position: 'absolute',
                top: '-20px',
                right: '-16px',
                background: 'var(--grey-0)',
                border: '1px solid var(--grey-20)',
                borderRadius: 'var(--radius-xl)',
                padding: '16px 20px',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 10,
              }}
            >
              <div className="flex items-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="var(--color-star)" style={{ color: 'var(--color-star)' }} />
                ))}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 900,
                  fontSize: '22px',
                  letterSpacing: '-0.04em',
                  color: 'var(--black)',
                  lineHeight: 1,
                }}
              >
                4.9 / 5
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  color: 'var(--grey-40)',
                  marginTop: '2px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Trustpilot · 120K reviews
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
