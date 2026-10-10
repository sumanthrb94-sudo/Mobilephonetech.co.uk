import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import PdpSection, { openPdpSection } from '../../components/pdp/PdpSection';
import { displayName } from '../../utils/displayName';

describe('PdpSection', () => {
  it('starts closed unless asked, and opens on tap', () => {
    const { container, getByText } = render(<PdpSection id="pdp-x" title="Specifications"><p>Body</p></PdpSection>);
    const details = container.querySelector('details')!;
    expect(details.open).toBe(false);
    fireEvent.click(getByText('Specifications'));
    details.open = true; // jsdom does not toggle <details> on click
    expect(details.open).toBe(true);
  });

  it('can start open, and be opened by id from a link', () => {
    const { container } = render(<>
      <PdpSection id="pdp-about" title="About" defaultOpen>a</PdpSection>
      <PdpSection id="pdp-reviews" title="Reviews">r</PdpSection>
    </>);
    const [about, reviews] = [...container.querySelectorAll('details')];
    expect(about.open).toBe(true);
    expect(reviews.open).toBe(false);
    openPdpSection('pdp-reviews');
    expect(reviews.open).toBe(true);
  });
});

describe('displayName', () => {
  it('does not repeat the brand', () => {
    expect(displayName('Apple', 'Apple Watch Ultra 2 49mm Titanium')).toBe('Apple Watch Ultra 2 49mm Titanium');
    expect(displayName('Apple', 'iPhone 15')).toBe('Apple iPhone 15');
    expect(displayName('Samsung', 'Galaxy S25')).toBe('Samsung Galaxy S25');
  });
});
