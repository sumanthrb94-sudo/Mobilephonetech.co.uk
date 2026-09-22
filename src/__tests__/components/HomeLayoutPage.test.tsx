import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomeLayoutPage from '../../components/admin/HomeLayoutPage';
import { SECTIONS, defaultLayout, type SectionState } from '../../lib/homeLayout';

/**
 * The admin page that decides the home page's running order.
 *
 * What is worth pinning: the save writes what is on screen, the carousel
 * cannot be switched off from here, and nothing reaches the shop until Save
 * is pressed — staff reordering a list should be able to change their mind
 * without having already published it.
 */

const loadHomeLayout = vi.fn(async (): Promise<SectionState[]> => defaultLayout());
// Typed, so `.mock.calls` carries SectionState[] rather than an empty tuple
// and the assertions below are checked rather than cast.
const saveHomeLayout = vi.fn(async (layout: SectionState[]) => { void layout; });

vi.mock('../../lib/homeLayout', async (orig) => {
  const actual = await orig<typeof import('../../lib/homeLayout')>();
  return {
    ...actual,
    loadHomeLayout: () => loadHomeLayout(),
    saveHomeLayout: (l: SectionState[]) => saveHomeLayout(l),
  };
});

vi.mock('../../lib/adminApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/adminApi')>();
  return { ...actual, describeError: (e: unknown) => (e instanceof Error ? e.message : 'failed') };
});

/** The order ids as the page would save them. */
const lastSaved = (): SectionState[] => {
  const call = saveHomeLayout.mock.calls.at(-1);
  if (!call) throw new Error('saveHomeLayout was never called');
  return call[0];
};
const savedIds = () => lastSaved().map(s => s.id);

beforeEach(() => {
  vi.clearAllMocks();
  loadHomeLayout.mockResolvedValue(defaultLayout());
});

describe('HomeLayoutPage', () => {
  it('lists every section in the shipped order', async () => {
    render(<HomeLayoutPage />);
    const list = await screen.findByRole('list', { name: /Home page sections/i });
    const rows = within(list).getAllByRole('listitem');

    expect(rows).toHaveLength(SECTIONS.length);
    expect(rows[0].textContent).toContain(SECTIONS[0].label);
  });

  it('moves a section down and saves the new order', async () => {
    render(<HomeLayoutPage />);
    await screen.findByRole('list', { name: /Home page sections/i });

    const first = SECTIONS[0];
    await userEvent.click(screen.getByRole('button', { name: `Move ${first.label} down` }));
    await userEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => expect(saveHomeLayout).toHaveBeenCalled());
    expect(savedIds()[1]).toBe(first.id);
  });

  it('switches a section off and saves it as hidden', async () => {
    render(<HomeLayoutPage />);
    await screen.findByRole('list', { name: /Home page sections/i });

    const target = SECTIONS.find(s => !s.locked)!;
    await userEvent.click(screen.getByRole('button', { name: `Switch off ${target.label}` }));
    await userEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => expect(saveHomeLayout).toHaveBeenCalled());
    expect(lastSaved().find(s => s.id === target.id)?.visible).toBe(false);
  });

  /**
   * The carousel is the shop front. The resolver refuses to hide it too, but
   * an admin page offering a control that silently does nothing is its own
   * bug — so the control is disabled rather than merely ineffective.
   */
  it('offers no way to switch off a locked section', async () => {
    render(<HomeLayoutPage />);
    await screen.findByRole('list', { name: /Home page sections/i });

    const locked = SECTIONS.find(s => s.locked)!;
    const toggle = screen.getByRole('button', { name: new RegExp(`Switch off ${locked.label}`, 'i') });
    expect(toggle.hasAttribute('disabled')).toBe(true);
  });

  it('does not save until Save is pressed', async () => {
    render(<HomeLayoutPage />);
    await screen.findByRole('list', { name: /Home page sections/i });

    const target = SECTIONS.find(s => !s.locked)!;
    await userEvent.click(screen.getByRole('button', { name: `Switch off ${target.label}` }));

    expect(saveHomeLayout).not.toHaveBeenCalled();
    expect(screen.getByText(/not live until you save/i)).toBeTruthy();
  });

  it('has nothing to save until something changes', async () => {
    render(<HomeLayoutPage />);
    await screen.findByRole('list', { name: /Home page sections/i });

    expect(screen.getByRole('button', { name: /Saved/i }).hasAttribute('disabled')).toBe(true);
  });

  it('cannot move the first section up or the last one down', async () => {
    render(<HomeLayoutPage />);
    await screen.findByRole('list', { name: /Home page sections/i });

    const first = SECTIONS[0];
    const last = SECTIONS[SECTIONS.length - 1];
    expect(screen.getByRole('button', { name: `Move ${first.label} up` }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: `Move ${last.label} down` }).hasAttribute('disabled')).toBe(true);
  });

  it('restores the shipped order', async () => {
    const shuffled = defaultLayout();
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    loadHomeLayout.mockResolvedValue(shuffled.map((s, i) => ({ ...s, order: i })));

    render(<HomeLayoutPage />);
    await screen.findByRole('list', { name: /Home page sections/i });

    await userEvent.click(screen.getByRole('button', { name: /Restore default order/i }));
    await userEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => expect(saveHomeLayout).toHaveBeenCalled());
    expect(savedIds()).toEqual(SECTIONS.map(s => s.id));
  });

  it('surfaces a failed save rather than claiming success', async () => {
    saveHomeLayout.mockRejectedValueOnce(new Error('Permission denied.'));
    render(<HomeLayoutPage />);
    await screen.findByRole('list', { name: /Home page sections/i });

    const target = SECTIONS.find(s => !s.locked)!;
    await userEvent.click(screen.getByRole('button', { name: `Switch off ${target.label}` }));
    await userEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Permission denied/i);
  });
});
