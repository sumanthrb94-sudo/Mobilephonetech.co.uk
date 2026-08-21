import { RotateCcw } from 'lucide-react';
import { LegalShell, LegalSection, P, LegalList, LegalCallout } from './LegalShell';
import { COMPANY } from '../../config/company';

/**
 * Returns, cancellation and warranty policy.
 *
 * Two distinct legal rights live here and must not be blurred, because they
 * have different clocks and different conditions:
 *
 *  - the 14-day change-of-mind cancellation right (Consumer Contracts
 *    Regulations 2013 — distance selling), and
 *  - the faulty-goods remedies (Consumer Rights Act 2015): 30-day short-term
 *    right to reject, then repair or replacement, with the burden of proof on
 *    the retailer for the first six months.
 *
 * The model cancellation form is included because the distance-selling rules
 * require the trader to make one available.
 */
export default function ReturnsPolicy() {
  return (
    <LegalShell
      icon={<RotateCcw size={20} />}
      eyebrow="Legal & Compliance"
      title="Returns & Cancellations"
      updated="21 August 2026"
      description="Your 14-day cancellation right, the 30-day right to reject faulty goods, and how the LeHart 12-month warranty works."
    >
      <LegalCallout>
        <strong>The short version:</strong> you have 14 days from delivery to change your
        mind about anything, no reason needed. If something is faulty, you have 30 days
        for a full refund and 12 months of warranty cover. Returns are free — we send a
        prepaid tracked label.
      </LegalCallout>

      <LegalSection title="1. Your 14-day right to change your mind">
        <P>
          Under the Consumer Contracts Regulations 2013, you may cancel your order for any
          reason — or none — up to 14 days after the day you (or someone you nominate)
          receive the goods. You do not need to give a reason and the right is in addition
          to, not instead of, your rights when something is faulty.
        </P>
        <P>
          To cancel, tell us before your 14 days run out. Email{' '}
          <strong>{COMPANY.supportEmail}</strong>, use the return option against the order
          in your account, or send us the model cancellation form below. Then return the
          device to us within 14 days of telling us.
        </P>
      </LegalSection>

      <LegalSection title="2. Refunds when you change your mind">
        <LegalList items={[
          <>We refund the full price of the goods plus standard delivery, to your original payment method.</>,
          <>The refund is made within 14 days of the goods reaching us (or of you proving you sent them, if earlier).</>,
          <>You may inspect the device as you would in a shop — turn it on, look it over. We may reduce the refund if the value has been diminished by handling beyond that (for example, scratches gained after delivery or a device newly activated into an account lock).</>,
          <>Remove any iCloud / Google account lock before returning — we cannot resell, or refund in full, a device we cannot unlock.</>,
        ]} />
      </LegalSection>

      <LegalSection title="3. Faulty goods — your separate rights">
        <P>
          Under the Consumer Rights Act 2015, everything we sell must be as described, of
          satisfactory quality for a refurbished device of its stated grade, and fit for
          purpose. The cosmetic condition described by the grade is part of the
          description — normal wear consistent with the grade you bought is not a fault.
        </P>
        <LegalList items={[
          <><strong>First 30 days:</strong> if the device is faulty you may reject it for a full refund.</>,
          <><strong>After 30 days:</strong> we repair or replace. If we cannot within a reasonable time and without significant inconvenience, you may claim a price reduction or a final refund.</>,
          <><strong>First 6 months:</strong> a fault appearing in this period is presumed to have been present at delivery unless we can show otherwise — the burden of proof is on us, not you.</>,
        ]} />
      </LegalSection>

      <LegalSection title="4. The LeHart 12-month warranty">
        <P>
          Every device carries a 12-month warranty from delivery, covering electrical and
          functional faults — battery below the stated health, screen, cameras, speakers,
          charging, connectivity. It does not cover accidental damage, liquid damage,
          unauthorised repair, or cosmetic wear consistent with the grade sold. The
          warranty is in addition to your statutory rights, never in place of them.
        </P>
      </LegalSection>

      <LegalSection title="5. How a return works">
        <LegalList items={[
          <>Start the return from your account or by emailing {COMPANY.supportEmail} with your order number.</>,
          <>We email a prepaid, tracked return label. Package the device securely, ideally in its original box.</>,
          <>Every return is inspected on arrival — condition checked, IMEI verified against the unit we dispatched.</>,
          <>Refunds go to the original payment method. Exchanges and warranty repairs are dispatched with tracking.</>,
        ]} />
      </LegalSection>

      <LegalSection title="6. Model cancellation form">
        <P>
          You are not required to use this form, but you may. Copy it into an email to{' '}
          <strong>{COMPANY.supportEmail}</strong>:
        </P>
        <LegalCallout>
          To {COMPANY.legalName || 'LeHart'}{COMPANY.registeredOffice ? `, ${COMPANY.registeredOffice}` : ''} ({COMPANY.supportEmail}):
          <br /><br />
          I hereby give notice that I cancel my contract of sale of the following goods:
          [description of device] — Ordered on [date] / received on [date] — Order number:
          [number] — Name of consumer: — Address of consumer: — Date:
        </LegalCallout>
      </LegalSection>

      <LegalSection title="7. Anything unclear?">
        <P>
          Contact us at <strong>{COMPANY.supportEmail}</strong>
          {COMPANY.supportPhone ? <> or on <strong>{COMPANY.supportPhone}</strong></> : null} before
          returning anything — most problems are quicker to resolve than to post. This
          policy does not affect your statutory rights.
        </P>
      </LegalSection>
    </LegalShell>
  );
}
