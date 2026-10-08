import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import PdpLabInspectionReel, { LAB_VIDEO_SRC, LAB_VIDEO_POSTER } from '../../components/pdp/PdpLabInspectionReel';

beforeAll(() => {
  // jsdom has no media playback.
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

describe('lab inspection video', () => {
  it('plays the rendered lab film with controls when opened', () => {
    render(<PdpLabInspectionReel isOpen onClose={() => {}} />);
    const video = document.querySelector('video');
    expect(video?.getAttribute('src')).toBe(LAB_VIDEO_SRC);
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('ships the video and its poster', () => {
    for (const path of [LAB_VIDEO_SRC, LAB_VIDEO_POSTER]) {
      expect(existsSync(resolve(__dirname, '../../../public', path.slice(1)))).toBe(true);
    }
  });
});
