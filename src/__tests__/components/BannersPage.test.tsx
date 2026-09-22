import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BannersPage from '../../components/admin/BannersPage';
import { bannerProblems, type Banner } from '../../lib/banners';

/** The live preview embeds the real home-page carousel, which links out
 *  via react-router — so it needs a Router in the tree, same as the page
 *  itself would have in the app. */
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/banners']}>
      <BannersPage />
    </MemoryRouter>,
  );
}

/**
 * The banner editor hands staff the home page.
 *
 * The property worth pinning hardest is that a half-finished banner cannot
 * reach the shop front: Save is the moment a headline and a link go in front
 * of every visitor, so the thing being saved has to be complete and its link
 * has to stay inside the shop.
 */

const listBanners = vi.fn();
const saveBanner = vi.fn(async () => {});
const deleteBanner = vi.fn(async () => {});

vi.mock('../../lib/banners', async (orig) => {
  const actual = await orig<typeof import('../../lib/banners')>();
  return {
    ...actual,
    listBanners: () => listBanners(),
    saveBanner: (...a: unknown[]) => saveBanner(...(a as [])),
    deleteBanner: (...a: unknown[]) => deleteBanner(...(a as [])),
  };
});

vi.mock('../../lib/adminApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/adminApi')>();
  return { ...actual, uploadImage: vi.fn(async () => 'https://example.test/uploaded.jpg') };
});

const live: Banner = {
  id: 'summer-sale-x1', eyebrow: 'Summer', headline: 'Up to 40% off',
  subline: 'Every device checked.', ctaLabel: 'Shop deals', ctaHref: '/products',
  image: 'https://example.test/d.jpg', imageMobile: 'https://example.test/m.jpg',
  alt: 'Phones on a bright background', active: true, order: 0,
  updatedAt: '2026-09-13T10:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  listBanners.mockResolvedValue([live]);
});

describe('bannerProblems', () => {
  const base = { headline: 'Hi', image: 'x', imageMobile: '', ctaHref: '/products', alt: 'A phone' };

  it('passes a complete banner', () => {
    expect(bannerProblems(base)).toEqual([]);
  });

  it('requires a headline, an image and a description', () => {
    expect(bannerProblems({ ...base, headline: '  ' })).toContain('A headline is required.');
    expect(bannerProblems({ ...base, image: '', imageMobile: '' })).toContain('Upload at least one image.');
    expect(bannerProblems({ ...base, alt: '' })[0]).toMatch(/screen readers/i);
  });

  it('refuses a link that leaves the shop', () => {
    // This is the home page's main call to action, set from a text field. An
    // external or javascript: URL here would be a link every visitor sees.
    for (const href of ['https://evil.test', 'javascript:alert(1)', 'evil.test']) {
      expect(bannerProblems({ ...base, ctaHref: href })[0]).toMatch(/inside the shop/i);
    }
    expect(bannerProblems({ ...base, ctaHref: '/products?brand=Apple' })).toEqual([]);
  });
});

describe('BannersPage', () => {
  it('lists a saved banner and says whether it is live', async () => {
    renderPage();
    expect(await screen.findByDisplayValue('Up to 40% off')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('saves an edited headline', async () => {
    renderPage();
    const field = await screen.findByDisplayValue('Up to 40% off');

    await userEvent.clear(field);
    await userEvent.type(field, 'Autumn clearance');
    await userEvent.click(screen.getByRole('button', { name: /Save & put live/i }));

    await waitFor(() => expect(saveBanner).toHaveBeenCalledWith(
      expect.objectContaining({ headline: 'Autumn clearance', active: true }),
    ));
  });

  it('will not let an incomplete banner be saved', async () => {
    listBanners.mockResolvedValue([{ ...live, headline: '', alt: '', active: false }]);
    renderPage();
    await screen.findByText('Off');

    const save = screen.getByRole('button', { name: /^Save$/i });
    expect(save.hasAttribute('disabled')).toBe(true);
    // And it says why, rather than just refusing.
    expect(screen.getByText(/A headline is required/)).toBeTruthy();
    expect(saveBanner).not.toHaveBeenCalled();
  });

  it('never deletes on a single click', async () => {
    renderPage();
    await screen.findByDisplayValue('Up to 40% off');

    await userEvent.click(screen.getByRole('button', { name: /Delete/i }));
    expect(deleteBanner).not.toHaveBeenCalled();

    const confirm = screen.getByRole('group', { name: 'Confirm delete' });
    await userEvent.click(within(confirm).getByRole('button', { name: /Yes, delete/i }));
    await waitFor(() => expect(deleteBanner).toHaveBeenCalledWith('summer-sale-x1'));
  });

  it('shows the real home-page carousel, not a mockup of it', async () => {
    renderPage();
    await screen.findByDisplayValue('Up to 40% off');

    // What staff approve here is the actual HeroCarousel component (see
    // BannersPage's bannerToSlide) — not a hand-rolled copy that could drift
    // from what the home page renders.
    const frame = document.querySelector('.bn-preview__frame2');
    expect(frame).toBeTruthy();
    expect(frame!.querySelector('img')?.getAttribute('src')).toBe('https://example.test/m.jpg');
    expect(frame!.textContent).toContain('Up to 40% off');
    expect(frame!.textContent).toContain('Shop deals');
  });

  it('adds a new banner switched off, so nothing reaches the shop by accident', async () => {
    renderPage();
    await screen.findByDisplayValue('Up to 40% off');

    await userEvent.click(screen.getByRole('button', { name: /New banner/i }));

    expect(await screen.findByText('Off')).toBeTruthy();
    expect(screen.getByText(/A headline is required/)).toBeTruthy();
  });
});

/**
 * Adding banner artwork by URL.
 *
 * The uploader is not always available — a deployment without working image
 * hosting, or an image that already lives somewhere reachable — and a banner
 * that cannot get a picture cannot be saved at all, because bannerProblems
 * refuses one without artwork. So this path is what keeps the shop front
 * editable independently of whoever is storing the files.
 */
describe('banner artwork by URL', () => {
  it('sets the desktop image from a pasted address', async () => {
    listBanners.mockResolvedValue([{ ...live, image: '', imageMobile: '' }]);
    renderPage();

    const field = await screen.findByLabelText(/Desktop image: add by URL/i);
    await userEvent.type(field, 'https://cdn.example.test/banner-wide.jpg');
    await userEvent.click(within(field.closest('.bn-upload__url')!).getByRole('button', { name: /Use/i }));

    await waitFor(() => expect(
      (screen.getByLabelText(/Desktop image: add by URL/i) as HTMLInputElement).value,
    ).toBe(''));

    await userEvent.click(screen.getByRole('button', { name: /Save & put live/i }));
    await waitFor(() => expect(saveBanner).toHaveBeenCalledWith(
      expect.objectContaining({ image: 'https://cdn.example.test/banner-wide.jpg' }),
    ));
  });

  it('keeps the phone and desktop fields separate', async () => {
    listBanners.mockResolvedValue([{ ...live, image: '', imageMobile: '' }]);
    renderPage();

    const phone = await screen.findByLabelText(/Phone image: add by URL/i);
    await userEvent.type(phone, '/assets/banner-tall.jpg');
    await userEvent.click(within(phone.closest('.bn-upload__url')!).getByRole('button', { name: /Use/i }));

    await userEvent.click(screen.getByRole('button', { name: /Save & put live/i }));
    await waitFor(() => expect(saveBanner).toHaveBeenCalledWith(
      expect.objectContaining({ imageMobile: '/assets/banner-tall.jpg', image: '' }),
    ));
  });

  /**
   * This value lands in an <img src> on the home page, so the field has to
   * refuse the schemes that turn an image slot into script execution.
   */
  it('refuses an address that is not a plain http(s) or site path', async () => {
    listBanners.mockResolvedValue([{ ...live, image: '', imageMobile: '' }]);
    renderPage();

    const field = await screen.findByLabelText(/Desktop image: add by URL/i);
    const use = within(field.closest('.bn-upload__url')!).getByRole('button', { name: /Use/i });

    for (const bad of ['javascript:alert(1)', 'data:image/svg+xml,<svg onload=alert(1)>', '//evil.test/x.jpg']) {
      await userEvent.clear(field);
      await userEvent.type(field, bad);
      await userEvent.click(use);

      expect(screen.getByText(/full http\(s\) address/i)).toBeTruthy();
      // Rejected values stay in the box to be corrected, never on the banner.
      expect((field as HTMLInputElement).value).toBe(bad);
    }

    await userEvent.click(screen.getByRole('button', { name: /Save & put live/i }));
    expect(saveBanner).not.toHaveBeenCalled();
  });
});
