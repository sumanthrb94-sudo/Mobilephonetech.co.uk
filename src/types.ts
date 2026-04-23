export type ProductGrade = 'Pristine' | 'Excellent' | 'Good' | 'Fair' | 'New';

export interface ProductVariant {
  id: string;
  color?: string;
  storage?: string;
  condition?: ProductGrade;
  price: number;
  originalPrice: number;
  stock: number;
  batteryHealth?: number;
  imageUrl?: string;
  galleryImages?: string[];
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
}

export interface Review {
  id: string;
  productId: string;
  rating: number;
  comment: string;
  userName: string;
  date: string;
}

export type ProductCategory = 'Phones' | 'Tablets' | 'Computing' | 'Gaming' | 'Smartwatches' | 'TV' | 'Accessories';

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
}
