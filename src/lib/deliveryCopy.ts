import { CUTOFF_HOUR } from '../../api/_deliveryEstimate';

/**
 * The delivery promise, in one place, so the product page and checkout say
 * the same thing. Plain words rather than a countdown: "order within 27h 31m
 * for dispatch tomorrow" was hard to read and, on a weekend, looked wrong.
 *
 * Matches the delivery policy: next working day on mainland UK orders placed
 * before the cut-off Monday to Friday (Northern Ireland and the Highlands &
 * Islands take up to two working days, as the policy says).
 */
export const DELIVERY_HEADLINE = 'Free next-day delivery on all orders across mainland UK';
export const DELIVERY_CUTOFF = `Order before ${CUTOFF_HOUR - 12}pm (Mon–Fri) for next-day delivery`;
