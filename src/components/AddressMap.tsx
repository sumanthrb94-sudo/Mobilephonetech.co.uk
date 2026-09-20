import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

/**
 * AddressMap — where the postcode the shopper typed actually is.
 *
 * WHAT IT IS FOR
 *
 * Catching the wrong postcode before it becomes a wrong delivery. A
 * transposed pair of characters is still a valid postcode, so validation
 * alone will happily accept somewhere 200 miles from where the parcel should
 * go. A picture of the place answers "is this your area?" in a glance, which
 * no amount of correctly-spelled text does.
 *
 * DELIBERATELY NOT INTERACTIVE
 *
 * No dragging, no scroll-wheel zoom. A draggable pin implies the position is
 * an input — that moving it changes where the parcel goes — and nothing here
 * reads it back, so it would be a lie told in gestures. Scroll zoom on a
 * phone is worse: the map sits mid-form and would swallow the scroll on the
 * way past it. It is a confirmation, so it behaves like a picture.
 *
 * WHY LEAFLET LOADS ITSELF HERE
 *
 * Imported inside the effect rather than at module scope, and this component
 * is only rendered once a lookup has succeeded. Leaflet is ~42KB gzipped
 * plus its stylesheet, and checkout is the last page on earth to spend that
 * on someone who never pressed the button. Nobody pays for the map until
 * they get one.
 *
 * TILES
 *
 * OpenStreetMap's own tile servers, with the attribution their policy
 * requires — Leaflet renders it into the corner and it must stay there. This
 * is a low-volume checkout aid, which is within their acceptable use; a
 * heavier or bulk use would need a paid tile host, and swapping one is a
 * change of URL here and in the CSP img-src, nothing more.
 */

export interface AddressMapProps {
  latitude: number;
  longitude: number;
  /** Shown on the marker's tooltip and to screen readers. */
  label: string;
}

export default function AddressMap({ latitude, longitude, label }: AddressMapProps) {
  const holder = useRef<HTMLDivElement>(null);
  // The Leaflet instance, kept so a re-render moves the view rather than
  // building a second map on top of the first.
  const mapRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const el = holder.current;
    if (!el) return;

    (async () => {
      const L = await import('leaflet');
      // Unmounted, or the postcode changed again, while the chunk was in
      // flight. Building the map now would leak it.
      if (cancelled || !holder.current) return;

      // React kept the node between renders and Leaflet refuses to
      // initialise a container twice.
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

      const map = L.map(el, {
        center: [latitude, longitude],
        zoom: 15,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // A plain circle rather than Leaflet's default pin: the default is a
      // PNG resolved relative to the stylesheet, which a hashed asset build
      // serves from somewhere the plugin does not expect, and a broken image
      // icon in the middle of a checkout is not worth the authenticity.
      L.circleMarker([latitude, longitude], {
        radius: 9,
        weight: 3,
        color: '#a16207',
        fillColor: '#a16207',
        fillOpacity: 0.35,
      })
        .addTo(map)
        .bindTooltip(label, { permanent: false, direction: 'top' });
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [latitude, longitude, label]);

  return (
    <div
      ref={holder}
      role="img"
      aria-label={`Map showing the area around ${label}`}
      data-testid="address-map"
      style={{
        height: 170,
        width: '100%',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--grey-20)',
        overflow: 'hidden',
        // Something to look at while the tiles arrive, rather than a white
        // hole the height of the map.
        background: 'var(--grey-5)',
      }}
    />
  );
}
