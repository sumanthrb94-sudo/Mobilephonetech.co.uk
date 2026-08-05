import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, CheckCircle2, Tag, Bell } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, COL } from '../lib/firebase';

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
    try {
      // The email is the document id, so re-subscribing overwrites rather
       // than creating a duplicate — the equivalent of the old unique index.
      // Lowercased so Foo@x.com and foo@x.com are one subscriber.
      await setDoc(
        doc(db, COL.newsletter, trimmed.toLowerCase()),
        { email: trimmed.toLowerCase(), isActive: true, subscribedAt: serverTimestamp() },
        { merge: true },
      );
    } catch { /* non-fatal — still show success */ }
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
