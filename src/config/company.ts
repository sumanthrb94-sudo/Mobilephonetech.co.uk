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
 */
export const COMPANY = {
  /** Trading name shown across the storefront. */
  tradingName: 'LeHart',

  /** Registered company name, e.g. "LeHart Ltd". Companies House exact form. */
  legalName: '',

  /** Companies House number, e.g. "12345678". */
  companyNumber: '',

  /** Registered office address, single line. */
  registeredOffice: '',

  /** VAT registration number, e.g. "GB 123 4567 89". Leave empty if not registered. */
  vatNumber: '',

  /** ICO data-protection registration reference, e.g. "ZA123456". */
  icoRegistration: '',

  /** Monitored support inbox. */
  supportEmail: 'support@lehart.co.uk',

  /** Support phone — an 03 number costs callers basic rate, which consumer law expects. */
  supportPhone: '',
} as const;

/** True once the legally-required identity fields are filled in. */
export const companyDetailsComplete = (): boolean =>
  Boolean(COMPANY.legalName && COMPANY.companyNumber && COMPANY.registeredOffice);
