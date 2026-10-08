/**
 * Apple reference catalogue: every iPhone, iPad and Apple Watch released
 * from 2020 onwards, with the options Apple actually sold — finishes, storage
 * and connectivity — and the headline specs a buyer compares.
 *
 * This is reference data, not stock. The admin "Catalogue import" screen
 * (src/components/admin/CatalogueImportPage.tsx) turns each model into a
 * draft product with one configuration per storage × colour × connectivity.
 * Drafts are hidden from the shop until staff add a condition, a price and
 * photos, and switch the product to listed. Nothing here carries a price or
 * an image on purpose: refurbished prices are the shop's decision, and the
 * photos must be of the actual stock.
 *
 * Sources: Apple's tech specs and newsroom, cross-checked against Apple
 * Support's "Identify your iPhone / iPad / Apple Watch" pages. Models released
 * after a field was certain carry `verify` notes the import screen shows, so
 * staff check those before listing.
 *
 * Mid-cycle colours (e.g. iPhone 12 Purple, April 2021) are included: a
 * refurbished shop sells whatever finish the stock arrives in.
 */

export type CatalogueFamily = 'iPhone' | 'iPad' | 'Apple Watch';

export interface CatalogueColour {
  name: string;
  /** Approximate finish colour for the swatch on the product page. */
  hex: string;
}

export interface CatalogueModel {
  /** Product slug and Firestore document id. */
  id: string;
  brand: 'Apple';
  family: CatalogueFamily;
  /** Shop category, matching ProductCategory. */
  category: 'Phones' | 'Tablets' | 'Smartwatches';
  model: string;
  /** Year and month of release, e.g. "2020-10". */
  released: string;
  colours: CatalogueColour[];
  /** Selectable storage. Empty for Apple Watch, whose storage is fixed. */
  storage: string[];
  /** Selectable connectivity, e.g. Wi-Fi / Wi-Fi + Cellular. */
  connectivity?: string[];
  specs: Record<string, string>;
  /** Things staff should confirm before listing, shown on the import screen. */
  verify?: string;
}

// ── Finishes ─────────────────────────────────────────────────────────────
// Named once so a finish shared by several models has one swatch colour.
const C = {
  black: { name: 'Black', hex: '#1f2020' },
  white: { name: 'White', hex: '#f5f5f0' },
  red: { name: '(PRODUCT)RED', hex: '#bf0013' },
  green12: { name: 'Green', hex: '#d8efd5' },
  blue12: { name: 'Blue', hex: '#233a5e' },
  purple12: { name: 'Purple', hex: '#b7afe6' },
  graphite: { name: 'Graphite', hex: '#54524f' },
  silver: { name: 'Silver', hex: '#e3e4e5' },
  gold: { name: 'Gold', hex: '#f3e2c7' },
  pacificBlue: { name: 'Pacific Blue', hex: '#2e4a5e' },
  midnight: { name: 'Midnight', hex: '#232a31' },
  starlight: { name: 'Starlight', hex: '#f0e9df' },
  blue13: { name: 'Blue', hex: '#276787' },
  pink13: { name: 'Pink', hex: '#f9e0dc' },
  green13: { name: 'Green', hex: '#394c38' },
  sierraBlue: { name: 'Sierra Blue', hex: '#a7c1d9' },
  alpineGreen: { name: 'Alpine Green', hex: '#576856' },
  purple14: { name: 'Purple', hex: '#e5ddea' },
  blue14: { name: 'Blue', hex: '#a0b4c7' },
  yellow14: { name: 'Yellow', hex: '#f9e479' },
  spaceBlack: { name: 'Space Black', hex: '#403e3d' },
  deepPurple: { name: 'Deep Purple', hex: '#594f63' },
  black15: { name: 'Black', hex: '#35393b' },
  blue15: { name: 'Blue', hex: '#d4e4ed' },
  green15: { name: 'Green', hex: '#e3e8d8' },
  yellow15: { name: 'Yellow', hex: '#f9f1c8' },
  pink15: { name: 'Pink', hex: '#f6dfe1' },
  blackTitanium: { name: 'Black Titanium', hex: '#3c3c3d' },
  whiteTitanium: { name: 'White Titanium', hex: '#f2f1ed' },
  blueTitanium: { name: 'Blue Titanium', hex: '#3f4c5b' },
  naturalTitanium: { name: 'Natural Titanium', hex: '#bab4a9' },
  desertTitanium: { name: 'Desert Titanium', hex: '#bfa48f' },
  pink16: { name: 'Pink', hex: '#f2adda' },
  teal: { name: 'Teal', hex: '#b0d4d2' },
  ultramarine: { name: 'Ultramarine', hex: '#9aadf6' },
  mistBlue: { name: 'Mist Blue', hex: '#a8bdd2' },
  sage: { name: 'Sage', hex: '#b8c3a8' },
  lavender: { name: 'Lavender', hex: '#d9c9e8' },
  skyBlue: { name: 'Sky Blue', hex: '#dbe8f2' },
  lightGold: { name: 'Light Gold', hex: '#efe2c8' },
  cloudWhite: { name: 'Cloud White', hex: '#f4f4f2' },
  cosmicOrange: { name: 'Cosmic Orange', hex: '#f2742b' },
  deepBlue: { name: 'Deep Blue', hex: '#2f3b52' },
  softPink: { name: 'Soft Pink', hex: '#f3d6d6' },
  glacier: { name: 'Glacier', hex: '#c9dcea' },
  burgundy: { name: 'Burgundy', hex: '#6b2a35' },
  // iPad
  spaceGrey: { name: 'Space Grey', hex: '#7d7e80' },
  roseGold: { name: 'Rose Gold', hex: '#e8c4b8' },
  greenAir4: { name: 'Green', hex: '#c3d5c0' },
  skyBlueAir4: { name: 'Sky Blue', hex: '#a9c6d8' },
  pinkAir5: { name: 'Pink', hex: '#e9cbc8' },
  purpleAir5: { name: 'Purple', hex: '#b9b3d6' },
  blueAir5: { name: 'Blue', hex: '#8fa7c4' },
  blueAir: { name: 'Blue', hex: '#a6bccf' },
  purpleAir: { name: 'Purple', hex: '#c9bfdc' },
  blueIpad: { name: 'Blue', hex: '#98b6d4' },
  pinkIpad: { name: 'Pink', hex: '#efb7c6' },
  yellowIpad: { name: 'Yellow', hex: '#f6dc6a' },
  pinkMini: { name: 'Pink', hex: '#e8cfcc' },
  purpleMini: { name: 'Purple', hex: '#c3bcdc' },
  blueMini: { name: 'Blue', hex: '#a9bdd0' },
  // Apple Watch
  blueWatch: { name: 'Blue', hex: '#3d5a80' },
  greenWatch: { name: 'Green', hex: '#3d4b3f' },
  pinkWatch: { name: 'Pink', hex: '#f1cfcb' },
  jetBlack: { name: 'Jet Black', hex: '#141414' },
  slate: { name: 'Slate', hex: '#5a5b5e' },
  natural: { name: 'Natural', hex: '#c9c4bb' },
  blackTi: { name: 'Black', hex: '#2b2b2c' },
  darkBronze: { name: 'Dark Bronze', hex: '#5e4a3a' },
} satisfies Record<string, CatalogueColour>;

const IPHONE = { brand: 'Apple' as const, family: 'iPhone' as const, category: 'Phones' as const };
const IPAD = { brand: 'Apple' as const, family: 'iPad' as const, category: 'Tablets' as const };
const WATCH = { brand: 'Apple' as const, family: 'Apple Watch' as const, category: 'Smartwatches' as const };

const IPAD_RADIO = ['Wi-Fi', 'Wi-Fi + Cellular'];
const WATCH_RADIO = ['GPS', 'GPS + Cellular'];
const CELLULAR_ONLY = ['GPS + Cellular'];

const S64_256 = ['64GB', '128GB', '256GB'];
const S128_512 = ['128GB', '256GB', '512GB'];
const S128_1T = ['128GB', '256GB', '512GB', '1TB'];
const S256_1T = ['256GB', '512GB', '1TB'];
const S256_2T = ['256GB', '512GB', '1TB', '2TB'];

const colourList = (cs: CatalogueColour[]) => cs.map(c => c.name).join(', ');

// ── iPhone ───────────────────────────────────────────────────────────────
function iphone(
  id: string, model: string, released: string, colours: CatalogueColour[], storage: string[],
  specs: Record<string, string>, verify?: string,
): CatalogueModel {
  return {
    ...IPHONE, id, model, released, colours, storage, verify,
    specs: { ...specs, storage: storage.join(' / '), miscColors: colourList(colours) },
  };
}

const IPHONES: CatalogueModel[] = [
  iphone('apple-iphone-se-2nd-gen', 'iPhone SE (2nd generation)', '2020-04', [C.black, C.white, C.red], S64_256, {
    displaySize: '4.7-inch', display: 'Retina HD LCD', chip: 'A13 Bionic',
    mainCamera: '12MP Wide', selfieCamera: '7MP', network: '4G LTE', bodySIM: 'Nano-SIM + eSIM',
    bodyWeight: '148g', features: 'Touch ID, IP67', commsUSB: 'Lightning', os: 'iOS 13',
  }),
  iphone('apple-iphone-12-mini', 'iPhone 12 mini', '2020-11', [C.black, C.white, C.red, C.green12, C.blue12, C.purple12], S64_256, {
    displaySize: '5.4-inch', display: 'Super Retina XDR OLED', chip: 'A14 Bionic',
    mainCamera: 'Dual 12MP (Wide, Ultra Wide)', selfieCamera: '12MP TrueDepth', network: '5G',
    bodySIM: 'Nano-SIM + eSIM', bodyWeight: '133g', features: 'Face ID, MagSafe, Ceramic Shield, IP68',
    commsUSB: 'Lightning', os: 'iOS 14',
  }),
  iphone('apple-iphone-12', 'iPhone 12', '2020-10', [C.black, C.white, C.red, C.green12, C.blue12, C.purple12], S64_256, {
    displaySize: '6.1-inch', display: 'Super Retina XDR OLED', chip: 'A14 Bionic',
    mainCamera: 'Dual 12MP (Wide, Ultra Wide)', selfieCamera: '12MP TrueDepth', network: '5G',
    bodySIM: 'Nano-SIM + eSIM', bodyWeight: '164g', features: 'Face ID, MagSafe, Ceramic Shield, IP68',
    commsUSB: 'Lightning', os: 'iOS 14',
  }),
  iphone('apple-iphone-12-pro', 'iPhone 12 Pro', '2020-10', [C.graphite, C.silver, C.gold, C.pacificBlue], S128_512, {
    displaySize: '6.1-inch', display: 'Super Retina XDR OLED', chip: 'A14 Bionic',
    mainCamera: 'Triple 12MP (Wide, Ultra Wide, 2x Telephoto) + LiDAR', selfieCamera: '12MP TrueDepth',
    network: '5G', bodySIM: 'Nano-SIM + eSIM', bodyWeight: '189g', bodyBuild: 'Stainless steel frame',
    features: 'Face ID, MagSafe, Ceramic Shield, IP68', commsUSB: 'Lightning', os: 'iOS 14',
  }),
  iphone('apple-iphone-12-pro-max', 'iPhone 12 Pro Max', '2020-11', [C.graphite, C.silver, C.gold, C.pacificBlue], S128_512, {
    displaySize: '6.7-inch', display: 'Super Retina XDR OLED', chip: 'A14 Bionic',
    mainCamera: 'Triple 12MP (Wide, Ultra Wide, 2.5x Telephoto) + LiDAR', selfieCamera: '12MP TrueDepth',
    network: '5G', bodySIM: 'Nano-SIM + eSIM', bodyWeight: '228g', bodyBuild: 'Stainless steel frame',
    features: 'Face ID, MagSafe, Ceramic Shield, IP68', commsUSB: 'Lightning', os: 'iOS 14',
  }),
  iphone('apple-iphone-13-mini', 'iPhone 13 mini', '2021-09', [C.midnight, C.starlight, C.blue13, C.pink13, C.red, C.green13], S128_512, {
    displaySize: '5.4-inch', display: 'Super Retina XDR OLED', chip: 'A15 Bionic',
    mainCamera: 'Dual 12MP (Wide, Ultra Wide)', selfieCamera: '12MP TrueDepth', network: '5G',
    bodySIM: 'Nano-SIM + eSIM', bodyWeight: '140g', features: 'Face ID, MagSafe, Ceramic Shield, IP68',
    commsUSB: 'Lightning', os: 'iOS 15',
  }),
  iphone('apple-iphone-13', 'iPhone 13', '2021-09', [C.midnight, C.starlight, C.blue13, C.pink13, C.red, C.green13], S128_512, {
    displaySize: '6.1-inch', display: 'Super Retina XDR OLED', chip: 'A15 Bionic',
    mainCamera: 'Dual 12MP (Wide, Ultra Wide)', selfieCamera: '12MP TrueDepth', network: '5G',
    bodySIM: 'Nano-SIM + eSIM', bodyWeight: '173g', features: 'Face ID, MagSafe, Ceramic Shield, IP68',
    commsUSB: 'Lightning', os: 'iOS 15',
  }),
  iphone('apple-iphone-13-pro', 'iPhone 13 Pro', '2021-09', [C.graphite, C.gold, C.silver, C.sierraBlue, C.alpineGreen], S128_1T, {
    displaySize: '6.1-inch', display: 'Super Retina XDR OLED with ProMotion (120Hz)', chip: 'A15 Bionic',
    mainCamera: 'Triple 12MP (Wide, Ultra Wide, 3x Telephoto) + LiDAR', selfieCamera: '12MP TrueDepth',
    network: '5G', bodySIM: 'Nano-SIM + eSIM', bodyWeight: '203g', bodyBuild: 'Stainless steel frame',
    features: 'Face ID, MagSafe, Ceramic Shield, IP68', commsUSB: 'Lightning', os: 'iOS 15',
  }),
  iphone('apple-iphone-13-pro-max', 'iPhone 13 Pro Max', '2021-09', [C.graphite, C.gold, C.silver, C.sierraBlue, C.alpineGreen], S128_1T, {
    displaySize: '6.7-inch', display: 'Super Retina XDR OLED with ProMotion (120Hz)', chip: 'A15 Bionic',
    mainCamera: 'Triple 12MP (Wide, Ultra Wide, 3x Telephoto) + LiDAR', selfieCamera: '12MP TrueDepth',
    network: '5G', bodySIM: 'Nano-SIM + eSIM', bodyWeight: '238g', bodyBuild: 'Stainless steel frame',
    features: 'Face ID, MagSafe, Ceramic Shield, IP68', commsUSB: 'Lightning', os: 'iOS 15',
  }),
  iphone('apple-iphone-se-3rd-gen', 'iPhone SE (3rd generation)', '2022-03', [C.midnight, C.starlight, C.red], S64_256, {
    displaySize: '4.7-inch', display: 'Retina HD LCD', chip: 'A15 Bionic',
    mainCamera: '12MP Wide', selfieCamera: '7MP', network: '5G', bodySIM: 'Nano-SIM + eSIM',
    bodyWeight: '144g', features: 'Touch ID, IP67', commsUSB: 'Lightning', os: 'iOS 15',
  }),
  iphone('apple-iphone-14', 'iPhone 14', '2022-09', [C.midnight, C.starlight, C.purple14, C.blue14, C.red, C.yellow14], S128_512, {
    displaySize: '6.1-inch', display: 'Super Retina XDR OLED', chip: 'A15 Bionic (5-core GPU)',
    mainCamera: 'Dual 12MP (Main, Ultra Wide)', selfieCamera: '12MP TrueDepth with autofocus', network: '5G',
    bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '172g',
    features: 'Face ID, MagSafe, Crash Detection, Emergency SOS via satellite, IP68', commsUSB: 'Lightning', os: 'iOS 16',
  }),
  iphone('apple-iphone-14-plus', 'iPhone 14 Plus', '2022-10', [C.midnight, C.starlight, C.purple14, C.blue14, C.red, C.yellow14], S128_512, {
    displaySize: '6.7-inch', display: 'Super Retina XDR OLED', chip: 'A15 Bionic (5-core GPU)',
    mainCamera: 'Dual 12MP (Main, Ultra Wide)', selfieCamera: '12MP TrueDepth with autofocus', network: '5G',
    bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '203g',
    features: 'Face ID, MagSafe, Crash Detection, Emergency SOS via satellite, IP68', commsUSB: 'Lightning', os: 'iOS 16',
  }),
  iphone('apple-iphone-14-pro', 'iPhone 14 Pro', '2022-09', [C.spaceBlack, C.silver, C.gold, C.deepPurple], S128_1T, {
    displaySize: '6.1-inch', display: 'Super Retina XDR OLED, ProMotion, Always-On, Dynamic Island', chip: 'A16 Bionic',
    mainCamera: '48MP Main, 12MP Ultra Wide, 12MP 3x Telephoto + LiDAR', selfieCamera: '12MP TrueDepth with autofocus',
    network: '5G', bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '206g', bodyBuild: 'Stainless steel frame',
    features: 'Face ID, MagSafe, Crash Detection, Emergency SOS via satellite, IP68', commsUSB: 'Lightning', os: 'iOS 16',
  }),
  iphone('apple-iphone-14-pro-max', 'iPhone 14 Pro Max', '2022-09', [C.spaceBlack, C.silver, C.gold, C.deepPurple], S128_1T, {
    displaySize: '6.7-inch', display: 'Super Retina XDR OLED, ProMotion, Always-On, Dynamic Island', chip: 'A16 Bionic',
    mainCamera: '48MP Main, 12MP Ultra Wide, 12MP 3x Telephoto + LiDAR', selfieCamera: '12MP TrueDepth with autofocus',
    network: '5G', bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '240g', bodyBuild: 'Stainless steel frame',
    features: 'Face ID, MagSafe, Crash Detection, Emergency SOS via satellite, IP68', commsUSB: 'Lightning', os: 'iOS 16',
  }),
  iphone('apple-iphone-15', 'iPhone 15', '2023-09', [C.black15, C.blue15, C.green15, C.yellow15, C.pink15], S128_512, {
    displaySize: '6.1-inch', display: 'Super Retina XDR OLED, Dynamic Island', chip: 'A16 Bionic',
    mainCamera: '48MP Main, 12MP Ultra Wide', selfieCamera: '12MP TrueDepth', network: '5G',
    bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '171g', features: 'Face ID, MagSafe, IP68',
    commsUSB: 'USB-C (USB 2)', os: 'iOS 17',
  }),
  iphone('apple-iphone-15-plus', 'iPhone 15 Plus', '2023-09', [C.black15, C.blue15, C.green15, C.yellow15, C.pink15], S128_512, {
    displaySize: '6.7-inch', display: 'Super Retina XDR OLED, Dynamic Island', chip: 'A16 Bionic',
    mainCamera: '48MP Main, 12MP Ultra Wide', selfieCamera: '12MP TrueDepth', network: '5G',
    bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '201g', features: 'Face ID, MagSafe, IP68',
    commsUSB: 'USB-C (USB 2)', os: 'iOS 17',
  }),
  iphone('apple-iphone-15-pro', 'iPhone 15 Pro', '2023-09', [C.blackTitanium, C.whiteTitanium, C.blueTitanium, C.naturalTitanium], S128_1T, {
    displaySize: '6.1-inch', display: 'Super Retina XDR OLED, ProMotion, Always-On, Dynamic Island', chip: 'A17 Pro',
    mainCamera: '48MP Main, 12MP Ultra Wide, 12MP 3x Telephoto + LiDAR', selfieCamera: '12MP TrueDepth',
    network: '5G', bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '187g', bodyBuild: 'Titanium frame',
    features: 'Face ID, Action button, MagSafe, IP68', commsUSB: 'USB-C (USB 3)', os: 'iOS 17',
  }),
  iphone('apple-iphone-15-pro-max', 'iPhone 15 Pro Max', '2023-09', [C.blackTitanium, C.whiteTitanium, C.blueTitanium, C.naturalTitanium], S256_1T, {
    displaySize: '6.7-inch', display: 'Super Retina XDR OLED, ProMotion, Always-On, Dynamic Island', chip: 'A17 Pro',
    mainCamera: '48MP Main, 12MP Ultra Wide, 12MP 5x Telephoto + LiDAR', selfieCamera: '12MP TrueDepth',
    network: '5G', bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '221g', bodyBuild: 'Titanium frame',
    features: 'Face ID, Action button, MagSafe, IP68', commsUSB: 'USB-C (USB 3)', os: 'iOS 17',
  }),
  iphone('apple-iphone-16', 'iPhone 16', '2024-09', [C.black, C.white, C.pink16, C.teal, C.ultramarine], S128_512, {
    displaySize: '6.1-inch', display: 'Super Retina XDR OLED, Dynamic Island', chip: 'A18',
    mainCamera: '48MP Fusion, 12MP Ultra Wide', selfieCamera: '12MP TrueDepth', network: '5G',
    bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '170g', features: 'Face ID, Camera Control, Action button, MagSafe, IP68',
    commsUSB: 'USB-C (USB 2)', os: 'iOS 18',
  }),
  iphone('apple-iphone-16-plus', 'iPhone 16 Plus', '2024-09', [C.black, C.white, C.pink16, C.teal, C.ultramarine], S128_512, {
    displaySize: '6.7-inch', display: 'Super Retina XDR OLED, Dynamic Island', chip: 'A18',
    mainCamera: '48MP Fusion, 12MP Ultra Wide', selfieCamera: '12MP TrueDepth', network: '5G',
    bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '199g', features: 'Face ID, Camera Control, Action button, MagSafe, IP68',
    commsUSB: 'USB-C (USB 2)', os: 'iOS 18',
  }),
  iphone('apple-iphone-16-pro', 'iPhone 16 Pro', '2024-09', [C.blackTitanium, C.whiteTitanium, C.naturalTitanium, C.desertTitanium], S128_1T, {
    displaySize: '6.3-inch', display: 'Super Retina XDR OLED, ProMotion, Always-On, Dynamic Island', chip: 'A18 Pro',
    mainCamera: '48MP Fusion, 48MP Ultra Wide, 12MP 5x Telephoto + LiDAR', selfieCamera: '12MP TrueDepth',
    network: '5G', bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '199g', bodyBuild: 'Titanium frame',
    features: 'Face ID, Camera Control, Action button, MagSafe, IP68', commsUSB: 'USB-C (USB 3)', os: 'iOS 18',
  }),
  iphone('apple-iphone-16-pro-max', 'iPhone 16 Pro Max', '2024-09', [C.blackTitanium, C.whiteTitanium, C.naturalTitanium, C.desertTitanium], S256_1T, {
    displaySize: '6.9-inch', display: 'Super Retina XDR OLED, ProMotion, Always-On, Dynamic Island', chip: 'A18 Pro',
    mainCamera: '48MP Fusion, 48MP Ultra Wide, 12MP 5x Telephoto + LiDAR', selfieCamera: '12MP TrueDepth',
    network: '5G', bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '227g', bodyBuild: 'Titanium frame',
    features: 'Face ID, Camera Control, Action button, MagSafe, IP68', commsUSB: 'USB-C (USB 3)', os: 'iOS 18',
  }),
  iphone('apple-iphone-16e', 'iPhone 16e', '2025-02', [C.black, C.white], S128_512, {
    displaySize: '6.1-inch', display: 'Super Retina XDR OLED', chip: 'A18',
    mainCamera: '48MP Fusion', selfieCamera: '12MP TrueDepth', network: '5G (Apple C1 modem)',
    bodySIM: 'Nano-SIM + eSIM (UK)', bodyWeight: '167g', features: 'Face ID, Action button, Qi wireless charging, IP68',
    commsUSB: 'USB-C (USB 2)', os: 'iOS 18',
  }),
  iphone('apple-iphone-17', 'iPhone 17', '2025-09', [C.black, C.white, C.mistBlue, C.sage, C.lavender], ['256GB', '512GB'], {
    displaySize: '6.3-inch', display: 'Super Retina XDR OLED, ProMotion (120Hz), Always-On, Dynamic Island', chip: 'A19',
    mainCamera: '48MP Fusion, 48MP Ultra Wide', selfieCamera: '18MP Center Stage', network: '5G',
    features: 'Face ID, Camera Control, Action button, MagSafe, Ceramic Shield 2, IP68', commsUSB: 'USB-C', os: 'iOS 26',
  }),
  iphone('apple-iphone-air', 'iPhone Air', '2025-09', [C.spaceBlack, C.cloudWhite, C.lightGold, C.skyBlue], S256_1T, {
    displaySize: '6.5-inch', display: 'Super Retina XDR OLED, ProMotion (120Hz), Always-On, Dynamic Island', chip: 'A19 Pro',
    mainCamera: '48MP Fusion', selfieCamera: '18MP Center Stage', network: '5G (Apple C1X modem)',
    bodySIM: 'eSIM only', bodyBuild: 'Titanium frame',
    features: 'Face ID, Camera Control, Action button, MagSafe, IP68', commsUSB: 'USB-C', os: 'iOS 26',
  }),
  iphone('apple-iphone-17-pro', 'iPhone 17 Pro', '2025-09', [C.cosmicOrange, C.deepBlue, C.silver], S256_1T, {
    displaySize: '6.3-inch', display: 'Super Retina XDR OLED, ProMotion, Always-On, Dynamic Island', chip: 'A19 Pro',
    mainCamera: '48MP Fusion, 48MP Ultra Wide, 48MP 4x Telephoto + LiDAR', selfieCamera: '18MP Center Stage',
    network: '5G', bodyBuild: 'Aluminium unibody',
    features: 'Face ID, Camera Control, Action button, MagSafe, IP68', commsUSB: 'USB-C (USB 3)', os: 'iOS 26',
  }),
  iphone('apple-iphone-17-pro-max', 'iPhone 17 Pro Max', '2025-09', [C.cosmicOrange, C.deepBlue, C.silver], S256_2T, {
    displaySize: '6.9-inch', display: 'Super Retina XDR OLED, ProMotion, Always-On, Dynamic Island', chip: 'A19 Pro',
    mainCamera: '48MP Fusion, 48MP Ultra Wide, 48MP 4x Telephoto + LiDAR', selfieCamera: '18MP Center Stage',
    network: '5G', bodyBuild: 'Aluminium unibody',
    features: 'Face ID, Camera Control, Action button, MagSafe, IP68', commsUSB: 'USB-C (USB 3)', os: 'iOS 26',
  }),
  iphone('apple-iphone-17e', 'iPhone 17e', '2026-03', [C.black, C.white, C.softPink], ['256GB', '512GB'], {
    displaySize: '6.1-inch', display: 'Super Retina XDR OLED', chip: 'A19',
    mainCamera: '48MP Fusion', network: '5G', features: 'Face ID, Action button, MagSafe, IP68',
    commsUSB: 'USB-C', os: 'iOS 26',
  }, 'Released March 2026: confirm SIM type and front camera from the unit before listing.'),
  iphone('apple-iphone-18-pro', 'iPhone 18 Pro', '2026-09', [C.black, C.silver, C.glacier, C.burgundy], S256_2T, {
    network: '5G',
  }, 'Released September 2026: finishes and storage are from Apple\'s announcement; add display, chip and camera specs before listing.'),
  iphone('apple-iphone-18-pro-max', 'iPhone 18 Pro Max', '2026-09', [C.black, C.silver, C.glacier, C.burgundy], S256_2T, {
    network: '5G',
  }, 'Released September 2026: finishes and storage are from Apple\'s announcement; add display, chip and camera specs before listing.'),
];

// ── iPad ─────────────────────────────────────────────────────────────────
function ipad(
  id: string, model: string, released: string, colours: CatalogueColour[], storage: string[],
  specs: Record<string, string>, verify?: string,
): CatalogueModel {
  return {
    ...IPAD, id, model, released, colours, storage, connectivity: IPAD_RADIO, verify,
    specs: { ...specs, storage: storage.join(' / '), miscColors: colourList(colours) },
  };
}

const AIR_M = [C.spaceGrey, C.blueAir, C.purpleAir, C.starlight];
const PRO_OLD = [C.spaceGrey, C.silver];
const PRO_OLED = [C.spaceBlack, C.silver];

const IPADS: CatalogueModel[] = [
  ipad('apple-ipad-8th-gen', 'iPad (8th generation)', '2020-09', [C.spaceGrey, C.silver, C.gold], ['32GB', '128GB'], {
    displaySize: '10.2-inch', display: 'Retina', chip: 'A12 Bionic', mainCamera: '8MP', selfieCamera: '1.2MP FaceTime HD',
    network: '4G LTE (Cellular models)', features: 'Touch ID, Apple Pencil (1st generation)', commsUSB: 'Lightning', os: 'iPadOS 14',
  }),
  ipad('apple-ipad-9th-gen', 'iPad (9th generation)', '2021-09', [C.spaceGrey, C.silver], ['64GB', '256GB'], {
    displaySize: '10.2-inch', display: 'Retina with True Tone', chip: 'A13 Bionic', mainCamera: '8MP',
    selfieCamera: '12MP Ultra Wide with Center Stage', network: '4G LTE (Cellular models)',
    features: 'Touch ID, Apple Pencil (1st generation)', commsUSB: 'Lightning', os: 'iPadOS 15',
  }),
  ipad('apple-ipad-10th-gen', 'iPad (10th generation)', '2022-10', [C.blueIpad, C.pinkIpad, C.yellowIpad, C.silver], ['64GB', '256GB'], {
    displaySize: '10.9-inch', display: 'Liquid Retina', chip: 'A14 Bionic', mainCamera: '12MP Wide',
    selfieCamera: '12MP landscape Ultra Wide with Center Stage', network: '5G (Cellular models)',
    features: 'Touch ID (top button)', commsUSB: 'USB-C', os: 'iPadOS 16',
  }),
  ipad('apple-ipad-a16', 'iPad (A16)', '2025-03', [C.blueIpad, C.pinkIpad, C.yellowIpad, C.silver], S128_512, {
    displaySize: '11-inch', display: 'Liquid Retina', chip: 'A16', mainCamera: '12MP Wide',
    selfieCamera: '12MP landscape Ultra Wide with Center Stage', network: '5G (Cellular models)',
    features: 'Touch ID (top button)', commsUSB: 'USB-C', os: 'iPadOS 18',
  }),
  ipad('apple-ipad-air-4th-gen', 'iPad Air (4th generation)', '2020-10', [C.spaceGrey, C.silver, C.roseGold, C.greenAir4, C.skyBlueAir4], ['64GB', '256GB'], {
    displaySize: '10.9-inch', display: 'Liquid Retina', chip: 'A14 Bionic', mainCamera: '12MP Wide', selfieCamera: '7MP FaceTime HD',
    network: '4G LTE (Cellular models)', features: 'Touch ID (top button), Apple Pencil (2nd generation)', commsUSB: 'USB-C', os: 'iPadOS 14',
  }),
  ipad('apple-ipad-air-5th-gen', 'iPad Air (5th generation)', '2022-03', [C.spaceGrey, C.starlight, C.pinkAir5, C.purpleAir5, C.blueAir5], ['64GB', '256GB'], {
    displaySize: '10.9-inch', display: 'Liquid Retina', chip: 'Apple M1', mainCamera: '12MP Wide',
    selfieCamera: '12MP Ultra Wide with Center Stage', network: '5G (Cellular models)',
    features: 'Touch ID (top button), Apple Pencil (2nd generation)', commsUSB: 'USB-C', os: 'iPadOS 15',
  }),
  ipad('apple-ipad-air-11-m2', 'iPad Air 11-inch (M2)', '2024-05', AIR_M, S128_1T, {
    displaySize: '11-inch', display: 'Liquid Retina', chip: 'Apple M2', mainCamera: '12MP Wide',
    selfieCamera: '12MP landscape Ultra Wide with Center Stage', network: '5G (Cellular models)',
    features: 'Touch ID (top button), Apple Pencil Pro', commsUSB: 'USB-C', os: 'iPadOS 17',
  }),
  ipad('apple-ipad-air-13-m2', 'iPad Air 13-inch (M2)', '2024-05', AIR_M, S128_1T, {
    displaySize: '13-inch', display: 'Liquid Retina', chip: 'Apple M2', mainCamera: '12MP Wide',
    selfieCamera: '12MP landscape Ultra Wide with Center Stage', network: '5G (Cellular models)',
    features: 'Touch ID (top button), Apple Pencil Pro', commsUSB: 'USB-C', os: 'iPadOS 17',
  }),
  ipad('apple-ipad-air-11-m3', 'iPad Air 11-inch (M3)', '2025-03', AIR_M, S128_1T, {
    displaySize: '11-inch', display: 'Liquid Retina', chip: 'Apple M3', mainCamera: '12MP Wide',
    selfieCamera: '12MP landscape Ultra Wide with Center Stage', network: '5G (Cellular models)',
    features: 'Touch ID (top button), Apple Pencil Pro', commsUSB: 'USB-C', os: 'iPadOS 18',
  }),
  ipad('apple-ipad-air-13-m3', 'iPad Air 13-inch (M3)', '2025-03', AIR_M, S128_1T, {
    displaySize: '13-inch', display: 'Liquid Retina', chip: 'Apple M3', mainCamera: '12MP Wide',
    selfieCamera: '12MP landscape Ultra Wide with Center Stage', network: '5G (Cellular models)',
    features: 'Touch ID (top button), Apple Pencil Pro', commsUSB: 'USB-C', os: 'iPadOS 18',
  }),
  ipad('apple-ipad-air-11-m4', 'iPad Air 11-inch (M4)', '2026-03', AIR_M, S128_1T, {
    displaySize: '11-inch', display: 'Liquid Retina', chip: 'Apple M4', ram: '12GB',
    network: '5G (Cellular models, Apple C1X modem)', commsWLAN: 'Wi-Fi 7 (Apple N1)', commsUSB: 'USB-C',
  }, 'Released March 2026: confirm camera specs before listing.'),
  ipad('apple-ipad-air-13-m4', 'iPad Air 13-inch (M4)', '2026-03', AIR_M, S128_1T, {
    displaySize: '13-inch', display: 'Liquid Retina', chip: 'Apple M4', ram: '12GB',
    network: '5G (Cellular models, Apple C1X modem)', commsWLAN: 'Wi-Fi 7 (Apple N1)', commsUSB: 'USB-C',
  }, 'Released March 2026: confirm camera specs before listing.'),
  ipad('apple-ipad-mini-6th-gen', 'iPad mini (6th generation)', '2021-09', [C.spaceGrey, C.pinkMini, C.purpleMini, C.starlight], ['64GB', '256GB'], {
    displaySize: '8.3-inch', display: 'Liquid Retina', chip: 'A15 Bionic', mainCamera: '12MP Wide',
    selfieCamera: '12MP Ultra Wide with Center Stage', network: '5G (Cellular models)',
    features: 'Touch ID (top button), Apple Pencil (2nd generation)', commsUSB: 'USB-C', os: 'iPadOS 15',
  }),
  ipad('apple-ipad-mini-a17-pro', 'iPad mini (A17 Pro)', '2024-10', [C.spaceGrey, C.blueMini, C.purpleMini, C.starlight], S128_512, {
    displaySize: '8.3-inch', display: 'Liquid Retina', chip: 'A17 Pro', mainCamera: '12MP Wide',
    selfieCamera: '12MP Ultra Wide with Center Stage', network: '5G (Cellular models)',
    features: 'Touch ID (top button), Apple Pencil Pro', commsUSB: 'USB-C', os: 'iPadOS 18',
  }),
  ipad('apple-ipad-pro-11-2nd-gen', 'iPad Pro 11-inch (2nd generation)', '2020-03', PRO_OLD, S128_1T, {
    displaySize: '11-inch', display: 'Liquid Retina, ProMotion', chip: 'A12Z Bionic',
    mainCamera: '12MP Wide, 10MP Ultra Wide + LiDAR', selfieCamera: '7MP TrueDepth', network: '4G LTE (Cellular models)',
    features: 'Face ID, Apple Pencil (2nd generation)', commsUSB: 'USB-C', os: 'iPadOS 13',
  }),
  ipad('apple-ipad-pro-12-9-4th-gen', 'iPad Pro 12.9-inch (4th generation)', '2020-03', PRO_OLD, S128_1T, {
    displaySize: '12.9-inch', display: 'Liquid Retina, ProMotion', chip: 'A12Z Bionic',
    mainCamera: '12MP Wide, 10MP Ultra Wide + LiDAR', selfieCamera: '7MP TrueDepth', network: '4G LTE (Cellular models)',
    features: 'Face ID, Apple Pencil (2nd generation)', commsUSB: 'USB-C', os: 'iPadOS 13',
  }),
  ipad('apple-ipad-pro-11-3rd-gen', 'iPad Pro 11-inch (3rd generation)', '2021-05', PRO_OLD, ['128GB', '256GB', '512GB', '1TB', '2TB'], {
    displaySize: '11-inch', display: 'Liquid Retina, ProMotion', chip: 'Apple M1',
    mainCamera: '12MP Wide, 10MP Ultra Wide + LiDAR', selfieCamera: '12MP Ultra Wide with Center Stage',
    network: '5G (Cellular models)', features: 'Face ID, Apple Pencil (2nd generation)', commsUSB: 'USB-C (Thunderbolt / USB 4)', os: 'iPadOS 14',
  }),
  ipad('apple-ipad-pro-12-9-5th-gen', 'iPad Pro 12.9-inch (5th generation)', '2021-05', PRO_OLD, ['128GB', '256GB', '512GB', '1TB', '2TB'], {
    displaySize: '12.9-inch', display: 'Liquid Retina XDR (mini-LED), ProMotion', chip: 'Apple M1',
    mainCamera: '12MP Wide, 10MP Ultra Wide + LiDAR', selfieCamera: '12MP Ultra Wide with Center Stage',
    network: '5G (Cellular models)', features: 'Face ID, Apple Pencil (2nd generation)', commsUSB: 'USB-C (Thunderbolt / USB 4)', os: 'iPadOS 14',
  }),
  ipad('apple-ipad-pro-11-4th-gen', 'iPad Pro 11-inch (4th generation)', '2022-10', PRO_OLD, ['128GB', '256GB', '512GB', '1TB', '2TB'], {
    displaySize: '11-inch', display: 'Liquid Retina, ProMotion', chip: 'Apple M2',
    mainCamera: '12MP Wide, 10MP Ultra Wide + LiDAR', selfieCamera: '12MP Ultra Wide with Center Stage',
    network: '5G (Cellular models)', features: 'Face ID, Apple Pencil hover', commsUSB: 'USB-C (Thunderbolt / USB 4)', os: 'iPadOS 16',
  }),
  ipad('apple-ipad-pro-12-9-6th-gen', 'iPad Pro 12.9-inch (6th generation)', '2022-10', PRO_OLD, ['128GB', '256GB', '512GB', '1TB', '2TB'], {
    displaySize: '12.9-inch', display: 'Liquid Retina XDR (mini-LED), ProMotion', chip: 'Apple M2',
    mainCamera: '12MP Wide, 10MP Ultra Wide + LiDAR', selfieCamera: '12MP Ultra Wide with Center Stage',
    network: '5G (Cellular models)', features: 'Face ID, Apple Pencil hover', commsUSB: 'USB-C (Thunderbolt / USB 4)', os: 'iPadOS 16',
  }),
  ipad('apple-ipad-pro-11-m4', 'iPad Pro 11-inch (M4)', '2024-05', PRO_OLED, S256_2T, {
    displaySize: '11-inch', display: 'Ultra Retina XDR (tandem OLED), ProMotion', chip: 'Apple M4',
    mainCamera: '12MP Wide + LiDAR', selfieCamera: '12MP landscape Ultra Wide with Center Stage',
    network: '5G (Cellular models, eSIM)', features: 'Face ID, Apple Pencil Pro', commsUSB: 'USB-C (Thunderbolt / USB 4)', os: 'iPadOS 17',
  }),
  ipad('apple-ipad-pro-13-m4', 'iPad Pro 13-inch (M4)', '2024-05', PRO_OLED, S256_2T, {
    displaySize: '13-inch', display: 'Ultra Retina XDR (tandem OLED), ProMotion', chip: 'Apple M4',
    mainCamera: '12MP Wide + LiDAR', selfieCamera: '12MP landscape Ultra Wide with Center Stage',
    network: '5G (Cellular models, eSIM)', features: 'Face ID, Apple Pencil Pro', commsUSB: 'USB-C (Thunderbolt / USB 4)', os: 'iPadOS 17',
  }),
  ipad('apple-ipad-pro-11-m5', 'iPad Pro 11-inch (M5)', '2025-10', PRO_OLED, S256_2T, {
    displaySize: '11-inch', display: 'Ultra Retina XDR (tandem OLED), ProMotion', chip: 'Apple M5',
    mainCamera: '12MP Wide + LiDAR', selfieCamera: '12MP landscape Ultra Wide with Center Stage',
    network: '5G (Cellular models, eSIM)', features: 'Face ID, Apple Pencil Pro', commsUSB: 'USB-C (Thunderbolt / USB 4)', os: 'iPadOS 26',
  }),
  ipad('apple-ipad-pro-13-m5', 'iPad Pro 13-inch (M5)', '2025-10', PRO_OLED, S256_2T, {
    displaySize: '13-inch', display: 'Ultra Retina XDR (tandem OLED), ProMotion', chip: 'Apple M5',
    mainCamera: '12MP Wide + LiDAR', selfieCamera: '12MP landscape Ultra Wide with Center Stage',
    network: '5G (Cellular models, eSIM)', features: 'Face ID, Apple Pencil Pro', commsUSB: 'USB-C (Thunderbolt / USB 4)', os: 'iPadOS 26',
  }),
];

// ── Apple Watch ──────────────────────────────────────────────────────────
// One product per series, case material and size: those change the price
// and the box, while finish and GPS / Cellular are the customer's choice.
// Stainless steel and titanium cases were only sold with Cellular.
function watch(
  idBase: string, modelBase: string, released: string, material: string, sizes: string[],
  colours: CatalogueColour[], connectivity: string[], specs: Record<string, string>, verify?: string,
): CatalogueModel[] {
  const materialSlug = material.toLowerCase().replace(/\s+/g, '-');
  return sizes.map(size => ({
    ...WATCH,
    id: `${idBase}-${materialSlug}-${size.replace('mm', '')}mm`,
    model: `${modelBase} ${size} ${material}`,
    released, colours, storage: [], connectivity, verify,
    specs: {
      ...specs, displaySize: size, bodyBuild: `${material} case`,
      miscColors: colourList(colours),
      network: connectivity.length > 1 ? 'GPS or GPS + Cellular' : 'GPS + Cellular',
    },
  }));
}

const WATCHES: CatalogueModel[] = [
  ...watch('apple-watch-series-6', 'Apple Watch Series 6', '2020-09', 'Aluminium', ['40mm', '44mm'],
    [C.silver, C.spaceGrey, C.gold, C.blueWatch, C.red], WATCH_RADIO,
    { chip: 'S6 SiP', display: 'Always-On Retina LTPO OLED', storage: '32GB', features: 'Blood oxygen, ECG, WR50', os: 'watchOS 7' }),
  ...watch('apple-watch-series-6', 'Apple Watch Series 6', '2020-09', 'Stainless Steel', ['40mm', '44mm'],
    [C.silver, C.graphite, C.gold], CELLULAR_ONLY,
    { chip: 'S6 SiP', display: 'Always-On Retina LTPO OLED, sapphire crystal', storage: '32GB', features: 'Blood oxygen, ECG, WR50', os: 'watchOS 7' }),
  ...watch('apple-watch-se-1st-gen', 'Apple Watch SE (1st generation)', '2020-09', 'Aluminium', ['40mm', '44mm'],
    [C.silver, C.spaceGrey, C.gold], WATCH_RADIO,
    { chip: 'S5 SiP', display: 'Retina LTPO OLED', storage: '32GB', features: 'Fall detection, WR50', os: 'watchOS 7' }),
  ...watch('apple-watch-series-7', 'Apple Watch Series 7', '2021-10', 'Aluminium', ['41mm', '45mm'],
    [C.midnight, C.starlight, C.greenWatch, C.blueWatch, C.red], WATCH_RADIO,
    { chip: 'S7 SiP', display: 'Always-On Retina LTPO OLED', storage: '32GB', features: 'Blood oxygen, ECG, fast charging, IP6X, WR50', os: 'watchOS 8' }),
  ...watch('apple-watch-series-7', 'Apple Watch Series 7', '2021-10', 'Stainless Steel', ['41mm', '45mm'],
    [C.silver, C.graphite, C.gold], CELLULAR_ONLY,
    { chip: 'S7 SiP', display: 'Always-On Retina LTPO OLED, sapphire crystal', storage: '32GB', features: 'Blood oxygen, ECG, fast charging, IP6X, WR50', os: 'watchOS 8' }),
  ...watch('apple-watch-series-8', 'Apple Watch Series 8', '2022-09', 'Aluminium', ['41mm', '45mm'],
    [C.midnight, C.starlight, C.silver, C.red], WATCH_RADIO,
    { chip: 'S8 SiP', display: 'Always-On Retina LTPO OLED', storage: '32GB', features: 'Temperature sensing, Crash Detection, ECG, IP6X, WR50', os: 'watchOS 9' }),
  ...watch('apple-watch-series-8', 'Apple Watch Series 8', '2022-09', 'Stainless Steel', ['41mm', '45mm'],
    [C.silver, C.graphite, C.gold], CELLULAR_ONLY,
    { chip: 'S8 SiP', display: 'Always-On Retina LTPO OLED, sapphire crystal', storage: '32GB', features: 'Temperature sensing, Crash Detection, ECG, IP6X, WR50', os: 'watchOS 9' }),
  ...watch('apple-watch-se-2nd-gen', 'Apple Watch SE (2nd generation)', '2022-09', 'Aluminium', ['40mm', '44mm'],
    [C.midnight, C.starlight, C.silver], WATCH_RADIO,
    { chip: 'S8 SiP', display: 'Retina LTPO OLED', storage: '32GB', features: 'Crash Detection, fall detection, WR50', os: 'watchOS 9' }),
  ...watch('apple-watch-ultra', 'Apple Watch Ultra', '2022-09', 'Titanium', ['49mm'],
    [C.natural], CELLULAR_ONLY,
    { chip: 'S8 SiP', display: 'Always-On Retina LTPO OLED, 2000 nits, sapphire crystal', storage: '32GB', features: 'Action button, dual-frequency GPS, depth gauge, 86dB siren, WR100', os: 'watchOS 9' }),
  ...watch('apple-watch-series-9', 'Apple Watch Series 9', '2023-09', 'Aluminium', ['41mm', '45mm'],
    [C.midnight, C.starlight, C.silver, C.pinkWatch, C.red], WATCH_RADIO,
    { chip: 'S9 SiP', display: 'Always-On Retina LTPO OLED, 2000 nits', storage: '64GB', features: 'Double tap, Precision Finding, ECG, WR50', os: 'watchOS 10' }),
  ...watch('apple-watch-series-9', 'Apple Watch Series 9', '2023-09', 'Stainless Steel', ['41mm', '45mm'],
    [C.gold, C.silver, C.graphite], CELLULAR_ONLY,
    { chip: 'S9 SiP', display: 'Always-On Retina LTPO OLED, 2000 nits, sapphire crystal', storage: '64GB', features: 'Double tap, Precision Finding, ECG, WR50', os: 'watchOS 10' }),
  ...watch('apple-watch-ultra-2', 'Apple Watch Ultra 2', '2023-09', 'Titanium', ['49mm'],
    [C.natural, C.blackTi], CELLULAR_ONLY,
    { chip: 'S9 SiP', display: 'Always-On Retina LTPO OLED, 3000 nits, sapphire crystal', storage: '64GB', features: 'Double tap, Action button, dual-frequency GPS, depth gauge, WR100', os: 'watchOS 10' },
    'Black titanium was added in September 2024; earlier units are Natural only.'),
  ...watch('apple-watch-series-10', 'Apple Watch Series 10', '2024-09', 'Aluminium', ['42mm', '46mm'],
    [C.jetBlack, C.roseGold, C.silver], WATCH_RADIO,
    { chip: 'S10 SiP', display: 'Always-On wide-angle OLED', storage: '64GB', features: 'Sleep apnoea notifications, depth gauge, ECG, WR50', os: 'watchOS 11' }),
  ...watch('apple-watch-series-10', 'Apple Watch Series 10', '2024-09', 'Titanium', ['42mm', '46mm'],
    [C.natural, C.gold, C.slate], CELLULAR_ONLY,
    { chip: 'S10 SiP', display: 'Always-On wide-angle OLED, sapphire crystal', storage: '64GB', features: 'Sleep apnoea notifications, depth gauge, ECG, WR50', os: 'watchOS 11' }),
  ...watch('apple-watch-series-11', 'Apple Watch Series 11', '2025-09', 'Aluminium', ['42mm', '46mm'],
    [C.jetBlack, C.spaceGrey, C.silver, C.roseGold], WATCH_RADIO,
    { chip: 'S10 SiP', display: 'Always-On wide-angle OLED', storage: '64GB', features: '5G Cellular, hypertension notifications, sleep score, WR50', os: 'watchOS 26' }),
  ...watch('apple-watch-series-11', 'Apple Watch Series 11', '2025-09', 'Titanium', ['42mm', '46mm'],
    [C.natural, C.gold, C.slate], CELLULAR_ONLY,
    { chip: 'S10 SiP', display: 'Always-On wide-angle OLED, sapphire crystal', storage: '64GB', features: '5G Cellular, hypertension notifications, sleep score, WR50', os: 'watchOS 26' }),
  ...watch('apple-watch-se-3', 'Apple Watch SE 3', '2025-09', 'Aluminium', ['40mm', '44mm'],
    [C.midnight, C.starlight], WATCH_RADIO,
    { chip: 'S10 SiP', display: 'Always-On Retina LTPO OLED', features: '5G Cellular, sleep score, temperature sensing, WR50', os: 'watchOS 26' },
    'Confirm storage from the unit before listing.'),
  ...watch('apple-watch-ultra-3', 'Apple Watch Ultra 3', '2025-09', 'Titanium', ['49mm'],
    [C.natural, C.blackTi], CELLULAR_ONLY,
    { chip: 'S10 SiP', display: 'Always-On wide-angle OLED, sapphire crystal', storage: '64GB', features: '5G Cellular, satellite SOS, Action button, WR100', os: 'watchOS 26' }),
  ...watch('apple-watch-series-12', 'Apple Watch Series 12', '2026-09', 'Aluminium', ['42mm', '46mm'],
    [C.darkBronze, C.black, C.lightGold, C.spaceGrey], WATCH_RADIO,
    { os: 'watchOS 27' },
    'Released September 2026: published reports disagree on finish names. Check the finish and add specs before listing.'),
  ...watch('apple-watch-ultra-4', 'Apple Watch Ultra 4', '2026-09', 'Titanium', ['49mm'],
    [C.natural, C.blackTi], CELLULAR_ONLY,
    { os: 'watchOS 27' },
    'Released September 2026: add specs before listing.'),
];

export const APPLE_CATALOGUE: CatalogueModel[] = [...IPHONES, ...IPADS, ...WATCHES];

