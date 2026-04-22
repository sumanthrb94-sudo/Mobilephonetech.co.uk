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
  processor?: string;
  camera?: string;
  battery?: string;
  ram?: string;
  os?: string;
  storage?: string;
  body?: string;
  network?: string;
  platform?: string;
  mainCamera?: string;
  selfieCamera?: string;
  sound?: string;
  comms?: string;
  features?: string;
  misc?: string;
  tests?: string;
}

export interface Review {
  id: string;
  productId: string;
  rating: number;
  comment: string;
  userName: string;
  date: string;
}

export interface Product {
  id: string;
  model: string;
  brand: string;
  category: 'Phones' | 'Computing' | 'Components' | 'Accessories';
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
