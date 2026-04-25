import { motion } from 'motion/react';
import { ArrowRight, Clock } from 'lucide-react';

/**
 * HomeBlog — 10 storytelling-style refurbished-phone posts.
 *
 * Cards are display-only for now (no /blog/:slug route built yet —
 * clicking falls through to NotFound, which routes back to shop).
 * Each post is hand-curated to read like a real publication, not a
 * keyword-stuffed SEO doormat.
 */

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  category:
    | 'Behind the Scenes'
    | 'Buying Guide'
    | 'Sustainability'
    | 'Trust'
    | 'Refurbished';
  readMinutes: number;
  publishedAt: string;     // displayed as "5 Apr 2026"
  /** Tinted gradient applied to the card hero. */
  accent: { from: string; to: string; ink: string };
}

const POSTS: Post[] = [
  {
    slug: 'thirty-point-inspection',
    title: 'The 30-point inspection that decides whether a phone goes on sale',
    excerpt:
      'Before any device hits the shop it spends about 47 minutes on a workshop bench. Here\'s what those 47 minutes look like — and why one phone in twelve never makes it through.',
    category: 'Behind the Scenes',
    readMinutes: 5,
    publishedAt: '2026-04-22',
    accent: { from: '#1a1f2c', to: '#2d3a52', ink: '#e8edf6' },
  },
  {
    slug: 'battery-health-92-percent',
    title: 'What "battery health: 92%" actually tells you',
    excerpt:
      'Lithium-ion batteries lose capacity in tiny, silent steps. We dug into the chemistry of an iPhone 11 that came back to us at 79% and what that number really means for the next two years.',
    category: 'Buying Guide',
    readMinutes: 4,
    publishedAt: '2026-04-18',
    accent: { from: '#0e3d5a', to: '#1a6c8e', ink: '#dff3fb' },
  },
  {
    slug: 'refurbished-not-a-dirty-word',
    title: 'Refurbished isn\'t a dirty word anymore — it\'s the smart one',
    excerpt:
      'There\'s a moment, somewhere between unboxing a £900 new phone and the first hairline crack, when you realise the secondary market exists for a reason. This is that reason.',
    category: 'Refurbished',
    readMinutes: 3,
    publishedAt: '2026-04-14',
    accent: { from: '#1f4633', to: '#3a7a52', ink: '#e3f4e8' },
  },
  {
    slug: 'pixel-7-saved-70kg-co2',
    title: 'Your old Pixel 7 saved 70 kg of CO₂. Here\'s the maths.',
    excerpt:
      'Manufacturing a smartphone burns more carbon than the next four years of using it. We pulled the lifecycle assessments, ran the numbers across our 2025 customer base, and wrote it up plainly.',
    category: 'Sustainability',
    readMinutes: 6,
    publishedAt: '2026-04-10',
    accent: { from: '#173d2e', to: '#2c6648', ink: '#dceee2' },
  },
  {
    slug: 'pristine-excellent-good-fair',
    title: 'Pristine, Excellent, Good, Fair — a field guide to refurb grades',
    excerpt:
      'Every refurb retailer has a different definition. Ours is calibrated against arm\'s-length viewing: at 30 cm, what would you actually see? Here\'s what each tier looks like in your hand.',
    category: 'Buying Guide',
    readMinutes: 5,
    publishedAt: '2026-04-05',
    accent: { from: '#3a2a52', to: '#5b3f7a', ink: '#efe5fa' },
  },
  {
    slug: 'twelve-month-warranty-not-marketing',
    title: 'Why we won\'t sell you a phone that won\'t last a year',
    excerpt:
      'Twelve months of warranty isn\'t a marketing line — it\'s a commitment that costs us. We\'ve turned down stock from suppliers who couldn\'t produce the bench data. Here\'s what we ask for.',
    category: 'Trust',
    readMinutes: 4,
    publishedAt: '2026-03-29',
    accent: { from: '#1f3a5b', to: '#3a5a8e', ink: '#e0eaf8' },
  },
  {
    slug: 'manchester-floor-4pm',
    title: 'Inside our Manchester refurb floor at 4 PM',
    excerpt:
      'Two technicians, fourteen iPhones, one suspicious smell of soldering paste. A walk through the workshop in the hour before today\'s stock ships out.',
    category: 'Behind the Scenes',
    readMinutes: 7,
    publishedAt: '2026-03-22',
    accent: { from: '#2c1f1a', to: '#5a3a2c', ink: '#f1e3d6' },
  },
  {
    slug: 'six-owners-of-memory',
    title: 'The phone you\'re buying has six owners\' worth of memory in it',
    excerpt:
      'Every refurbished phone arrives with a story it can\'t tell — or shouldn\'t. We talk through what data sanitisation means at the silicon level, and how we make sure the only history left is yours.',
    category: 'Refurbished',
    readMinutes: 5,
    publishedAt: '2026-03-15',
    accent: { from: '#3a1f3a', to: '#6b3a6b', ink: '#f1dcef' },
  },
  {
    slug: 'first-time-buyer-decision-tree',
    title: 'A first-time refurb buyer\'s decision tree',
    excerpt:
      'If you\'re stepping off the new-phone treadmill for the first time, the menu of generations and grades is paralysing. Here\'s the four-question shortcut we\'d give a friend.',
    category: 'Buying Guide',
    readMinutes: 4,
    publishedAt: '2026-03-08',
    accent: { from: '#1e3d5a', to: '#3a708e', ink: '#dff0fa' },
  },
  {
    slug: 'five-myths-busted-by-engineer',
    title: 'Five myths about refurbished phones, busted by an engineer',
    excerpt:
      '"It\'s cosmetic only." "The battery is shot." "There\'s malware." We sat down with the lead engineer who has signed off 14,000 devices and asked which myths still keep her up at night.',
    category: 'Refurbished',
    readMinutes: 6,
    publishedAt: '2026-03-01',
    accent: { from: '#1a1f2c', to: '#3a3f5b', ink: '#e8edf6' },
  },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HomeBlog() {
  return (
    <section
      aria-label="From the workshop blog"
      style={{
        background: 'var(--grey-0)',
        paddingTop: 'var(--spacing-64)',
        paddingBottom: 'var(--spacing-64)',
      }}
    >
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: 'var(--spacing-32)' }}>
          <div style={{ maxWidth: '540px' }}>
            <div className="overline" style={{ marginBottom: '8px' }}>From the workshop</div>
            <h2
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(24px, 3vw, 34px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--brand-header)',
                lineHeight: 1.15,
                margin: '0 0 8px',
              }}
            >
              Stories, guides &amp; ammunition for refurb buyers.
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
              Field notes from the bench, the warehouse, and the buyer-experience desk. Honest writing about used tech, written by people who actually open the things up.
            </p>
          </div>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          style={{ gap: '20px' }}
        >
          {POSTS.map((p, i) => (
            <motion.article
              key={p.slug}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: Math.min(i, 5) * 0.04, duration: 0.4, ease: [0.2, 0, 0, 1] }}
              style={{
                background: 'var(--grey-0)',
                border: '1px solid var(--grey-10)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform var(--duration-fast) var(--ease-default), box-shadow var(--duration-fast)',
                cursor: 'pointer',
              }}
              whileHover={{ y: -3, boxShadow: '0 16px 32px rgba(0,0,0,0.08)' }}
            >
              {/* Card hero with category eyebrow + decorative gradient */}
              <div
                style={{
                  aspectRatio: '16 / 9',
                  background: `linear-gradient(135deg, ${p.accent.from} 0%, ${p.accent.to} 100%)`,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  padding: '14px 16px',
                  color: p.accent.ink,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(6px)',
                    color: p.accent.ink,
                  }}
                >
                  {p.category}
                </span>

                {/* Faint decorative glyph in the corner — layered circles
                    that read like a magazine cover mark. Pure CSS, no
                    raster image required. */}
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    bottom: '-30%',
                    right: '-12%',
                    width: '60%',
                    aspectRatio: '1',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                />
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    bottom: '-10%',
                    right: '12%',
                    width: '30%',
                    aspectRatio: '1',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  padding: '18px 20px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '17px',
                    fontWeight: 800,
                    color: 'var(--brand-header)',
                    letterSpacing: '-0.015em',
                    lineHeight: 1.25,
                    margin: 0,
                  }}
                >
                  {p.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    color: 'var(--grey-60)',
                    lineHeight: 1.55,
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {p.excerpt}
                </p>

                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)' }}>
                    {formatDate(p.publishedAt)}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      color: 'var(--grey-50)',
                    }}
                  >
                    <Clock size={12} /> {p.readMinutes} min read
                  </span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--spacing-40)' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--grey-50)',
            }}
          >
            More stories landing on the workshop blog soon <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </section>
  );
}
