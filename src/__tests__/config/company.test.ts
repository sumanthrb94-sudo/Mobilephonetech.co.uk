import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMPANY, companyDetailsComplete } from '../../config/company';

/**
 * The legal identity a UK limited company must publish when it trades
 * online: registered name, company number, registered office, VAT number.
 *
 * These are asserted as shape, not as specific values, so a change of
 * registered office is not a test failure — but a field going back to ''
 * is, because every surface that prints the identity renders nothing for an
 * empty field, and the site would silently stop disclosing who it is.
 */
describe('company identity', () => {
  it('is complete, so every legal surface has something to print', () => {
    expect(companyDetailsComplete()).toBe(true);
  });

  it('carries the registered name in Companies House form', () => {
    // Companies House holds names in capitals with the suffix; a trading
    // name here would be the wrong thing on a legal document.
    expect(COMPANY.legalName).toMatch(/^[A-Z0-9 &'.-]+ (LTD|LIMITED|PLC)$/);
  });

  it('has an eight-digit company number', () => {
    expect(COMPANY.companyNumber).toMatch(/^\d{8}$/);
  });

  it('has a registered office ending in a UK postcode', () => {
    expect(COMPANY.registeredOffice).toMatch(/[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/);
  });

  it('has a VAT number in GB form', () => {
    expect(COMPANY.vatNumber).toMatch(/^GB ?\d{3} ?\d{4} ?\d{2}$/);
  });

  it('never prints an invented address anywhere in the source', () => {
    // The privacy notice used to name a data controller at an address that
    // does not exist. Keeping the placeholder out of the tree is the whole
    // point of having one config file.
    const files = ['src/components/legal/PrivacyPolicy.tsx', 'src/components/layout/CheckoutFooter.tsx', 'src/components/layout/Footer.tsx', 'api/_templates.ts'];
    for (const f of files) {
      const text = readFileSync(resolve(process.cwd(), f), 'utf8');
      expect(text, f).not.toMatch(/Tech Hub|EC1A 1BB|LeHart\.co\.uk Ltd/);
    }
  });

  it('agrees with the structured data in index.html', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1]);
    const org = ld.find((n: { '@type': string }) => n['@type'] === 'Organization');
    expect(org.legalName).toBe(COMPANY.legalName);
    expect(org.vatID).toBe(COMPANY.vatNumber.replace(/\s+/g, ''));
    expect(org.address.postalCode).toBe(COMPANY.registeredOffice.match(/[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/)![0]);
    expect(org.email).toBe(COMPANY.supportEmail);
  });
});
