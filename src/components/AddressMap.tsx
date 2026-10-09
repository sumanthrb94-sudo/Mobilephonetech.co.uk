import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

/**
 * AddressMap — a map of the postcode with a pin the customer moves to their
 * door.
 *
 * WHAT IT IS FOR
 *
 * Two things a typed address cannot do. It catches the wrong postcode — a
 * transposed pair of characters is still valid, and a picture of the wrong
 * town is obvious at a glance. And it says which door: a UK postcode covers
 * about fifteen addresses, and a new-build, a farm or a flat round the back
 * is exactly where a courier gives up. The pin's position is stored with the
 * address (`location`) so staff can open it before booking the label.
 *
 * WHY THE PIN IS NOW DRAGGABLE
 *
 * The first version was a picture, deliberately: nothing read the position
 * back, so a draggable pin would have been a promise in gestures that went
 * nowhere. It is read back now, so it moves. Scroll-wheel zoom stays off —
 * the map sits mid-form and would swallow the page scroll on the way past.
 *
 * WHY LEAFLET LOADS ITSELF HERE
 *
 * Imported inside the effect, and this component is itself lazy, so nobody
 * pays for ~42KB of map until there is a postcode to show. Leaflet stays out
 * of the startup bundle (see vite.config.ts manualChunks).
 *
 * FAILING QUIETLY
 *
 * The chunk can fail to load and the tiles can fail to arrive (offline, a
 * blocked host, OSM having a bad day). Either way the map steps aside and
 * says so in one line; the address form never depended on it.
 *
 * TILES
 *
 * OpenStreetMap's own tile servers, with the attribution their policy
 * requires. Low-volume checkout use is within their acceptable use; a
 * heavier use would need a paid tile host, which is a change of URL here and
 * in the CSP img-src, nothing more.
 */

export interface AddressMapProps {
  latitude: number;
  longitude: number;
  /** Shown to screen readers, e.g. the postcode. */
  label: string;
  /** Called when the customer drags the pin or taps the map. Omit for a static map. */
  onMove?: (lat: number, lng: number) => void;
  /** Height in px. */
  height?: number;
}

/** A drop pin as inline SVG: no image request, so nothing to 404 or block. */
const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">'
  + '<path d="M15 39s13-13.4 13-23.5C28 7.5 22.2 1.5 15 1.5S2 7.5 2 15.5C2 25.6 15 39 15 39z" fill="#111827" stroke="#fff" stroke-width="2"/>'
  + '<circle cx="15" cy="15.5" r="5" fill="#fff"/></svg>';

/** Tiles that must fail, with none loading, before the map gives up. */
const TILE_FAILURES_BEFORE_GIVING_UP = 4;

// Leaflet's instance types, kept loose so this file does not pull the types
// of a module it only ever imports lazily.
interface MapLike {
  remove: () => void;
  setView: (c: [number, number], z?: number) => void;
  getZoom: () => number;
}
interface MarkerLike {
  setLatLng: (c: [number, number]) => void;
  getLatLng: () => { lat: number; lng: number };
}

export default function AddressMap({ latitude, longitude, label, onMove, height = 200 }: AddressMapProps) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLike | null>(null);
  const markerRef = useRef<MarkerLike | null>(null);
  // The latest callback, so the map is not rebuilt every time a parent
  // re-renders with a fresh closure.
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const [failed, setFailed] = useState(false);

  // Build once per mount. Position changes are handled by the effect below,
  // which moves the existing map rather than tearing it down mid-drag.
  useEffect(() => {
    let cancelled = false;
    const el = holder.current;
    if (!el) return;

    (async () => {
      let L: typeof import('leaflet');
      try {
        L = await import('leaflet');
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }
      if (cancelled || !holder.current) return;

      const interactive = Boolean(onMoveRef.current);
      const map = L.map(el, {
        center: [latitude, longitude],
        zoom: 17,
        zoomControl: interactive,
        dragging: interactive,
        touchZoom: interactive,
        doubleClickZoom: interactive,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: interactive,
        attributionControl: true,
      });
      mapRef.current = map;

      let loaded = 0;
      let errors = 0;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      })
        .on('tileload', () => { loaded++; })
        .on('tileerror', () => {
          errors++;
          if (!loaded && errors >= TILE_FAILURES_BEFORE_GIVING_UP && !cancelled) setFailed(true);
        })
        .addTo(map);

      const marker = L.marker([latitude, longitude], {
        draggable: interactive,
        autoPan: true,
        keyboard: false,
        title: label,
        icon: L.divIcon({ className: 'address-map-pin', html: PIN_SVG, iconSize: [30, 40], iconAnchor: [15, 39] }),
      }).addTo(map);
      markerRef.current = marker;

      if (interactive) {
        const report = () => {
          const p = marker.getLatLng();
          onMoveRef.current?.(p.lat, p.lng);
        };
        marker.on('dragend', report);
        // A tap is easier than a drag on a phone: put the pin where tapped.
        map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
          marker.setLatLng([e.latlng.lat, e.latlng.lng]);
          report();
        });
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      markerRef.current = null;
    };
  }, []);

  // A new position from outside — a different postcode was looked up. One
  // that came from the pin itself is already where the marker is, so the
  // view does not jump under the customer's finger.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const at = marker.getLatLng();
    if (Math.abs(at.lat - latitude) < 1e-5 && Math.abs(at.lng - longitude) < 1e-5) return;
    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], Math.max(map.getZoom(), 16));
  }, [latitude, longitude]);

  if (failed) {
    return (
      <p
        data-testid="address-map-unavailable"
        style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--grey-50)', margin: 0 }}
      >
        The map is not available right now — your address is all we need.
      </p>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={holder}
        role={onMove ? 'group' : 'img'}
        aria-label={onMove ? `Map of ${label}. Drag the pin to your door.` : `Map showing the area around ${label}`}
        data-testid="address-map"
        style={{
          height,
          width: '100%',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--grey-20)',
          overflow: 'hidden',
          // Something to look at while the tiles arrive.
          background: 'var(--grey-5)',
          // Leaflet's panes use z-indexes up to 1000; keep them inside this
          // box rather than over the sticky header.
          isolation: 'isolate',
        }}
      />
      {onMove && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1, pointerEvents: 'none', whiteSpace: 'nowrap',
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(17,24,39,0.82)', color: '#fff',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
          }}
        >
          Drag the pin to your door
        </span>
      )}
    </div>
  );
}
