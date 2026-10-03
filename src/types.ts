export type ProductGrade = 'Pristine' | 'Excellent' | 'Good' | 'Fair' | 'New';

export interface ProductVariant {
  id: string;
  color?: string;
  storage?: string;
  /** Tablet / wearable radio option, e.g. "Wi-Fi" or "Cellular". */
  connectivity?: string;
  condition?: ProductGrade;
  price: number;
  originalPrice: number;
  stock: number;
  batteryHealth?: number;
  imageUrl?: string;
  galleryImages?: string[];
  // ── Inventory / warehouse fields (admin-only, not shown on storefront) ────
  /** IMEI number. Undefined for non-IMEI accessories. */
  imei?: string;
  /** Internal or marketplace SKU code. */
  sku?: string;
  /** Supplier the unit was purchased from, e.g. MHL, ABC, IMAX. */
  supplier?: string;
  /** Cost price paid to supplier (£). Never exposed to the storefront. */
  buyPrice?: number;
  /** SIM tray type printed on the listing, e.g. "Physical SIM + eSIM". */
  simType?: string;
  /** Where the physical unit currently sits. */
  stockLocation?: 'OFFICE' | 'SHS' | 'FBA' | 'WAREHOUSE';
  /** ISO date the unit arrived in stock. */
  stockInDate?: string;
  /** Free-text internal note visible only to staff. */
  notes?: string;
  /** Full IMEI-level event log for this unit. Mirrors the Unit Histories sheet. */
  unitHistory?: UnitEvent[];
}

export interface ProductSpecs {
  display?: string;
  displaySize?: string;
  displayResolution?: string;
  displayProtection?: string;
  displayFeatures?: string;
  processor?: string;
  cpu?: string;
  gpu?: string;
  chip?: string;
  camera?: string;
  mainCamera?: string;
  mainCameraFeatures?: string;
  mainCameraVideo?: string;
  selfieCamera?: string;
  selfieCameraFeatures?: string;
  selfieCameraVideo?: string;
  battery?: string;
  batteryCharging?: string;
  batteryChargingSpeed?: string;
  batteryLife?: string;
  ram?: string;
  storage?: string;
  storageExpandable?: string;
  os?: string;
  osVersion?: string;
  body?: string;
  bodyDimensions?: string;
  bodyWeight?: string;
  bodyBuild?: string;
  bodySIM?: string;
  bodyProtection?: string;
  network?: string;
  network2G?: string;
  network3G?: string;
  network4G?: string;
  network5G?: string;
  networkSpeed?: string;
  comms?: string;
  commsWLAN?: string;
  commsBluetooth?: string;
  commsNFC?: string;
  commsUSB?: string;
  commsGPS?: string;
  features?: string;
  featuresSensors?: string;
  featuresRadio?: string;
  misc?: string;
  miscColors?: string;
  miscModels?: string;
  miscPrice?: string;
  sound?: string;
   soundLoudspeaker?: string;
  soundJack?: string;
  output?: string;
  type?: string;
  drive?: string;
  protection?: string;
  drivers?: string;
  support?: string;
}

export interface Review {
  id: string;
  productId: string;
  rating: number;
  comment: string;
  userName: string;
  date: string;
  /** Photos the reviewer attached, most recent upload last. Optional — most reviews have none. */
  images?: string[];
}

export type ProductCategory = 'Phones' | 'Tablets' | 'Computing' | 'Gaming' | 'Smartwatches' | 'TV' | 'Accessories' | 'Ipads & Tabs' | 'Speakers' | 'Hearables' | 'Playables' | 'Apple' | 'Samsung' | 'Google';

export interface Product {
  id: string;
  model: string;
  brand: string;
  category: ProductCategory;
  storage?: string;
  price: number;
  originalPrice: number;
  grade: ProductGrade;
  batteryHealth: number; // Added for transparency
  warrantyMonths: number; // Added for trust
  returnDays: number; // Added for trust
  imageUrl: string;
  galleryImages?: string[]; // Added for real photos
  isCertified: boolean;
  stock: number;
  specs: ProductSpecs;
  description?: string;
  reviews?: Review[];
  conditionDescription?: string; // Added for clarity
  variants?: ProductVariant[]; // Product variant support
  colorOptions?: string[];
  storageOptions?: string[];
  conditionOptions?: ProductGrade[];
}

export type Phone = Product; 

export interface Category {
  id: string;
  name: string;
  imageUrl: string;
  parent?: string; // Parent category ID for nested structure
  children?: Category[]; // Subcategories
  description?: string;
  productCount?: number;
}

export interface DeliveryPromise {
  date: string; // ISO date string
  time?: string; // e.g., "by 9pm"
  label: string; // e.g., "Get it by Tomorrow"
  confidence: 'high' | 'medium' | 'low';
}

export interface FilterState {
  brand: string[];
  grade: ProductGrade[];
  priceRange: [number, number];
  storage: string[];
  category: string[];
}

// ── Returns / RMA ──────────────────────────────────────────────
//
// The two consumer rights the returns policy describes are different clocks
// with different conditions, so the legal basis is stored on the request
// rather than inferred later: a 14-day change-of-mind cancellation and a
// faulty-goods claim are not the same case, and staff must not have to guess.

export type ReturnReason =
  | 'changed_mind'
  | 'not_as_described'
  | 'faulty'
  | 'arrived_damaged'
  | 'wrong_item'
  | 'arrived_late'
  | 'other';

/** What the customer is asking for. Replacement and repair are not refunds. */
export type ReturnOutcome = 'refund' | 'replacement' | 'repair';

export type ReturnStatus =
  | 'requested'    // customer submitted, awaiting staff decision
  | 'approved'     // staff accepted; label issued, awaiting the parcel
  | 'rejected'     // staff declined, with a reason
  | 'received'     // parcel arrived, awaiting inspection
  | 'resolved'     // refunded / replaced / repaired and closed
  | 'cancelled';   // withdrawn by the customer

export type ReturnLegalBasis = 'cooling_off' | 'faulty_goods' | 'warranty';

export interface ReturnItem {
  productId: string;
  model: string;
  brand: string;
  quantity: number;
  price: number;
  imageUrl?: string | null;
  /** IMEI of the returned unit (matches ProductVariant.imei). */
  imei?: string;
  storage?: string;
  color?: string;
  /** Supplier the unit originally came from — needed for supplier credit tracking. */
  supplier?: string;
}

export interface ReturnEvent {
  status: ReturnStatus;
  at: string;
  by: 'customer' | 'admin';
  note?: string;
}

export interface ReturnRequest {
  id: string;                 // RMA reference, shown to the customer
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  items: ReturnItem[];
  reason: ReturnReason;
  outcome: ReturnOutcome;
  legalBasis: ReturnLegalBasis;
  note?: string;
  photoUrls: string[];
  status: ReturnStatus;
  history: ReturnEvent[];
  refundAmount: number;
  /** Set when a replacement despatch is raised against this return. */
  replacementOrderId?: string | null;
  staffNote?: string | null;
  createdAt: string;
  updatedAt: string;
  // ── Return cost breakdown (maps to Returns Detail / Returns & Profit sheets) ─
  /** Which marketplace / sales channel this return originated from. */
  channel?: string;
  /** Per-leg postage cost £ (e.g. 2.75 for a 2-leg return). */
  carriageCost?: number;
  /** Number of postage legs (outbound + return = 2 typical). */
  shippingLegs?: number;
  /** External repair invoice total £, if unit was repaired before resale. */
  repairCost?: number;
  /** Credit received from supplier for the faulty unit £. */
  supplierCredit?: number;
  /** Marketplace fees that were NOT refunded to us (e.g. eBay £0.40 admin). */
  feesKept?: number;
  /** ISO date the returned unit was physically restocked. */
  stockRestoredDate?: string | null;
}

// ── Per-IMEI unit audit trail ──────────────────────────────────────────────
//
// Every significant event in a unit's life is recorded here as an element
// of ProductVariant.unitHistory. It is the source of truth for the
// "Unit Histories" sheet in the exported sales report.

export type UnitEventType = 'STOCK_IN' | 'SOLD' | 'RETURNED' | 'REPAIRED' | 'WRITTEN_OFF';

export interface UnitEvent {
  /** ISO datetime of the event. */
  at: string;
  type: UnitEventType;
  /** Human-readable detail, e.g. "AMAZON · 204-0679132-3237927" or supplier name. */
  detail?: string;
  /** £ value associated with the event (positive = revenue, negative = cost). */
  amount?: number;
  note?: string;
}

// ── Order channel ───────────────────────────────────────────────────────────
//
// Where the sale originated. Website orders default to WEBSITE.
// External marketplace orders arrive via webhook and carry the channel
// set by that marketplace.

export type OrderChannel = 'AMAZON' | 'EBAY' | 'BM' | 'ONBUY' | 'TEMU' | 'WEBSITE';

// ── Support conversations ──────────────────────────────────────
//
// One thread per customer, keyed by uid. That keeps the security rules
// trivially correct (a customer can only ever reach conversations/{their own
// uid}) and matches how a small shop actually works — staff want the person's
// history, not a pile of disconnected tickets.

export type MessageSender = 'customer' | 'admin';

export interface SupportMessage {
  id: string;
  body: string;
  sender: MessageSender;
  senderName: string;
  at: string;
}

export interface SupportConversation {
  id: string;                 // === userId
  userId: string;
  customerName: string;
  customerEmail: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSender: MessageSender;
  unreadForAdmin: number;
  unreadForCustomer: number;
  status: 'open' | 'closed';
  createdAt: string;
}
