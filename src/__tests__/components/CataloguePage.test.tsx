import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CataloguePage from '../../components/admin/CataloguePage';
import type { CatalogueModel, ModelRequest } from '../../lib/catalogue';
import type { Product } from '../../types';

/**
 * The Catalogue page is where a member of staff's blocked listing gets
 * unblocked. Staff cannot type a model any more, so a request that sits here
 * unseen, or is approved with the wrong spelling, or is declined with no
 * reason, is a phone on the shop floor that cannot be sold. The properties
 * pinned below are the ways this page could quietly fail those people.
 *
 * Only the reads and writes are mocked. modelNameProblem, planImport and the
 * other pure helpers are the real ones, so if what the catalogue refuses
 * changes, these tests change with it rather than agreeing with a copy.
 */

const api = vi.hoisted(() => ({
  listCatalogueModels: vi.fn(),
  listModelRequests: vi.fn(),
  addCatalogueModel: vi.fn(),
  retireCatalogueModel: vi.fn(),
  restoreCatalogueModel: vi.fn(),
  approveModelRequest: vi.fn(),
  declineModelRequest: vi.fn(),
  applyImport: vi.fn(),
  listInventory: vi.fn(),
}));

vi.mock('../../lib/catalogue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/catalogue')>();
  return {
    ...actual,
    listCatalogueModels: (...a: unknown[]) => api.listCatalogueModels(...a),
    listModelRequests: (...a: unknown[]) => api.listModelRequests(...a),
    addCatalogueModel: (...a: unknown[]) => api.addCatalogueModel(...a),
    retireCatalogueModel: (...a: unknown[]) => api.retireCatalogueModel(...a),
    restoreCatalogueModel: (...a: unknown[]) => api.restoreCatalogueModel(...a),
    approveModelRequest: (...a: unknown[]) => api.approveModelRequest(...a),
    declineModelRequest: (...a: unknown[]) => api.declineModelRequest(...a),
    applyImport: (...a: unknown[]) => api.applyImport(...a),
  };
});

vi.mock('../../lib/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/adminApi')>();
  return { ...actual, listInventory: (...a: unknown[]) => api.listInventory(...a) };
});

const IPHONE_8: CatalogueModel = { id: 'apple__iphone-8', brand: 'Apple', model: 'iPhone 8' };
const GALAXY: CatalogueModel = { id: 'samsung__galaxy-s23', brand: 'Samsung', model: 'Galaxy S23' };

function request(over: Partial<ModelRequest> = {}): ModelRequest {
  return {
    id: 'req-1',
    brand: 'apple',
    model: 'iphone 17e',
    note: 'Customer trade-in, sealed box',
    status: 'open',
    requestedBy: 'sam@lehart.co.uk',
    requestedAt: '2026-09-22T09:30:00.000Z',
    ...over,
  };
}

function listing(id: string, brand: string, model: string, over: Partial<Product> = {}): Product {
  return {
    id, brand, model,
    category: 'Phones', storage: '64GB', price: 199, originalPrice: 479,
    grade: 'Good', batteryHealth: 88, warrantyMonths: 12, returnDays: 30,
    imageUrl: '/assets/x.jpg', isCertified: true, stock: 2, specs: {},
    ...over,
  } as Product;
}

/** Wire the reads: the open queue and the full history come from one list. */
function given({
  catalogue = [IPHONE_8, GALAXY] as CatalogueModel[],
  requests = [] as ModelRequest[],
  products = [] as Product[],
} = {}) {
  api.listCatalogueModels.mockResolvedValue(catalogue);
  api.listModelRequests.mockImplementation(async (status?: string) =>
    status ? requests.filter(r => r.status === status) : requests);
  api.listInventory.mockResolvedValue({ products, total: products.length, truncated: false });
}

const renderPage = () => render(
  <MemoryRouter initialEntries={['/admin/catalogue']}><CataloguePage /></MemoryRouter>,
);
const region = (name: string) => screen.getByRole('region', { name });
const precedes = (a: HTMLElement, b: HTMLElement) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

beforeEach(() => {
  vi.clearAllMocks();
  given();
  api.approveModelRequest.mockImplementation(async (_r, s: { brand: string; model: string }) =>
    ({ id: 'x', ...s }));
  api.declineModelRequest.mockResolvedValue(undefined);
  api.retireCatalogueModel.mockResolvedValue(undefined);
  api.applyImport.mockImplementation(async (plan: { toAdd: unknown[] }) => plan.toAdd.length);
});

describe('CataloguePage', () => {
  /**
   * A request is a member of staff who cannot finish a listing until a
   * manager answers. The models list is reference; the queue is people
   * waiting. If the queue sat below a few hundred models it would be found
   * the way a note under a pile is found — late.
   */
  it('puts open requests before the models list', async () => {
    given({ requests: [request()] });
    renderPage();

    expect(await screen.findByText('apple iphone 17e')).toBeInTheDocument();
    expect(precedes(region('Requests'), region('Models'))).toBe(true);
    expect(within(region('Requests')).getByText(/Customer trade-in/)).toBeInTheDocument();
    expect(within(region('Requests')).getByText(/sam@lehart.co.uk/)).toBeInTheDocument();
  });

  /**
   * The request is what someone typed at the till; the catalogue is what the
   * shop calls the phone, and every future listing of it copies that
   * spelling. Approving "iphone 17e" as typed would put the typo into the
   * picker for good, so what is sent is what the manager corrected it to.
   */
  it('approves with the manager\'s corrected spelling, not the raw request', async () => {
    const asked = request();
    given({ requests: [asked] });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Approve request for apple iphone 17e' }));
    const form = screen.getByRole('form', { name: 'Approve apple iphone 17e' });
    const brand = within(form).getByLabelText('Brand');
    const model = within(form).getByLabelText('Model');
    expect(brand).toHaveValue('apple');
    expect(model).toHaveValue('iphone 17e');

    await user.clear(brand);
    await user.type(brand, 'Apple');
    await user.clear(model);
    await user.type(model, 'iPhone 17e');
    await user.click(within(form).getByRole('button', { name: 'Add to catalogue and approve' }));

    await waitFor(() => expect(api.approveModelRequest).toHaveBeenCalledTimes(1));
    const [sentRequest, spelling, existing] = api.approveModelRequest.mock.calls[0];
    expect(sentRequest).toEqual(asked);
    expect(spelling).toEqual({ brand: 'Apple', model: 'iPhone 17e' });
    expect(existing).toEqual([IPHONE_8, GALAXY]);
  });

  /**
   * "iPhone 17e 128GB" is a phone no other size of it will ever be grouped
   * with — the orphan the catalogue exists to prevent. The API would refuse
   * it too, but a manager should see why while typing and never get as far
   * as pressing the button.
   */
  it('blocks approval while the corrected model name has a storage size in it', async () => {
    given({ requests: [request({ model: 'iPhone 17e 128GB' })] });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^Approve request for/ }));
    const form = screen.getByRole('form', { name: /^Approve / });

    expect(within(form).getByText(/Storage belongs in the Storage field/)).toBeInTheDocument();
    const submit = within(form).getByRole('button', { name: 'Add to catalogue and approve' });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(api.approveModelRequest).not.toHaveBeenCalled();

    const model = within(form).getByLabelText('Model');
    await user.clear(model);
    await user.type(model, 'iPhone 17e');
    expect(within(form).queryByText(/Storage belongs in the Storage field/)).toBeNull();
    expect(submit).toBeEnabled();
  });

  /**
   * A refusal that only says "no" sends the requester off to ask a colleague
   * what happened, and they still cannot list the phone. The reason is what
   * tells them what to do instead, so the page will not send a decline
   * without one, and says who is going to read it.
   */
  it('will not send a decline without a reason', async () => {
    const asked = request();
    given({ requests: [asked] });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Decline request for apple iphone 17e' }));
    const form = screen.getByRole('form', { name: 'Decline apple iphone 17e' });
    const send = within(form).getByRole('button', { name: 'Send decline' });

    expect(within(form).getByText(/sam@lehart.co.uk will see this/)).toBeInTheDocument();
    expect(send).toBeDisabled();
    await user.type(within(form).getByLabelText('Reason'), '   ');
    expect(send).toBeDisabled();
    await user.click(send);
    expect(api.declineModelRequest).not.toHaveBeenCalled();

    await user.type(within(form).getByLabelText('Reason'), 'We already list it as iPhone 16e — pick that.');
    await user.click(send);
    await waitFor(() => expect(api.declineModelRequest).toHaveBeenCalledTimes(1));
    expect(api.declineModelRequest.mock.calls[0][0]).toEqual(asked);
    expect(api.declineModelRequest.mock.calls[0][1]).toMatch(/pick that/);
  });

  /**
   * With nothing in the catalogue no member of staff can create any listing
   * at all, whatever the queue says. Importing what the shop already sells is
   * the most urgent thing on the page, so it goes first and says why.
   */
  it('puts the import first, with a warning, when the catalogue is empty', async () => {
    given({
      catalogue: [],
      requests: [request()],
      products: [listing('a', 'Apple', 'iPhone 8')],
    });
    renderPage();

    const warning = await screen.findByRole('alert');
    expect(warning).toHaveTextContent(/staff cannot create any listing/i);
    const importPanel = await screen.findByRole('region', { name: 'Import from existing listings' });
    expect(precedes(importPanel, region('Requests'))).toBe(true);
    expect(precedes(warning, importPanel)).toBe(true);
  });

  /**
   * Importing writes models every future listing will be spelt after, and
   * silently leaves out the orphans. The manager has to see both before a
   * single entry exists: which spelling wins where the listings disagree,
   * and which listings were refused and need fixing by hand. Nothing may be
   * written until the button is pressed.
   */
  it('previews spelling conflicts and refused names, and writes nothing until asked', async () => {
    given({
      catalogue: [GALAXY],
      products: [
        listing('p1', 'Apple', 'iPhone 11'),
        listing('p2', 'Apple', 'iPhone 11'),
        listing('p3', 'Apple', 'iphone 11'),
        listing('p4', 'Apple', 'iPhone 8 128GB'),
        listing('p5', 'Google', 'Pixel 7'),
      ],
    });
    const user = userEvent.setup();
    renderPage();

    const panel = await screen.findByRole('region', { name: 'Import from existing listings' });
    expect(within(panel).getByText(/2 models would be added/)).toBeInTheDocument();

    // The spelling on two listings beats the one on a single listing.
    expect(within(panel).getByText('Apple iPhone 11', { selector: 'strong' })).toBeInTheDocument();
    expect(within(panel).getByText('Apple iphone 11', { selector: '.ops-chip' })).toBeInTheDocument();
    expect(within(panel).getByText(/corrected to the winner the next time someone saves them/)).toBeInTheDocument();

    // The orphan is reported with the reason, and a way to the listing.
    expect(within(panel).getByText('Apple iPhone 8 128GB')).toBeInTheDocument();
    expect(within(panel).getByText(/Storage belongs in the Storage field/)).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Edit p4' })).toHaveAttribute('href', '/admin/inventory/p4');

    expect(api.applyImport).not.toHaveBeenCalled();

    await user.click(within(panel).getByRole('button', { name: 'Import 2 models' }));
    await waitFor(() => expect(api.applyImport).toHaveBeenCalledTimes(1));
    const plan = api.applyImport.mock.calls[0][0];
    expect(plan.toAdd.map((e: { model: string }) => e.model).sort()).toEqual(['Pixel 7', 'iPhone 11']);
    expect(plan.refused.map((e: { model: string }) => e.model)).toEqual(['iPhone 8 128GB']);
  });

  /**
   * An empty queue drawn over a failed read tells the manager nobody is
   * waiting while someone on the shop floor is holding a phone they cannot
   * list. The two must never look alike.
   */
  it('reads differently when nobody is waiting than when the queue could not be loaded', async () => {
    const quiet = renderPage();
    expect(await within(region('Requests')).findByText(/Nobody is waiting on you/)).toBeInTheDocument();
    expect(within(region('Requests')).queryByText('Could not load')).toBeNull();
    quiet.unmount();

    api.listModelRequests.mockRejectedValue(new Error('Missing or insufficient permissions.'));
    renderPage();
    expect(await within(region('Requests')).findAllByText('Could not load')).not.toHaveLength(0);
    expect(within(region('Requests')).getByText(/not an empty queue/)).toBeInTheDocument();
    expect(within(region('Requests')).queryByText(/Nobody is waiting on you/)).toBeNull();
  });

  /**
   * "Retire" sounds like it might take phones off sale. It does not — it
   * only stops new listings choosing the model — and a manager who thinks it
   * does will either never use it or use it expecting the wrong thing. So it
   * asks first, says what it does, and warns when live listings use it.
   */
  it('asks before retiring and says existing listings keep the model', async () => {
    given({
      products: [listing('a', 'Apple', 'iPhone 8'), listing('b', 'Apple', 'iPhone 8', { catalogueModelId: IPHONE_8.id })],
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Retire Apple iPhone 8' }));
    expect(api.retireCatalogueModel).not.toHaveBeenCalled();

    const confirm = screen.getByRole('group', { name: 'Confirm retiring Apple iPhone 8' });
    expect(confirm).toHaveTextContent("New listings can't choose it; existing listings keep it.");
    expect(confirm).toHaveTextContent(/2 live listings still use it/);

    await user.click(within(confirm).getByRole('button', { name: 'Yes, retire it' }));
    await waitFor(() => expect(api.retireCatalogueModel).toHaveBeenCalledWith(IPHONE_8.id));
  });
});
