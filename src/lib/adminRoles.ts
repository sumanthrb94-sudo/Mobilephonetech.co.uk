/**
 * Who may do what in the back office.
 *
 * The console used to have one door. `admin === true` and you could do
 * everything behind it: change a price, delete a product and every image of
 * it, rewrite the home page. That is fine while the only person with the
 * claim is the person who owns the shop. It stops being fine the moment the
 * shop is handed to someone who employs staff, because the smallest job —
 * "mark this order dispatched" — arrives bundled with the authority to blank
 * the shop front.
 *
 * So there are two roles, following InventoryManager: its Stock Intake,
 * Inventory and Returns screens are the working floor, and its Admin tab is
 * marked "managers only". The same division here:
 *
 *   staff  — the daily work. Products, stock, orders, returns, support.
 *   admin  — everything staff can do, plus the decisions that are hard to
 *            undo or commercially sensitive: what the shop front says,
 *            archiving a product, margin and traffic figures.
 *
 * WHY CAPABILITIES RATHER THAN ROLE CHECKS AT THE CALL SITE
 *
 * `if (role === 'admin')` scattered through the pages is a rule you cannot
 * read in one place and cannot test without rendering. Every question the UI
 * asks is named here instead, so the whole policy is this one table, and a
 * third role later is a column rather than a hunt through the components.
 *
 * WHAT THIS IS NOT
 *
 * This decides what the console *offers*. It is not what makes the shop
 * secure — firestore.rules checks the same claims server-side, and a browser
 * that lies about its role still cannot write anything it should not. Every
 * capability below has a matching rule; if you add one here, add it there.
 */

/** The roles a signed-in person can hold, weakest first. */
export type StaffRole = 'none' | 'staff' | 'admin';

/**
 * The things the console can be asked to do.
 *
 * Named for the job rather than the screen, because screens move: "Home
 * layout" and "Series" are two routes today and could be one tomorrow, but
 * "deciding what the shop front says" is the same authority either way.
 */
export type Capability =
  /** See the console at all. */
  | 'console'
  /** Create and edit products, and set stock. */
  | 'products:write'
  /** Take a product off sale. Hard to undo from a customer's point of view. */
  | 'products:archive'
  /** Move an order through its statuses. */
  | 'orders:write'
  /** Decide a return. */
  | 'returns:write'
  /** Reply to a customer. */
  | 'support:write'
  /** Decide what the home page says: banners, running order, series panels. */
  | 'storefront:write'
  /** Margin, traffic and takings. Commercially sensitive. */
  | 'insights:read'
  /** Take the catalogue or the order book out of the building. */
  | 'export'
  /** Add a brand or model the catalogue has never carried. */
  | 'catalogue:extend'
  /**
   * Ask a manager to add a model. How staff get a phone listed that the
   * catalogue lacks, since they cannot type a model themselves.
   */
  | 'catalogue:request';

/**
 * The policy, in one table.
 *
 * Read a row as "a person with this role may do these things". admin is not
 * written as "staff plus extras" because an inherited list is a list you have
 * to assemble in your head before you can audit it, and this table is meant
 * to be checked against firestore.rules line by line.
 */
const GRANTS: Record<StaffRole, readonly Capability[]> = {
  none: [],

  staff: [
    'console',
    'products:write',
    'orders:write',
    'returns:write',
    'support:write',
    'export',
    'catalogue:request',
  ],

  admin: [
    'console',
    'products:write',
    'products:archive',
    'orders:write',
    'returns:write',
    'support:write',
    'storefront:write',
    'insights:read',
    'export',
    'catalogue:extend',
    'catalogue:request',
  ],
};

/** Whether this role carries this capability. */
export function can(role: StaffRole, capability: Capability): boolean {
  return GRANTS[role]?.includes(capability) ?? false;
}

/** Every capability a role carries. Useful in tests and in the account page. */
export function capabilitiesOf(role: StaffRole): readonly Capability[] {
  return GRANTS[role] ?? [];
}

/**
 * The role carried by a set of ID-token claims.
 *
 * BACKWARDS COMPATIBILITY IS THE POINT
 *
 * Every existing staff account has `{ admin: true }` and nothing else. Those
 * accounts must keep working unchanged — a role split that signs the owner
 * out of their own shop on deploy is not a role split, it is an outage. So
 * `admin` still means admin, and `staff` is the new, strictly smaller claim.
 *
 * Claims arrive from a decoded JWT, so they are `unknown` in shape and the
 * comparison is `=== true` rather than truthy: the string "false" is truthy,
 * and a claim that survived a round trip through somewhere careless should
 * not silently promote anyone.
 */
export function roleFromClaims(claims: Record<string, unknown> | null | undefined): StaffRole {
  if (!claims) return 'none';
  if (claims.admin === true) return 'admin';
  if (claims.staff === true) return 'staff';
  return 'none';
}

/** How the role is written in the console. */
export function roleLabel(role: StaffRole): string {
  return role === 'admin' ? 'Manager' : role === 'staff' ? 'Staff' : 'No access';
}

/**
 * What to say when someone is refused.
 *
 * A refusal that only says "no" sends the person to ask a colleague what
 * happened. Naming the role that would have worked turns it into one message
 * to their manager instead.
 */
export function refusalFor(capability: Capability): string {
  const needed: Capability[] = [
    'products:archive', 'storefront:write', 'insights:read', 'catalogue:extend',
  ];
  return needed.includes(capability)
    ? 'This is a manager-only action. Ask whoever administers the shop to do it, or to give your account the manager role.'
    : 'Your account does not have access to this.';
}
