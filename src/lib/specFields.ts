import type { ProductSpecs } from '../types';

/**
 * The specification fields a product page shows, in its tabs and order.
 *
 * Shared by the product page table (TechnicalSpecs) and the admin editor,
 * so staff can fill in exactly the fields shoppers see, and a field added
 * here appears in both places at once.
 */
export interface SpecGroup {
  title: string;
  items: { key: keyof ProductSpecs; label: string }[];
}

export const SPEC_GROUPS: SpecGroup[] = [
  {
    title: 'Launch',
    items: [
      { key: 'os', label: 'Operating System' },
      { key: 'osVersion', label: 'OS Version' },
      { key: 'body', label: 'Body' },
      { key: 'bodyBuild', label: 'Build' },
      { key: 'bodySIM', label: 'SIM' },
      { key: 'bodyProtection', label: 'Protection' },
    ],
  },
  {
    title: 'Display',
    items: [
      { key: 'displaySize', label: 'Size' },
      { key: 'display', label: 'Type' },
      { key: 'displayResolution', label: 'Resolution' },
      { key: 'displayProtection', label: 'Protection' },
      { key: 'displayFeatures', label: 'Features' },
    ],
  },
  {
    title: 'Performance',
    items: [
      { key: 'chip', label: 'Chipset' },
      { key: 'processor', label: 'Processor' },
      { key: 'cpu', label: 'CPU' },
      { key: 'gpu', label: 'GPU' },
      { key: 'ram', label: 'RAM' },
      { key: 'storage', label: 'Storage' },
      { key: 'storageExpandable', label: 'Expandable' },
    ],
  },
  {
    title: 'Camera',
    items: [
      { key: 'mainCamera', label: 'Main Camera' },
      { key: 'mainCameraFeatures', label: 'Main Features' },
      { key: 'mainCameraVideo', label: 'Main Video' },
      { key: 'selfieCamera', label: 'Selfie Camera' },
      { key: 'selfieCameraFeatures', label: 'Selfie Features' },
      { key: 'selfieCameraVideo', label: 'Selfie Video' },
    ],
  },
  {
    title: 'Battery',
    items: [
      { key: 'battery', label: 'Capacity' },
      { key: 'batteryCharging', label: 'Charging Type' },
      { key: 'batteryChargingSpeed', label: 'Charging Speed' },
      { key: 'batteryLife', label: 'Battery Life' },
    ],
  },
  {
    title: 'Connectivity',
    items: [
      { key: 'network', label: 'Network' },
      { key: 'network2G', label: '2G Bands' },
      { key: 'network3G', label: '3G Bands' },
      { key: 'network4G', label: '4G Bands' },
      { key: 'network5G', label: '5G Bands' },
      { key: 'networkSpeed', label: 'Speed' },
      { key: 'commsWLAN', label: 'WLAN' },
      { key: 'commsBluetooth', label: 'Bluetooth' },
      { key: 'commsNFC', label: 'NFC' },
      { key: 'commsUSB', label: 'USB' },
      { key: 'commsGPS', label: 'GPS' },
    ],
  },
  {
    title: 'Physical',
    items: [
      { key: 'bodyDimensions', label: 'Dimensions' },
      { key: 'bodyWeight', label: 'Weight' },
      { key: 'miscColors', label: 'Colors' },
    ],
  },
  {
    title: 'Audio',
    items: [
      { key: 'soundLoudspeaker', label: 'Loudspeaker' },
      { key: 'soundJack', label: '3.5mm Jack' },
    ],
  },
];


/** Longest a single spec value may be; a spec is a line, not a paragraph. */
export const SPEC_MAX_LENGTH = 300;

/**
 * Specs as staff typed them, ready to store: trimmed, empty fields dropped
 * (so the product page falls back to its family default for them), and each
 * value capped. Fields the editor does not show are kept untouched.
 */
export function cleanSpecs(specs: ProductSpecs | undefined | null): ProductSpecs {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(specs ?? {})) {
    if (typeof v !== 'string') continue;
    const value = v.trim().slice(0, SPEC_MAX_LENGTH);
    if (value) out[k] = value;
  }
  return out as ProductSpecs;
}
