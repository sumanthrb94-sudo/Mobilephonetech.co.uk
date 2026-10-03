import type { Product } from '../types';

/**
 * Returns the one compatible charger we can offer beside a phone.
 *
 * The upsell is deliberately backed by a real catalogue product instead of
 * inventing a priced add-on. That keeps the cart and server-side order
 * repricing on the same product IDs and means an out-of-stock charger simply
 * is not offered.
 */
const USB_C_CHARGER_ID = 'lehart-usb-c-fast-charger-brick-with-cable';

export interface ChargerUpsell {
  product: Product;
  title: string;
  description: string;
}

export function chargerUpsellFor(device: Product, catalogue: Product[]): ChargerUpsell | null {
  if (device.category !== 'Phones') return null;

  const apple = device.brand.trim().toLowerCase() === 'apple';
  const charger = catalogue.find(product => product.id === USB_C_CHARGER_ID);
  if (!charger || charger.stock < 1) return null;

  return apple
    ? {
        product: charger,
        title: 'Add a USB-C wall charger + cable',
        description: 'Optional add-on — Apple does not include a power adapter in the box.',
      }
    : {
        product: charger,
        title: 'Add a USB-C charger brick + cable',
        description: 'Fast USB-C wall charger with a matching USB-C cable for your Android phone.',
      };
}
