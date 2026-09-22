import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageManager from '../../components/admin/ImageManager';

vi.mock('../../lib/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/adminApi')>();
  return { ...actual, uploadImage: vi.fn(), deleteImage: vi.fn(() => Promise.resolve()) };
});

function setup(images: string[] = []) {
  const onChange = vi.fn();
  render(<ImageManager productId="apple-iphone-17" images={images} onChange={onChange} />);
  return { onChange };
}

beforeEach(() => vi.clearAllMocks());

describe('ImageManager — linking an image by URL', () => {
  // Storage needs Firebase's paid plan just to enable, so linking is the path
  // that keeps the console usable without it.
  it('accepts an absolute https URL', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.type(screen.getByLabelText(/add an image by url/i), 'https://cdn.example.com/a.jpg');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(onChange).toHaveBeenCalledWith(['https://cdn.example.com/a.jpg']);
  });

  it('accepts a site-relative asset path', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.type(screen.getByLabelText(/add an image by url/i), '/assets/iphone.jpg');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(onChange).toHaveBeenCalledWith(['/assets/iphone.jpg']);
  });

  it('appends rather than replacing the existing gallery', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(['/assets/first.jpg']);

    await user.type(screen.getByLabelText(/add an image by url/i), '/assets/second.jpg');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(onChange).toHaveBeenCalledWith(['/assets/first.jpg', '/assets/second.jpg']);
  });

  it.each(['javascript:alert(1)', 'data:image/png;base64,AAAA', 'ftp://x/y.jpg', 'not a url'])(
    'rejects %s — the value ends up in an img src', async (bad) => {
      const user = userEvent.setup();
      const { onChange } = setup();

      await user.type(screen.getByLabelText(/add an image by url/i), bad);
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      expect(onChange).not.toHaveBeenCalled();
      expect(await screen.findByText(/full http\(s\) address or a path/i)).toBeInTheDocument();
    },
  );

  it('refuses a duplicate instead of adding it twice', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(['/assets/a.jpg']);

    await user.type(screen.getByLabelText(/add an image by url/i), '/assets/a.jpg');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(onChange).not.toHaveBeenCalled();
    expect(await screen.findByText(/already on this product/i)).toBeInTheDocument();
  });

  it('clears the field after a successful add, ready for the next one', async () => {
    const user = userEvent.setup();
    setup();
    const field = screen.getByLabelText(/add an image by url/i);

    await user.type(field, 'https://cdn.example.com/a.jpg');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => expect(field).toHaveValue(''));
  });

  it('marks a linked image as Linked, so deleting it is understood to only unlink', () => {
    setup(['/assets/bundled.jpg']);
    expect(screen.getByTitle(/only unlinks it/i)).toBeInTheDocument();
  });
});

/**
 * The six-image limit.
 *
 * The product gallery is a six-frame grid, so a seventh image has nowhere to
 * go. The save path caps it too, which means an editor that accepted a
 * seventh would be accepting something it then silently discarded — the
 * worst of the available behaviours. So the controls stop at six and say so.
 */
describe('ImageManager — the six-image limit', () => {
  const six = Array.from({ length: 6 }, (_, i) => `https://cdn.example.com/${i}.jpg`);

  it('counts images against the limit', () => {
    setup(['https://cdn.example.com/a.jpg']);
    expect(screen.getByText(/1 of 6/)).toBeTruthy();
  });

  it('stops offering uploads once six are on the product', () => {
    setup(six);
    const upload = screen.getByRole('button', { name: /remove one to add another/i });
    expect(upload.hasAttribute('disabled')).toBe(true);
  });

  it('refuses a seventh image by URL, and says why', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(six);

    const field = screen.getByLabelText(/add an image by url/i);
    // The field is closed off at the limit, so there is no way to submit —
    // which is the point: the refusal is visible before anything is typed.
    expect((field as HTMLInputElement).disabled).toBe(true);
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^add$/i })).catch(() => {});
    expect(onChange).not.toHaveBeenCalled();
  });

  it('still accepts a sixth image', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(six.slice(0, 5));

    await user.type(screen.getByLabelText(/add an image by url/i), 'https://cdn.example.com/last.jpg');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    expect(onChange).toHaveBeenCalledWith([...six.slice(0, 5), 'https://cdn.example.com/last.jpg']);
  });

  it('frees a slot again when an image is removed', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(six);

    await user.click(screen.getByRole('button', { name: /Delete image 1/i }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(six.slice(1)));
  });
});
