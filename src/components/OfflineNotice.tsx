import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * OfflineNotice — a bar across the top of the app while the device has no
 * connection.
 *
 * A bar rather than a full screen on purpose. Losing signal mid-browse should
 * not throw away what is already on screen: the catalogue page they are
 * looking at, the basket they have filled. Everything already rendered stays
 * usable and readable; only the next request would fail, and this says so
 * before they tap and watch it hang.
 *
 * It sits under the app bar rather than over it, so it never covers the way
 * out of wherever they are.
 */
export default function OfflineNotice() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="offline-bar" role="status" aria-live="polite">
      <WifiOff size={15} aria-hidden="true" />
      <span>You are offline — some things will not load until you reconnect.</span>
    </div>
  );
}
