/**
 * Micro-haptics via the Web Vibration API. No-ops on platforms that don't
 * support it (desktop, iOS Safari). Kept deliberately short so it feels like
 * a tactile confirm, not a buzzer.
 */
export type HapticPattern = 'tap' | 'success' | 'warn';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [8, 40, 14],
  warn: [12, 30, 12, 30, 12],
};

export function haptic(pattern: HapticPattern = 'tap') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try { navigator.vibrate(PATTERNS[pattern]); } catch {}
}
