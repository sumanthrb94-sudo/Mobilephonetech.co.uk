import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BrandShowcase from '../../components/BrandShowcase';
import { BUILT_IN_PANELS, livePanelsFrom, type SeriesPanel } from '../../lib/seriesPanels';
import type { Product } from '../../types';

// What the catalogue context hands the home page; each test sets it.
const ctx: { products: Product[]; panels: SeriesPanel[] | null; isLoading: boolean } = { products: [], panels: null, isLoading: false };
vi.mock('../../context/CatalogueContext', () => ({
  useCatalogue: () => ({ ...ctx, fromSupabase: true }),
}));
vi.mock('../../components/ProductCard', () => ({ default: () => null }));

const listLivePanels = vi.fn(async () => BUILT_IN_PANELS);
vi.mock('../../lib/seriesPanels', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/seriesPanels')>();
  return { ...actual, listLivePanels: () => listLivePanels() };
});

const { MOCK_PHONES_WITH_PHOTOS: MOCK_PHONES } = await import('../../test/fixtures/mockPhones');
const ids = (c: HTMLElement) => [...c.querySelectorAll('section[data-panel-id]')].map(s => s.getAttribute('data-panel-id'));

describe('home page rows', () => {
  beforeEach(() => {
    listLivePanels.mockClear();
    ctx.products = MOCK_PHONES;
    ctx.isLoading = false;
  });

  it('come with the catalogue, in the stored order, with no second request', () => {
    const stored = [...BUILT_IN_PANELS].reverse().map((p, i) => ({ ...p, order: i }));
    ctx.panels = stored;
    const { container } = render(<MemoryRouter><BrandShowcase /></MemoryRouter>);
    const shown = ids(container);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown).toEqual(stored.map(p => p.id).filter(id => shown.includes(id)));
    expect(listLivePanels).not.toHaveBeenCalled();
  });

  it('are read separately only when the catalogue came without them', async () => {
    ctx.panels = null;
    const { container } = render(<MemoryRouter><BrandShowcase /></MemoryRouter>);
    await waitFor(() => expect(ids(container).length).toBeGreaterThan(0));
    expect(listLivePanels).toHaveBeenCalledTimes(1);
  });

  it('use a real product photo, never a bundled stock picture, as artwork', () => {
    const phones: Product[] = [
      { ...MOCK_PHONES[0], id: 'no-photo', brand: 'Google', model: 'Pixel 6a', imageUrl: '', stock: 2 },
      { ...MOCK_PHONES[0], id: 'with-photo', brand: 'Google', model: 'Pixel 8 Pro', imageUrl: 'https://res.cloudinary.com/x/image/upload/v1/pixel-8-pro.png', stock: 2 },
    ];
    ctx.products = phones;
    ctx.panels = [{ ...BUILT_IN_PANELS[0], id: 'pixel', brand: 'Google', include: ['Pixel'], exclude: [], heroImage: '/assets/iphone-17-pro-max-trio.jpg' }];
    const { container } = render(<MemoryRouter><BrandShowcase /></MemoryRouter>);
    const art = container.querySelector('section[data-panel-id="pixel"] img');
    expect(art?.getAttribute('src') ?? '').toContain('pixel-8-pro');
    expect(container.innerHTML).not.toContain('iphone-17-pro-max-trio');
  });
});

describe('livePanelsFrom', () => {
  it('keeps active rows with a headline, in order', () => {
    const out = livePanelsFrom([
      { id: 'b', active: true, headline: 'B', order: 2 },
      { id: 'a', active: true, headline: 'A', order: 1 },
      { id: 'off', active: false, headline: 'Off', order: 0 },
      { id: 'blank', active: true, headline: '', order: 0 },
    ]);
    expect(out.map(p => p.id)).toEqual(['a', 'b']);
  });

  it('falls back to the built-ins when nothing usable is stored', () => {
    expect(livePanelsFrom([])).toBe(BUILT_IN_PANELS);
    expect(livePanelsFrom('nonsense')).toBe(BUILT_IN_PANELS);
  });
});
