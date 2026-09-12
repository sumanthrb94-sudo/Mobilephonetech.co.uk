import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
const markDispatched = vi.fn(async () => {});

vi.mock('../../lib/orders', async (orig) => {
  const actual = await orig<typeof import('../../lib/orders')>();
  return {
    ...actual,
    listOrders: () => listOrders(),
    refundOrder: (...a: unknown[]) => refundOrder(...(a as [])),
    markDispatched: (...a: unknown[]) => markDispatched(...(a as [])),
    markOutForDelivery: vi.fn(async () => {}),
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

    await userEvent.click(screen.getByRole('button', { name: /Open/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Refund & restock/ }));

    // Asked, not done.
    expect(refundOrder).not.toHaveBeenCalled();
    expect(screen.getByText(/Refund £654\.00 and put the stock back\?/)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /Yes, refund/ }));
    await waitFor(() => expect(refundOrder).toHaveBeenCalledWith('ORD-1001'));
  });

  it('sends the courier and tracking number with a dispatch', async () => {
    render(<OrdersPage />);
    await screen.findByText('ORD-1001');

    await userEvent.click(screen.getByRole('button', { name: /Open/ }));
    await userEvent.type(await screen.findByLabelText('Courier'), 'Royal Mail');
    await userEvent.type(screen.getByLabelText('Tracking'), 'AB123456789GB');
    await userEvent.click(screen.getByRole('button', { name: /Mark dispatched/ }));

    await waitFor(() => expect(markDispatched).toHaveBeenCalledWith('ORD-1001', {
      courier: 'Royal Mail', trackingNumber: 'AB123456789GB',
    }));
  });

  it('offers no money actions on an order already refunded', async () => {
    render(<OrdersPage />);
    await screen.findByText('ORD-1001');
    await userEvent.click(screen.getByRole('tab', { name: /Refunded/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Open/ }));

    expect(screen.queryByRole('button', { name: /Refund & restock/ })).toBeNull();
    expect(screen.getByText(/Refunded £199\.00/)).toBeTruthy();
  });
});
