import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import Breadcrumbs from '../ui/Breadcrumbs';
import { GUIDE_REDIRECTS, guideBySlug, publishedGuides, type Guide } from '../../data/guides';
import GuideProducts from './GuideProducts';
import { useSeo, SITE_ORIGIN } from '../../hooks/useSeo';

/**
 * The blog: every guide at /guides, each one at /guides/:slug. Articles live
 * in src/data/guides.ts, the same list the home page shows.
 */
export default function BuyingGuidesPage() {
  const { slug } = useParams();
  if (!slug) return <GuideList />;
  if (GUIDE_REDIRECTS[slug]) return <Navigate to={`/guides/${GUIDE_REDIRECTS[slug]}`} replace />;
  const guide = guideBySlug(slug);
  return guide ? <GuideArticle guide={guide} /> : <GuideMissing />;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function GuideList() {
  useSeo({
    title: 'Buying guides — LeHart',
    description: 'Plain-English guides to buying a refurbished phone: grades, battery health, software updates, network locks, which model to choose, warranties and your rights.',
    canonical: `${SITE_ORIGIN}/guides`,
  });
  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-0)', paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-80)' }}>
      <div className="container-bm" style={{ maxWidth: '960px' }}>
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Buying guides' }]} />

        <header style={{ marginBottom: 'var(--spacing-48)' }}>
          <div className="overline mb-3">Learn</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--black)', lineHeight: 1.1, marginBottom: '16px' }}>
            Buying guides
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--grey-60)', lineHeight: 1.65, maxWidth: '620px' }}>
            Plain-English guides to help you pick the right refurbished phone, and to know exactly what you are getting.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {publishedGuides().map(g => (
            <Link key={g.slug} to={`/guides/${g.slug}`} className="guide-card">
              <span className="guide-card__tag" style={{ background: `linear-gradient(135deg, ${g.accent.from}, ${g.accent.to})`, color: g.accent.ink }}>
                {g.category}
              </span>
              <h2 className="guide-card__title">{g.title}</h2>
              <p className="guide-card__summary">{g.summary}</p>
              <span className="guide-card__foot">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {g.readMinutes} min read</span>
                <span className="guide-card__more">Read guide <ArrowRight size={12} /></span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function GuideArticle({ guide }: { guide: Guide }) {
  const url = `${SITE_ORIGIN}/guides/${guide.slug}`;
  useSeo({
    title: `${guide.title} — LeHart`,
    description: guide.summary,
    canonical: url,
    ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.summary,
      datePublished: guide.publishedAt,
      mainEntityOfPage: url,
      publisher: { '@type': 'Organization', name: 'LeHart', url: SITE_ORIGIN },
    },
  });

  const more = publishedGuides().filter(g => g.slug !== guide.slug).slice(0, 3);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-0)', paddingTop: 'var(--spacing-48)', paddingBottom: 'var(--spacing-80)' }}>
      <article className="container-bm guide-article" style={{ maxWidth: '720px' }}>
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Buying guides', to: '/guides' }, { label: guide.title }]} />

        <header style={{ margin: 'var(--spacing-24) 0 var(--spacing-32)' }}>
          <span className="guide-card__tag" style={{ background: `linear-gradient(135deg, ${guide.accent.from}, ${guide.accent.to})`, color: guide.accent.ink }}>
            {guide.category}
          </span>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(28px, 4.5vw, 44px)', fontWeight: 900, letterSpacing: '-0.025em', color: 'var(--black)', lineHeight: 1.12, margin: '14px 0 12px' }}>
            {guide.title}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: 'var(--grey-60)', lineHeight: 1.6, margin: '0 0 12px' }}>{guide.summary}</p>
          <p className="guide-meta">{formatDate(guide.publishedAt)} · {guide.readMinutes} min read</p>
        </header>

        <div className="guide-body">
          {guide.body.map((b, i) => b.type === 'h2'
            ? <h2 key={i}>{b.text}</h2>
            : b.type === 'ul'
              ? <ul key={i}>{b.items.map(item => <li key={item}>{item}</li>)}</ul>
              : b.type === 'products'
                ? <GuideProducts key={i} block={b} />
                : <p key={i}>{b.text}</p>)}
        </div>

        <div className="guide-cta">
          <Link to="/products" className="btn btn-buy btn-md" style={{ textDecoration: 'none' }}>
            Shop refurbished phones <ArrowRight size={15} />
          </Link>
          <Link to="/guides" className="btn btn-secondary btn-md" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={15} /> All guides
          </Link>
        </div>

        <section aria-label="More guides" style={{ marginTop: 'var(--spacing-48)' }}>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 800, color: 'var(--black)', margin: '0 0 14px' }}>More guides</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {more.map(g => (
              <Link key={g.slug} to={`/guides/${g.slug}`} className="guide-card guide-card--small">
                <h3 className="guide-card__title">{g.title}</h3>
                <span className="guide-card__more">Read <ArrowRight size={12} /></span>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}

function GuideMissing() {
  useSeo({ title: 'Guide not found — LeHart', description: 'That guide does not exist.', noindex: true });
  return (
    <div className="container-bm" style={{ maxWidth: '720px', padding: 'var(--spacing-80) 16px', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '28px', fontWeight: 900, color: 'var(--black)' }}>We could not find that guide</h1>
      <p style={{ fontFamily: 'var(--font-body)', color: 'var(--grey-60)' }}>It may have moved.</p>
      <Link to="/guides" className="btn btn-secondary btn-md" style={{ textDecoration: 'none', marginTop: 16 }}>See all guides</Link>
    </div>
  );
}
