/**
 * Preview mode — the site is visible but must not take an order.
 *
 * One environment variable, `VITE_PREVIEW_MODE`, drives both sides. Vite
 * inlines it into the bundle; Vercel also hands it to the serverless functions
 * as a plain variable. A single value means the banner and the order route
 * cannot disagree — two variables would eventually be set to two things, and
 * the day that happens the banner says one thing while checkout does another.
 *
 * This module deliberately reads no environment itself. `import.meta.env` does
 * not exist in the functions' TypeScript project and `process` does not exist
 * in the browser, so each side passes its own value into the same rule. One
 * parsing rule, one message, no drift.
 *
 * **The banner is not the mechanism.** A notice asking people not to order,
 * over a checkout that works, produces exactly one outcome: a real order from
 * someone who did not read it, and a refund, and an apology. The refusal lives
 * in api/_routes/orders.ts, server-side, where a determined browser cannot
 * route around it. The banner exists so nobody wastes their time getting that
 * far.
 *
 * Everything else stays live on purpose — browsing, search, accounts, the
 * emails. Those are what need testing with real people before launch, and none
 * of them takes money.
 */

/** Values that mean "off" once the variable exists at all. */
const OFF = new Set(['', '0', 'false', 'off', 'no']);

/**
 * Unset is off, so production is never accidentally frozen by a missing
 * variable — but anything set to a word that is not clearly negative counts as
 * on, because a typo should fail towards refusing orders rather than taking
 * them.
 */
export function previewModeFrom(value: unknown): boolean {
  const text = String(value ?? '').trim().toLowerCase();
  return text !== '' && !OFF.has(text);
}

/** Shown on the banner and returned by the order route when it refuses. */
export const PREVIEW_MESSAGE =
  'This is a preview of the LeHart store. Everything works except checkout — orders are switched off while we finish setting up.';
