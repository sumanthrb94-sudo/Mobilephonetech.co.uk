import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useSeo } from '../../hooks/useSeo';

/**
 * Shared layout for policy pages, matching the structure PrivacyPolicy and
 * TermsOfService established — eyebrow, serif display title, dated header,
 * stacked sections. Extracted so the returns / delivery / cookies pages don't
 * each carry their own copy of the same inline styling.
 */
export function LegalShell({
  icon, eyebrow, title, updated, description, children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  updated: string;
  description: string;
  children: React.ReactNode;
}) {
  useSeo({ title: `${title} — LeHart`, description });
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ background: 'var(--grey-0)', minHeight: '100vh', paddingTop: 'var(--spacing-80)', paddingBottom: 'var(--spacing-80)' }}>
      <div className="container-bm" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--spacing-48)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-16)' }}>
            <span style={{ color: 'var(--brand-cyan-hover)', display: 'inline-flex' }}>{icon}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800, color: 'var(--brand-cyan-hover)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {eyebrow}
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, color: 'var(--black)', lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-50)', margin: 0 }}>
            Last updated: {updated}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-32)' }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6, marginBottom: '12px' }}>
      {children}
    </p>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul style={{ paddingLeft: '24px', margin: '0 0 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', lineHeight: 1.6 }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Highlighted panel for the parts a customer actually needs to act on. */
export function LegalCallout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '16px 18px',
      background: 'var(--color-brand-subtle)',
      border: '1px solid rgba(161, 98, 7, 0.25)',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-body)', fontSize: '14.5px',
      color: 'var(--grey-70)', lineHeight: 1.6,
      marginBottom: '12px',
    }}>
      {children}
    </div>
  );
}
