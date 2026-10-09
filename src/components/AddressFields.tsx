import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { lookupPostcode, hasCoordinates, type PostcodePlace } from '../utils/postcodeLookup';
import { sanitiseLocation, type AddressDraft } from '../utils/address';

/**
 * AddressFields — the delivery address form, shared by checkout and
 * My Account → Addresses so the two can never disagree about what an
 * address is again.
 *
 * ONE POSTCODE BOX
 *
 * There used to be a "Postcode lookup" box with a Find address button, and
 * then a separate Postal Code box further down — the same question asked
 * twice, and the map only ever appeared for someone who found the button.
 * Now the postcode box IS the lookup: once it holds a whole UK postcode it is
 * checked against postcodes.io, the town is filled, and the map appears with
 * a pin to drag to the door. What postcodes.io can and cannot do is written
 * up in src/utils/postcodeLookup.ts — in short, it never invents a street.
 *
 * CONTROLLED
 *
 * The value is owned by the parent. Every input still carries the `name`
 * checkout's FormData and the e2e suites read (addressLine1, city,
 * postalCode…), so nothing downstream needed to learn a new vocabulary.
 */

// Lazy for the same reason as ever: Leaflet is only wanted once there is a
// postcode to show, and must stay out of every other page's download.
const AddressMap = lazy(() => import('./AddressMap'));

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export const fieldLabelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
  color: 'var(--grey-70)', marginBottom: 4,
};
export const fieldErrorStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--color-sale)', margin: '4px 0 0',
};
const hintStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--grey-50)', margin: '4px 0 0', lineHeight: 1.45,
};

/** A label, an input and its error, in the compact rhythm both forms use. */
export function Field({
  label, error, hint, style, ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: React.ReactNode }) {
  const id = input.id ?? `f-${input.name}`;
  const described = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div style={style}>
      <label htmlFor={id} style={fieldLabelStyle}>{label}</label>
      <input
        {...input}
        id={id}
        className={`input${error ? ' input-error' : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
      />
      {hint && !error && <p id={`${id}-hint`} style={hintStyle}>{hint}</p>}
      {error && <p id={`${id}-err`} style={fieldErrorStyle}>{error}</p>}
    </div>
  );
}

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; place: PostcodePlace }
  | { status: 'error'; message: string };

export interface AddressFieldsProps {
  value: AddressDraft;
  onChange: (next: AddressDraft) => void;
  /** Keyed by field name: addressLine1, city, postalCode. */
  errors?: Record<string, string | undefined>;
}

export default function AddressFields({ value, onChange, errors = {} }: AddressFieldsProps) {
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });
  // The latest value, for the async lookup to merge into rather than
  // overwrite whatever was typed while it was in flight.
  const latest = useRef(value);
  latest.current = value;
  // The postcode the current pin belongs to. An address that arrives already
  // pinned (saved, or a previous step) keeps its pin; typing a different
  // postcode moves the pin to that postcode's centre.
  const pinFor = useRef<string>(value.location ? compact(value.postalCode) : '');
  const lookedUp = useRef<string>('');
  // The postcode the form arrived with. Confirming it must not overwrite a
  // town the customer chose (their "London" for postcodes.io's "Westminster").
  const arrivedWith = useRef<string>(compact(value.postalCode));

  const set = (patch: Partial<AddressDraft>) => onChange({ ...latest.current, ...patch });

  const runLookup = async (raw: string) => {
    const key = compact(raw);
    if (!UK_POSTCODE_RE.test(raw.trim()) || key === lookedUp.current) return;
    lookedUp.current = key;
    setLookup({ status: 'loading' });
    const result = await lookupPostcode(raw);
    // Typed on since; this answer is for a postcode no longer in the box.
    if (compact(latest.current.postalCode) !== key) return;
    if (!result.ok) {
      setLookup({ status: 'error', message: result.message });
      return;
    }
    const { place } = result;
    const patch: Partial<AddressDraft> = { postalCode: place.postcode };
    // Only the town. The street stays the customer's to type: an invented
    // plausible street is how a parcel goes to the wrong door.
    const keepTown = key === arrivedWith.current && latest.current.city.trim();
    if (place.town && !keepTown) patch.city = place.town;
    if (hasCoordinates(place) && pinFor.current !== key) {
      patch.location = sanitiseLocation({ lat: place.latitude, lng: place.longitude, pinned: false });
      pinFor.current = key;
    }
    set(patch);
    setLookup({ status: 'found', place });
  };

  // Look up once the box holds a whole postcode — on mount for a saved
  // address too, so its town is confirmed and an unpinned one gets a map.
  // Debounced, so a correction mid-word is not a request per keystroke.
  useEffect(() => {
    const raw = value.postalCode;
    if (!UK_POSTCODE_RE.test(raw.trim())) return;
    const t = window.setTimeout(() => { void runLookup(raw); }, 350);
    return () => window.clearTimeout(t);
  }, [value.postalCode]);

  const onPostcode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (compact(next) !== lookedUp.current) {
      lookedUp.current = '';
      if (lookup.status !== 'idle') setLookup({ status: 'idle' });
    }
    set({ postalCode: next });
  };

  const pin = value.location;
  const status = lookup.status === 'found'
    ? [lookup.place.town, lookup.place.county].filter((s, i, all) => s && all.indexOf(s) === i).join(', ')
    : '';

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 12 }}>
        <Field
          label="Postcode"
          name="postalCode"
          id="postcode-lookup"
          autoComplete="postal-code"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="SW1A 1AA"
          value={value.postalCode}
          onChange={onPostcode}
          onBlur={() => { void runLookup(value.postalCode); }}
          onKeyDown={(e) => {
            // Enter here means "look it up", not "submit a half-filled form".
            if (e.key === 'Enter') { e.preventDefault(); void runLookup(value.postalCode); }
          }}
          error={errors.postalCode}
        />
        <Field
          label="Town or city"
          name="city"
          autoComplete="address-level2"
          value={value.city}
          onChange={(e) => set({ city: e.target.value })}
          error={errors.city}
        />
      </div>

      {/* One live region for every lookup outcome. */}
      <div aria-live="polite" style={{ marginTop: -6 }}>
        {lookup.status === 'loading' && <p style={hintStyle}>Checking postcode…</p>}
        {lookup.status === 'error' && <p role="alert" style={{ ...hintStyle, color: 'var(--color-sale)' }}>{lookup.message}</p>}
        {lookup.status === 'found' && status && (
          <p style={hintStyle}>
            <span aria-hidden="true" style={{ color: 'var(--color-trust-text)', fontWeight: 700 }}>✓ </span>
            {lookup.place.postcode} · {status}
          </p>
        )}
      </div>

      {pin && (
        <Suspense fallback={<div style={{ height: 200, borderRadius: 'var(--radius-lg)', background: 'var(--grey-5)', border: '1px solid var(--grey-20)' }} />}>
          <AddressMap
            latitude={pin.lat}
            longitude={pin.lng}
            label={value.postalCode || 'your postcode'}
            onMove={(lat, lng) => set({ location: sanitiseLocation({ lat, lng, pinned: true }) })}
          />
        </Suspense>
      )}

      <Field
        label="Address line 1"
        name="addressLine1"
        autoComplete="address-line1"
        placeholder="House number and street"
        value={value.addressLine1}
        onChange={(e) => set({ addressLine1: e.target.value })}
        error={errors.addressLine1}
      />
      <Field
        label="Address line 2 (optional)"
        name="addressLine2"
        autoComplete="address-line2"
        placeholder="Flat, floor or building"
        value={value.addressLine2}
        onChange={(e) => set({ addressLine2: e.target.value })}
      />
    </div>
  );
}

function compact(postcode: string): string {
  return (postcode ?? '').replace(/\s+/g, '').toUpperCase();
}
