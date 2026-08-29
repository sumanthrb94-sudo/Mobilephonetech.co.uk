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
