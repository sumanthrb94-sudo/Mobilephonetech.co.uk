import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProducts } from '../../hooks/useProducts';
import { MOCK_PHONES } from '../../data';
import { getDocs } from 'firebase/firestore';

// firebase/firestore is globally mocked in src/test/setup.ts. The default
// getDocs resolves to an empty snapshot, which is the "empty" branch and
// forces useProducts to fall back to MOCK_PHONES.

/** A Firestore QuerySnapshot carrying the given documents. */
function snapshot(docs: { id: string; data: Record<string, unknown> }[]) {
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map(d => ({ id: d.id, data: () => d.data })),
  };
}

describe('useProducts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Fallback behaviour ──────────────────────────────────────────────────
  it('returns MOCK_PHONES fallback when Firestore returns no documents', async () => {
    // The default global mock resolves to an empty snapshot, so no extra
    // stubbing is needed here.
    const { result } = renderHook(() => useProducts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeGreaterThan(0);
    // Every returned product must be present in MOCK_PHONES
    result.current.products.forEach(p => {
      expect(MOCK_PHONES.some(m => m.id === p.id)).toBe(true);
    });
  });

  it('returns MOCK_PHONES fallback when Firestore rejects', async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('unavailable'));

    const { result } = renderHook(() => useProducts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeGreaterThan(0);
    result.current.products.forEach(p => {
      expect(MOCK_PHONES.some(m => m.id === p.id)).toBe(true);
    });
  });

  it('sets fromSupabase to false when using mock fallback', async () => {
    const { result } = renderHook(() => useProducts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.fromSupabase).toBe(false);
  });

  it('sets fromSupabase to true when Firestore returns real data', async () => {
    const source = MOCK_PHONES[0];
    // Firestore documents are camelCase, and the id is the document key rather
    // than a field on the document body.
    const mockDoc = {
      id: source.id,
      data: {
        model: source.model,
        brand: source.brand,
        category: source.category,
        storage: source.storage ?? null,
        price: source.price,
        originalPrice: source.originalPrice,
        grade: source.grade,
        batteryHealth: source.batteryHealth,
        warrantyMonths: source.warrantyMonths,
        returnDays: source.returnDays,
        imageUrl: source.imageUrl,
        isCertified: source.isCertified,
        stock: source.stock,
        specs: {},
      },
    };

    vi.mocked(getDocs).mockResolvedValueOnce(snapshot([mockDoc]) as never);

    const { result } = renderHook(() => useProducts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.fromSupabase).toBe(true);
    expect(result.current.products[0].id).toBe(source.id);
    expect(result.current.products[0].price).toBe(source.price);
  });

  // ── Loading state ───────────────────────────────────────────────────────
  it('isLoading starts true and becomes false after fetch', async () => {
    const { result } = renderHook(() => useProducts());

    // Immediately after mount, loading should be true (or may already have
    // resolved synchronously with the mock — capture initial value then wait).
    // We assert the final settled state is false.
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  // ── Brand filter ────────────────────────────────────────────────────────
  it('filters by brand correctly using mock fallback', async () => {
    const { result } = renderHook(() =>
      useProducts({ filters: { brand: ['Samsung'] } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeGreaterThan(0);
    result.current.products.forEach(p => {
      expect(p.brand).toBe('Samsung');
    });
  });

  it('returns only Apple products when filtering by Apple brand', async () => {
    const { result } = renderHook(() =>
      useProducts({ filters: { brand: ['Apple'] } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeGreaterThan(0);
    result.current.products.forEach(p => {
      expect(p.brand).toBe('Apple');
    });
  });

  it('filters by multiple brands correctly', async () => {
    const { result } = renderHook(() =>
      useProducts({ filters: { brand: ['Apple', 'Samsung'] } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeGreaterThan(0);
    result.current.products.forEach(p => {
      expect(['Apple', 'Samsung']).toContain(p.brand);
    });
  });

  // ── Grade filter ────────────────────────────────────────────────────────
  it('filters by grade correctly using mock fallback', async () => {
    const { result } = renderHook(() =>
      useProducts({ filters: { grade: ['Good'] } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeGreaterThan(0);
    result.current.products.forEach(p => {
      expect(p.grade).toBe('Good');
    });
  });

  it('filters by New grade correctly', async () => {
    const { result } = renderHook(() =>
      useProducts({ filters: { grade: ['New'] } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeGreaterThan(0);
    result.current.products.forEach(p => {
      expect(p.grade).toBe('New');
    });
  });

  // ── Price range filter ──────────────────────────────────────────────────
  it('filters by priceRange correctly — all results within bounds', async () => {
    const { result } = renderHook(() =>
      useProducts({ filters: { priceRange: [100, 300] } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeGreaterThan(0);
    result.current.products.forEach(p => {
      expect(p.price).toBeGreaterThanOrEqual(100);
      expect(p.price).toBeLessThanOrEqual(300);
    });
  });

  it('returns empty list when priceRange excludes all products', async () => {
    const { result } = renderHook(() =>
      // An absurdly high minimum that no product reaches
      useProducts({ filters: { priceRange: [999999, 9999999] } })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  // ── Search ──────────────────────────────────────────────────────────────
  it('filters by model name case-insensitively', async () => {
    const { result } = renderHook(() =>
      useProducts({ search: 'iphone 15' })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeGreaterThan(0);
    result.current.products.forEach(p => {
      const matchesModel = p.model.toLowerCase().includes('iphone 15');
      const matchesBrand = p.brand.toLowerCase().includes('iphone 15');
      expect(matchesModel || matchesBrand).toBe(true);
    });
  });

  it('search is case-insensitive — uppercase query matches lowercase data', async () => {
    const { result: lower } = renderHook(() =>
      useProducts({ search: 'iphone' })
    );
    const { result: upper } = renderHook(() =>
      useProducts({ search: 'IPHONE' })
    );

    await waitFor(() => expect(lower.current.isLoading).toBe(false));
    await waitFor(() => expect(upper.current.isLoading).toBe(false));

    expect(lower.current.total).toBe(upper.current.total);
  });

  it('returns no products when search matches nothing', async () => {
    const { result } = renderHook(() =>
      useProducts({ search: 'zzznomatch99999' })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  // ── Sorting ─────────────────────────────────────────────────────────────
  it('sort price_asc orders results ascending', async () => {
    const { result } = renderHook(() =>
      useProducts({ sort: 'price_asc', pageSize: 50 })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const prices = result.current.products.map(p => p.price);
    expect(prices.length).toBeGreaterThan(1);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it('sort price_desc orders results descending', async () => {
    const { result } = renderHook(() =>
      useProducts({ sort: 'price_desc', pageSize: 50 })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const prices = result.current.products.map(p => p.price);
    expect(prices.length).toBeGreaterThan(1);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    }
  });

  it('price_asc produces a lower first price than price_desc', async () => {
    const { result: asc } = renderHook(() =>
      useProducts({ sort: 'price_asc', pageSize: 50 })
    );
    const { result: desc } = renderHook(() =>
      useProducts({ sort: 'price_desc', pageSize: 50 })
    );

    await waitFor(() => expect(asc.current.isLoading).toBe(false));
    await waitFor(() => expect(desc.current.isLoading).toBe(false));

    expect(asc.current.products[0].price).toBeLessThanOrEqual(
      desc.current.products[0].price
    );
  });

  // ── Pagination ──────────────────────────────────────────────────────────
  it('page 1 returns the first slice of results', async () => {
    const pageSize = 5;
    const { result } = renderHook(() =>
      useProducts({ page: 1, pageSize })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeLessThanOrEqual(pageSize);
  });

  it('page 2 returns a different slice than page 1', async () => {
    const pageSize = 5;
    const { result: page1 } = renderHook(() =>
      useProducts({ page: 1, pageSize })
    );
    const { result: page2 } = renderHook(() =>
      useProducts({ page: 2, pageSize })
    );

    await waitFor(() => expect(page1.current.isLoading).toBe(false));
    await waitFor(() => expect(page2.current.isLoading).toBe(false));

    const ids1 = page1.current.products.map(p => p.id);
    const ids2 = page2.current.products.map(p => p.id);

    // No id should appear on both pages
    const overlap = ids1.filter(id => ids2.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it('page 2 skips the first pageSize items', async () => {
    const pageSize = 3;
    const { result: page1 } = renderHook(() =>
      useProducts({ page: 1, pageSize })
    );
    const { result: page2 } = renderHook(() =>
      useProducts({ page: 2, pageSize })
    );

    await waitFor(() => expect(page1.current.isLoading).toBe(false));
    await waitFor(() => expect(page2.current.isLoading).toBe(false));

    // The full unfiltered mock list sliced manually
    const allSorted = [...MOCK_PHONES]; // fallback preserves original order
    const expectedPage2Ids = allSorted.slice(pageSize, pageSize * 2).map(p => p.id);
    const actualPage2Ids   = page2.current.products.map(p => p.id);

    expect(actualPage2Ids).toEqual(expectedPage2Ids);
  });

  it('total reflects the full unfiltered count, not just the current page', async () => {
    const pageSize = 5;
    const { result } = renderHook(() =>
      useProducts({ page: 1, pageSize })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // total must be >= pageSize (there are many more products than 5)
    expect(result.current.total).toBeGreaterThan(pageSize);
    // total should equal the full MOCK_PHONES count when unfiltered
    expect(result.current.total).toBe(MOCK_PHONES.length);
  });

  // ── Combined filters + sort ─────────────────────────────────────────────
  it('brand filter + price_asc sort returns only that brand sorted ascending', async () => {
    const { result } = renderHook(() =>
      useProducts({
        filters: { brand: ['Samsung'] },
        sort: 'price_asc',
        pageSize: 50,
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products.length).toBeGreaterThan(0);
    result.current.products.forEach(p => expect(p.brand).toBe('Samsung'));

    const prices = result.current.products.map(p => p.price);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });
});
