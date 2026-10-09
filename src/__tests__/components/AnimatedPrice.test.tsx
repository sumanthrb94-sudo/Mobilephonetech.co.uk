import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import AnimatedPrice from '../../components/ui/AnimatedPrice';

let reduceMotion = false;
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: () => reduceMotion,
}));

afterEach(() => { reduceMotion = false; vi.useRealTimers(); });

const text = (container: HTMLElement) => container.querySelector('span')?.textContent;

describe('a price that changes', () => {
  it('shows its first figure at once, with no count-up', () => {
    const { container } = render(<AnimatedPrice value={270} />);
    expect(text(container)).toBe('£270');
  });

  it('shows pennies only when there are some', () => {
    const { container } = render(<AnimatedPrice value={289.5} />);
    expect(text(container)).toBe('£289.50');
  });

  it('keeps two decimals when asked, as totals do', () => {
    const { container } = render(<AnimatedPrice value={1408} decimals={2} />);
    expect(text(container)).toBe('£1408.00');
  });

  it('ends on the new figure after rolling to it', async () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<AnimatedPrice value={270} />);
    rerender(<AnimatedPrice value={289} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(text(container)).toBe('£289');
  });

  it('jumps straight to the new figure when motion is reduced', () => {
    reduceMotion = true;
    const { container, rerender } = render(<AnimatedPrice value={270} />);
    rerender(<AnimatedPrice value={289} />);
    expect(text(container)).toBe('£289');
  });

  it('names the final figure for screen readers, not the frames in between', () => {
    const { container, rerender } = render(<AnimatedPrice value={270} />);
    rerender(<AnimatedPrice value={289} />);
    expect(container.querySelector('span')?.getAttribute('aria-label')).toBe('£289');
  });
});
