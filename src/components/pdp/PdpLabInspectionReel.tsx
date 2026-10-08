import { useEffect, useRef } from 'react';
import Modal from '../ui/Modal';

interface PdpLabInspectionReelProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Rendered from video/lab-inspection (HyperFrames); see that folder to change it. */
export const LAB_VIDEO_SRC = '/videos/lab-inspection.mp4';
export const LAB_VIDEO_POSTER = '/videos/lab-inspection-poster.jpg';

/**
 * The 70-point inspection film: one video, every check shown by name, of how every device is
 * checked in the lab, the same for every product. It opens from a tap, so it
 * starts playing with sound; the native controls let the shopper pause,
 * mute or replay it.
 */
export default function PdpLabInspectionReel({ isOpen, onClose }: PdpLabInspectionReelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isOpen) {
      video.currentTime = 0;
      // Autoplay with sound can still be refused; the controls cover that.
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How we run the 70-point inspection" width={560}>
      <video
        ref={videoRef}
        src={LAB_VIDEO_SRC}
        poster={LAB_VIDEO_POSTER}
        controls
        playsInline
        preload="metadata"
        aria-label="LeHart lab: the 70-point inspection, step by step"
        style={{ display: 'block', width: '100%', aspectRatio: '1 / 1', borderRadius: 'var(--radius-lg)', background: '#0c0a09' }}
      />
    </Modal>
  );
}
