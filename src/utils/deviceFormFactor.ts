/**
 * deviceFormFactor — resolve a (brand, model, category) triple to one
 * of the SVG form factors DeviceMock can render. Keeps each device
 * shape recognisably different so a Galaxy Z Fold never gets shown
 * as a Galaxy S body, an iPad never gets shown as an iPhone, etc.
 */

export type FormFactor =
  | 'iphone-island'      // Dynamic Island era: 14 Pro+, 15+, 16+, 17+
  | 'iphone-notch'       // Notch era: X / XR / XS / 11 / 12 / 13 / 14 / 14 Plus
  | 'iphone-classic'     // Home button: 8 / 8 Plus / SE 2020 / SE 2022
  | 'ipad'
  | 'ipad-pro'
  | 'ipad-mini'
  | 'galaxy-s'           // Modern punch-hole Galaxy S / Note
  | 'galaxy-fold'        // Z Fold — tall narrow, hinge mark
  | 'galaxy-flip'        // Z Flip — square with cover screen
  | 'galaxy-tab'
  | 'galaxy-classic'     // Older A-series with bezels
  | 'pixel-bar'          // Pixel 6+ with horizontal camera bar
  | 'pixel-classic'      // Pixel 5 and older
  | 'console-ps'
  | 'console-xbox'
  | 'console-switch'
  | 'console-vr'
  | 'controller'
  | 'audio-buds'
  | 'audio-headphones'
  | 'speaker'
  | 'powerbank'
  | 'watch'
  | 'generic';

export function resolveFormFactor(brand: string, model: string, category?: string): FormFactor {
  const b = (brand || '').toLowerCase();
  const m = (model || '').toLowerCase();
  const c = (category || '').toLowerCase();

  // ── Apple ─────────────────────────────────────────────────────
  if (b === 'apple') {
    // iPads first so "iPad Pro" doesn't match "Pro" in iPhone path
    if (m.includes('ipad mini')) return 'ipad-mini';
    if (m.includes('ipad pro'))  return 'ipad-pro';
    if (m.includes('ipad'))      return 'ipad';

    // iPhone classics
    if (/iphone\s*(8|se)/.test(m)) return 'iphone-classic';
    // Dynamic Island era
    if (/iphone\s*(1[4-9]|2\d).*pro|iphone\s*1[5-9]|iphone\s*2\d|iphone\s*16e/.test(m)) return 'iphone-island';
    // Notch era
    if (/iphone\s*(x|xs|xr|10|11|12|13|14)/.test(m)) return 'iphone-notch';

    return 'iphone-island';
  }

  // ── Samsung ───────────────────────────────────────────────────
  if (b === 'samsung') {
    if (m.includes('galaxy tab'))           return 'galaxy-tab';
    if (m.includes('z fold') || m.includes('fold'))   return 'galaxy-fold';
    if (m.includes('z flip') || m.includes('flip'))   return 'galaxy-flip';
    if (/galaxy\s*a(1[0-9]|2[0-9]|3[0-9])/.test(m))   return 'galaxy-classic';
    return 'galaxy-s';
  }

  // ── Google ────────────────────────────────────────────────────
  if (b === 'google') {
    if (m.includes('buds'))   return 'audio-buds';
    if (m.includes('watch'))  return 'watch';
    // Pixel 6 onwards has the horizontal camera bar
    if (/pixel\s*([6-9]|1\d)/.test(m)) return 'pixel-bar';
    return 'pixel-classic';
  }

  // ── Sony / Nintendo / Microsoft / Meta consoles ───────────────
  if (b === 'sony' || /playstation|ps5|ps4|dualsense/.test(m))   return /dualsense|controller/.test(m) ? 'controller' : 'console-ps';
  if (b === 'nintendo' || /switch/.test(m))                       return 'console-switch';
  if (b === 'microsoft' || /xbox/.test(m))                        return 'console-xbox';
  if (b === 'meta' || /quest/.test(m))                            return 'console-vr';

  // ── Audio / accessories (mostly VIDVIE) ───────────────────────
  if (/buds|earbuds|earphone/.test(m))                            return 'audio-buds';
  if (/headphone|headset|over.?ear/.test(m))                      return 'audio-headphones';
  if (/speaker/.test(m))                                          return 'speaker';
  if (/powerbank|power.?bank|charger|charging/.test(m))           return 'powerbank';
  if (/watch|smartwatch/.test(m))                                 return 'watch';

  // Category fallbacks
  if (c.includes('tablet'))     return 'ipad';
  if (c.includes('hearable'))   return 'audio-buds';
  if (c.includes('speaker'))    return 'speaker';
  if (c.includes('playable'))   return 'console-ps';

  return 'generic';
}
