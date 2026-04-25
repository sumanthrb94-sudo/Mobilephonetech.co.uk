/**
 * deviceColors — exhaustive map of every variant colour name we ship,
 * across Apple / Samsung / Google / Sony / Nintendo, to a hex.
 *
 * Lookup is case-insensitive. When a colour isn't found we return the
 * device's brand-fallback shade so the SVG still has something to
 * paint with rather than a transparent body.
 */

const PALETTE: Record<string, string> = {
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
  'violet':           '#7a64a4',

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
  'charcoal':         '#3a3a3a',
  'sea':              '#4a8278',

  // ── default per brand if colour name is unknown ──────────────────
  '_apple':           '#a8a8aa',
  '_samsung':         '#1a1a1a',
  '_google':          '#1d1d1d',
  '_default':         '#888888',
};

const SCREEN_GLASS = '#0c0e10';
const FRAME_OUTLINE = 'rgba(0,0,0,0.18)';

export function colourHex(name: string | undefined, brand?: string): string {
  if (name) {
    const k = name.trim().toLowerCase();
    if (PALETTE[k]) return PALETTE[k];
  }
  if (brand) {
    const fb = PALETTE[`_${brand.toLowerCase()}`];
    if (fb) return fb;
  }
  return PALETTE._default;
}

export const SCREEN = SCREEN_GLASS;
export const FRAME  = FRAME_OUTLINE;
