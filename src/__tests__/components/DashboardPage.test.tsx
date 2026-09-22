import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../../components/admin/DashboardPage';
import type { DashboardStats } from '../../lib/adminApi';
import type { StaffRole } from '../../lib/adminRoles';

/**
 * The Operations Hub is the first screen anyone sees, and the only one they
 * read without being sent there by a job. That makes its failure mode quiet:
 * every panel here can draw something plausible out of nothing. The three
 * properties pinned below are the three ways it can lie — an unread panel that
 * looks calm, an unread figure that looks like zero, and the takings in front
 * of an account that should not have them.
 */

const loadDashboardStats = vi.fn();

vi.mock('../../lib/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/adminApi')>();
  return { ...actual, loadDashboardStats: () => loadDashboardStats() };
});

// The role under test, swapped per case. The capability check itself is the
// real one from adminRoles — a test that mocked `can` would pass against a
// policy table that had been changed underneath it.
const signedIn = vi.hoisted(() => ({ role: 'admin' as StaffRole }));

vi.mock('../../hooks/useAdmin', async () => {
  const { can } = await vi.importActual<typeof import('../../lib/adminRoles')>('../../lib/adminRoles');
  return {
    useAdmin: () => ({
      isAdmin: signedIn.role === 'admin',
      role: signedIn.role,
      isStaff: signedIn.role !== 'none',
      can: (capability: Parameters<typeof can>[1]) => can(signedIn.role, capability),
      isLoading: false,
    }),
  };
});

function stats(over: Partial<DashboardStats> = {}): DashboardStats {
  return {
    skuCount: 12,
    unitsInStock: 340,
    stockValue: 51200,
    outOfStock: 1,
    lowStock: 2,
    byBrand: [{ brand: 'Apple', units: 200, value: 30000 }],
    needsAttention: [],
    orderCount: 8,
    orderRevenue: 4210,
    recentOrders: [],
    ordersUnavailable: false,
    catalogueTruncated: false,
    ...over,
  };
}

const renderHub = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>);
const kpis = () => screen.getByRole('region', { name: 'Inventory summary' });

beforeEach(() => {
  vi.clearAllMocks();
  signedIn.role = 'admin';
  loadDashboardStats.mockResolvedValue(stats());
});

describe('DashboardPage', () => {
  /**
   * The finding from the InventoryManager simulation, in full: with ~1,900
   * units spread evenly across ~28 buckets nothing ever ran dry, so the
   * restock panel sat on screen with nothing in it and the check on it passed
   * without a line ever being read. An empty panel and a broken one have to
   * say different things, or a console that has stopped working looks exactly
   * like a shop with nothing to do.
   */
  it('reads differently when a panel is empty than when it could not be loaded', async () => {
    const quiet = renderHub();
    expect(await screen.findByText(/Everything is comfortably in stock/)).toBeTruthy();
    expect(screen.queryByText('Could not load')).toBeNull();
    quiet.unmount();

    loadDashboardStats.mockRejectedValue(new Error('Missing or insufficient permissions.'));
    renderHub();

    // Every panel says so itself. The page-level alert scrolls away, and a
    // panel that stays quiet under it still looks like a panel that passed.
    expect(await screen.findAllByText('Could not load')).toHaveLength(3);
    expect(screen.queryByText(/Everything is comfortably in stock/)).toBeNull();
    expect(screen.queryByText(/No orders yet/)).toBeNull();
  });

  /**
   * "If a cost has not been entered yet the ledger says Awaiting rather than
   * showing zero — an un-invoiced repair is not a free repair." A failed read
   * of the catalogue drawn as "0 products" says the shop has nothing listed,
   * which is the one thing the page cannot know.
   */
  it('prints Awaiting for a figure it could not read, never zero', async () => {
    loadDashboardStats.mockRejectedValue(new Error('Missing or insufficient permissions.'));
    renderHub();

    await screen.findAllByText('Awaiting');
    expect(within(kpis()).getAllByText('Awaiting')).toHaveLength(6);
    expect(within(kpis()).queryByText('0')).toBeNull();
  });

  /**
   * The other half of the same rule, and the half that makes it worth having:
   * a shop that genuinely has nothing must still be allowed to say zero.
   * "Awaiting" everywhere would be as useless as zero everywhere.
   */
  it('still prints a measured zero as zero', async () => {
    loadDashboardStats.mockResolvedValue(stats({
      skuCount: 0, unitsInStock: 0, stockValue: 0, outOfStock: 0, lowStock: 0,
      byBrand: [], orderCount: 0, orderRevenue: 0,
    }));
    renderHub();

    expect(await screen.findByText('No stock recorded yet.')).toBeTruthy();
    expect(within(kpis()).getAllByText('0')).toHaveLength(4);
    expect(within(kpis()).queryByText('Awaiting')).toBeNull();
  });

  /**
   * The order book is a separate read and fails on its own. When it does, the
   * catalogue figures beside it are still true and must keep their numbers —
   * blanking the whole page for one failed read is its own sort of lie.
   */
  it('marks only the figures the failed read covered', async () => {
    loadDashboardStats.mockResolvedValue(stats({ ordersUnavailable: true }));
    renderHub();

    expect(await screen.findByText('12')).toBeTruthy();
    expect(within(kpis()).getAllByText('Awaiting')).toHaveLength(2);
    expect(screen.getAllByText('Could not load')).toHaveLength(1);
  });

  /**
   * Staff run the shop floor; the takings are a manager's business. The tile
   * is omitted rather than blanked — an empty box where the money goes is an
   * invitation to ask who hid it.
   */
  describe('takings', () => {
    it('are shown to a manager', async () => {
      signedIn.role = 'admin';
      renderHub();

      expect(await screen.findByText('Takings')).toBeTruthy();
      expect(screen.getByText('£4,210')).toBeTruthy();
    });

    it('are not shown to a staff account, and leave no empty box behind', async () => {
      signedIn.role = 'staff';
      renderHub();

      // The operational panels are all still there for them.
      expect(await screen.findByText('Stock by brand')).toBeTruthy();
      expect(screen.getByText('Recent orders')).toBeTruthy();
      expect(screen.getByText('8')).toBeTruthy();

      expect(screen.queryByText('Takings')).toBeNull();
      expect(screen.queryByText('£4,210')).toBeNull();
    });
  });

  /**
   * A title says what the data is; the question says what you are meant to do
   * about it, which is the part a new member of staff does not know.
   */
  it('titles every panel with the question it answers', async () => {
    renderHub();
    await screen.findByText('Stock by brand');

    expect(screen.getByText(/Which brands are you actually holding/)).toBeTruthy();
    expect(screen.getByText(/What do you need to buy/)).toBeTruthy();
    expect(screen.getByText(/What has just come in/)).toBeTruthy();
  });
});

/**
 * A catalogue bigger than one read can carry.
 *
 * Found by opening this page against twelve hundred products: it reported
 * "1000 listed SKUs" with total conviction, and the out-of-stock and
 * low-stock counts beneath it were drawn from the same truncated slice.
 *
 * This is the "Awaiting rather than zero" rule applied to a count. A figure
 * that is quietly wrong is worse than one that admits what it cannot see,
 * because nothing on screen invites you to doubt it.
 */
describe('DashboardPage — a catalogue past the read cap', () => {
  it('says the figures describe part of the catalogue', async () => {
    loadDashboardStats.mockResolvedValue(stats({ catalogueTruncated: true, skuCount: 1000 }));
    renderHub();

    expect(await screen.findByText(/describes the first/i)).toBeTruthy();
    expect(within(kpis()).getByText(/listed SKUs — partial/i)).toBeTruthy();
  });

  it('says nothing of the sort for a catalogue that fits', async () => {
    loadDashboardStats.mockResolvedValue(stats({ catalogueTruncated: false }));
    renderHub();

    await screen.findByText('12');
    expect(screen.queryByText(/describes the first/i)).toBeNull();
    expect(within(kpis()).getByText(/^listed SKUs$/i)).toBeTruthy();
  });

  /**
   * A failed read has no opinion on the size of the catalogue. Marking its
   * blanks "partial" as well would offer two different explanations for the
   * same absence, and the reader would have to guess which applied.
   */
  it('does not call a failed read partial', async () => {
    loadDashboardStats.mockRejectedValue(new Error('firestore unreachable'));
    renderHub();

    await screen.findAllByText(/awaiting/i);
    expect(screen.queryByText(/describes the first/i)).toBeNull();
  });
});
