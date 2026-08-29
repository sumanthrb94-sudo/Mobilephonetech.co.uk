import { Cookie } from 'lucide-react';
import { LegalShell, LegalSection, P, LegalList } from './LegalShell';
import { COMPANY } from '../../config/company';

/**
 * Cookie policy — the page the consent banner links to.
 *
 * Honest about the current state: no advertising cookies at all, cookieless
 * measurement that runs for everyone, and Google Analytics loaded only for
 * visitors who accept.
 *
 * This page must be UPDATED THE SAME DAY anything changes. Describing trackers
 * that do not exist is as misleading as hiding ones that do, so it lists only
 * what the code actually sets — and src/lib/firebaseAnalytics.ts is the single
 * place that can start GA, so there is one file to check against this text.
 */
export default function CookiePolicy() {
  return (
    <LegalShell
      icon={<Cookie size={20} />}
      eyebrow="Legal & Compliance"
      title="Cookies"
      updated="21 August 2026"
      description="What LeHart stores in your browser, why, and how to change your choice."
    >
      <LegalSection title="1. What this covers">
        <P>
          "Cookies" here means cookies and similar technologies that store data in your
          browser, including local storage. This page lists everything the site actually
          sets — nothing more, nothing less. If we ever add analytics or advertising
          technologies, they will be added here and will not load unless you consent.
        </P>
      </LegalSection>

      <LegalSection title="2. Strictly necessary">
        <P>These make the shop work and do not track you across other sites. They do not require consent:</P>
        <LegalList items={[
          <><strong>Sign-in session</strong> — keeps you signed in to your account (Firebase Authentication). Cleared on sign-out.</>,
          <><strong>Basket and wishlist</strong> — remembers what you have picked while you browse.</>,
          <><strong>Cookie choice</strong> — records whether you accepted or rejected non-essential storage, so the banner does not reappear on every page.</>,
          <><strong>Checkout progress</strong> — keeps a part-completed order from vanishing if the page reloads.</>,
        ]} />
      </LegalSection>

      <LegalSection title="3. Analytics and advertising">
        <P>
          <strong>Advertising: none.</strong> We set no advertising or ad-targeting
          cookies, and we do not share your browsing with ad networks.
        </P>
        <P>
          <strong>Measurement, always on: no cookies.</strong> We count page and product
          views to see what is popular. Those counts store nothing on your device — no
          cookie, no identifier, no IP address — and cannot be traced back to you by us
          or by anyone else. Because nothing is stored on your device and nobody is
          identified, this needs no consent and runs for everyone.
        </P>
        <P>
          <strong>Measurement, only if you accept: Google Analytics.</strong> If you
          choose &ldquo;Accept all cookies&rdquo; we load Google Analytics for Firebase,
          which sets <strong>_ga</strong> cookies and a Google identifier so we can see
          journeys through the site rather than only totals. It does not load at all
          unless you accept, and choosing &ldquo;Reject non-essential&rdquo; means it is
          never requested — not loaded and disabled, but never fetched. Google acts as
          our processor for this; the data reaches Google servers, which may be outside
          the UK.
        </P>
      </LegalSection>

      <LegalSection title="4. Changing your mind">
        <P>
          Your choice is stored in your browser. To change it, clear this site's data in
          your browser settings and the banner will ask again on your next visit. You can
          also block or delete cookies entirely in your browser — the essential features
          above may stop working if you do. Withdrawing consent stops Google Analytics
          from being loaded again; any <strong>_ga</strong> cookies already set are
          cleared with the rest of the site's data.
        </P>
      </LegalSection>

      <LegalSection title="5. Questions">
        <P>
          Anything unclear, ask us at <strong>{COMPANY.supportEmail}</strong>. How we use
          personal data more broadly is covered by our Privacy Policy.
        </P>
      </LegalSection>
    </LegalShell>
  );
}
