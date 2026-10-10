/**
 * deviceColors — map of the variant colour names we ship, across
 * Apple / Samsung / Google / Sony / Nintendo, to a hex.
 *
 * Lookup is case-insensitive and goes from exact to approximate:
 *   1. the exact name ("Titanium Silverblue");
 *   2. the same name with spacing, punctuation and grey/gray spelling
 *      evened out, and run-together words split ("Titanium Jetblack");
 *   3. the longest known colour inside the name, rightmost first, so
 *      "Titanium Icy Blue" is Icy Blue and not "titanium";
 *   4. a colour keyword ("Emerald", "Onyx", "Champagne"), lightened or
 *      darkened by words such as "light", "pale", "deep" or "shadow";
 *   5. a material on its own ("Titanium").
 * Only a name none of that recognises falls back to the device's brand
 * shade or the generic grey. Every name was one exact lookup before, so a
 * brand's new finish such as "Titanium Icy Blue" painted every swatch of
 * the Galaxy S25 Edge the same grey.
 */

const PALETTE: Record<string, string> = {
  // ── Google Pixel and Samsung Galaxy finishes ─────────────────────
  'porcelain':        '#ece6db',
  'peony':            '#e9b7c2',
  'chalk':            '#eceae5',
  'sorta seafoam':    '#c9e2d6',
  'bay':              '#8fb4dc',
  'mint':             '#cfe8d6',
  'rose':             '#f1c6c2',
  'iris':             '#9fa6da',
  'aloe':             '#c4dac1',
  'wintergreen':      '#cfe4d5',
  'icy blue':         '#c7dbe9',
  'onyx black':       '#262628',
  'marble grey':      '#c6c4c0',
  'cobalt violet':    '#6f5f99',
  'amber yellow':     '#efd38b',
  'awesome lilac':    '#c9b6dc',
  'awesome lime':     '#d6e6a3',
  'awesome iceblue':  '#c5def0',
  'awesome navy':     '#2c3956',
  'awesome graphite': '#4b4c4f',
  'titanium gray':    '#8e8e90',
  'titanium black':   '#2d2d2f',
  'titanium violet':  '#9b8fb8',
  'titanium yellow':  '#e8dc9c',
  'titanium silverblue': '#a9b8c8',
  'titanium whitesilver': '#e3e3e1',
  'light blue':       '#bcd7ee',
  'light green':      '#cfe6c8',
  // Galaxy S25 / S25+ / S25 Edge / S25 FE / Z Fold7 / Z Flip7 and the
  // S24 family. Samsung runs words together ("Jetblack", "Icyblue"); the
  // lookup splits those, so one spelling of each is enough here.
  'titanium silver':  '#c4c6c9',
  'titanium jet black': '#1b1b1d',
  'titanium icy blue': '#adc8e2',
  'titanium jade green': '#9db7a6',
  'titanium pink gold': '#e5c8bc',
  'titanium blue':    '#4a5f7c',
  'titanium green':   '#5d6b5f',
  'titanium orange':  '#e0864d',
  'silver shadow':    '#a9abae',
  'blue shadow':      '#34465f',
  'blue black':       '#232a36',
  'coral red':        '#d6675d',
  'lilac':            '#c5b3db',
  'jade green':       '#a3c4b0',
  'sapphire blue':    '#3a5a96',
  'sandstone orange': '#e19a6b',
  // Pixel 9 / 10
  'rose quartz':      '#f1d3d1',
  'indigo':           '#3b4170',
  'frost':            '#dfe7ee',
  'moonstone':        '#8d98a5',
  'jade':             '#a9c9b6',
  // ── Apple colours from the reference catalogue not listed below ──
  '(product)red':     '#bf0013',
  'light gold':       '#efe2c8',
  'soft pink':        '#f3d6d6',
  'glacier':          '#c9dcea',
  'star white':       '#f1efe9',
  'night sky':        '#2b2f3a',
  'jet black':        '#141414',
  'slate':            '#5a5b5e',
  'natural':          '#c9c4bb',
  'dark bronze':      '#5e4a3a',
  // ── Apple iPhone 17 / 16 / 15 / 14 titanium and standard ─────────
  'cosmic orange':    '#d65a31',
  'deep blue':        '#1f3a5f',
  'silver':           '#e3e4e6',
  'mist blue':        '#9bb3ce',
  'lavender':         '#cdb8d6',
  'sage':             '#a8b89a',
  'white':            '#f5f5f7',
  'natural titanium': '#beb6a8',
  'blue titanium':    '#3d5a7a',
  'white titanium':   '#f0eee9',
  'black titanium':   '#3a3a3a',
  'desert titanium':  '#c1a888',
  'teal':             '#5b8c8a',
  'ultramarine':      '#3b5fb4',
  'pink':             '#f9c8d0',

  // iPhone 14 / 13 / 12 / 11 finishes
  'deep purple':      '#5b4d70',
  'space black':      '#2a2a2c',
  'gold':             '#e0c9a8',
  'midnight':         '#1c1f25',
  'starlight':        '#f5e6d3',
  'red':              '#cc2936',
  'green':            '#385e3e',
  'sierra blue':      '#82a8d6',
  'alpine green':     '#465c4d',
  'graphite':         '#535355',
  'pacific blue':     '#2a3e58',
  'midnight green':   '#475850',
  'space grey':       '#535150',
  'space gray':       '#535150',
  'rose gold':        '#dabfb1',
  'product red':      '#cc2936',
  'yellow':           '#f0d667',
  'purple':           '#7c64a3',
  'blue':             '#3a6fb5',
  'navy':             '#1f2a44',
  'olive':            '#6b6f4a',
  'orange':           '#e0782f',
  'black':            '#1a1a1a',
  'coral':            '#fb6c5e',

  // ── Samsung Galaxy S / Note / Z Fold / Z Flip ────────────────────
  'phantom black':    '#0a0a0a',
  'phantom white':    '#f4f1ec',
  'phantom silver':   '#cbd1d6',
  'phantom navy':     '#1d2438',
  'phantom green':    '#3a5a48',
  'phantom violet':   '#9c89c7',
  'phantom pink':     '#e7c5d3',
  'phantom red':      '#9b2535',
  'phantom brown':    '#7a5b48',
  'phantom titanium': '#a4adb5',
  'phantom grey':     '#7c7e83',
  'phantom gold':     '#cfb487',
  'cream':            '#e8dac9',
  'lime':             '#c0d472',
  'sky blue':         '#a3c8e4',
  'pink gold':        '#dcc1b6',
  'bora purple':      '#a89dca',
  'burgundy red':     '#7a1f25',
  'mystic black':     '#1a1d1f',
  'mystic bronze':    '#b89878',
  'mystic green':     '#4a6151',
  'mystic grey':      '#5a6168',
  'mystic white':     '#f0eae0',
  'mystic silver':    '#c1c5cb',
  'aura black':       '#0d0d11',
  'aura glow':        '#dadcea',
  'aura white':       '#f0eee8',
  'aura blue':        '#5577a8',
  'aura red':         '#a13241',
  'cloud blue':       '#9fb6d1',
  'cloud pink':       '#f1c4cd',
  'cloud white':      '#f4f0e8',
  'cloud red':        '#c45562',
  'cloud lavender':   '#c8b4d6',
  'cloud lavendar':   '#c8b4d6',
  'cloud mint':       '#a5d4c0',
  'cloud navy':       '#2c4060',
  'cloud orange':     '#f1ad6f',
  'cosmic black':     '#0e1014',
  'cosmic grey':      '#54595e',
  'cosmic white':     '#f0ece4',
  'crown silver':     '#cdd1d4',
  'majestic black':   '#1a1a1c',
  'royal gold':       '#d6b97a',
  'prism black':      '#171a20',
  'prism blue':       '#3e6db8',
  'prism green':      '#5b9b6b',
  'prism white':      '#eef0f2',
  'cardinal red':     '#a82c34',
  'flamingo pink':    '#f1a3aa',
  'awesome black':    '#1d1f24',
  'awesome blue':     '#5b75b3',
  'awesome violet':   '#a087c8',
  'awesome white':    '#efeae0',
  'awesome peach':    '#f3c9b8',
  'haze crush silver': '#cbcfd6',
  'prism crush black': '#171a20',
  'prism crush blue':  '#3e6db8',
  'prism crush pink':  '#f4b9bf',
  'prism crush white': '#eef0f2',
  'crush black':      '#1a1c20',
  'crush blue':       '#3e6db8',
  'crush pink':       '#f4b9bf',
  'crush silver':     '#c5cad0',
  'beige':            '#cebc9e',
  'burgundy':         '#7a2333',
  'greygreen':        '#586759',
  'grey-green':       '#586759',
  'grey green':       '#586759',
  'grey':             '#7a7c80',
  'gray':             '#7a7c80',
  // Lighter and bluer than 'purple': the Galaxy S21 FE is listed in both,
  // and two swatches a shade apart read as the same colour twice.
  'violet':           '#9683c6',

  // ── Google Pixel finishes ────────────────────────────────────────
  'obsidian':         '#1d1d1d',
  'snow':             '#f4f3ee',
  'hazel':            '#8a8773',
  'lemongrass':       '#bcbf6b',
  'kinda coral':      '#dd7766',
  'sorta seaform':    '#a4d4ca',
  'sorta sage':       '#a3c2a1',
  'sorta sunny':      '#e8c878',
  'cloudy white':     '#eee9e0',
  'stormy black':     '#1a1c1f',
  'just black':       '#161616',
  'clearly white':    '#f5f0ea',
  'oh so orange':     '#e88a2f',
  'barely blue':      '#a9c4d8',
  'charcoal':         '#36383b',
  'sea':              '#4a8278',

  // ── default per brand if colour name is unknown ──────────────────
  '_apple':           '#a8a8aa',
  '_samsung':         '#1a1a1a',
  '_google':          '#1d1d1d',
  '_default':         '#888888',
};

/**
 * Single colour words that are not finish names in the palette, so a name
 * the palette has never seen ("Emerald Titanium", "Phantom Onyx") still
 * lands on its colour family rather than on the grey.
 */
const KEYWORDS: Record<string, string> = {
  // black and near-black
  onyx: '#1f1f21', jet: '#141414', ink: '#1c1e24', carbon: '#2b2c2e',
  noir: '#161616', ebony: '#1b1a19', stealth: '#232427',
  // white and pale neutrals
  pearl: '#efebe4', ivory: '#f2ecdf', platinum: '#d9d9d6', linen: '#ece4d6',
  // grey and silver
  ash: '#b2b2ae', smoke: '#8f9194', stone: '#a29d94', steel: '#8a8f94',
  gunmetal: '#4a4d52', pewter: '#8c8d8a',
  // blue
  icy: '#c7dbe9', ice: '#c7dbe9', sky: '#a3c8e4', arctic: '#cfe2ee',
  ocean: '#2f5f8a', cobalt: '#2f4fa0', sapphire: '#3a5a96', azure: '#5d8ed0',
  denim: '#4a6488', sierra: '#82a8d6', pacific: '#2a3e58',
  aqua: '#7fc7c9', turquoise: '#45b5aa', cyan: '#5bc0d0',
  // green
  alpine: '#465c4d', emerald: '#2e7d5b', forest: '#2f4a37', pine: '#2f4f43',
  pistachio: '#c3d6a6', seafoam: '#c9e2d6', khaki: '#b5aa82',
  // pink and coral
  peach: '#f3c9b8', blush: '#f2cfd0', salmon: '#f0a493', flamingo: '#f1a3aa',
  magenta: '#b33a72', fuchsia: '#c2408a', quartz: '#f1d3d1',
  // purple
  mauve: '#b39bb5', plum: '#6b3f5e', orchid: '#c08fc4', amethyst: '#8e6fb0',
  // gold, yellow and cream
  champagne: '#ead8b8', sand: '#d9c7a7', sandstone: '#d9b48f', lemon: '#f3e27a',
  butter: '#f4e3a1', amber: '#efc06b', honey: '#e8c36a', mustard: '#d6b13d',
  dune: '#bfa78a',
  // red
  crimson: '#a51d2d', scarlet: '#c8262e', ruby: '#9b1b30', cherry: '#a8142b',
  wine: '#6e1f2e', maroon: '#6b1f28',
  // orange
  copper: '#b87333', tangerine: '#f08a3c', apricot: '#f4b183', sunset: '#ef8a5b',
  terracotta: '#c46a4a', rust: '#a94f2c',
  // brown, bronze, beige
  bronze: '#8c6a4a', brown: '#6f4f3a', mocha: '#6e5446', chocolate: '#4e3428',
  coffee: '#5b4334', espresso: '#3b2a22', caramel: '#b07a4a', taupe: '#9a8c80',
  tan: '#c8a983', desert: '#c1a888', latte: '#c9ad8f',
};

/**
 * What a finish is made of rather than what colour it is. Used only when no
 * word in the name is a colour, so "Titanium Icy Blue" is blue and a finish
 * called just "Titanium" is still metal rather than the fallback grey.
 */
const MATERIALS: Record<string, string> = {
  titanium: '#8e8e90', metal: '#8e8e90', aluminium: '#c9cacc', aluminum: '#c9cacc', chrome: '#d4d6d8',
};

/** Words that shade the colour they qualify: "Baby Blue", "Midnight Blue", "Silver Shadow". */
const LIGHTER = new Set(['light', 'pale', 'soft', 'baby', 'pastel', 'icy', 'ice', 'frost', 'frosted', 'misty', 'powder']);
const DARKER = new Set(['dark', 'deep', 'midnight', 'night', 'shadow']);

/** Every single word the lookup understands, for splitting "Jetblack" into "jet black". */
const VOCABULARY = new Set<string>([
  ...Object.keys(PALETTE).filter(k => /^[a-z]+$/.test(k)),
  ...Object.keys(KEYWORDS),
  ...Object.keys(MATERIALS),
  ...LIGHTER,
  ...DARKER,
]);

/** "Jetblack" -> ["jet", "black"], when both halves are colour words. */
function splitRunTogether(word: string): string[] {
  if (VOCABULARY.has(word)) return [word];
  for (let i = 3; i <= word.length - 3; i++) {
    const head = word.slice(0, i);
    const tail = word.slice(i);
    if (VOCABULARY.has(head) && VOCABULARY.has(tail)) return [head, tail];
  }
  return [word];
}

/** A colour name as lowercase words: punctuation dropped, compounds split, "gray" spelt "grey". */
function colourWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .flatMap(splitRunTogether)
    .map(w => (w === 'gray' ? 'grey' : w));
}

/** The palette keyed by normalised words. The first spelling listed wins. */
const BY_WORDS = new Map<string, string>();
for (const [key, hex] of Object.entries(PALETTE)) {
  if (key.startsWith('_')) continue;
  const words = colourWords(key).join(' ');
  if (!BY_WORDS.has(words)) BY_WORDS.set(words, hex);
}

/** Blend a #rrggbb colour towards white (255) or black (0). */
function mix(hex: string, towards: 0 | 255, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 255;
    return Math.round(c + (towards - c) * amount).toString(16).padStart(2, '0');
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

/** Lighten or darken a matched colour by the words around it. */
function shade(hex: string, otherWords: string[]): string {
  let out = hex;
  if (otherWords.some(w => LIGHTER.has(w))) out = mix(out, 255, 0.4);
  if (otherWords.some(w => DARKER.has(w))) out = mix(out, 0, 0.35);
  return out;
}

/** A table entry by its own key only — never "constructor" from Object.prototype. */
function lookup(table: Record<string, string>, key: string): string | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

/** The colour a finish name describes, or null when nothing in it is a colour. */
function resolveColour(name: string | undefined): string | null {
  if (!name) return null;
  const exact = name.trim().toLowerCase();
  if (!exact.startsWith('_')) {
    const hex = lookup(PALETTE, exact);
    if (hex) return hex;
  }

  const words = colourWords(name);
  // The longest run of words that is a known colour, rightmost first, since
  // the colour usually comes last: "Titanium Icy Blue" is Icy Blue. Words
  // left over may shade it, as in "Midnight Blue".
  for (let len = words.length; len >= 1; len--) {
    for (let start = words.length - len; start >= 0; start--) {
      const phrase = words.slice(start, start + len).join(' ');
      const hex = BY_WORDS.get(phrase) ?? (len === 1 ? lookup(KEYWORDS, phrase) : undefined);
      if (hex) return shade(hex, [...words.slice(0, start), ...words.slice(start + len)]);
    }
  }
  for (let i = words.length - 1; i >= 0; i--) {
    const hex = lookup(MATERIALS, words[i]);
    if (hex) return shade(hex, words.filter((_, j) => j !== i));
  }
  return null;
}

const SCREEN_GLASS = '#0c0e10';
const FRAME_OUTLINE = 'rgba(0,0,0,0.18)';

/** The generic grey every unrecognised colour name falls back to. */
export const FALLBACK_HEX = PALETTE._default;

export function colourHex(name: string | undefined, brand?: string): string {
  const hex = resolveColour(name);
  if (hex) return hex;
  if (brand) {
    const fb = PALETTE[`_${brand.toLowerCase()}`];
    if (fb) return fb;
  }
  return FALLBACK_HEX;
}

export const SCREEN = SCREEN_GLASS;
export const FRAME  = FRAME_OUTLINE;

/** The colour for a finish name, or null when nothing in the name is recognised. */
export function knownColourHex(name: string | undefined): string | null {
  return resolveColour(name);
}

/**
 * Greys that only ever mean "no colour known": the generic fallback above,
 * the Apple fallback shade and the product card's last resort. A variant
 * carrying one of these was given a placeholder, not a colour.
 */
const PLACEHOLDER_HEXES = new Set([FALLBACK_HEX, '#808080', PALETTE._apple, '#c7c7cc']);

/**
 * A stored swatch hex worth showing: a valid #rgb / #rrggbb that is not a
 * placeholder grey. Anything else returns undefined, so the colour comes
 * from the finish name instead.
 */
export function deliberateHex(hex: string | null | undefined): string | undefined {
  const value = hex?.trim().toLowerCase();
  if (!value) return undefined;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value);
  if (!m) return undefined;
  const long = m[1].length === 3 ? `#${[...m[1]].map(c => c + c).join('')}` : value;
  return PLACEHOLDER_HEXES.has(long) ? undefined : long;
}

/**
 * The swatch a variant of this finish was given on purpose, if any. Catalogue
 * imports carry Apple's exact hex per finish and that should win over the
 * shared palette, where one name such as "Blue" covers several blues; a
 * placeholder grey should not, or it paints over a colour the name gives.
 */
export function storedSwatch(
  variants: ReadonlyArray<{ color?: string; colorHex?: string }> | null | undefined,
  colour: string,
): string | undefined {
  const wanted = colour.trim();
  for (const v of variants ?? []) {
    if (v.color?.trim() !== wanted) continue;
    const hex = deliberateHex(v.colorHex);
    if (hex) return hex;
  }
  return undefined;
}
