/**
 * Legal identity of the shop — the single place to fill in real company
 * details before launch.
 *
 * UK law requires a limited company trading online to publish its registered
 * name, company number, registered office and (if registered) VAT number.
 * Every surface that shows these — the footer, the legal pages — reads from
 * here, so going live is a one-file edit.
 *
 * Empty string means "not yet provided": the UI renders nothing rather than a
 * placeholder, because publishing an invented company number or ICO reference
 * is worse than publishing none — it is a false statement on a legal document.
 *
 * The identity below is as supplied by the company on 19 September 2026, in
 * the exact form Companies House holds it. The ICO reference is still to
 * come; the privacy policy omits the line until it does.
 */
export const COMPANY = {
  /** Trading name shown across the storefront. */
  tradingName: 'LeHart',

  /** Registered company name, e.g. "LeHart Ltd". Companies House exact form. */
  legalName: 'LE HART LTD',

  /** Companies House number, e.g. "12345678". */
  companyNumber: '12379174',

  /** Registered office address, single line. */
  registeredOffice: '250a High Road, Ilford, Essex, England, IG1 1YS',

  /** VAT registration number, e.g. "GB 123 4567 89". Leave empty if not registered. */
  vatNumber: 'GB 343 0196 26',

  /** ICO data-protection registration reference, e.g. "ZA123456". */
  icoRegistration: '',

  /**
   * Monitored support inbox. Must be a mailbox that actually exists and that
   * somebody reads — it is printed on the legal pages, in the footer and in
   * the returns flow, so a typo here is an address customers write to and
   * nobody receives.
   *
   * info@ rather than support@: info@lehart.co.uk exists on the IONOS mail
   * plan, support@ does not, and publishing an address that bounces is worse
   * than publishing a less pretty one.
   */
  supportEmail: 'info@lehart.co.uk',

  /** Support phone — an 03 number costs callers basic rate, which consumer law expects. */
  supportPhone: '',
} as const;

/** True once the legally-required identity fields are filled in. */
export const companyDetailsComplete = (): boolean =>
  Boolean(COMPANY.legalName && COMPANY.companyNumber && COMPANY.registeredOffice);
