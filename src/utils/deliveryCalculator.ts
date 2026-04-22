import { DeliveryPromise } from '../types';

/**
 * Mock location data for UK postcodes
 * In production, this would integrate with a real geo-location service
 */
const LOCATION_DATA: Record<string, { region: string; deliveryDays: number }> = {
  'SW1A': { region: 'London', deliveryDays: 1 },
  'M1': { region: 'Manchester', deliveryDays: 1 },
  'B': { region: 'Birmingham', deliveryDays: 1 },
  'LS': { region: 'Leeds', deliveryDays: 1 },
  'G': { region: 'Glasgow', deliveryDays: 2 },
  'EH': { region: 'Edinburgh', deliveryDays: 2 },
  'CF': { region: 'Cardiff', deliveryDays: 2 },
  'BT': { region: 'Belfast', deliveryDays: 3 },
};

/**
 * Calculate delivery promises based on order time and location
 * @param postalCode - UK postal code
 * @param orderTime - Time of order (ISO string or Date)
 * @returns Array of delivery promise options
 */
export function calculateDeliveryPromises(
  postalCode: string,
  orderTime: string | Date = new Date()
): DeliveryPromise[] {
  const now = typeof orderTime === 'string' ? new Date(orderTime) : orderTime;
  const hour = now.getHours();
  
  // Extract postcode prefix (e.g., "SW1A 1AA" -> "SW1A")
  const postcodePrefix = postalCode.split(' ')[0].toUpperCase();
  const locationInfo = LOCATION_DATA[postcodePrefix] || { region: 'Other UK', deliveryDays: 2 };
  
  // Determine if order is placed before cutoff time (2 PM)
  const isBefore2PM = hour < 14;
  
  const promises: DeliveryPromise[] = [];
  
  // Next-day delivery (if ordered before 2 PM)
  if (isBefore2PM) {
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    promises.push({
      date: nextDay.toISOString().split('T')[0],
      time: 'by 9pm',
      label: 'Get it by Tomorrow',
      confidence: 'high',
    });
  }
  
  // Standard delivery based on location
  const standardDay = new Date(now);
  standardDay.setDate(standardDay.getDate() + locationInfo.deliveryDays);
  promises.push({
    date: standardDay.toISOString().split('T')[0],
    time: 'by 5pm',
    label: `Delivery by ${formatDate(standardDay)}`,
    confidence: 'high',
  });
  
  // Express delivery (1 day faster)
  const expressDay = new Date(now);
  expressDay.setDate(expressDay.getDate() + Math.max(1, locationInfo.deliveryDays - 1));
  promises.push({
    date: expressDay.toISOString().split('T')[0],
    time: 'by 5pm',
    label: `Express: ${formatDate(expressDay)}`,
    confidence: 'medium',
  });
  
  return promises;
}

/**
 * Get fastest delivery promise
 */
export function getFastestDelivery(
  postalCode: string,
  orderTime?: string | Date
): DeliveryPromise | null {
  const promises = calculateDeliveryPromises(postalCode, orderTime);
  return promises.length > 0 ? promises[0] : null;
}

/**
 * Check if next-day delivery is available
 */
export function isNextDayDeliveryAvailable(orderTime: string | Date = new Date()): boolean {
  const now = typeof orderTime === 'string' ? new Date(orderTime) : orderTime;
  const hour = now.getHours();
  return hour < 14; // Available if ordered before 2 PM
}

/**
 * Format date for display (e.g., "Tomorrow", "Friday, Dec 20")
 */
function formatDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
}

/**
 * Get region from postal code
 */
export function getRegionFromPostcode(postalCode: string): string {
  const postcodePrefix = postalCode.split(' ')[0].toUpperCase();
  return LOCATION_DATA[postcodePrefix]?.region || 'UK';
}
