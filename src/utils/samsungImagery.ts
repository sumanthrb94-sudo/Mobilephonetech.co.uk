const ASSETS = {
  s24Ultra:  '/assets/samsung-s24-ultra.png',
  s23Ultra:  '/assets/samsung-s23-ultra.png',
  s22:       '/assets/samsung-s22.png',
  s21Fe:     '/assets/samsung-s21-fe.png',
  tabS9:     '/assets/samsung-tab-s9.svg',
};

const EXACT: Record<string, string> = {
  'Samsung Galaxy S23 Ultra - Unlocked':    ASSETS.s23Ultra,
  'Samsung Galaxy S22 5G - Unlocked':       ASSETS.s22,
  'Samsung Galaxy S22+ 5G - Unlocked':      ASSETS.s22,
  'Samsung Galaxy S22 Ultra 5G - Unlocked': ASSETS.s23Ultra,
  'Samsung Galaxy S20 FE - Unlocked':       ASSETS.s21Fe,
  'Samsung Galaxy S20 FE -  Unlocked':      ASSETS.s21Fe,
  'Samsung Galaxy S20 FE 5G - Unlocked':    ASSETS.s21Fe,
};

const FAMILY_RULES: Array<[RegExp, string]> = [
  [/Galaxy\s*S2[3-9].*Ultra/i,       ASSETS.s24Ultra],
  [/Galaxy\s*S2[2-3]/i,              ASSETS.s23Ultra],
  [/Galaxy\s*S2[0-1]/i,              ASSETS.s22],
  [/Galaxy\s*S1[0-9]/i,              ASSETS.s22],
  [/Galaxy\s*S\d.*FE/i,              ASSETS.s21Fe],
  [/Galaxy\s*Note\s*\d+\s*Ultra/i,   ASSETS.s24Ultra],
  [/Galaxy\s*Note\s*\d+/i,           ASSETS.s23Ultra],
  [/Galaxy\s*Z\s*Fold/i,             ASSETS.s23Ultra],
  [/Galaxy\s*Z\s*Flip/i,             ASSETS.s22],
  [/Galaxy\s*A\d+/i,                 ASSETS.s21Fe],
  [/Galaxy\s*Tab\s*S/i,              ASSETS.tabS9],
];

export function resolveSamsungImage(brand: string, model: string): string | null {
  if (brand !== 'Samsung') return null;
  if (!model) return null;
  if (EXACT[model]) return EXACT[model];
  for (const [re, asset] of FAMILY_RULES) {
    if (re.test(model)) return asset;
  }
  return null;
}
