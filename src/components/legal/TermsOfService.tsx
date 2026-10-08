import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { LegalShell, LegalSection, P, LegalList, LegalCallout } from './LegalShell';
import { COMPANY } from '../../config/company';

/**
 * Terms of sale for consumers.
 *
 * Consumer statutory rights cannot be excluded (Consumer Rights Act 2015,
 * s.31 and s.65), so nothing here tries to: the liability section limits only
 * what the law lets a seller limit, and every reference to cancellation and
 * faults matches the Returns page, which carries the detail.
 */
export default function TermsOfService() {
  const identity = [
    COMPANY.legalName,
    COMPANY.companyNumber && `company number ${COMPANY.companyNumber}`,
    COMPANY.registeredOffice && `registered office ${COMPANY.registeredOffice}`,
  ].filter(Boolean).join(', ');

  return (
    <LegalShell
      icon={<FileText size={20} />}
      eyebrow="Legal & Compliance"
      title="Terms of Sale"
      updated="8 October 2026"
      description="The terms on which LeHart sells refurbished devices to consumers in the UK: orders, prices, delivery, cancellation, faults, warranty and liability."
    >
      <LegalCallout>
        <strong>The short version:</strong> you can change your mind within 14 days of
        delivery, a faulty device can be rejected for a full refund within 30 days, and
        every device carries our 12-month warranty. None of these terms reduce your
        legal rights as a consumer.
      </LegalCallout>

      <LegalSection title="1. Who we are">
        <P>
          LeHart.co.uk is run by {identity}.
          {COMPANY.vatNumber && <> Our VAT number is {COMPANY.vatNumber}.</>}{' '}
          You can contact us at <strong>{COMPANY.supportEmail}</strong>.
        </P>
        <P>
          These terms apply when you buy from us as a consumer. Please read them before
          ordering; by placing an order you agree to them.
        </P>
      </LegalSection>

      <LegalSection title="2. Your order and our contract">
        <LegalList items={[
          <>Placing an order is an offer to buy. The contract is formed when we email you to confirm the order.</>,
          <>If we cannot supply a device — for example it has sold, or a price was shown in obvious error — we will tell you and refund any payment in full.</>,
          <>Each refurbished device is an individual unit. Photos show the model and colour; the grade describes the cosmetic condition of the unit you receive.</>,
        ]} />
      </LegalSection>

      <LegalSection title="3. Prices and payment">
        <P>
          Prices are in pounds sterling and include VAT. Delivery charges, if any, are shown
          before you pay. Payment is taken through PayPal, including card payments made
          through PayPal, when you place your order.
        </P>
      </LegalSection>

      <LegalSection title="4. Delivery">
        <P>
          We deliver within the UK. Delivery dates shown on the site are estimates; we will
          email you when your order is dispatched. If delivery is late we will tell you, and
          if we miss an agreed date that was essential you may cancel for a full refund.
          The device is your responsibility once it is delivered to you or a person you
          nominate. Full details are in our <Link to="/delivery">Delivery policy</Link>.
        </P>
      </LegalSection>

      <LegalSection title="5. Grades and condition">
        <P>
          We sell refurbished devices. The grade describes cosmetic condition only; every
          grade is fully functional and covered by the same warranty.
        </P>
        <LegalList items={[
          <><strong>Pristine:</strong> no visible signs of use on the screen or body.</>,
          <><strong>Excellent:</strong> light signs of use; screen micro-scratches not visible from 20&nbsp;cm.</>,
          <><strong>Good:</strong> visible signs of use such as scratches or scuffs on the body; the screen may show light marks that do not affect use.</>,
        ]} />
        <P>
          Apple iPhones carry a verified minimum battery health of 85%. For other devices,
          battery health is recorded for the individual unit where available, but no minimum
          is promised.
        </P>
      </LegalSection>

      <LegalSection title="6. Changing your mind">
        <P>
          Under the Consumer Contracts Regulations 2013 you may cancel your order for any
          reason within 14 days of the day you receive the device. We refund the price and
          standard delivery within 14 days of receiving the device back. How to cancel,
          return the device and get your refund is set out in our{' '}
          <Link to="/returns">Returns &amp; Cancellations policy</Link>.
        </P>
      </LegalSection>

      <LegalSection title="7. Faulty devices and our warranty">
        <P>
          Under the Consumer Rights Act 2015 a device must be as described, of satisfactory
          quality for a refurbished device of its grade, and fit for purpose. If it is not,
          you may reject it for a full refund within 30 days of delivery; after that we will
          repair or replace it, and if we cannot, you may claim a price reduction or refund.
        </P>
        <P>
          In addition, every device carries the LeHart 12-month warranty against technical
          faults from the date of delivery. The warranty does not cover accidental damage,
          liquid damage, or faults caused by third-party repairs or software modifications.
          It is in addition to, and does not affect, your legal rights.
        </P>
      </LegalSection>

      <LegalSection title="8. Our liability to you">
        <LegalList items={[
          <>If we fail to comply with these terms, we are responsible for loss or damage you suffer that is a foreseeable result of our breach or our negligence.</>,
          <>We do not exclude or limit our liability where it would be unlawful to do so, including for death or personal injury caused by our negligence, for fraud, or for breach of your legal rights in relation to the goods.</>,
          <>We sell to consumers for domestic and private use. We are not liable for business losses such as lost profit, loss of business or business interruption.</>,
          <>Please back up your data before returning a device. Devices returned to us are wiped, and we cannot recover data from them.</>,
        ]} />
      </LegalSection>

      <LegalSection title="9. Complaints and the law">
        <P>
          If something goes wrong, email <strong>{COMPANY.supportEmail}</strong> and we will
          try to resolve it quickly. These terms are governed by the law of England and
          Wales. You may bring proceedings in the courts of England and Wales, or, if you
          live in Scotland or Northern Ireland, in the courts of the place where you live.
        </P>
      </LegalSection>
    </LegalShell>
  );
}
