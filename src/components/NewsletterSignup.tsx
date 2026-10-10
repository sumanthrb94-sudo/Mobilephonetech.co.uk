import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, Tag, Bell, ArrowRight } from 'lucide-react';
import { useCatalogue } from '../context/CatalogueContext';
import { isUploadedPhoto } from '../lib/productImages';
import ProductImage from './ProductImage';
import type { Product } from '../types';

const STORAGE_KEY = 'mt_newsletter_email';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState<boolean>(() => {
    try { return !!window.localStorage.getItem(STORAGE_KEY); } catch { return false; }
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsSubmitting(true);

    // Why the outcome is collected rather than thrown: a server refusal has a
    // reason worth showing ("Invalid email address"), while a network failure
    // only has the browser's own "Failed to fetch", which tells a customer
    // nothing. They are reported differently on purpose.
    let failure: string | null = null;
    const GENERIC = 'Could not subscribe you just now. Please try again.';

    try {
      // Through the API, not straight into Firestore. Writing direct from the
      // browser skipped the rate limit and, worse, skipped the consent record
      // — timestamp, source and policy version — that is what makes this list
      // lawfully mailable. Client writes to the collection are now refused by
      // the security rules, so this is the only path in.
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'homepage-newsletter' }),
      });

      // The confirmation is only honest if the subscription exists. This used
      // to show success unconditionally — a rejected address, a rate limit, a
      // 500, or no network at all all rendered "you're subscribed". The
      // consent record is the whole point of routing through the API, so a
      // failed write leaves someone believing they opted in, absent from the
      // list, and with no record either way.
      if (!res.ok) {
        const detail = await res.json().catch(() => ({} as { error?: string }));
        failure = detail.error || GENERIC;
      }
    } catch {
      failure = GENERIC;
    }

    if (failure) {
      setError(failure);
      setIsSubmitting(false);
      return;
    }

    try { window.localStorage.setItem(STORAGE_KEY, trimmed); } catch { /* ignore */ }
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <section
      aria-label="Subscribe for deals"
      style={{
        background: 'linear-gradient(135deg, var(--grey-90) 0%, var(--black) 100%)',
        color: 'white',
        paddingTop: 'var(--home-section-y)',
        paddingBottom: 'var(--home-section-y)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0,
          width: '50%',
          background:
            'radial-gradient(circle at 70% 40%, rgba(55, 200, 235, 0.22) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div className="container-bm" style={{ maxWidth: '920px', position: 'relative' }}>
        <div
          className="grid grid-cols-1 md:grid-cols-2"
          style={{ gap: '32px', alignItems: 'center' }}
        >
          <div>
            <div
              className="overline"
              style={{ color: 'var(--brand-cyan-on-dark)', marginBottom: '8px' }}
            >
              Price drops & new stock
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(24px, 3vw, 34px)',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: 'white',
                lineHeight: 1.15,
                margin: '0 0 10px',
              }}
            >
              Be first when your phone drops in price.
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 1.55,
                margin: '0 0 16px',
                maxWidth: '440px',
              }}
            >
              One email a fortnight. New stock on Pro Max, Galaxy S and Pixel first, plus the deals we'd actually open ourselves.
            </p>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Tag size={14} style={{ color: 'var(--brand-cyan)' }} />
                Subscriber-only price drops
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bell size={14} style={{ color: 'var(--brand-cyan)' }} />
                New stock alerts on flagships
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={14} style={{ color: 'var(--brand-cyan)' }} />
                Unsubscribe in one click, anytime
              </li>
            </ul>
          </div>

          <div>
            <DealCard />
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '20px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <CheckCircle2 size={28} style={{ color: 'var(--brand-cyan)', flexShrink: 0 }} />
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: '2px',
                      }}
                    >
                      You're on the list.
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.65)',
                      }}
                    >
                      Next price-drop email lands in about a fortnight.
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleSubmit}
                  style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                >
                  <label
                    htmlFor="newsletter-email"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.8)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Your email
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      id="newsletter-email"
                      type="email"
                      required
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand-cyan-on-dark)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = error ? 'var(--color-sale)' : 'rgba(255,255,255,0.22)'; }}
                      style={{
                        flex: '1 1 200px',
                        padding: '14px 16px',
                        background: 'rgba(255,255,255,0.08)',
                        border: `1px solid ${error ? 'var(--color-sale)' : 'rgba(255,255,255,0.22)'}`,
                        borderRadius: 'var(--radius-md)',
                        color: 'white',
                        fontFamily: 'var(--font-body)',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      style={{ flexShrink: 0, background: 'var(--brand-cyan-on-dark)', color: 'var(--black)', borderColor: 'var(--brand-cyan-on-dark)' }}
                    >
                      {isSubmitting ? 'Saving…' : 'Notify me'}
                    </button>
                  </div>
                  {error && (
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '12px',
                        color: 'var(--color-sale)',
                        margin: 0,
                      }}
                    >
                      {error}
                    </p>
                  )}
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.55)',
                      margin: '4px 0 0',
                      lineHeight: 1.5,
                    }}
                  >
                    We use your email only for stock & price alerts. Full policy in our{' '}
                    <a
                      href="/privacy"
                      style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'underline' }}
                    >
                      privacy notice
                    </a>.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The block promises price drops, so show one: the in-stock product with a
 * real photo that is furthest below its new price, linked to its page. The
 * figures are the product's own (our price against the new price it lists),
 * never an invented "was" price.
 */
export function pickDeal(products: Product[]): Product | null {
  let best: Product | null = null;
  let bestSaving = 0;
  for (const p of products) {
    if (p.stock <= 0 || !isUploadedPhoto(p.imageUrl)) continue;
    if (!(p.originalPrice > p.price) || p.price <= 0) continue;
    const saving = (p.originalPrice - p.price) / p.originalPrice;
    // Ties go to the dearer phone: a flagship reads as the better deal.
    if (saving > bestSaving + 1e-9 || (Math.abs(saving - bestSaving) < 1e-9 && best && p.originalPrice > best.originalPrice)) {
      best = p;
      bestSaving = saving;
    }
  }
  return best;
}

function DealCard() {
  const { products } = useCatalogue();
  const deal = pickDeal(products);
  if (!deal) return null;
  const saving = deal.originalPrice - deal.price;
  return (
    <Link
      to={`/product/${deal.id}`}
      aria-label={`${deal.brand} ${deal.model}, £${deal.price}, £${saving} less than new`}
      style={{
        display: 'grid', gridTemplateColumns: '96px 1fr', gap: '14px', alignItems: 'center',
        padding: '12px', marginBottom: '20px', borderRadius: 'var(--radius-lg)',
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
        color: 'white', textDecoration: 'none',
      }}
    >
      <div style={{ width: 96, height: 96, borderRadius: 'var(--radius-md)', background: 'white', padding: 6, boxSizing: 'border-box' }}>
        <ProductImage brand={deal.brand} model={deal.model} category={deal.category} imageUrl={deal.imageUrl} alt="" context="thumb" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand-cyan-on-dark)' }}>
          Biggest saving today
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 800, margin: '3px 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {deal.model}{deal.storage ? ` · ${deal.storage}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontFamily: 'var(--font-body)' }}>
          <strong style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 900 }}>£{deal.price}</strong>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'line-through' }}>£{deal.originalPrice} new</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: '#7ee2a8' }}>
          £{saving} less than new <ArrowRight size={13} aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
