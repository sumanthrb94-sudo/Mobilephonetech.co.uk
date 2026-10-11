import { Truck } from 'lucide-react';
import { DELIVERY_CUTOFF, DELIVERY_HEADLINE } from '../../lib/deliveryCopy';

/**
 * The delivery promise on the product page: free next-day delivery and the
 * 4pm cut-off, in plain words. It used to count down to the next dispatch
 * ("order within 27h 31m for dispatch tomorrow"), which read badly.
 */
export default function PdpDeliveryUrgency() {
  return (
    <p className="pdp-delivery-urgency">
      <Truck size={16} aria-hidden="true" />
      <span>
        <strong>{DELIVERY_HEADLINE}</strong>
        {' · '}{DELIVERY_CUTOFF}
      </span>
    </p>
  );
}
