import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * One collapsible section of the product page: a title row the shopper taps
 * to open or close. A native <details>, so it works without JavaScript, is
 * announced as expandable by screen readers, and Ctrl+F opens a closed one.
 *
 * The page below the buy box ran to several screens of cards; collapsed,
 * the shopper sees every topic at a glance and opens only what they want.
 */
export default function PdpSection({
  id, title, defaultOpen = false, children,
}: {
  id: string;
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details id={id} className="pdp-section" open={defaultOpen || undefined}>
      <summary className="pdp-section__summary">
        <h2 id={`${id}-h`} className="pdp-section__title">{title}</h2>
        <ChevronDown size={20} aria-hidden="true" className="pdp-section__chevron" />
      </summary>
      <div className="pdp-section__body">{children}</div>
    </details>
  );
}

/** Open a section by id (used by links that jump to one, e.g. the rating). */
export function openPdpSection(id: string): void {
  const el = document.getElementById(id);
  if (el instanceof HTMLDetailsElement) el.open = true;
}
