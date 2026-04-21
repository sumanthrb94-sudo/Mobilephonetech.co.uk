export type ProductGrade = 'Pristine' | 'Excellent' | 'Good' | 'Fair' | 'New';

export interface ProductSpecs {
  display?: string;
  processor?: string;
  camera?: string;
  battery?: string;
  ram?: string;
  os?: string;
  aiPerformance?: string;
  compatibilty?: string;
  type?: string;
  ports?: string;
  storage?: string;
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
  storage?: string; // Restore for mobile devices
  price: number;
  originalPrice: number;
  grade: ProductGrade;
  imageUrl: string;
  isCertified: boolean;
  stock: number;
  specs: ProductSpecs;
  description?: string;
  reviews?: Review[];
}

export type Phone = Product; 

export interface Category {
  id: string;
  name: string;
  imageUrl: string;
}

export interface FilterState {
  brand: string[];
  grade: ProductGrade[];
  priceRange: [number, number];
  storage: string[];
}
