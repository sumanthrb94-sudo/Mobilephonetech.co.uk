import { useEffect, useState } from 'react';

/**
 * Whether the browser believes it has a network connection.
 *
 * `navigator.onLine` is a weak signal — it reports the link, not whether
 * anything is reachable across it, so a captive portal still reads as online.
 * It is reliable in the one direction that matters here: when it says false,
 * the device really has no route out, and that is the case worth telling the
 * visitor about. A request that fails for any other reason is handled where
 * the request is made, with the error that request actually produced.
 *
 * Read lazily rather than defaulted to true, so a page opened with the radio
 * already off does not flash a working shop first.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine !== false,
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    // The events can fire between the lazy read above and this subscription.
    setOnline(navigator.onLine !== false);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return online;
}

export default useOnlineStatus;
