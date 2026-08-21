import { Truck } from 'lucide-react';
import { LegalShell, LegalSection, P, LegalList, LegalCallout } from './LegalShell';
import { COMPANY } from '../../config/company';

/**
 * Delivery policy. The timescales here must match the promises made in the
 * site chrome ("Free next-day delivery") and the FAQ — a policy page that
 * contradicts the banner is a drip-pricing / misleading-claims problem, not
 * just untidy copy.
 */
export default function DeliveryPolicy() {
  return (
    <LegalShell
      icon={<Truck size={20} />}
      eyebrow="Legal & Compliance"
      title="Delivery"
      updated="21 August 2026"
      description="Free next-day delivery on orders before 4pm, mainland UK — timescales, tracking and what happens if a parcel goes missing."
    >
      <LegalCallout>
        <strong>The short version:</strong> order before 4pm Monday–Friday and it arrives
        the next working day, free, tracked and signed for, anywhere in mainland UK.
      </LegalCallout>

      <LegalSection title="1. Timescales">
        <LegalList items={[
          <><strong>Mainland UK:</strong> free next-working-day delivery on orders placed before 4pm Monday–Friday. Orders after 4pm, or at the weekend, are dispatched the next working day.</>,
          <><strong>Northern Ireland, Highlands & Islands:</strong> within 2 working days.</>,
          <>All timescales are estimates, not guarantees — carrier delays outside our control can add a day.</>,
        ]} />
      </LegalSection>

      <LegalSection title="2. How devices are shipped">
        <LegalList items={[
          <>Every parcel is tracked, insured to its full value, and requires a signature — a phone is exactly the parcel thieves look for, so we do not use safe-place or leave-with-neighbour delivery.</>,
          <>Tracking details are emailed at dispatch.</>,
          <>Devices ship with lithium batteries installed, so they travel with carriers certified for battery freight, which can rule out some express air options to islands.</>,
        ]} />
      </LegalSection>

      <LegalSection title="3. Missed and failed deliveries">
        <P>
          If nobody can sign, the carrier leaves a card and re-attempts or holds the parcel
          for collection. After a failed delivery cycle the device returns to us and we
          contact you to rearrange.
        </P>
      </LegalSection>

      <LegalSection title="4. Lost or damaged in transit">
        <P>
          The device is our responsibility until it is in your hands. If a parcel arrives
          damaged or does not arrive at all, contact {COMPANY.supportEmail} — we replace or
          refund, and we deal with the carrier and the insurance. You never have to pursue
          the courier yourself.
        </P>
      </LegalSection>

      <LegalSection title="5. Addresses">
        <P>
          We deliver to the address given at checkout — check it carefully, as a parcel
          signed for at the address you gave counts as delivered. We currently ship within
          the United Kingdom only.
        </P>
      </LegalSection>
    </LegalShell>
  );
}
