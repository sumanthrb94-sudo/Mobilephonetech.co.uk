import { motion } from 'motion/react';
import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

import { GUIDES } from '../data/guides';

/**
 * HomeBlog — the latest articles from the blog (src/data/guides.ts), each
 * card opening the article at /guides/:slug.
 */

/** Three cards: one row on desktop, enough to show the blog is there. */
const HOME_POST_COUNT = 3;

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
        paddingTop: 'var(--home-section-y)',
        paddingBottom: 'var(--home-section-y)',
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
              Plain-English guides to buying refurbished: grades, batteries, warranties, and how every phone is checked before it goes on sale.
            </p>
          </div>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          style={{ gap: '20px' }}
        >
          {GUIDES.slice(0, HOME_POST_COUNT).map((p, i) => (
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
              }}
            >
              <Link to={`/guides/${p.slug}`} aria-label={p.title} style={{ display: 'flex', flexDirection: 'column', flex: 1, color: 'inherit', textDecoration: 'none' }}>
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
                  {p.summary}
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
              </Link>
            </motion.article>
          ))}
        </div>

        {/* Every article, on the blog page. */}
        <div style={{ textAlign: 'center', marginTop: 'var(--spacing-32)' }}>
          <Link
            to="/guides"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--brand-cyan-hover)',
              textDecoration: 'none',
            }}
          >
            Read all guides <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
