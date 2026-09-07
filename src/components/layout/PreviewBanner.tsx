import { AlertTriangle } from 'lucide-react';
import { previewModeFrom, PREVIEW_MESSAGE } from '../../config/preview';

/**
 * A standing notice that the shop is not trading yet.
 *
 * Deliberately not dismissible, and deliberately on every page rather than
 * only the home page. Someone arriving on a product listing from a search
 * result never sees the home page, and they are exactly the person most likely
 * to try to buy something.
 *
 * It renders nothing at all when preview mode is off, so this costs one
 * boolean in production rather than needing to be removed.
 */
export default function PreviewBanner() {
  if (!previewModeFrom(import.meta.env.VITE_PREVIEW_MODE)) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'relative',
        zIndex: 120,
        background: '#7C2D12',
        color: '#FFF7ED',
        padding: '9px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '9px',
        textAlign: 'center',
        fontFamily: 'var(--font-body)',
        fontSize: '12.5px',
        fontWeight: 600,
        lineHeight: 1.45,
      }}
    >
      <AlertTriangle size={15} style={{ flexShrink: 0 }} aria-hidden="true" />
      <span>{PREVIEW_MESSAGE}</span>
    </div>
  );
}
