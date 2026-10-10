import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BrandShowcase from '../../components/BrandShowcase';
import type { SeriesPanel } from '../../lib/seriesPanels';

vi.mock('../../context/CatalogueContext', async () => {
  const { MOCK_PHONES: products } = await import('../../test/fixtures/mockPhones');
  return { useCatalogue: () => ({ products, isLoading: false, fromSupabase: true }) };
});
vi.mock('../../components/ProductCard', () => ({ default: () => null }));

// Staff put the Pixel row first: the opposite of the built-in order.
let resolveLive: (p: SeriesPanel[]) => void = () => {};
vi.mock('../../lib/seriesPanels', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/seriesPanels')>();
  return {
    ...actual,
    listLivePanels: () => new Promise<SeriesPanel[]>(r => { resolveLive = r; }),
  };
});

const { BUILT_IN_PANELS } = await vi.importActual<typeof import('../../lib/seriesPanels')>('../../lib/seriesPanels');
const stored = [...BUILT_IN_PANELS].reverse();
const ids = (c: HTMLElement) => [...c.querySelectorAll('section[data-panel-id]')].map(s => s.getAttribute('data-panel-id'));

describe('home page rows on first paint', () => {
  beforeEach(() => window.localStorage.clear());

  it('never shows the built-in order before the stored one arrives', async () => {
    const { container } = render(<MemoryRouter><BrandShowcase /></MemoryRouter>);
    expect(ids(container)).toEqual([]);
    resolveLive(stored);
    await waitFor(() => expect(ids(container).length).toBeGreaterThan(0));
    expect(ids(container)[0]).toBe(stored.find(p => ids(container).includes(p.id))!.id);
    expect(ids(container)).not.toEqual(BUILT_IN_PANELS.map(p => p.id).filter(id => ids(container).includes(id)));
  });

  it('a returning visitor sees the stored order straight away', async () => {
    window.localStorage.setItem('lehart.homePanels.v1', JSON.stringify(stored.map(p => ({ ...p, active: true }))));
    const { container } = render(<MemoryRouter><BrandShowcase /></MemoryRouter>);
    const first = ids(container);
    expect(first.length).toBeGreaterThan(0);
    resolveLive(stored);
    await waitFor(() => expect(ids(container)).toEqual(first));
  });
});
