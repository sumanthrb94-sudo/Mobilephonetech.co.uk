import { Cookie } from 'lucide-react';
import { LegalShell, LegalSection, P, LegalList } from './LegalShell';
import { COMPANY } from '../../config/company';

/**
 * Cookie policy — the page the consent banner links to.
 *
 * Honest about the current state: the site sets no analytics or advertising
 * cookies today, and this page must be UPDATED THE SAME DAY any are added.
 * Describing trackers that do not exist is as misleading as hiding ones that
 * do, so the tables below list only what the code actually sets.
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
          None at present. The site sets no analytics, measurement or advertising cookies
          today. If that changes, this page will say exactly what was added and why, and
          nothing will load before you consent through the banner.
        </P>
      </LegalSection>

      <LegalSection title="4. Changing your mind">
        <P>
          Your choice is stored in your browser. To change it, clear this site's data in
          your browser settings and the banner will ask again on your next visit. You can
          also block or delete cookies entirely in your browser — the essential features
          above may stop working if you do.
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
