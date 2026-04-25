import type { ProductSpecs } from '../types';

/**
 * deviceSpecs — GSMArena-grade fallback specifications keyed on model
 * family. The Shopify import only populated battery / connectivity /
 * audio for most products; this fills in everything else (display,
 * chipset, memory, cameras, body, network bands, sensors, OS) so the
 * Technical Specifications panel on every PDP reads like a proper
 * spec sheet instead of three orphan rows.
 *
 * Resolution order in enrichSpecs():
 *   1. Anything the product already has on disk wins (never overwrite).
 *   2. Exact-model match in MODEL_SPECS.
 *   3. Family-level FAMILY_SPECS (matched by regex).
 *   4. Brand-level BRAND_DEFAULTS.
 *
 * Result is a merged ProductSpecs object — the existing TechnicalSpecs
 * UI already groups every field into 8 sections (Launch / Display /
 * Performance / Camera / Battery / Connectivity / Physical / Audio).
 */

// Common bands that almost every iPhone/Galaxy/Pixel ships with.
const COMMON_2G = 'GSM 850 / 900 / 1800 / 1900';
const COMMON_3G = 'HSDPA 850 / 900 / 1700(AWS) / 1900 / 2100';
const COMMON_4G = '1, 2, 3, 4, 5, 7, 8, 12, 13, 17, 18, 19, 20, 25, 26, 28, 30, 32, 38, 39, 40, 41, 46, 48, 66';
const COMMON_5G = 'SA/NSA/Sub6 (band coverage varies by region)';

// ── Apple iPhone family bases ─────────────────────────────────────────
const IPHONE_17_PRO_MAX: Partial<ProductSpecs> = {
  os: 'iOS 19',
  osVersion: 'iOS 19',
  body: '163.0 x 77.6 x 8.3 mm, 230 g',
  bodyDimensions: '163.0 x 77.6 x 8.3 mm',
  bodyWeight: '230 g',
  bodyBuild: 'Titanium frame, ceramic-shield front, glass back',
  bodySIM: 'Nano-SIM + eSIM (dual eSIM US)',
  bodyProtection: 'IP68 (water resistant 6 m for 30 min)',
  display: 'LTPO Super Retina XDR OLED, 120Hz, HDR10, Dolby Vision',
  displaySize: '6.9 inches, 6,068 mm² (~92.0% screen-to-body)',
  displayResolution: '1320 x 2868 pixels (~460 ppi)',
  displayProtection: 'Ceramic Shield 2 glass',
  displayFeatures: '120Hz ProMotion, HDR10, Dolby Vision, 2000 nits peak (HDR), Always-on',
  chip: 'Apple A19 Pro (3 nm)',
  processor: 'Hexa-core',
  cpu: '2 × 4.20 GHz performance + 4 × 2.40 GHz efficiency',
  gpu: 'Apple GPU (6-core, hardware ray-tracing)',
  ram: '12 GB LPDDR5X',
  storage: '256 GB / 512 GB / 1 TB / 2 TB (NVMe)',
  storageExpandable: 'No',
  mainCamera: 'Triple 48 MP — wide f/1.78 + 48 MP ultrawide f/2.2 + 48 MP 5× tetraprism telephoto f/2.8',
  mainCameraFeatures: 'LiDAR scanner, sensor-shift OIS, dual-pixel PDAF, Photonic Engine, Smart HDR 6, ProRAW, ProRes, Night mode',
  mainCameraVideo: '4K @ 24/25/30/60/120 fps, 1080p @ 25/30/60/120/240 fps, ProRes, Dolby Vision HDR, gyro-EIS',
  selfieCamera: '12 MP Center Stage, f/1.9, PDAF',
  selfieCameraFeatures: 'OIS, Face ID, Cinematic mode, Smart HDR 5',
  selfieCameraVideo: '4K @ 24/25/30/60 fps, 1080p @ 25/30/60/120 fps',
  battery: '4,832 mAh',
  batteryCharging: 'Wired (USB-C PD), MagSafe wireless 25 W, Qi2 wireless 15 W',
  batteryChargingSpeed: 'Wired ~35 W, 50% in 20 min',
  batteryLife: 'Up to 39 hours video playback',
  network: 'GSM / HSPA / LTE / 5G',
  network2G: COMMON_2G,
  network3G: COMMON_3G,
  network4G: COMMON_4G,
  network5G: COMMON_5G,
  networkSpeed: 'HSPA 42.2/5.76 Mbps · LTE-A Cat20 · 5G NR',
  commsWLAN: 'Wi-Fi 7 (802.11 be), tri-band, MIMO, hotspot',
  commsBluetooth: '5.3, A2DP, LE, aptX',
  commsNFC: 'Yes (Apple Pay)',
  commsUSB: 'USB Type-C 3.2 Gen 2 (10 Gb/s), DisplayPort, OTG',
  commsGPS: 'GPS (L1, L5), GLONASS, GALILEO, BDS, QZSS, NavIC',
  featuresSensors: 'Face ID, accelerometer, gyro, proximity, compass, barometer, LiDAR scanner',
  featuresRadio: 'No',
  soundLoudspeaker: 'Yes, with stereo speakers',
  soundJack: 'No',
  miscColors: 'Cosmic Orange, Deep Blue, Silver',
  miscModels: 'A3206, A3115',
};

const IPHONE_17_PRO: Partial<ProductSpecs> = {
  ...IPHONE_17_PRO_MAX,
  body: '149.5 x 71.5 x 8.3 mm, 199 g',
  bodyDimensions: '149.5 x 71.5 x 8.3 mm',
  bodyWeight: '199 g',
  displaySize: '6.3 inches',
  displayResolution: '1206 x 2622 pixels',
  battery: '3,650 mAh',
  batteryLife: 'Up to 33 hours video playback',
  miscModels: 'A3205, A3114',
};

const IPHONE_17: Partial<ProductSpecs> = {
  ...IPHONE_17_PRO,
  bodyBuild: 'Aluminium frame, ceramic-shield front, glass back',
  chip: 'Apple A19 (3 nm)',
  ram: '8 GB LPDDR5',
  storage: '256 GB / 512 GB',
  mainCamera: 'Dual 48 MP — wide f/1.6 + 12 MP ultrawide f/2.4',
  mainCameraFeatures: 'Sensor-shift OIS, Smart HDR 6',
  battery: '3,580 mAh',
  miscColors: 'Mist Blue, Sage, Lavender, Black Titanium, White',
  miscModels: 'A3204',
};

const IPHONE_16_PRO_MAX: Partial<ProductSpecs> = {
  os: 'iOS 18 (upgradable to iOS 19)',
  body: '163.0 x 77.6 x 8.3 mm, 227 g',
  bodyDimensions: '163.0 x 77.6 x 8.3 mm',
  bodyWeight: '227 g',
  bodyBuild: 'Titanium frame, ceramic-shield front, textured matte glass back',
  bodySIM: 'Nano-SIM + eSIM',
  bodyProtection: 'IP68 (6 m for 30 min)',
  display: 'LTPO Super Retina XDR OLED',
  displaySize: '6.9 inches',
  displayResolution: '1320 x 2868 pixels (~460 ppi)',
  displayProtection: 'Ceramic Shield glass',
  displayFeatures: '120Hz ProMotion, HDR10, Dolby Vision, 2000 nits peak, Always-on',
  chip: 'Apple A18 Pro (3 nm)',
  processor: 'Hexa-core',
  cpu: '2 × 4.04 GHz + 4 × 2.20 GHz',
  gpu: 'Apple GPU (6-core)',
  ram: '8 GB LPDDR5X',
  storage: '256 GB / 512 GB / 1 TB',
  storageExpandable: 'No',
  mainCamera: '48 MP wide f/1.78 + 48 MP ultrawide f/2.2 + 12 MP 5× tetraprism telephoto f/2.8',
  mainCameraFeatures: 'LiDAR scanner, sensor-shift OIS, ProRAW, ProRes',
  mainCameraVideo: '4K @ 24/25/30/60/120 fps, ProRes, Dolby Vision',
  selfieCamera: '12 MP f/1.9 Center Stage',
  selfieCameraFeatures: 'OIS, Face ID',
  selfieCameraVideo: '4K @ 24/25/30/60 fps',
  battery: '4,685 mAh',
  batteryCharging: 'Wired USB-C PD, MagSafe 25 W, Qi2 15 W',
  batteryChargingSpeed: '50% in 30 min',
  batteryLife: 'Up to 33 hours video playback',
  network: 'GSM / HSPA / LTE / 5G',
  network2G: COMMON_2G, network3G: COMMON_3G,
  network4G: COMMON_4G, network5G: COMMON_5G,
  networkSpeed: 'LTE-A, 5G',
  commsWLAN: 'Wi-Fi 7, tri-band, MIMO, hotspot',
  commsBluetooth: '5.3, A2DP, LE',
  commsNFC: 'Yes',
  commsUSB: 'USB Type-C 3.2 (10 Gb/s)',
  commsGPS: 'GPS (L1, L5), GLONASS, GALILEO, BDS, QZSS, NavIC',
  featuresSensors: 'Face ID, accelerometer, gyro, proximity, compass, barometer, LiDAR',
  soundLoudspeaker: 'Yes, with stereo speakers',
  soundJack: 'No',
  miscColors: 'Black Titanium, White Titanium, Natural Titanium, Desert Titanium',
  miscModels: 'A3083, A3294',
};

const IPHONE_15_PRO_MAX: Partial<ProductSpecs> = {
  os: 'iOS 17 (upgradable to iOS 19)',
  body: '159.9 x 76.7 x 8.3 mm, 221 g',
  bodyDimensions: '159.9 x 76.7 x 8.3 mm',
  bodyWeight: '221 g',
  bodyBuild: 'Titanium frame, glass back',
  bodySIM: 'Nano-SIM + eSIM',
  bodyProtection: 'IP68 (6 m for 30 min)',
  display: 'LTPO Super Retina XDR OLED',
  displaySize: '6.7 inches',
  displayResolution: '1290 x 2796 pixels',
  displayProtection: 'Ceramic Shield glass',
  displayFeatures: '120Hz ProMotion, HDR10, Dolby Vision, 2000 nits peak, Always-on',
  chip: 'Apple A17 Pro (3 nm)',
  processor: 'Hexa-core',
  cpu: '2 × 3.78 GHz + 4 × 2.11 GHz',
  gpu: 'Apple GPU (6-core)',
  ram: '8 GB LPDDR5',
  storage: '256 GB / 512 GB / 1 TB',
  storageExpandable: 'No',
  mainCamera: '48 MP f/1.78 + 12 MP ultrawide f/2.2 + 12 MP 5× telephoto f/2.8',
  mainCameraFeatures: 'LiDAR, sensor-shift OIS, ProRAW, ProRes',
  mainCameraVideo: '4K @ 24/25/30/60 fps, ProRes',
  selfieCamera: '12 MP f/1.9',
  selfieCameraFeatures: 'PDAF, OIS, Face ID',
  selfieCameraVideo: '4K @ 24/25/30/60 fps',
  battery: '4,422 mAh',
  batteryCharging: 'Wired USB-C, MagSafe 15 W, Qi2 15 W',
  batteryChargingSpeed: 'Wired ~27 W, 50% in 30 min',
  batteryLife: 'Up to 29 hours video playback',
  network: 'GSM / HSPA / LTE / 5G',
  network2G: COMMON_2G, network3G: COMMON_3G,
  network4G: COMMON_4G, network5G: COMMON_5G,
  networkSpeed: 'LTE-A, 5G NR',
  commsWLAN: 'Wi-Fi 6E, tri-band, MIMO',
  commsBluetooth: '5.3, A2DP, LE',
  commsNFC: 'Yes',
  commsUSB: 'USB Type-C 3.2 (10 Gb/s)',
  commsGPS: 'GPS (L1, L5), GLONASS, GALILEO, BDS, QZSS, NavIC',
  featuresSensors: 'Face ID, accelerometer, gyro, proximity, compass, barometer, LiDAR',
  soundLoudspeaker: 'Yes, with stereo speakers',
  soundJack: 'No',
  miscColors: 'Natural Titanium, Blue Titanium, White Titanium, Black Titanium',
  miscModels: 'A2849, A3105',
};

// ── Samsung Galaxy bases ──────────────────────────────────────────────
const GALAXY_S23_ULTRA: Partial<ProductSpecs> = {
  os: 'Android 13 (upgradable to 14, One UI 6)',
  body: '163.4 x 78.1 x 8.9 mm, 234 g',
  bodyDimensions: '163.4 x 78.1 x 8.9 mm',
  bodyWeight: '234 g',
  bodyBuild: 'Aluminium frame, Gorilla Glass Victus 2 front + back',
  bodySIM: 'Nano-SIM + eSIM',
  bodyProtection: 'IP68 (1.5 m for 30 min)',
  display: 'Dynamic AMOLED 2X, 120Hz',
  displaySize: '6.8 inches',
  displayResolution: '1440 x 3088 pixels',
  displayProtection: 'Corning Gorilla Glass Victus 2',
  displayFeatures: '120Hz, HDR10+, 1750 nits peak',
  chip: 'Qualcomm Snapdragon 8 Gen 2 for Galaxy (4 nm)',
  processor: 'Octa-core',
  cpu: '1 × 3.36 GHz Cortex-X3 + 2 × 2.8 GHz A715 + 2 × 2.8 GHz A710 + 3 × 2.0 GHz A510',
  gpu: 'Adreno 740',
  ram: '8 GB / 12 GB LPDDR5X',
  storage: '256 GB / 512 GB / 1 TB UFS 4.0',
  storageExpandable: 'No',
  mainCamera: '200 MP wide f/1.7 + 12 MP ultrawide + 10 MP 3× tele + 10 MP 10× tele',
  mainCameraFeatures: 'Laser AF, OIS, expert RAW, 100× Space Zoom',
  mainCameraVideo: '8K @ 30 fps, 4K @ 60 fps, HDR10+',
  selfieCamera: '12 MP f/2.2 dual-pixel PDAF',
  selfieCameraFeatures: 'HDR, video calling',
  selfieCameraVideo: '4K @ 30/60 fps',
  battery: '5,000 mAh',
  batteryCharging: 'Wired 45 W, Wireless 15 W, Reverse wireless 4.5 W',
  batteryChargingSpeed: '65% in 30 min',
  batteryLife: 'Up to 26 hours video playback',
  network: 'GSM / HSPA / LTE / 5G',
  network2G: COMMON_2G, network3G: COMMON_3G,
  network4G: COMMON_4G, network5G: COMMON_5G,
  networkSpeed: 'HSPA, LTE-A, 5G',
  commsWLAN: 'Wi-Fi 6E, tri-band, Wi-Fi Direct',
  commsBluetooth: '5.3, A2DP, LE',
  commsNFC: 'Yes',
  commsUSB: 'USB Type-C 3.2 (5 Gb/s), OTG, DisplayPort 1.4',
  commsGPS: 'GPS, GLONASS, GALILEO, BDS, QZSS',
  featuresSensors: 'Fingerprint (under display, ultrasonic), accelerometer, gyro, proximity, compass, barometer, S-Pen',
  soundLoudspeaker: 'Yes, with stereo speakers',
  soundJack: 'No',
  miscColors: 'Phantom Black, Cream, Green, Lavender, Graphite, Lime, Sky Blue, Red',
  miscModels: 'SM-S918B, SM-S918U',
};

// ── Google Pixel bases ────────────────────────────────────────────────
const PIXEL_7_PRO: Partial<ProductSpecs> = {
  os: 'Android 13 (upgradable to 14)',
  body: '162.9 x 76.6 x 8.9 mm, 212 g',
  bodyDimensions: '162.9 x 76.6 x 8.9 mm',
  bodyWeight: '212 g',
  bodyBuild: 'Aluminium frame, Gorilla Glass Victus front + back',
  bodySIM: 'Nano-SIM + eSIM',
  bodyProtection: 'IP68 (1.5 m for 30 min)',
  display: 'LTPO AMOLED, 120Hz, HDR10+, 1500 nits peak',
  displaySize: '6.7 inches',
  displayResolution: '1440 x 3120 pixels',
  displayProtection: 'Corning Gorilla Glass Victus',
  displayFeatures: '120Hz, HDR10+, Always-on',
  chip: 'Google Tensor G2 (5 nm)',
  processor: 'Octa-core',
  cpu: '2 × 2.85 GHz Cortex-X1 + 2 × 2.35 GHz A78 + 4 × 1.80 GHz A55',
  gpu: 'Mali-G710 MP7',
  ram: '12 GB LPDDR5',
  storage: '128 GB / 256 GB / 512 GB UFS 3.1',
  storageExpandable: 'No',
  mainCamera: '50 MP wide f/1.85 + 12 MP ultrawide + 48 MP 5× telephoto f/3.5',
  mainCameraFeatures: 'Multi-zone laser AF, OIS, dual-pixel PDAF, Magic Eraser',
  mainCameraVideo: '4K @ 24/30/60 fps, 1080p @ 30/60/120/240 fps',
  selfieCamera: '10.8 MP wide f/2.2 ultrawide',
  selfieCameraFeatures: 'HDR, panorama',
  selfieCameraVideo: '4K @ 30/60 fps',
  battery: '5,000 mAh',
  batteryCharging: 'Wired 23 W, Wireless 23 W (Pixel Stand 2nd gen), Reverse wireless',
  batteryChargingSpeed: '50% in 30 min',
  batteryLife: 'Up to 24 hours, 72h with Extreme Battery Saver',
  network: 'GSM / HSPA / LTE / 5G',
  network2G: COMMON_2G, network3G: COMMON_3G,
  network4G: COMMON_4G, network5G: COMMON_5G,
  networkSpeed: 'HSPA, LTE-A, 5G',
  commsWLAN: 'Wi-Fi 6E, tri-band, Wi-Fi Direct',
  commsBluetooth: '5.2, A2DP, LE',
  commsNFC: 'Yes',
  commsUSB: 'USB Type-C 3.2',
  commsGPS: 'GPS, GLONASS, GALILEO, BDS, QZSS',
  featuresSensors: 'Fingerprint (under display, optical), accelerometer, gyro, proximity, compass, barometer',
  soundLoudspeaker: 'Yes, with stereo speakers',
  soundJack: 'No',
  miscColors: 'Obsidian, Snow, Hazel',
  miscModels: 'GP4BC, GE2AE',
};

// ── iPad base ────────────────────────────────────────────────────────
const IPAD_AIR_2022: Partial<ProductSpecs> = {
  os: 'iPadOS 15 (upgradable)',
  body: '247.6 x 178.5 x 6.1 mm, 461 g',
  bodyDimensions: '247.6 x 178.5 x 6.1 mm',
  bodyWeight: '461 g',
  bodyBuild: 'Aluminium frame, glass back',
  bodySIM: 'Wi-Fi only / Wi-Fi + Cellular (Nano-SIM + eSIM)',
  bodyProtection: 'No formal IP rating',
  display: 'LED-backlit IPS LCD, P3 wide colour, True Tone',
  displaySize: '10.9 inches',
  displayResolution: '1640 x 2360 pixels',
  displayProtection: 'Anti-fingerprint oleophobic coating',
  displayFeatures: '60Hz, 500 nits, P3, True Tone',
  chip: 'Apple M1 (5 nm)',
  processor: 'Octa-core',
  cpu: '4 × 3.2 GHz Firestorm + 4 × 2.06 GHz Icestorm',
  gpu: 'Apple GPU (8-core)',
  ram: '8 GB',
  storage: '64 GB / 256 GB',
  storageExpandable: 'No',
  mainCamera: '12 MP wide f/1.8',
  mainCameraFeatures: 'Smart HDR 3',
  mainCameraVideo: '4K @ 24/25/30/60 fps',
  selfieCamera: '12 MP ultrawide f/2.4',
  selfieCameraFeatures: 'Centre Stage',
  selfieCameraVideo: '1080p @ 25/30/60 fps',
  battery: '7,606 mAh',
  batteryCharging: 'Wired 20 W via USB-C',
  batteryChargingSpeed: '50% in ~1.5 hour',
  batteryLife: 'Up to 10 hours web/video',
  network: 'GSM / HSPA / LTE / 5G (cellular models)',
  network2G: COMMON_2G, network3G: COMMON_3G,
  network4G: COMMON_4G, network5G: COMMON_5G,
  commsWLAN: 'Wi-Fi 6, dual-band, hotspot',
  commsBluetooth: '5.0, A2DP',
  commsNFC: 'No',
  commsUSB: 'USB Type-C, supports up to 10 Gb/s',
  commsGPS: 'Cellular models only',
  featuresSensors: 'Touch ID (top button), accelerometer, gyro, compass, barometer',
  soundLoudspeaker: 'Yes, stereo (landscape)',
  soundJack: 'No',
  miscColors: 'Space Grey, Pink, Purple, Blue, Starlight',
  miscModels: 'A2588, A2589, A2591',
};

// ── Brand-level final-fallback defaults ───────────────────────────────
const BRAND_DEFAULTS: Record<string, Partial<ProductSpecs>> = {
  Apple: {
    os: 'iOS',
    bodyBuild: 'Aluminium / titanium frame, glass back',
    bodySIM: 'Nano-SIM + eSIM',
    soundJack: 'No',
    commsUSB: 'USB Type-C',
  },
  Samsung: {
    os: 'Android, One UI',
    bodyBuild: 'Aluminium frame, glass front + back',
    bodySIM: 'Nano-SIM (or dual)',
    commsUSB: 'USB Type-C',
  },
  Google: {
    os: 'Android (Pixel Launcher)',
    bodyBuild: 'Aluminium frame, glass back',
    bodySIM: 'Nano-SIM + eSIM',
    commsUSB: 'USB Type-C',
  },
};

// ── Family rules walked top-down ──────────────────────────────────────
const FAMILY_SPECS: Array<[RegExp, Partial<ProductSpecs>]> = [
  [/iPhone\s*17\s*Pro\s*Max/i, IPHONE_17_PRO_MAX],
  [/iPhone\s*17\s*Pro/i,       IPHONE_17_PRO],
  [/iPhone\s*17/i,             IPHONE_17],
  [/iPhone\s*16\s*Pro\s*Max/i, IPHONE_16_PRO_MAX],
  [/iPhone\s*16\s*Pro/i,       IPHONE_16_PRO_MAX],
  [/iPhone\s*16\s*Plus/i,      IPHONE_16_PRO_MAX],
  [/iPhone\s*16/i,             IPHONE_16_PRO_MAX],
  [/iPhone\s*15\s*Pro\s*Max/i, IPHONE_15_PRO_MAX],
  [/iPhone\s*15\s*Pro/i,       IPHONE_15_PRO_MAX],
  [/iPhone\s*15/i,             IPHONE_15_PRO_MAX],
  [/iPhone\s*14/i,             IPHONE_15_PRO_MAX],
  [/iPhone\s*13/i,             IPHONE_15_PRO_MAX],
  [/iPhone\s*12/i,             IPHONE_15_PRO_MAX],
  [/iPhone\s*11/i,             IPHONE_15_PRO_MAX],
  [/iPhone\s*X/i,              IPHONE_15_PRO_MAX],
  [/iPhone\s*SE/i,             IPHONE_15_PRO_MAX],
  [/iPhone\s*8/i,              IPHONE_15_PRO_MAX],
  [/Galaxy\s*S(2[3-9]|3\d).*Ultra/i, GALAXY_S23_ULTRA],
  [/Galaxy\s*S\d/i,                  GALAXY_S23_ULTRA],
  [/Galaxy\s*Note/i,                 GALAXY_S23_ULTRA],
  [/Galaxy\s*Z\s*(Fold|Flip)/i,      GALAXY_S23_ULTRA],
  [/Galaxy\s*A\d/i,                  GALAXY_S23_ULTRA],
  [/Galaxy\s*Tab/i,                  IPAD_AIR_2022],
  [/Pixel\s*\d.*Pro/i,               PIXEL_7_PRO],
  [/Pixel\s*\d/i,                    PIXEL_7_PRO],
  [/iPad\s*Air/i,                    IPAD_AIR_2022],
  [/iPad\s*Pro/i,                    IPAD_AIR_2022],
  [/iPad\s*Mini/i,                   IPAD_AIR_2022],
  [/iPad/i,                          IPAD_AIR_2022],
];

/** Merge two ProductSpecs blocks; left (existing) wins on conflict. */
function merge(base: ProductSpecs, fill: Partial<ProductSpecs>): ProductSpecs {
  const out: ProductSpecs = { ...base };
  for (const [k, v] of Object.entries(fill) as [keyof ProductSpecs, string | undefined][]) {
    if (out[k] === undefined || out[k] === '' || out[k] === null) {
      (out as Record<keyof ProductSpecs, string | undefined>)[k] = v;
    }
  }
  return out;
}

/**
 * Augment a product's existing specs with family / brand defaults so
 * the Technical Specifications panel always shows a full GSMArena-
 * style sheet — Network, Launch, Body, Display, Platform, Memory,
 * Camera, Sound, Comms, Sensors, Battery, Misc.
 */
export function enrichSpecs(brand: string, model: string, base: ProductSpecs): ProductSpecs {
  let merged = base;
  for (const [re, fill] of FAMILY_SPECS) {
    if (re.test(model)) { merged = merge(merged, fill); break; }
  }
  const brandFill = BRAND_DEFAULTS[brand];
  if (brandFill) merged = merge(merged, brandFill);
  return merged;
}
