import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrdersPage from '../../components/admin/OrdersPage';
import type { AdminOrder } from '../../lib/orders';

/**
 * The staff screen for running the shop. The property worth pinning hardest is
 * the refund: it moves real money out and cannot be undone from this page, so
 * a single misplaced click must never trigger one.
 */

const listOrders = vi.fn();
const refundOrder = vi.fn(async () => {});
const advanceOrder = vi.fn(async () => {});

vi.mock('../../lib/orders', async (orig) => {
  const actual = await orig<typeof import('../../lib/orders')>();
  return {
    ...actual,
    listOrders: () => listOrders(),
    refundOrder: (...a: unknown[]) => refundOrder(...(a as [])),
    advanceOrder: (...a: unknown[]) => advanceOrder(...(a as [])),
    resendConfirmation: vi.fn(async () => {}),
  };
});

const paid: AdminOrder = {
  id: 'ORD-1001', status: 'pending', total: 654, currency: 'GBP',
  createdAt: '2026-09-11T08:12:44.000Z', contactEmail: 'ram@example.com',
  customer: 'Alex Morgan', address: ['221B Baker Street', 'London', 'NW1 6XE'],
  items: [{ name: 'Samsung Galaxy S24', quantity: 1, price: 275 }],
};
const done: AdminOrder = {
  ...paid, id: 'ORD-1002', status: 'refunded', total: 199,
  refundedAt: '2026-09-12T09:00:00.000Z', refundedAmount: 199,
};

beforeEach(() => {
  vi.clearAllMocks();
  listOrders.mockResolvedValue([paid, done]);
});

describe('OrdersPage', () => {
  it('shows orders waiting to be packed', async () => {
    render(<OrdersPage />);
    expect(await screen.findByText('ORD-1001')).toBeTruthy();
    expect(screen.getByText('£654.00')).toBeTruthy();
    // The refunded one is not in the default "To pack" view.
    expect(screen.queryByText('ORD-1002')).toBeNull();
  });

  it('filters to refunded orders', async () => {
    render(<OrdersPage />);
    await screen.findByText('ORD-1001');

    await userEvent.click(screen.getByRole('tab', { name: /Refunded/ }));

    expect(await screen.findByText('ORD-1002')).toBeTruthy();
    expect(screen.queryByText('ORD-1001')).toBeNull();
  });

  it('never refunds on a single click — it asks first', async () => {
    render(<OrdersPage />);
    await screen.findByText('ORD-1001');

    await userEvent.click(screen.getByRole('button', { name: /ORD-1001/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Refund & restock/ }));

    // Asked, not done.
    expect(refundOrder).not.toHaveBeenCalled();
    const confirm = screen.getByRole('group', { name: 'Confirm refund' });
    expect(within(confirm).getByText('£654.00')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /Yes, refund/ }));
    await waitFor(() => expect(refundOrder).toHaveBeenCalledWith('ORD-1001'));
  });

  it('sends the courier and tracking number with a dispatch', async () => {
    render(<OrdersPage />);
    await screen.findByText('ORD-1001');

    await userEvent.click(screen.getByRole('button', { name: /ORD-1001/ }));
    await userEvent.type(await screen.findByLabelText('Courier'), 'Royal Mail');
    await userEvent.type(screen.getByLabelText('Tracking number'), 'AB123456789GB');
    await userEvent.click(screen.getByRole('button', { name: /Mark dispatched/ }));

    await waitFor(() => expect(advanceOrder).toHaveBeenCalledWith(
      'ORD-1001',
      expect.objectContaining({ kind: 'dispatched' }),
      { courier: 'Royal Mail', trackingNumber: 'AB123456789GB' },
    ));
  });

  /**
   * The defect that shipped: every action was offered at every stage, so an
   * order already out for delivery still showed "Mark dispatched". Picking it
   * emailed the customer that a parcel already on the van was on its way.
   *
   * One case per stage, because a single example would have passed against
   * the broken screen too — it showed everything, so it showed the right
   * thing as well.
   */
  describe('offers only the move the order is actually waiting for', () => {
    const cases: Array<[string, string, string[]]> = [
      ['pending',          'Mark dispatched',       ['Mark out for delivery', 'Mark delivered']],
      ['dispatched',       'Mark out for delivery', ['Mark dispatched', 'Mark delivered']],
      ['out-for-delivery', 'Mark delivered',        ['Mark dispatched', 'Mark out for delivery']],
    ];

    /** The default tab is "To pack", which by definition excludes anything
     *  already moving — so these open on All. */
    const openOrder = async () => {
      await userEvent.click(await screen.findByRole('tab', { name: /All/ }));
      await userEvent.click(await screen.findByRole('button', { name: /ORD-1001/ }));
    };

    it.each(cases)('at %s', async (status, expected, forbidden) => {
      listOrders.mockResolvedValue([{ ...paid, status }]);
      render(<OrdersPage />);
      await openOrder();

      expect(await screen.findByRole('button', { name: new RegExp(`^${expected}$`, 'i') })).toBeTruthy();
      for (const gone of forbidden) {
        expect(screen.queryByRole('button', { name: new RegExp(`^${gone}$`, 'i') })).toBeNull();
      }
    });

    it('offers nothing further once delivered', async () => {
      listOrders.mockResolvedValue([{ ...paid, status: 'delivered' }]);
      render(<OrdersPage />);
      await openOrder();

      expect(screen.queryByRole('button', { name: /mark (dispatched|out for delivery|delivered)/i })).toBeNull();
      // But a refund is still possible — a delivered order can still come back.
      expect(await screen.findByRole('button', { name: /Refund & restock/ })).toBeTruthy();
    });

    it('asks for tracking only while there is a movement to record', async () => {
      listOrders.mockResolvedValue([{ ...paid, status: 'out-for-delivery' }]);
      render(<OrdersPage />);
      await openOrder();

      await screen.findByRole('button', { name: /Mark delivered/i });
      expect(screen.queryByLabelText('Tracking number')).toBeNull();
    });

    it('shows how far along the order is', async () => {
      listOrders.mockResolvedValue([{ ...paid, status: 'dispatched' }]);
      render(<OrdersPage />);
      await openOrder();

      const steps = await screen.findByRole('list', { name: 'Order progress' });
      const items = within(steps).getAllByRole('listitem');
      expect(items.map(li => li.dataset.state)).toEqual(['done', 'now', 'todo', 'todo']);
    });
  });

  it('offers no money actions on an order already refunded', async () => {
    render(<OrdersPage />);
    await screen.findByText('ORD-1001');
    await userEvent.click(screen.getByRole('tab', { name: /Refunded/ }));
    await userEvent.click(await screen.findByRole('button', { name: /ORD-1002/ }));

    expect(screen.queryByRole('button', { name: /Refund & restock/ })).toBeNull();
    expect(screen.getByText(/Refunded £199\.00/)).toBeTruthy();
  });

  /**
   * Bulk move — dispatched -> out for delivery, or out for delivery ->
   * delivered. Deliberately not offered for the very first move: that one
   * needs a distinct tracking number typed per parcel, which bulk selection
   * cannot honestly shortcut.
   */
  describe('bulk move', () => {
    const dispatched1: AdminOrder = {
      ...paid, id: 'ORD-2001', status: 'dispatched',
      courier: 'Royal Mail', trackingNumber: 'RM111',
    };
    const dispatched2: AdminOrder = {
      ...paid, id: 'ORD-2002', status: 'dispatched',
      courier: 'DPD', trackingNumber: 'DPD222',
    };
    const outForDelivery1: AdminOrder = {
      ...paid, id: 'ORD-2003', status: 'out-for-delivery',
      courier: 'Evri', trackingNumber: 'EV333',
    };

    it('offers no checkbox on an order still waiting to be packed', async () => {
      listOrders.mockResolvedValue([paid]);
      render(<OrdersPage />);
      await screen.findByText('ORD-1001');

      expect(screen.queryByRole('checkbox')).toBeNull();
    });

    it('selects a whole group in one click, and Clear empties it again', async () => {
      listOrders.mockResolvedValue([dispatched1, dispatched2]);
      render(<OrdersPage />);
      await userEvent.click(await screen.findByRole('tab', { name: /All/ }));

      const selectAll = await screen.findByRole('button', { name: /Select all in transit \(2\)/ });
      await userEvent.click(selectAll);
      expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(2);
      expect(screen.getByText('2 selected')).toBeTruthy();

      await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
      expect(screen.queryByText('2 selected')).toBeNull();
      expect(screen.queryAllByRole('checkbox', { checked: true })).toHaveLength(0);
    });

    it('moves every selected order, carrying forward its own saved courier and tracking', async () => {
      listOrders.mockResolvedValue([dispatched1, dispatched2]);
      render(<OrdersPage />);
      await userEvent.click(await screen.findByRole('tab', { name: /All/ }));
      await userEvent.click(await screen.findByRole('button', { name: /Select all in transit \(2\)/ }));

      await userEvent.click(screen.getByRole('button', { name: /Mark 2 out for delivery/ }));

      await waitFor(() => expect(advanceOrder).toHaveBeenCalledTimes(2));
      expect(advanceOrder).toHaveBeenCalledWith(
        'ORD-2001', expect.objectContaining({ kind: 'out-for-delivery' }),
        { courier: 'Royal Mail', trackingNumber: 'RM111' },
      );
      expect(advanceOrder).toHaveBeenCalledWith(
        'ORD-2002', expect.objectContaining({ kind: 'out-for-delivery' }),
        { courier: 'DPD', trackingNumber: 'DPD222' },
      );
      expect(await screen.findByText(/2 orders marked out for delivery/)).toBeTruthy();
    });

    it('refuses to guess when the selection spans two different stages', async () => {
      listOrders.mockResolvedValue([dispatched1, outForDelivery1]);
      render(<OrdersPage />);
      await userEvent.click(await screen.findByRole('tab', { name: /All/ }));

      const boxes = await screen.findAllByRole('checkbox');
      await userEvent.click(boxes[0]);
      await userEvent.click(boxes[1]);

      expect(screen.getByText('2 selected')).toBeTruthy();
      expect(screen.queryByRole('button', { name: /Mark 2/ })).toBeNull();
      expect(screen.getByText(/Select orders at the same stage/)).toBeTruthy();
      expect(advanceOrder).not.toHaveBeenCalled();
    });

    it('shows the tracking number already on file, not a blank box, at the next move', async () => {
      listOrders.mockResolvedValue([dispatched1]);
      render(<OrdersPage />);
      await userEvent.click(await screen.findByRole('tab', { name: /All/ }));
      await userEvent.click(await screen.findByRole('button', { name: /ORD-2001/ }));

      expect(await screen.findByLabelText('Courier')).toHaveValue('Royal Mail');
      expect(screen.getByLabelText('Tracking number')).toHaveValue('RM111');
    });
  });
});
