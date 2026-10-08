import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BrandShowcase from '../../components/BrandShowcase';
import { BUILT_IN_PANELS, toneForPosition } from '../../lib/seriesPanels';

// The live catalogue, as if loaded from the database.
vi.mock('../../context/CatalogueContext', async () => {
  const { MOCK_PHONES: products } = await import('../../test/fixtures/mockPhones');
  return { useCatalogue: () => ({ products, isLoading: false, fromSupabase: true }) };
});

// The cards are not what is under test, and need the cart and wishlist.
vi.mock('../../components/ProductCard', () => ({ default: () => null }));

// Stored panels deliberately all dark: position, not the stored tone, decides.
vi.mock('../../lib/seriesPanels', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/seriesPanels')>();
  return {
    ...actual,
    listLivePanels: async () => actual.BUILT_IN_PANELS.map(p => ({ ...p, tone: 'dark' as const })),
  };
});

describe('home page series panels', () => {
  it('alternate white, black, white, black from the top', async () => {
    const { container } = render(<MemoryRouter><BrandShowcase /></MemoryRouter>);
    await waitFor(() => expect(container.querySelectorAll('section[data-tone]').length).toBeGreaterThan(1));
    const tones = [...container.querySelectorAll('section[data-tone]')].map(s => s.getAttribute('data-tone'));
    expect(tones).toEqual(tones.map((_, i) => toneForPosition(i)));
    expect(tones[0]).toBe('light');
    expect(tones[1]).toBe('dark');
  });

  it('never shows a demo picture as panel artwork', async () => {
    const { container } = render(<MemoryRouter><BrandShowcase /></MemoryRouter>);
    await waitFor(() => expect(container.querySelectorAll('section[data-tone]').length).toBeGreaterThan(1));
    expect(BUILT_IN_PANELS.some(p => p.heroImage.startsWith('/assets/'))).toBe(true);
    const srcs = [...container.querySelectorAll('section[data-tone] img')].map(i => i.getAttribute('src') ?? '');
    expect(srcs.filter(s => s.startsWith('/assets/'))).toEqual([]);
  });

  it('positions start white', () => {
    expect([0, 1, 2, 3].map(toneForPosition)).toEqual(['light', 'dark', 'light', 'dark']);
    expect(BUILT_IN_PANELS[0].tone).toBe('light');
  });
});
