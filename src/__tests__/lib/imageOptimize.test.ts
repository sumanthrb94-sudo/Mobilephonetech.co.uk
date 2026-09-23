import { describe, it, expect, vi } from 'vitest';
import { pickBestEncoding, extensionFor } from '../../lib/imageOptimize';

/**
 * The browser-side compression a product photo goes through before a single
 * byte leaves the admin's machine.
 *
 * `pickBestEncoding` is tested here as a pure function over an injected
 * encoder — the real one draws to a canvas, which jsdom cannot do, but the
 * policy it is asked to follow (which rung wins, when to stop, that it never
 * upscales) does not depend on a canvas at all, and is exactly what a bug
 * here would get wrong silently. `Blob` itself is real in this environment,
 * so a fake encoder can return genuine Blobs of a chosen size and type
 * without mocking anything.
 */

const blob = (size: number, type = 'image/webp') => new Blob([new Uint8Array(size)], { type });

describe('pickBestEncoding', () => {
  it('stops at the first rung that clears the budget', async () => {
    const encode = vi.fn()
      .mockResolvedValueOnce(blob(500_000))
      .mockResolvedValueOnce(blob(100_000));

    const result = await pickBestEncoding(
      4000, encode,
      [{ dim: 2000, quality: 0.85 }, { dim: 1200, quality: 0.7 }, { dim: 800, quality: 0.6 }],
      200_000,
    );

    expect(result?.size).toBe(100_000);
    // The third rung was never worth trying once the second cleared budget.
    expect(encode).toHaveBeenCalledTimes(2);
  });

  /**
   * The point of trying every rung in the worst case: a busy source photo
   * that never gets under budget should still come back with its smallest
   * attempt, not nothing at all.
   */
  it('falls back to the smallest result seen when nothing clears the budget', async () => {
    const encode = vi.fn()
      .mockResolvedValueOnce(blob(900_000))
      .mockResolvedValueOnce(blob(700_000))
      .mockResolvedValueOnce(blob(750_000)); // worse than the previous rung

    const result = await pickBestEncoding(
      4000, encode,
      [{ dim: 2000, quality: 0.85 }, { dim: 1200, quality: 0.7 }, { dim: 800, quality: 0.6 }],
      200_000,
    );

    expect(result?.size).toBe(700_000);
    expect(encode).toHaveBeenCalledTimes(3);
  });

  /**
   * Downscale only. A rung asking for more pixels than the source actually
   * has must never be handed to the encoder as-is — that would be asking it
   * to invent detail that was never there.
   */
  it('never asks the encoder for more than the source has', async () => {
    const encode = vi.fn().mockResolvedValue(blob(50_000));

    await pickBestEncoding(600, encode, [{ dim: 2000, quality: 0.85 }], 10);

    expect(encode).toHaveBeenCalledWith(600, 0.85);
  });

  it('skips a rung the encoder could not produce, rather than treating it as the answer', async () => {
    const encode = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(blob(90_000));

    const result = await pickBestEncoding(
      2000, encode,
      [{ dim: 2000, quality: 0.85 }, { dim: 1200, quality: 0.7 }],
      200_000,
    );

    expect(result?.size).toBe(90_000);
  });

  it('returns null when every rung fails, rather than throwing', async () => {
    const encode = vi.fn().mockResolvedValue(null);
    const result = await pickBestEncoding(2000, encode, [{ dim: 2000, quality: 0.85 }], 200_000);
    expect(result).toBeNull();
  });
});

describe('extensionFor', () => {
  /**
   * The blob's own type decides the extension — never the format that was
   * requested. A browser that cannot encode WebP hands back a PNG blob
   * without erroring, and labelling that file "image/webp" would upload
   * bytes under a Content-Type that lies about what they are.
   */
  it('names the file after what was actually produced', () => {
    expect(extensionFor('image/webp')).toBe('webp');
    expect(extensionFor('image/jpeg')).toBe('jpg');
    expect(extensionFor('image/png')).toBe('png');
  });

  it('refuses a type this module never asks a canvas to produce', () => {
    expect(() => extensionFor('image/gif')).toThrow(/unexpected MIME type/);
  });
});
